import retry from "async-retry";

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
  const maxRetries = Number(process.env.LLM_RETRIES ?? "3");
  const url = `${config.baseUrl}/chat/completions`;
  const body = JSON.stringify({
    model: config.model,
    messages: [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.user },
    ],
  });

  return retry(
    async (bail) => {
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
        const errorMsg = `OpenAI error ${response.status}: ${message}`;

        // Stop retrying on client errors (except 429 Too Many Requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          bail(new Error(errorMsg));
          return "";
        }

        throw new Error(errorMsg);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return payload.choices?.[0]?.message?.content?.trim() || "";
    },
    {
      retries: maxRetries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 20000,
      onRetry: (error, attempt) => {
        const msg = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.warn(
          `[llm] request failed attempt=${attempt}/${maxRetries}, retrying...`,
          msg
        );
      },
    }
  );
}
