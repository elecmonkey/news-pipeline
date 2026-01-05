import type { NormalizedArticle, RssItem, RssSource } from "../core/types";
import { asArray, pickPublishedAt, stripHtml, textValue } from "../core/normalize";

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

  return {
    source: "unNews",
    title,
    link,
    summary,
    publishedAt,
    guid: guid || undefined,
    imageUrl: enclosureUrl(item),
    categories: asArray(item.category).map(textValue).filter(Boolean),
  };
}

export const unNewsSource: RssSource = {
  id: "unNews",
  url: "https://news.un.org/feed/subscribe/en/news/region/global/feed/rss.xml",
  supportsReadability: true,
  mapItem,
};
