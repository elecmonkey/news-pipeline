import he from "he";

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function textValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return textValue(value[0]);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"];
    if (typeof record["_text"] === "string") return record["_text"];
    if (typeof record["text"] === "string") return record["text"];
  }
  return "";
}

export function stripHtml(input: string): string {
  const withoutTags = input.replace(/<[^>]*>/g, " ");
  return he.decode(withoutTags).replace(/\s+/g, " ").trim();
}

export function parseDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pickPublishedAt(
  item: Record<string, unknown>,
  keys: string[]
): Date | null {
  for (const key of keys) {
    const value = textValue(item[key]);
    const parsed = parseDate(value);
    if (parsed) return parsed;
  }
  return null;
}
