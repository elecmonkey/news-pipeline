export async function fetchRss(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "news-pipeline/1.0 (+https://github.com)",
        accept: "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${url} ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
