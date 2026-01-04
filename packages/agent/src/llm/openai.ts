type OpenAIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function loadOpenAIConfig(): OpenAIConfig {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || "";
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const model = process.env.OPENAI_MODEL?.trim() || "";

  if (!baseUrl || !apiKey || !model) {
    throw new Error("Missing OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL");
  }

  return { baseUrl, apiKey, model };
}

export async function createChatCompletion(
  input: { system?: string; user: string },
  config: OpenAIConfig
): Promise<string> {
  const maxRetries = Number(process.env.LLM_RETRIES ?? "2");
  const url = `${config.baseUrl}/chat/completions`;
  const body = JSON.stringify({
    model: config.model,
    messages: [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.user },
    ],
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`OpenAI error ${response.status}: ${message}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return payload.choices?.[0]?.message?.content?.trim() || "";
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        const delayMs = 500 * attempt;
        // eslint-disable-next-line no-console
        console.warn(
          `[llm] request failed attempt=${attempt}/${maxRetries + 1}, retrying in ${delayMs}ms`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI request failed");
}
