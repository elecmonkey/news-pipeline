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

  const records: StoredArticle[] = [];
  for (const article of articles) {
    const record = await prisma.article.upsert({
      where: { link: article.link },
      create: {
        source: article.source,
        title: article.title,
        content: article.content || article.summary || article.title,
        link: article.link,
        publishedAt: article.publishedAt ?? undefined,
      },
      update: {
        title: article.title,
        content: article.content || article.summary || article.title,
        publishedAt: article.publishedAt ?? undefined,
      },
      select: {
        id: true,
        link: true,
        title: true,
        source: true,
      },
    });
    records.push(record);
  }

  return records;
}
