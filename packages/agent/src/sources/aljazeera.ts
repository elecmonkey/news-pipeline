import type { NormalizedArticle, RssSource } from "../core/types";
import { pickPublishedAt, stripHtml, textValue } from "../core/normalize";
import type { RssItem } from "../core/types";

function mapItem(item: RssItem): NormalizedArticle | null {
  const title = textValue(item.title);
  const link = textValue(item.link);
  if (!title || !link) return null;

  const summary = stripHtml(textValue(item.description));
  const publishedAt = pickPublishedAt(item, ["pubDate", "dc:date", "updated"]);
  const guid = textValue(item.guid);
  const categories = [textValue(item.category)].filter(Boolean);

  return {
    source: "aljazeera",
    title,
    link,
    summary,
    publishedAt,
    guid: guid || undefined,
    categories: categories.length ? categories : undefined,
  };
}

export const aljazeeraSource: RssSource = {
  id: "aljazeera",
  url: "https://www.aljazeera.com/xml/rss/all.xml",
  supportsReadability: true,
  mapItem,
};
