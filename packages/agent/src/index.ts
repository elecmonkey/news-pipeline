import { prisma } from "@news-pipeline/database";
import { dedupeByLink } from "./pipeline/dedupe";
import { enrichArticles } from "./pipeline/enrich";
import { ingestSources } from "./pipeline/ingest";
import { sources } from "./sources";
import { createChatCompletion, loadOpenAIConfig } from "./llm/openai";
import { eventsSystemPrompt, eventsUserPrompt } from "./llm/prompts/events";
import { buildSummarySystemPrompt, summaryUserPrompt } from "./llm/prompts/summary";
import type { NormalizedArticle } from "./core/types";
import { upsertArticles } from "./store/db";

type EventGroup = {
  event_key: string;
  title: string;
  article_refs: string[];
};

type EventsResponse = {
  events: EventGroup[];
};

type PreparedEvent = {
  event_key: string;
  title: string;
  summary: string;
  references: Array<{
    source: string;
    title: string;
    link: string;
    publishedAt: string | null;
  }>;
  articleIds: string[];
  articles: Array<ReturnType<typeof pickArticleOutput>>;
};

async function main() {
  let stage = "init";
  const config = loadOpenAIConfig();
  const localLanguage = process.env.LOCAL_LANGUAGE?.trim() || undefined;
  const summarySystemPrompt = buildSummarySystemPrompt(localLanguage);
  const lockId = "agent";
  try {
    stage = "db-connect";
    await prisma.$connect();
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    stage = "check-run-lock";
    const existingLock = await prisma.runLock.findUnique({
      where: { id: lockId },
      select: { startedAt: true },
    });
    if (existingLock && existingLock.startedAt >= cutoff) {
      console.log(
        `[run] skipping: recent start at ${existingLock.startedAt.toISOString()}`
      );
      await prisma.$disconnect();
      return;
    }
    stage = "acquire-run-lock";
    const now = new Date();
    try {
      if (existingLock) {
        await prisma.runLock.update({
          where: { id: lockId },
          data: { startedAt: now },
        });
      } else {
        await prisma.runLock.create({
          data: { id: lockId, startedAt: now },
        });
      }
    } catch (error) {
      console.warn("[run] lock contention, skipping", error);
      await prisma.$disconnect();
      return;
    }

    const windowMinutes = parseWindowMinutes(process.env.WINDOW_MINUTES);
    console.log("[run] starting ingest");
    stage = "ingest";
    const ingested = await ingestSources();
    const windowed = filterByWindow(ingested, windowMinutes);
    const filtered = windowed.articles;
    const articles = dedupeByLink(filtered);
    const contentConcurrency = Number(process.env.CONTENT_FETCH_CONCURRENCY ?? "4");
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    stage = "enrich";
    const enriched = await enrichArticles(articles, sourceById, contentConcurrency);
    console.log(
      `[run] ingest done total=${ingested.length} window=${windowMinutes}m filtered=${filtered.length} unique=${articles.length}`
    );

    stage = "upsert-articles";
    console.log(`[run] upserting articles count=${enriched.length}`);
    const storedArticles = await upsertArticles(prisma, enriched);
    const storedByLink = new Map(storedArticles.map((item) => [item.link, item]));
    const withRefs = enriched.map((article, index) => ({
      ...article,
      ref: `A${(index + 1).toString(36).toUpperCase().padStart(3, "0")}`,
    }));

    console.log(`[run] building event input articles=${withRefs.length}`);
    stage = "llm-event-input";
    const eventInput = withRefs
      .map((article) =>
        [
          `[${article.ref}] ${article.title}`,
          pickGroupingContext(article),
          article.link,
        ].join("\n")
      )
      .join("\n\n");

    stage = "llm-events";
    console.log("[llm] requesting event grouping");
    const eventsStartedAt = Date.now();
    const events = await withRetry(
      async () => {
        const eventsRaw = await createChatCompletion(
          {
            system: eventsSystemPrompt,
            user: `${eventsUserPrompt}\n\nArticles:\n${eventInput}`,
          },
          config
        );
        return parseEvents(eventsRaw);
      },
      Number(process.env.LLM_PARSE_RETRIES ?? "1"),
      "event-grouping"
    );
    console.log(
      `[llm] event grouping done events=${events.events.length} ${Date.now() - eventsStartedAt}ms`
    );

    stage = "prepare-events";
    const preparedEvents: PreparedEvent[] = [];
    let index = 1;
    for (const event of events.events) {
      stage = `summary-${index}/${events.events.length}`;
      const eventArticles = withRefs.filter((article) =>
        event.article_refs.includes(article.ref)
      );

      console.log(
        `[llm] summarizing ${index}/${events.events.length} ${event.event_key} refs=${eventArticles.length}`
      );
      const summaryStartedAt = Date.now();
      const summaryInput = eventArticles
        .map((article) =>
          [
            `Title: ${article.title}`,
            `Summary: ${pickSummaryContext(article, 4000)}`,
            `Link: ${article.link}`,
          ].join("\n")
        )
        .join("\n\n");

      const summary = await withRetry(
        async () => {
          const value = await createChatCompletion(
            {
              system: summarySystemPrompt,
              user: `${summaryUserPrompt}\n\n${summaryInput}`,
            },
            config
          );
          if (!value.trim()) {
            throw new Error("Empty summary response");
          }
          return value;
        },
        Number(process.env.LLM_PARSE_RETRIES ?? "1"),
        `summary ${event.event_key}`
      );
      console.log(
        `[llm] summary done ${event.event_key} ${Date.now() - summaryStartedAt}ms`
      );

      const references = eventArticles.map((article) => ({
        source: article.source,
        title: article.title,
        link: article.link,
        publishedAt: article.publishedAt?.toISOString() ?? null,
      }));

      const articleIds = eventArticles
        .map((article) => storedByLink.get(article.link))
        .filter(
          (item): item is { id: string; link: string; title: string; source: string } =>
            Boolean(item)
        )
        .map((item) => item.id);

      preparedEvents.push({
        event_key: event.event_key,
        title: event.title,
        summary,
        references,
        articleIds,
        articles: eventArticles.map(pickArticleOutput),
      });

      index += 1;
    }

    stage = "db-write";
    const output: Array<{
      event_key: string;
      title: string;
      summary: string;
      articles: Array<ReturnType<typeof pickArticleOutput>>;
    }> = [];
    await prisma.$transaction(async (tx: typeof prisma) => {
      const run = await tx.generationRun.create({
        data: {
          windowStart: new Date(windowed.windowStart),
          windowEnd: new Date(windowed.windowEnd),
        },
        select: { id: true },
      });

      for (const prepared of preparedEvents) {
        const createdEvent = await tx.event.create({
          data: {
            generationRunId: run.id,
            title: prepared.title,
            summary: prepared.summary,
            references: prepared.references,
          },
          select: { id: true },
        });

        if (prepared.articleIds.length) {
          await tx.eventArticleLink.createMany({
            data: prepared.articleIds.map((articleId) => ({
              eventId: createdEvent.id,
              articleId,
            })),
            skipDuplicates: true,
          });
        }

        output.push({
          event_key: prepared.event_key,
          title: prepared.title,
          summary: prepared.summary,
          articles: prepared.articles,
        });
      }

      return run;
    });

    stage = "release-run-lock";
    await prisma.runLock.delete({ where: { id: lockId } });
    stage = "disconnect";
    await prisma.$disconnect();
    console.log(`[run] wrote ${output.length} events to database`);
  } catch (error) {
    console.error(`[run] failed at stage=${stage}`, error);
    try {
      await prisma.runLock.delete({ where: { id: lockId } });
    } catch (cleanupError) {
      console.warn("[run] failed to release lock", cleanupError);
    }
    await prisma.$disconnect();
    throw error;
  }
}
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});

