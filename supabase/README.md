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
