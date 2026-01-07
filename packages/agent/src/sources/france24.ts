import type { NormalizedArticle, RssItem, RssSource } from "../core/types";
import { asArray, pickPublishedAt, stripHtml, textValue } from "../core/normalize";

function mediaThumbnailUrl(item: RssItem): string | undefined {
  const media = item["media:thumbnail"] as Record<string, unknown> | undefined;
  const url = media?.url;
  return typeof url === "string" ? url : undefined;
}

function enclosureUrl(item: RssItem): string | undefined {
  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const url = enclosure?.url;
  return typeof url === "string" ? url : undefined;
}

function mapItem(item: RssItem): NormalizedArticle | null {
  const title = textValue(item.title);
  const link = textValue(item.link);
  if (!title || !link) return null;

  const summary = stripHtml(textValue(item.description));
  const publishedAt = pickPublishedAt(item, ["pubDate", "dc:date", "updated"]);
  const guid = textValue(item.guid);
  const authors = asArray(item["dc:creator"]).map(textValue).filter(Boolean);

  return {
    source: "france24",
    title,
    link,
    summary,
    publishedAt,
    guid: guid || undefined,
    imageUrl: mediaThumbnailUrl(item) || enclosureUrl(item),
    authors: authors.length ? authors : undefined,
    categories: asArray(item.category).map(textValue).filter(Boolean),
  };
}

export const france24Source: RssSource = {
  id: "france24",
  url: "https://www.france24.com/en/rss",
  supportsReadability: true,
  readability: {
    useCustomHeaders: true,
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1",
    },
  },
  mapItem,
};
