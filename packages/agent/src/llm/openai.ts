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

function loadBackupConfig(primaryConfig: OpenAIConfig): OpenAIConfig | null {
  const baseUrl = process.env.OPENAI_BASE_URL_BACKUP?.trim();
  const apiKey = process.env.OPENAI_API_KEY_BACKUP?.trim();
  const model = process.env.OPENAI_MODEL_BACKUP?.trim();

  // If none of the backup variables are set, return null
  if (!baseUrl && !apiKey && !model) {
    return null;
  }

  // Fallback to primary config if backup variable is missing
  return {
    baseUrl: baseUrl || primaryConfig.baseUrl,
    apiKey: apiKey || primaryConfig.apiKey,
    model: model || primaryConfig.model,
  };
}

async function executeRequest(
  input: { system?: string; user: string },
  config: OpenAIConfig,
  maxRetries: number
): Promise<string> {
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout per attempt

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          const errorMsg = `OpenAI error ${response.status}: ${message}`;

          // Stop retrying on client errors (except 429 Too Many Requests)
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429
          ) {
            bail(new Error(errorMsg));
            return "";
          }

          throw new Error(errorMsg);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        return payload.choices?.[0]?.message?.content?.trim() || "";
      } finally {
        clearTimeout(timeout);
      }
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

export async function createChatCompletion(
  input: { system?: string; user: string },
  config: OpenAIConfig
): Promise<string> {
  const maxRetries = Number(process.env.LLM_RETRIES ?? "3");

  try {
    return await executeRequest(input, config, maxRetries);
  } catch (error) {
    const backupConfig = loadBackupConfig(config);
    if (backupConfig) {
      // eslint-disable-next-line no-console
      console.warn(
        "[llm] primary configuration failed exhausted all retries, switching to backup configuration...",
        error
      );
      try {
        return await executeRequest(input, backupConfig, maxRetries);
      } catch (backupError) {
        throw new Error(
          `Backup configuration also failed: ${
            backupError instanceof Error ? backupError.message : String(backupError)
          }`
        );
      }
    }
    throw error;
  }
}
