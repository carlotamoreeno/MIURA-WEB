# Runbook operativo MIURA Web App

Este runbook cubre operaciones de desarrollo, preview, troubleshooting y
rollback del MVP 0.1. Para la ingesta RAG, usa tambien
[docs/rag-ingestion.md](rag-ingestion.md).

## Salud rapida local

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Arranque:

```bash
npm run dev
```

Produccion local:

```bash
npm run build
npm run start
```

## Preview y deploy Vercel

Proyecto aceptado:

- Owner/proyecto: `carlotamoreenos-projects/miura-web`
- Dominio publico: `https://miura-web.vercel.app`
- Build Command: `npm run build`

Comandos de diagnostico:

```bash
gh api repos/carlotamoreeno/MIURA-WEB/commits/main/status
gh run list --limit 5
npx vercel ls miura-web --scope carlotamoreenos-projects
npx vercel inspect https://miura-web.vercel.app --logs
curl -I -L https://miura-web.vercel.app
```

Si un deployment unico devuelve `401`, puede ser proteccion de Vercel. Para QA
publica usa el alias `https://miura-web.vercel.app` salvo que se pida validar
una preview protegida.

Validacion de performance en preview:

```bash
MIURA_LIGHTHOUSE_BASE_URL=https://miura-web.vercel.app npm run perf:lighthouse
```

## Variables y secretos

Configura secretos en Vercel Project Settings o `.env` local. No los escribas
en codigo ni docs con valores reales.

Checklist:

- `SUPABASE_URL` configurada.
- `SUPABASE_SERVICE_ROLE_KEY` preferida o `SUPABASE_SECRET_KEY` equivalente.
- `OPENAI_API_KEY` configurada para chat/embeddings reales.
- `MIURA_RAG_MATCH_THRESHOLD=0.25`.
- `MIURA_ALLOWED_ORIGINS` solo contiene origenes exactos necesarios.
- No existe ningun secreto con prefijo `NEXT_PUBLIC_`.

Revision local de build cliente:

```bash
rg -n "OPENAI_API_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_" .next/static
find .next/static -name '*.map'
```

La primera orden no debe encontrar claves. La segunda no debe listar source maps
de navegador en produccion.

## Fallo de chat RAG

Sintomas habituales:

- `/api/chat` devuelve `503`.
- La UI muestra que no se puede recuperar evidencia.
- Preguntas MIURA devuelven no-sources inesperado.
- El proveedor LLM falla durante streaming.

Diagnostico:

```bash
npm run test -- tests/miura-chat-api.test.ts
RUN_MIURA_RAG_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-rag-retrieve.integration.test.ts
RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts
```

Revisar:

- `ENABLE_RAG_CHAT` no esta desactivado.
- `OPENAI_API_KEY` existe y no esta caducada.
- `SUPABASE_URL` y clave server-side existen.
- El corpus remoto tiene `documents=7`, `chunks=10`, `distinctChunks=10`.
- `MIURA_RAG_MATCH_THRESHOLD` no se quedo en `0.72`.
- Rate limit no esta bloqueando pruebas repetidas.

Mitigacion segura:

```bash
ENABLE_RAG_CHAT=false
```

Con el chat desactivado, evaluacion, wizard, scorecard, informe y datos locales
siguen funcionando.

## CORS y rate limit

Las APIs aceptan origen exacto de la app y origenes extra de
`MIURA_ALLOWED_ORIGINS`. No deben emitir `Access-Control-Allow-Origin: *`.

Smoke en produccion:

```bash
curl -i -X OPTIONS https://miura-web.vercel.app/api/chat \
  -H "Origin: https://miura-web.vercel.app" \
  -H "Access-Control-Request-Method: POST"

curl -i -X OPTIONS https://miura-web.vercel.app/api/chat \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST"
```

Esperado:

- origen valido: `204` y `Access-Control-Allow-Origin` exacto;
- origen invalido: `403`;
- sin wildcard en APIs.

El rate limit es en memoria por instancia. Es suficiente para la demo, no para
control distribuido de abuso.

## Reset de datos locales

Desde la UI:

1. Abrir `/ajustes-locales`.
2. Exportar JSON si se necesita conservar la evaluacion.
3. Usar la accion de borrado/reset.

Desde DevTools, solo para diagnostico local:

```js
localStorage.clear();
sessionStorage.clear();
```

No hay rollback server-side de evaluaciones porque el MVP no las guarda en
servidor.

## Rollback

Rollback de app:

1. Identificar el ultimo deployment sano:

   ```bash
   npx vercel ls miura-web --scope carlotamoreenos-projects
   ```

2. Promover/redeployar el deployment sano desde Vercel UI o CLI segun permisos.
3. Confirmar:

   ```bash
   npx vercel inspect https://miura-web.vercel.app --logs
   curl -I -L https://miura-web.vercel.app
   MIURA_LIGHTHOUSE_BASE_URL=https://miura-web.vercel.app npm run perf:lighthouse
   ```

Rollback de corpus:

1. Volver a la version Git anterior de `knowledge/`.
2. Verificar `knowledge/checksums.sha256`.
3. Ejecutar `npm run rag:ingest:dry-run`.
4. Ejecutar `npm run rag:ingest` si se aprueba escribir en Supabase.
5. Validar retrieval/chat con las pruebas gated.

Rollback de chat:

- Desactivar `ENABLE_RAG_CHAT=false` si retrieval, Supabase u OpenAI fallan.
- Mantener la app disponible para evaluacion local.

## Auditoria de dependencias

```bash
npm run audit:critical
npm run audit
```

`npm run audit:critical` debe pasar. `npm run audit` puede fallar por el
advisory moderado conocido `postcss <8.5.10` transitivo de `next@16.2.6`. No
aplicar `npm audit fix --force` si propone downgrade rompedor a Next.js 9.x.

## Evidencia recomendada para QA

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run rag:ingest:dry-run`
- `npm run test:e2e:browsers`
- `npm run perf:lighthouse`
- `npm run audit:critical`
- `git diff --check`

Para RAG real, anadir las pruebas gated de retrieval y chat si hay credenciales
y coste aprobado.
