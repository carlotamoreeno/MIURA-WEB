# Supabase RAG schema

Este directorio contiene la configuracion de base de datos para el corpus RAG
controlado de MIURA. Supabase almacena documentos, chunks, embeddings y
metadatos de citas. Las evaluaciones de usuario siguen viviendo en el navegador
para el MVP 0.1.

Para setup operativo, migraciones, ingesta y validacion end-to-end, usa:

- [../docs/rag-ingestion.md](../docs/rag-ingestion.md)
- [../docs/runbook.md](../docs/runbook.md)

## Migraciones

Aplicacion contra Supabase remoto:

```bash
set -a
source .env
set +a
npx supabase db push --db-url "$DIRECT_URL" --dry-run
npx supabase db push --db-url "$DIRECT_URL" --yes
```

Validacion de historial:

```bash
npx supabase migration list --db-url "$DIRECT_URL"
```

## Objetos creados por TASK-017

- `extensions.vector` para pgvector.
- `public.knowledge_documents` para fuentes del corpus controlado.
- `public.knowledge_chunks` para texto, metadatos de cita y embeddings
  `extensions.vector(1536)`.
- Indices btree/GIN/HNSW para filtrado y busqueda vectorial.
- RPC `public.match_knowledge_chunks(query_embedding, match_count, filter,
match_threshold)`.

## Modelo de permisos

RLS esta activo en `knowledge_documents` y `knowledge_chunks`.

Acceso esperado:

- `anon`, `authenticated` y `public`: sin acceso directo a tablas ni ejecucion
  del RPC.
- `service_role`: select/insert/update/delete sobre tablas del corpus y execute
  sobre `match_knowledge_chunks`.

Usa `SUPABASE_SERVICE_ROLE_KEY` como clave server-side preferida. El MVP acepta
`SUPABASE_SECRET_KEY` como equivalente server-side existente. No expongas ninguna
clave como `NEXT_PUBLIC_*`.

## Validacion rapida

Dry-run local de corpus, sin embeddings ni escrituras:

```bash
npm run rag:ingest:dry-run
```

Retrieval gated contra Supabase/OpenAI:

```bash
RUN_MIURA_RAG_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-rag-retrieve.integration.test.ts
```

Chat gated contra Supabase/OpenAI:

```bash
RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts
```

La ingesta real se documenta en [../docs/rag-ingestion.md](../docs/rag-ingestion.md)
y debe ejecutarse solo con claves reales y aprobacion de coste/escritura.