function pickArticleOutput(article: NormalizedArticle & { ref: string }) {
  return {
    ref: article.ref,
    source: article.source,
    title: article.title,
    link: article.link,
    publishedAt: article.publishedAt?.toISOString() ?? null,
  };
}

function pickGroupingContext(article: NormalizedArticle): string {
  return article.summary || article.title;
}

function pickSummaryContext(
  article: NormalizedArticle,
  maxLength = 1200
): string {
  const value = article.content || article.summary || article.title;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (attempt > 0) {
        console.warn(`[llm] retry ${label} attempt=${attempt}/${retries}`);
      }
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`LLM failed: ${label}`);
}

function parseEvents(raw: string): EventsResponse {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const jsonText =
    start >= 0 && end >= 0 ? trimmed.slice(start, end + 1) : trimmed;
  const parsed = JSON.parse(jsonText) as EventsResponse;
  if (!parsed.events || !Array.isArray(parsed.events)) {
    throw new Error("Invalid events JSON from LLM");
  }
  return parsed;
}

function parseWindowMinutes(value: string | undefined): number {
  const parsed = Number(value ?? "480");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 480;
  }
  return Math.floor(parsed);
}

function filterByWindow(
  articles: NormalizedArticle[],
  windowMinutes: number
): { articles: NormalizedArticle[]; windowStart: number; windowEnd: number } {
  const now = Date.now();
  const windowStart = now - windowMinutes * 60 * 1000;
  const filtered = articles.filter((article) => {
    if (!article.publishedAt) return false;
    const time = article.publishedAt.getTime();
    return time >= windowStart && time <= now;
  });
  console.log(
    `[run] window start=${new Date(windowStart).toISOString()} end=${new Date(now).toISOString()}`
  );
  return { articles: filtered, windowStart, windowEnd: now };
}
