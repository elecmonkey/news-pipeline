export async function fetchRss(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "news-pipeline/1.0 (+https://github.com)",
      accept: "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${url} ${response.status}`);
  }

  return await response.text();
}
