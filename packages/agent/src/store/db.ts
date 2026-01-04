import type { PrismaClient } from "@news-pipeline/database";
import type { NormalizedArticle } from "../core/types";

type DbClient = InstanceType<typeof PrismaClient>;

export type StoredArticle = {
  id: string;
  link: string;
  title: string;
  source: string;
};

export async function upsertArticles(
  prisma: DbClient,
  articles: NormalizedArticle[]
): Promise<StoredArticle[]> {
  if (!articles.length) return [];

  const records = await prisma.$transaction(
    articles.map((article) =>
      prisma.article.upsert({
        where: { link: article.link },
        create: {
          source: article.source,
          title: article.title,
          content: article.summary || article.title,
          link: article.link,
          publishedAt: article.publishedAt ?? undefined,
        },
        update: {
          title: article.title,
          content: article.summary || article.title,
          publishedAt: article.publishedAt ?? undefined,
        },
        select: {
          id: true,
          link: true,
          title: true,
          source: true,
        },
      })
    )
  );

  return records;
}
