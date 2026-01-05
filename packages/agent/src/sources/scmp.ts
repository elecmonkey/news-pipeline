import type { NormalizedArticle, RssItem, RssSource } from "../core/types";
import { asArray, pickPublishedAt, stripHtml, textValue } from "../core/normalize";

function mediaContentUrl(item: RssItem): string | undefined {
  const media = item["media:content"] as
    | Record<string, unknown>
    | Array<Record<string, unknown>>
    | undefined;
  const first = Array.isArray(media) ? media[0] : media;
  const url = first?.url;
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
  const authors = [
    ...asArray(item["dc:creator"]).map(textValue),
    textValue(item.author),
  ].filter(Boolean);

  return {
    source: "scmp",
    title,
    link,
    summary,
    publishedAt,
    guid: guid || undefined,
    imageUrl: mediaContentUrl(item) || enclosureUrl(item),
    authors: authors.length ? authors : undefined,
    categories: asArray(item.category).map(textValue).filter(Boolean),
  };
}

export const scmpSource: RssSource = {
  id: "scmp",
  url: "https://www.scmp.com/rss/91/feed/",
  supportsReadability: true,
  mapItem,
};
