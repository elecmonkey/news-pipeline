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

async function main() {
  const lockId = "agent";
  const lockNow = new Date();
  const cutoff = new Date(lockNow.getTime() - 10 * 60 * 1000);
  const config = loadOpenAIConfig();
  const localLanguage = process.env.LOCAL_LANGUAGE?.trim() || undefined;
  const summarySystemPrompt = buildSummarySystemPrompt(localLanguage);
  await prisma.$connect();
  let lockAcquired = false;
  try {
    await prisma.runLock.create({
      data: { id: lockId, startedAt: lockNow },
    });
    lockAcquired = true;
  } catch (error) {
    const updated = await prisma.runLock.updateMany({
      where: { id: lockId, startedAt: { lt: cutoff } },
      data: { startedAt: lockNow },
    });
    lockAcquired = updated.count === 1;
  }
  if (!lockAcquired) {
    const existing = await prisma.runLock.findUnique({
      where: { id: lockId },
      select: { startedAt: true },
    });
    if (existing) {
      console.log(
        `[run] skipping: recent start at ${existing.startedAt.toISOString()}`
      );
    } else {
      console.log("[run] skipping: lock contention");
    }
    await prisma.$disconnect();
    return;
  }
  console.log(`[run] lock acquired at ${lockNow.toISOString()}`);
  console.log("[run] starting ingest");
  const ingested = await ingestSources();
  const windowMinutes = parseWindowMinutes(process.env.WINDOW_MINUTES);
  const windowed = filterByWindow(ingested, windowMinutes);
  const filtered = windowed.articles;
  const articles = dedupeByLink(filtered);
  const contentConcurrency = Number(process.env.CONTENT_FETCH_CONCURRENCY ?? "2");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const enriched = await enrichArticles(articles, sourceById, contentConcurrency);
  console.log(
    `[run] ingest done total=${ingested.length} window=${windowMinutes}m filtered=${filtered.length} unique=${articles.length}`
  );

  const storedArticles = await upsertArticles(prisma, enriched);
  const storedByLink = new Map(storedArticles.map((item) => [item.link, item]));
  const generationRun = await prisma.generationRun.create({
    data: {
      windowStart: new Date(windowed.windowStart),
      windowEnd: new Date(windowed.windowEnd),
    },
    select: { id: true },
  });

  const withRefs = enriched.map((article, index) => ({
    ...article,
    ref: `A${(index + 1).toString(36).toUpperCase().padStart(3, "0")}`,
  }));

  console.log(`[run] building event input articles=${withRefs.length}`);
  const eventInput = withRefs
    .map((article) =>
      [
        `[${article.ref}] ${article.title}`,
        pickGroupingContext(article),
        article.link,
      ].join("\n")
    )
    .join("\n\n");

  console.log("[llm] requesting event grouping");
  const eventsStartedAt = Date.now();
  const eventsRaw = await createChatCompletion(
    {
      system: eventsSystemPrompt,
      user: `${eventsUserPrompt}\n\nArticles:\n${eventInput}`,
    },
    config
  );

  const events = parseEvents(eventsRaw);
  console.log(
    `[llm] event grouping done events=${events.events.length} ${Date.now() - eventsStartedAt}ms`
  );

  const output = [];
  let index = 1;
  for (const event of events.events) {
    try {
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

      const summary = await createChatCompletion(
        {
          system: summarySystemPrompt,
          user: `${summaryUserPrompt}\n\n${summaryInput}`,
        },
        config
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

      const createdEvent = await prisma.event.create({
        data: {
          generationRunId: generationRun.id,
          title: event.title,
          summary,
          references,
        },
        select: { id: true },
      });

      const linkRows = eventArticles
        .map((article) => storedByLink.get(article.link))
        .filter(
          (item): item is { id: string; link: string; title: string; source: string } =>
            Boolean(item)
        )
        .map((item) => ({
          eventId: createdEvent.id,
          articleId: item.id,
        }));

      if (linkRows.length) {
        await prisma.eventArticleLink.createMany({
          data: linkRows,
          skipDuplicates: true,
        });
      }

      output.push({
        event_key: event.event_key,
        title: event.title,
        summary,
        articles: eventArticles.map(pickArticleOutput),
      });
    } catch (error) {
      console.error(
        `[run] failed to process event ${event.event_key} "${event.title}"`,
        error
      );
      // Continue to next event instead of crashing entire run
    } finally {
      index += 1;
    }
  }

  await prisma.$disconnect();
  console.log(`[run] wrote ${output.length} events to database`);
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
