import { XMLParser } from "fast-xml-parser";
import type { RssItem } from "../core/types";
import { asArray } from "../core/normalize";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true,
});

export function parseRssItems(xml: string): RssItem[] {
  const data = parser.parse(xml);
  const channel = data?.rss?.channel;
  if (!channel) return [];
  const items = asArray<RssItem>(channel.item as RssItem | RssItem[] | undefined);
  return items;
}
