# MIURA Web App

MIURA Web App MVP 0.1 es una demo guiada sin login para explicar y evaluar
deuda tecnica con el framework MIURA. La app usa Next.js App Router, React,
TypeScript strict, Tailwind CSS v4, shadcn/ui, Zod, Supabase pgvector para el
corpus RAG, LangChain.js para retrieval y Vercel AI SDK para chat streaming.

Las evaluaciones de usuario viven en el navegador. Supabase se usa solo para
documentos, chunks, embeddings y citas del corpus RAG.

## Requisitos

- Node.js `>=20.9`; CI y QA aceptados usan Node `24.x`.
- npm `11.10.0`.
- Git.
- Para RAG real: proyecto Supabase con pgvector y `OPENAI_API_KEY`.

Este repositorio usa npm y `package-lock.json`; no cambies de package manager.

## Arranque local

```bash
npm ci
cp .env.example .env
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para una ejecucion local sin chat RAG real, deja vacias las claves de `.env` y
usa las pantallas de evaluacion, scorecard, informe y datos locales. Para probar
chat o reingesta real, completa las variables server-side descritas abajo.

## Variables de entorno

Las variables sensibles deben vivir solo en `.env*`, que esta ignorado por Git.
No uses `NEXT_PUBLIC_*` para claves de Supabase, OpenAI, embeddings, chat ni
analitica interna.

Variables principales:

- `DIRECT_URL`: conexion Postgres directa para migraciones Supabase.
- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: clave server-side preferida para ingesta y
  retrieval.
- `SUPABASE_SECRET_KEY`: equivalente server-side aceptado por el MVP si no se
  usa `SUPABASE_SERVICE_ROLE_KEY`.
- `OPENAI_API_KEY`: clave para embeddings y chat.
- `OPENAI_EMBEDDING_MODEL`: por defecto `text-embedding-3-small`.
- `MIURA_EMBEDDING_DIMENSIONS`: debe ser `1536` para el esquema actual.
- `MIURA_RAG_TOP_K`: por defecto `5`.
- `MIURA_RAG_MATCH_THRESHOLD`: por defecto `0.25`.
- `OPENAI_CHAT_MODEL`: por defecto `gpt-5.4-mini`.
- `MIURA_CHAT_MAX_OUTPUT_TOKENS`: por defecto `900`.
- `MIURA_CHAT_RATE_LIMIT_*` o `CHAT_RATE_LIMIT_*`: control de coste del chat.
- `MIURA_ALLOWED_ORIGINS`: origenes `http(s)` exactos separados por coma, sin
  wildcards.
- `ENABLE_RAG_CHAT`: permite apagar el chat sin bloquear la evaluacion local.
- `ENABLE_EVALUATION_CONTEXT_IN_CHAT`: controla el contexto minimo opcional.
- `ENABLE_ANALYTICS`: por defecto `false`.

`.env.example` contiene la plantilla completa.

## Validacion

Comandos habituales:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Validaciones operativas:

```bash
npm run test:e2e:browsers
npm run perf:lighthouse
npm run audit:critical
npm run rag:ingest:dry-run
```

`npm run build` ejecuta la build Next.js de produccion. Next.js 16 ya no
proporciona `next lint`, por eso `lint`, `format:check` y `typecheck` viven en
scripts separados.

`npm run perf:lighthouse` construye la app, arranca `next start` local y valida
landing y wizard en perfiles movil/default y desktop. Para una preview externa:

```bash
MIURA_LIGHTHOUSE_BASE_URL=https://miura-web.vercel.app npm run perf:lighthouse
```

Estado conocido de auditoria: `npm run audit` puede fallar por el advisory
moderado `postcss <8.5.10` transitivo de `next@16.2.6`. `npm run
audit:critical` debe pasar. No ejecutes `npm audit fix --force` si propone un
downgrade rompedor de Next.js.

## RAG y corpus

El corpus controlado vive en `knowledge/` y se ingiere con:

```bash
npm run rag:ingest:dry-run
npm run rag:ingest
```

La reingesta real genera embeddings y escribe en Supabase. Antes de ejecutarla,
lee [docs/rag-ingestion.md](docs/rag-ingestion.md).

La referencia de esquema Supabase esta en
[supabase/README.md](supabase/README.md).

## Deploy Vercel

El proyecto aceptado esta conectado a Vercel como
`carlotamoreenos-projects/miura-web` y publica
[https://miura-web.vercel.app](https://miura-web.vercel.app).

Configuracion esperada:

```bash
npm ci
npm run build
```

En Vercel Project Settings, el Build Command debe ser `npm run build`. No uses
comandos heredados de Prisma; Prisma no forma parte del MVP.

Configura las variables sensibles en Vercel Project Settings, no en codigo ni
con prefijo `NEXT_PUBLIC_*`. Si una preview adicional debe llamar a las APIs,
anade su origen exacto a `MIURA_ALLOWED_ORIGINS`.

## Documentacion operativa

- [docs/rag-ingestion.md](docs/rag-ingestion.md): Supabase, migraciones,
  corpus, checksums, ingesta y validacion RAG.
- [docs/runbook.md](docs/runbook.md): troubleshooting, fallo de chat, CORS,
  rate limit, deploy, rollback y reset local.
- [supabase/README.md](supabase/README.md): objetos de base de datos, permisos
  y RPC RAG.

## Decisiones de alcance MVP

- No hay login, cuentas, roles ni persistencia server-side de evaluaciones.
- El navegador guarda las evaluaciones mediante almacenamiento local o fallback
  de sesion.
- El chat no persiste conversaciones en servidor.
- El contexto de evaluacion enviado al chat es minimo y opcional.
- MIURA se presenta como framework preliminar, no validado industrialmente.
