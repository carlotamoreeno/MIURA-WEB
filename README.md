# MIURA Web App

Baseline técnico para el MVP 0.1 de MIURA Web App: una demo guiada sin login
para representar el framework MIURA de deuda técnica con Next.js App Router.

## Requisitos

- Node.js >= 20.9
- npm 11.10.0

Este repositorio usa npm y `package-lock.json` como baseline reproducible.

## Desarrollo

Instala dependencias:

```bash
npm install
```

Arranca el servidor local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Validación de baseline

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run audit
```

`npm run build` genera la build Next.js de producción. Ejecuta `lint`,
`format:check` y `typecheck` por separado porque Next.js 16 ya no proporciona
`next lint`.

Validaciones específicas de `TASK-028`:

```bash
npm run test:e2e:browsers
npm run perf:lighthouse
npm run audit:critical
```

`test:e2e:browsers` ejecuta un smoke de navegador moderno en Chromium, Firefox
y WebKit. Chromium cubre el motor usado por Chrome/Edge; WebKit aproxima Safari
para CI local. `perf:lighthouse` construye la app, arranca `next start` en
`127.0.0.1` y valida Lighthouse en perfiles móvil y desktop para landing y
wizard. Los reportes JSON se guardan en `test-results/lighthouse-task-028/`.
Para auditar una preview externa:

```bash
MIURA_LIGHTHOUSE_BASE_URL=https://tu-preview.vercel.app npm run perf:lighthouse
```

Estado conocido de auditoría: `npm run audit` puede fallar por el advisory
moderado `postcss <8.5.10` transitivo de `next@16.2.6`. `npm run
audit:critical` debe pasar; no apliques `npm audit fix --force` si propone un
downgrade rompedor de Next.js.

## Variables de entorno

Las variables sensibles deben vivir solo en `.env*`, que está ignorado por Git.
No expongas claves con prefijo `NEXT_PUBLIC_` salvo que sean valores públicos
deliberados.

Variables relevantes para preview:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SECRET_KEY`, server-side only
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL`, por defecto `text-embedding-3-small`
- `OPENAI_CHAT_MODEL`, por defecto `gpt-5.4-mini`
- `MIURA_CHAT_RATE_LIMIT_*` y alias `CHAT_RATE_LIMIT_*`
- `MIURA_ALLOWED_ORIGINS`, lista separada por comas de orígenes `http(s)`
  exactos, sin wildcards
- `ENABLE_RAG_CHAT`, `ENABLE_EVALUATION_CONTEXT_IN_CHAT`,
  `ENABLE_ANALYTICS`

La V1 no incluye login ni persistencia server-side de evaluaciones. Supabase se
usa para el corpus RAG, no para datos locales de usuarios.

## Preview Vercel

Vercel detecta Next.js automáticamente. Este repo fija Node.js `>=20.9` en
`package.json`; en Vercel se debe usar una versión soportada actual, idealmente
Node 24.x para mantener paridad con CI aceptado.

Comandos esperados:

```bash
npm ci
npm run build
```

Configura las variables sensibles en Vercel Project Settings, no como
`NEXT_PUBLIC_*`. Si se permite CORS desde una URL adicional de preview,
añádela completa en `MIURA_ALLOWED_ORIGINS`, por ejemplo
`https://miura-web-git-feature-org.vercel.app`.
