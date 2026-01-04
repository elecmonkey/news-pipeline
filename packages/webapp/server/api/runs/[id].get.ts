import { prisma } from "@news-pipeline/database";

type ReferenceItem = {
  source: string;
  title: string;
  link: string;
  publishedAt?: string | null;
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing run id" });
  }

  type ArticleLinkRow = {
    article: {
      title: string;
      link: string;
      source: string;
      publishedAt: Date | null;
    };
  };

  type EventRow = {
    id: string;
    title: string;
    summary: string;
    references: unknown;
    createdAt: Date;
    articles: ArticleLinkRow[];
  };

  type RunRow = {
    id: string;
    windowStart: Date;
    windowEnd: Date;
    createdAt: Date;
    events: EventRow[];
  };

  const run = (await prisma.generationRun.findUnique({
    where: { id },
    select: {
      id: true,
      windowStart: true,
      windowEnd: true,
      createdAt: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          summary: true,
          references: true,
          createdAt: true,
          articles: {
            select: {
              article: {
                select: {
                  title: true,
                  link: true,
                  source: true,
                  publishedAt: true,
                },
              },
            },
          },
        },
      },
    },
  })) as RunRow | null;

  if (!run) {
    throw createError({ statusCode: 404, statusMessage: "Run not found" });
  }

  const events = run.events.map((eventItem) => {
    const refs = Array.isArray(eventItem.references)
      ? (eventItem.references as ReferenceItem[]).map((reference) => ({
          ...reference,
          publishedAt: reference.publishedAt ?? null,
        }))
      : eventItem.articles.map((link) => ({
          source: link.article.source,
          title: link.article.title,
          link: link.article.link,
          publishedAt: link.article.publishedAt?.toISOString() ?? null,
        }));

    return {
      id: eventItem.id,
      title: eventItem.title,
      summary: eventItem.summary,
      createdAt: eventItem.createdAt,
      references: refs,
    };
  });

  return {
    id: run.id,
    windowStart: run.windowStart,
    windowEnd: run.windowEnd,
    createdAt: run.createdAt,
    events,
  };
});
