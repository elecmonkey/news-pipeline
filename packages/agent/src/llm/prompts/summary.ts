export function buildSummarySystemPrompt(localLanguage?: string): string {
  const base = [
    "You are an editor writing a concise event brief for a news digest.",
    "Use only the provided articles as evidence.",
    "Return a single paragraph summary, factual and neutral.",
  ];

  if (!localLanguage) {
    return base.join(" ");
  }

  return [
    ...base.slice(0, 2),
    `Return two paragraphs: first in English, then a ${localLanguage} translation.`,
    "The translation must correspond line-by-line to the English paragraph.",
    "Keep tone factual and neutral.",
  ].join(" ");
}

export const summaryUserPrompt = `
Write a concise event summary based on the articles below.
Focus on what happened, where, and why it matters.
Avoid speculation and avoid listing sources.
`.trim();
