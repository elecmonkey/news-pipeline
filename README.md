# News Pipeline

Personal automated news aggregation and summarization pipeline with:
- An agent that ingests RSS, extracts article content, clusters events, and writes summaries.
- A webapp that displays briefing runs, events, and source articles.
- A Prisma/Postgres database for storage.

## Repo layout
- `packages/agent` — RSS ingestion + LLM summarization pipeline (Bun runtime).
- `packages/webapp` — Nuxt/Vuetify web UI.
- `packages/database` — Prisma schema + generated client.

## Prerequisites
- Node.js (for pnpm + webapp tooling)
- pnpm
- Bun (for the agent)
- PostgreSQL

## Setup
1) Install dependencies:
   ```bash
   pnpm install
   ```

2) Create `.env` from the example and fill in values:
   ```bash
   cp .env.example .env
   ```

3) Initialize the database:
   ```bash
   pnpm --filter @news-pipeline/database db:push
   pnpm --filter @news-pipeline/database build
   ```

## Run the agent
```bash
pnpm --filter @news-pipeline/agent dev
```

The agent will:
- Fetch RSS feeds from configured sources.
- Extract article content (Readability when supported, RSS summary fallback otherwise).
- Cluster and summarize events with the configured LLM.
- Store runs, events, and articles in the database.

## Run the webapp
```bash
pnpm --filter @news-pipeline/webapp dev
```

Open the local URL printed by Nuxt.

## Deployment

1) Build the database package before building the webapp:
   ```bash
   pnpm --filter @news-pipeline/database build
   ```

2) Deploy the Nuxt webapp using your preferred Nuxt hosting target.

## Scheduling the agent
- This repo includes a `workflow_dispatch` workflow. You can trigger it from your own scheduler
  (or trigger locally with your scheduler of choice) to run the agent.
- Recommended command:
  ```bash
  bun packages/agent/src/index.ts
  ```
- Avoid using GitHub Actions scheduled workflows for this job due to unreliable timing delays.

## Environment variables
See `.env.example` for all options. Common ones:
- `DATABASE_URL` — Postgres connection string.
- `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY` — LLM provider settings.
- `WINDOW_MINUTES` — ingest window size.
- `LOCAL_LANGUAGE` — summarization language hint.
- `DISPLAY_TZ` — UI time zone (IANA name) used for formatting.
- `DISPLAY_TZ_LABEL` — optional label appended in parentheses; leave empty/undefined to omit.
- `CONTENT_FETCH_CONCURRENCY` — content extraction concurrency.

## Notes
- Sources declare whether Readability extraction is supported; e.g. NYT uses RSS summary fallback.
- Source content is shown in a modal in the webapp with a link to the original article.
