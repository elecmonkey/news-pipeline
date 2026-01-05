import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MIN_TEXT = 200;

type ExtractedArticle = {
  text: string;
  title?: string;
};

export async function fetchArticleText(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ExtractedArticle | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();
    if (!parsed?.textContent) return null;
    const text = normalizeText(parsed.textContent);
    if (text.length < DEFAULT_MIN_TEXT) return null;
    return { text, title: parsed.title || undefined };
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      return null;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
