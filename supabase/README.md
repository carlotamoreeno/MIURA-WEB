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
