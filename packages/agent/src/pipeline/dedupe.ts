import type { NormalizedArticle } from "../core/types";

export function dedupeByLink(
  articles: NormalizedArticle[]
): NormalizedArticle[] {
  const seen = new Set<string>();
  const output: NormalizedArticle[] = [];
  for (const article of articles) {
    if (seen.has(article.link)) continue;
    seen.add(article.link);
    output.push(article);
  }
  return output;
}
