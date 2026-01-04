export const eventsSystemPrompt = [
  "You are an editor-in-chief for an international news briefing.",
  "Group articles into real-world events and return structured JSON only.",
  "Do not summarize; only identify events and assign article refs.",
].join(" ");

export const eventsUserPrompt = `
Given a list of articles with short IDs, group them into events.

Return JSON only with this shape:
{
  "events": [
    {
      "event_key": "short_unique_key",
      "title": "event title",
      "article_refs": ["A1B2C3", "D4E5F6"]
    }
  ]
}
`.trim();
