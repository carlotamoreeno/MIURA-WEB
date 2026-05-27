# Supabase RAG setup

This directory contains the database setup for the controlled MIURA RAG corpus.
It stores knowledge documents, chunks, embeddings, and citation metadata only.
User evaluations remain local to the browser for MVP 0.1.

## Apply migrations

Use the project `DIRECT_URL` from `.env` so the SQL runs against the Supabase
Postgres database without requiring local Docker or system `psql`.

```bash
set -a
source .env
set +a
npx supabase db push --db-url "$DIRECT_URL" --dry-run
npx supabase db push --db-url "$DIRECT_URL" --yes
```

## Objects created by TASK-017

- `extensions.vector` is enabled for pgvector support.
- `public.knowledge_documents` stores controlled corpus source records.
- `public.knowledge_chunks` stores chunk text, citation metadata, and
  `extensions.vector(1536)` embeddings for `text-embedding-3-small`.
- `public.match_knowledge_chunks(...)` performs read-only cosine vector search
  and returns citation-ready metadata for later RAG tasks.

## Permissions model

Row Level Security is enabled on both corpus tables. Direct table access and RPC
execution are revoked from `anon`, `authenticated`, and `public`; only
`service_role` receives corpus table grants and RPC execute permission.

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only when later ingestion or chat
tasks use the Supabase API. Do not expose it as `NEXT_PUBLIC_*`.

## Validation

After migration, validate:

```bash
npx supabase migration list --db-url "$DIRECT_URL"
npx supabase db query --db-url "$DIRECT_URL" --output json "<SQL verification query>"
```

TASK-018 owns corpus ingestion. It should read `knowledge/sources.json`, verify
`knowledge/checksums.sha256`, and upsert only the controlled Markdown corpus.

## Ingest the controlled corpus

TASK-018 adds a reproducible ingestion CLI for the controlled Markdown corpus in
`knowledge/`. The current MVP corpus prepares 7 knowledge documents and 10
chunks.

Required server-side variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or server-side equivalent `SUPABASE_SECRET_KEY`
- Optional: `OPENAI_EMBEDDING_MODEL`, defaults to `text-embedding-3-small`
- Optional: `MIURA_EMBEDDING_DIMENSIONS`, defaults to `1536`
- Optional for retrieval: `MIURA_RAG_TOP_K`, defaults to `5`
- Optional for retrieval: `MIURA_RAG_MATCH_THRESHOLD`, defaults to `0.25`
- Optional for chat: `OPENAI_CHAT_MODEL`, defaults to `gpt-5.4-mini`
- Optional for chat: `MIURA_CHAT_MAX_OUTPUT_TOKENS`, defaults to `900`
- Optional for chat cost control: `MIURA_CHAT_RATE_LIMIT_ENABLED`, defaults
  to `true`
- Optional for chat cost control: `MIURA_CHAT_RATE_LIMIT_MAX`, defaults to
  `10`
- Optional for chat cost control: `MIURA_CHAT_RATE_LIMIT_WINDOW_MS`, defaults
  to `60000`
- Optional for API origin control: `MIURA_ALLOWED_ORIGINS`, comma-separated
  http(s) origins allowed in addition to the app's own origin
- Optional for chat: `ENABLE_RAG_CHAT`, defaults to enabled unless set to
  `false`, `0`, `off`, or `no`
- Optional for chat: `ENABLE_EVALUATION_CONTEXT_IN_CHAT`, defaults to enabled

Validate without external writes:

```bash
npm run rag:ingest:dry-run
```

Run ingestion:

```bash
npm run rag:ingest
```

The script verifies `knowledge/checksums.sha256`, rejects unexpected corpus
files, deduplicates manifest paths, generates embeddings with
`text-embedding-3-small`, upserts `knowledge_documents`, replaces chunks for the
ingested document IDs, and inserts deterministic chunk IDs.

Expected output for the current corpus:

```text
Prepared 7 documents, 10 chunks
Remote row count: documents=7, chunks=10, distinctChunks=10
```

Validation SQL for the current ingested corpus:

