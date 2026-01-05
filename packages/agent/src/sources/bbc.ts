import type { NormalizedArticle, RssItem, RssSource } from "../core/types";
import { asArray, pickPublishedAt, stripHtml, textValue } from "../core/normalize";

function mediaThumbnailUrl(item: RssItem): string | undefined {
  const thumb = item["media:thumbnail"] as Record<string, unknown> | undefined;
  const url = thumb?.url;
  return typeof url === "string" ? url : undefined;
}

function mapItem(item: RssItem): NormalizedArticle | null {
  const title = textValue(item.title);
  const link = textValue(item.link);
  if (!title || !link) return null;

  const summary = stripHtml(textValue(item.description));
  const publishedAt = pickPublishedAt(item, ["pubDate", "dc:date", "updated"]);
  const guid = textValue(item.guid);

  return {
    source: "bbc",
    title,
    link,
    summary,
    publishedAt,
    guid: guid || undefined,
    imageUrl: mediaThumbnailUrl(item),
    categories: asArray(item.category).map(textValue).filter(Boolean),
  };
}

export const bbcSource: RssSource = {
  id: "bbc",
  url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  supportsReadability: true,
  mapItem,
};
