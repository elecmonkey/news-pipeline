import type { NormalizedArticle } from "../core/types";
import { fetchArticleText } from "../content/extract";

const DEFAULT_CONCURRENCY = 4;

export async function enrichArticles(
  articles: NormalizedArticle[],
  concurrency = DEFAULT_CONCURRENCY
): Promise<NormalizedArticle[]> {
  if (!articles.length) return [];
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<NormalizedArticle>(articles.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(limit, articles.length) },
    async () => {
      while (true) {
        const index = cursor++;
        if (index >= articles.length) break;
        const article = articles[index];
        if (article.content) {
          results[index] = article;
          continue;
        }
        const extracted = await fetchArticleText(article.link);
        results[index] = {
          ...article,
          // If extraction fails (e.g. paywalled/JS-rendered pages), fall back to RSS summary.
          content: extracted?.text ?? article.summary ?? article.content,
        };
      }
    }
  );

  await Promise.all(workers);
  return results;
}
