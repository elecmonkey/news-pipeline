import type { NormalizedArticle } from "../core/types";
import { fetchRss } from "../rss/fetch";
import { parseRssItems } from "../rss/parse";
import { sources } from "../sources";

export async function ingestSources(): Promise<NormalizedArticle[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      const startedAt = Date.now();
      try {
        console.log(`[ingest] fetching ${source.id} ${source.url}`);
        const xml = await fetchRss(source.url);
        const items = parseRssItems(xml);
        const mapped = items
          .map(source.mapItem)
          .filter((item): item is NormalizedArticle => item !== null);

        console.log(
          `[ingest] ${source.id} items=${items.length} mapped=${mapped.length} ${Date.now() - startedAt}ms`
        );
        return mapped;
      } catch (error) {
        console.error(
          `[ingest] ${source.id} failed after ${Date.now() - startedAt}ms`,
          error
        );
        return [];
      }
    })
  );

  return results.flat();
}
