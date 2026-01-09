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
- Node.js (for webapp development and build)
- pnpm (for monorepo and package management)
- Bun (for running the agent)
- PostgreSQL

## Setup
1) Install dependencies:
   ```bash
   pnpm i
   ```

2) Create `.env` from the example and fill in values:
   ```bash
   cp .env.example .env
   ```

3) Initialize the database:
   ```bash
   pnpm db:push
   ```

## Run the agent
```bash
pnpm agent
```

The agent will:
- Fetch RSS feeds from configured sources.
- Extract article content (Readability when supported, RSS summary fallback otherwise).
- Cluster and summarize events with the configured LLM.
- Store runs, events, and articles in the database.

## Run the webapp
```bash
pnpm dev
```

Open the local URL printed by Nuxt.

## Scheduling the agent
- This repo includes a `workflow_dispatch` workflow. You can trigger it from your own scheduler
  (or trigger locally with your scheduler of choice) to run the agent.
- Recommended command:
  ```bash
  bun agent
  ```
- Avoid using GitHub Actions scheduled workflows for this job due to unreliable timing delays.

## Database maintenance
- Do not run these commands while the agent is running.
- Delete a report (generationRun + events + links):
  ```bash
  pnpm -C packages/database db:delete-report <runId>
  ```
- Dry-run orphan event cleanup (no deletion):
  ```bash
  pnpm -C packages/database db:cleanup-orphan-events
  ```
- Delete orphan events (requires confirmation):
  ```bash
  pnpm -C packages/database db:cleanup-orphan-events -- --confirm
  ```
- Dry-run orphan article cleanup (no deletion):
  ```bash
  pnpm -C packages/database db:cleanup-orphan-articles
  ```
- Delete orphan articles (requires confirmation):
  ```bash
  pnpm -C packages/database db:cleanup-orphan-articles -- --confirm
  ```

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

## Contributing
Issues and PRs are welcome. Please keep changes focused and include a clear description of the behavior change.

## License
MIT. See [LICENSE](./LICENSE).
