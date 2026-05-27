# RAG e ingesta del corpus MIURA

Esta guia cubre la preparacion de Supabase, migraciones, corpus controlado,
checksums, ingesta y validacion del RAG MVP. La app no guarda evaluaciones de
usuario en Supabase; solo guarda documentos, chunks, embeddings y metadatos de
citas del corpus.

## Prerrequisitos

- Dependencias instaladas con `npm ci`.
- `.env` creado desde `.env.example`.
- Proyecto Supabase accesible.
- `DIRECT_URL` con conexion Postgres directa para migraciones.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` preferida, o `SUPABASE_SECRET_KEY` como
  equivalente server-side aceptado por el MVP.
- `OPENAI_API_KEY`.

No expongas claves con `NEXT_PUBLIC_*`. La clave service-role solo debe usarse
en scripts server-side o rutas server-side.

## Migraciones Supabase

Carga `.env` y aplica migraciones contra la base remota:

```bash
set -a
source .env
set +a
npx supabase db push --db-url "$DIRECT_URL" --dry-run
npx supabase db push --db-url "$DIRECT_URL" --yes
```

Valida historial de migraciones:

```bash
npx supabase migration list --db-url "$DIRECT_URL"
```

El esquema aceptado crea:

- extension `extensions.vector`;
- `public.knowledge_documents`;
- `public.knowledge_chunks` con `extensions.vector(1536)`;
- RPC `public.match_knowledge_chunks(...)`;
- RLS activo y grants solo para `service_role`.

## Corpus controlado

El manifiesto vive en `knowledge/sources.json`; los checksums en
`knowledge/checksums.sha256`.

Politica del MVP:

- Ingerir solo Markdown controlado de `knowledge/`.
- Mantener el extracto TFG curado en
  `knowledge/miura/tfg/tfg-miura-seleccion.md`.
- No ingerir DOCX/PDF originales, imagenes, logos, CSV, pantallazos de
  cuestionarios, plantillas, rubricas externas ni versiones antiguas.
- Si cambia cualquier archivo ingerible, actualizar `knowledge/checksums.sha256`
  de forma intencional y registrar el motivo.
- `knowledge/rag-eval.md` queda fuera de ingestion por front matter.

Validacion previa:

```bash
shasum -a 256 -c knowledge/checksums.sha256
npm run rag:ingest:dry-run
```

## Ingesta

Dry-run sin embeddings ni escrituras externas:

```bash
npm run rag:ingest:dry-run
```

Salida esperada para el corpus MVP:

```text
Prepared 7 documents, 10 chunks
Dry-run complete. No embeddings or Supabase writes.
```

Ingesta real:

```bash
npm run rag:ingest
```

La ingesta real:

- valida checksums;
- rechaza archivos inesperados bajo `knowledge/`;
- deduplica rutas compartidas en `sources.json`;
- genera embeddings con `text-embedding-3-small`;
- valida dimensiones `1536`;
- upserta `knowledge_documents`;
- reemplaza chunks de los documentos ingeridos;
- inserta chunks deterministas;
- muestra conteo remoto.

Salida remota esperada:

```text
Remote row count: documents=7, chunks=10, distinctChunks=10.
```

## Validacion SQL opcional

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

## Validacion retrieval y chat

Retrieval real contra OpenAI y Supabase:

```bash
RUN_MIURA_RAG_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-rag-retrieve.integration.test.ts
```

Chat API real:

```bash
RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts
```

Comportamiento esperado:

- `que es PDI` o `Que es PDI en MIURA?` devuelve fuentes MIURA con titulo,
  seccion, snippet y citas.
- `quien gano el mundial de futbol de 2010` devuelve no-sources y cero citas.

El threshold `0.72` es demasiado estricto para el corpus MVP actual. Mantener
`MIURA_RAG_MATCH_THRESHOLD=0.25` salvo recalibracion documentada.

## Variables relevantes

- `OPENAI_API_KEY`: obligatoria para embeddings y chat real.
- `OPENAI_EMBEDDING_MODEL`: por defecto `text-embedding-3-small`.
- `MIURA_EMBEDDING_DIMENSIONS`: `1536`.
- `MIURA_RAG_CHUNK_TARGET_TOKENS`: por defecto `800`.
- `MIURA_RAG_CHUNK_OVERLAP_TOKENS`: por defecto `160`.
- `MIURA_RAG_EMBEDDING_PARALLELISM`: por defecto `2`.
- `MIURA_RAG_TOP_K`: por defecto `5`, maximo efectivo `20`.
- `MIURA_RAG_MATCH_THRESHOLD`: por defecto `0.25`.
- `OPENAI_CHAT_MODEL`: por defecto `gpt-5.4-mini`.
- `MIURA_CHAT_MAX_OUTPUT_TOKENS`: por defecto `900`.
- `ENABLE_RAG_CHAT`: apagar con `false`, `0`, `off` o `no`.
- `ENABLE_EVALUATION_CONTEXT_IN_CHAT`: controla contexto minimo opcional.

## Cuando cambia el corpus

1. Editar solo fuentes Markdown aceptadas.
2. Actualizar `knowledge/sources.json` si se agrega o retira una fuente
   ingerible.
3. Regenerar `knowledge/checksums.sha256`.
4. Ejecutar `npm run rag:ingest:dry-run`.
5. Ejecutar `npm run rag:ingest` solo con aprobacion operativa y claves reales.
6. Ejecutar las pruebas de retrieval/chat gated si hay credenciales.
7. Registrar conteos, queries positivas/negativas y riesgos en `TASKS.md`.