```sql
with ingested_documents as (
  select unnest(array[
    'kanban-guide-miura-notes',
    'miura-alcance-disclaimers',
    'miura-pilares-metricas-rubricas',
    'miura-formulas-cobertura-escenarios',
    'miura-recomendaciones-scrum-kanban',
    'miura-tfg-seleccion-metodologica',
    'scrum-guide-2020-miura-notes'
  ]) as id
),
document_rows as (
  select kd.*
  from public.knowledge_documents kd
  join ingested_documents ids on ids.id = kd.id
),
chunk_rows as (
  select kc.*
  from public.knowledge_chunks kc
  join ingested_documents ids on ids.id = kc.document_id
)
select
  (select count(*) from document_rows) as document_count,
  (select count(*) from chunk_rows) as chunk_count,
  (select count(distinct id) from chunk_rows) as distinct_chunk_count,
  (select count(*) from chunk_rows where document_id is null) as missing_document_id,
  (select count(*) from chunk_rows where section is null or btrim(section) = '') as missing_section,
  (select count(*) from chunk_rows where content_hash is null or btrim(content_hash) = '') as missing_content_hash,
  (select count(*) from chunk_rows where embedding is null) as missing_embedding,
  (select count(*) from document_rows where metadata ? 'sourceIds') as documents_with_source_ids;
```

Do not ingest original TFG binaries, images, CSV exports, questionnaire
screenshots, templates, rubrics, or old versions unless a later task explicitly
changes the corpus policy.

## Retrieve context with citations

TASK-019 adds a server-side retriever in `lib/miura/rag/retrieve.ts`. It embeds
the query with LangChain `OpenAIEmbeddings`, calls the accepted
`match_knowledge_chunks` RPC, applies `topK` plus similarity threshold, and
returns citation-ready metadata for later chat/API tasks.

The current MVP corpus was calibrated with:

```bash
RUN_MIURA_RAG_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-rag-retrieve.integration.test.ts
```

Expected behavior:

- `que es PDI` returns at least one MIURA citation with title, section and
  snippet.
- `quien gano el mundial de futbol de 2010` returns insufficient sources.

The previous threshold `0.72` is too strict for the current small corpus and
returns no sources for accepted MIURA queries. Keep retrieval server-side and do
not expose Supabase service keys or OpenAI keys with a `NEXT_PUBLIC_` prefix.

## Serve `/api/chat`

TASK-020 adds a Next.js App Router route at `app/api/chat/route.ts`. The route
validates AI SDK `DefaultChatTransport`-compatible payloads with Zod, rejects
client-provided system messages and non-text user parts, runs retrieval before
generation, streams answers with Vercel AI SDK `streamText`, and sends citation
metadata as a `data-citations` stream part.

The endpoint fails closed:

- malformed or unsupported payloads return HTTP 400;
- disallowed browser origins return HTTP 403 and receive no wildcard CORS
  headers;
- repeated chat requests return HTTP 429 after the configured rate limit and
  skip retrieval/LLM calls;
- disabled or unavailable RAG configuration returns HTTP 503;
- no sufficient retrieval sources streams a controlled no-sources answer without
  calling the LLM;
- provider streaming failures emit a controlled Spanish error and log only
  sanitized error category/name.

Security checklist for the MVP chat/API surface:

- `/api/chat` and `/api/analytics` accept exact same-origin browser calls and
  optional exact origins from `MIURA_ALLOWED_ORIGINS`; they do not emit
  `Access-Control-Allow-Origin: *`.
- `/api/chat` has an in-memory per-instance rate limit for MVP cost control.
  It is suitable for the demo but not a distributed abuse-control system.
- Evaluation context sent to chat is a minimal DTO; raw `metricValues`,
  evidence notes, local export JSON, hourly cost, and monthly capacity are not
  accepted by the chat contract.
- Assistant Markdown is rendered with `react-markdown`, `remark-gfm`,
  `rehype-sanitize`, and a component-level http(s)-only link allowlist.
- Corpus tables keep RLS enabled, revoke direct access from `anon`,
  `authenticated`, and `public`, and grant corpus table/RPC access only to
  `service_role` for server-side ingestion/retrieval.

Run the local API/unit coverage without external provider calls:

```bash
npm run test -- tests/miura-chat-api.test.ts
```

Run the gated end-to-end API validation against OpenAI and Supabase:

```bash
RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts
```

Expected behavior:

- `¿Qué es PDI en MIURA?` returns a streaming response with citation metadata.
- `¿Quién ganó el mundial de fútbol de 2010?` returns the controlled no-sources
  response and no citations.
