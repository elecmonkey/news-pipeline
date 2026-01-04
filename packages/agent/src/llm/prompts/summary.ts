export const summarySystemPrompt = [
  "You are an editor writing a concise event brief for a news digest.",
  "Use only the provided articles as evidence.",
  "Return a single paragraph summary, factual and neutral.",
].join(" ");

export const summaryUserPrompt = `
Write a concise event summary based on the articles below.
Focus on what happened, where, and why it matters.
Avoid speculation and avoid listing sources.
`.trim();
