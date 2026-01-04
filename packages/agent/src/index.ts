import { prisma } from "@news-pipeline/database";
import { dedupeByLink } from "./pipeline/dedupe";
import { ingestSources } from "./pipeline/ingest";
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
  const config = loadOpenAIConfig();
  const localLanguage = process.env.LOCAL_LANGUAGE?.trim() || undefined;
  const summarySystemPrompt = buildSummarySystemPrompt(localLanguage);
  console.log("[run] starting ingest");
  const ingested = await ingestSources();
  const windowMinutes = parseWindowMinutes(process.env.WINDOW_MINUTES);
  const windowed = filterByWindow(ingested, windowMinutes);
  const filtered = windowed.articles;
  const articles = dedupeByLink(filtered);
  console.log(
    `[run] ingest done total=${ingested.length} window=${windowMinutes}m filtered=${filtered.length} unique=${articles.length}`
  );

  await prisma.$connect();
  const storedArticles = await upsertArticles(prisma, articles);
  const storedByLink = new Map(storedArticles.map((item) => [item.link, item]));
  const generationRun = await prisma.generationRun.create({
    data: {
      windowStart: new Date(windowed.windowStart),
      windowEnd: new Date(windowed.windowEnd),
    },
    select: { id: true },
  });

  const withRefs = articles.map((article, index) => ({
    ...article,
    ref: `A${(index + 1).toString(36).toUpperCase().padStart(3, "0")}`,
  }));

  console.log(`[run] building event input articles=${withRefs.length}`);
  const eventInput = withRefs
    .map((article) =>
      [
        `[${article.ref}] ${article.title}`,
        article.summary || article.title,
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
          `Summary: ${article.summary || article.title}`,
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
    index += 1;
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
