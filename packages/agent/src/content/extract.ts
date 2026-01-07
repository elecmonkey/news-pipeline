import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MIN_TEXT = 200;

type ExtractedArticle = {
  text: string;
  title?: string;
};

type FetchArticleOptions = {
  headers?: Record<string, string>;
};

const DEFAULT_HEADERS = {
  accept: "text/html,application/xhtml+xml",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
};

export async function fetchArticleText(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options?: FetchArticleOptions
): Promise<ExtractedArticle | null> {
  return fetchArticleTextDebug(url, timeoutMs, options);
}

export async function fetchArticleTextDebug(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options?: FetchArticleOptions
): Promise<ExtractedArticle | null> {
  const debug = process.env.DEBUG_READABILITY === "1";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = options?.headers
    ? { ...DEFAULT_HEADERS, ...options.headers }
    : DEFAULT_HEADERS;
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (debug) {
        console.warn(`[readability] status=${response.status} url=${url}`);
      }
      return null;
    }
    const html = await response.text();
    if (debug) {
      console.log(`[readability] fetched url=${url} bytes=${html.length}`);
    }
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => {
      if (error.message.includes("Could not parse CSS stylesheet")) return;
      if (debug) {
        console.warn("[content] jsdom", error.message);
      }
    });
    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();
    if (!parsed?.textContent) {
      if (debug) {
        console.warn(`[readability] empty parsed text url=${url}`);
      }
      return null;
    }
    const text = normalizeText(parsed.textContent);
    if (text.length < DEFAULT_MIN_TEXT) {
      if (debug) {
        console.warn(
          `[readability] too short length=${text.length} url=${url}`
        );
      }
      return null;
    }
    if (debug) {
      console.log(
        `[readability] ok length=${text.length} title=${parsed.title || ""}`
      );
    }
    return { text, title: parsed.title || undefined };
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      if (debug) {
        console.warn(`[readability] timeout url=${url}`);
      }
      return null;
    }
    if (debug) {
      console.warn(`[readability] error url=${url}`, error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
