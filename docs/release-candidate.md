# Release candidate MVP 0.1

Fecha: 2026-05-27

Estado: validacion local completa; pendiente de QA sobre RC desplegado.

Referencia RC: commit que contiene este reporte, mas la evidencia final
registrada en `TASKS.md` y en la salida de `git rev-parse HEAD` durante
`TASK-030`.

Deploy publico objetivo: <https://miura-web.vercel.app>

## Alcance

Este reporte corresponde a `TASK-030`, validacion final de aceptacion y release
candidate del MVP 0.1. No introduce funcionalidades nuevas. Su objetivo es
confirmar criterios `AC-001` a `AC-015`, documentar riesgos residuales y dejar
evidencia para QA.

## Checklist de aceptacion

| ID     | Criterio                                                                  | Evidencia RC                                                                                                                                   | Estado  |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| AC-001 | Usuario puede crear evaluacion sin login.                                 | `npm run test:e2e` pasa flujo critico de creacion sin login; suite completa 57 passed / 1 skipped.                                             | Pasa    |
| AC-002 | Wizard contiene 3 pilares y 12 metricas MIURA.                            | `npm run test`, `tests/e2e/metric-wizard.spec.ts` dentro de `npm run test:e2e`, y catalogo MIURA validado.                                     | Pasa    |
| AC-003 | Motor calcula CDI, DDI, PDI, DS, CF, capacidad perdida, PWC y break-even. | `npm run test` pasa 107 tests, incluyendo formulas y fixtures MIURA.                                                                           | Pasa    |
| AC-004 | Cobertura insuficiente bloquea monetizacion fuerte.                       | `npm run test` y E2E scorecard/report cubren diagnostico parcial y bloqueo monetario.                                                          | Pasa    |
| AC-005 | Scorecard ejecutiva y tecnica muestran resultados y supuestos.            | `npm run test:e2e` incluye `scorecard.spec.ts` con tabs ejecutiva/tecnica, supuestos y mobile smoke.                                           | Pasa    |
| AC-006 | Recomendaciones se adaptan a severidad y pilar dominante.                 | `npm run test` incluye recomendaciones MIURA y matriz de severidad/pilar dominante.                                                            | Pasa    |
| AC-007 | Mapeo Scrum/Kanban esta disponible.                                       | `npm run test` y `npm run test:e2e` incluyen paginas `/metodologia` y `/scrum-kanban` con eventos/puntos requeridos.                           | Pasa    |
| AC-008 | Chatbot responde con citas sobre corpus.                                  | `RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts` pasa 2/2.               | Pasa    |
| AC-009 | Chatbot no inventa si no hay fuentes.                                     | La integracion de chat y retriever gated pasa positivos/negativos; matriz `knowledge/rag-eval.md` aceptada en TASK-022.                        | Pasa    |
| AC-010 | Datos de evaluacion no se guardan en servidor.                            | Revision de frontera: APIs existentes son `/api/chat` y `/api/analytics`; Supabase aparece solo en RAG ingestion/retrieve, no evaluaciones.    | Pasa    |
| AC-011 | Export/import local funciona.                                             | `npm run test:e2e` incluye `local-settings.spec.ts` y flujo critico export/reset/import.                                                       | Pasa    |
| AC-012 | Informe exportable incluye disclaimers.                                   | `npm run test:e2e` incluye `report.spec.ts` con Markdown, print, diagnostico parcial y disclaimers.                                            | Pasa    |
| AC-013 | UI responsive y accesible en flujos clave.                                | `npm run test:e2e`, `npm run test:e2e:browsers` y `npm run perf:lighthouse` pasan; Axe/responsive/browser/performance cubiertos.               | Pasa    |
| AC-014 | Build y deploy preview pasan sin errores.                                 | Local `npm run build` y local Lighthouse pasan. CI/Vercel/public Lighthouse se validan despues del push de este RC.                            | Parcial |
| AC-015 | Documentacion de instalacion, ingesta y runbook completa.                 | `README.md`, `docs/rag-ingestion.md`, `docs/runbook.md`, `supabase/README.md` revisados; `npm run rag:ingest:dry-run` pasa 7 docs / 10 chunks. | Pasa    |

## Validacion ejecutada

| Check                                                                                                                     | Resultado                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                                  | Pasa; 983 paquetes instalados, 2 vulnerabilidades moderadas conocidas.                              |
| `npm run format:check`                                                                                                    | Pasa tras formatear este reporte.                                                                   |
| `npm run lint`                                                                                                            | Pasa.                                                                                               |
| `npm run typecheck`                                                                                                       | Pasa; `next typegen && tsc --noEmit`.                                                               |
| `npm run test`                                                                                                            | Pasa; 17 archivos passed, 2 skipped; 107 tests passed, 4 skipped.                                   |
| `npm run build`                                                                                                           | Pasa con Next.js 16.2.6; rutas estaticas/dinamicas esperadas.                                       |
| `npm run audit:critical`                                                                                                  | Pasa con exit code 0; reporta solo advisory moderado Next/PostCSS conocido.                         |
| `npm run rag:ingest:dry-run`                                                                                              | Pasa; 7 documentos, 10 chunks, 4541 tokens estimados, sin embeddings ni escrituras Supabase.        |
| `RUN_MIURA_RAG_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-rag-retrieve.integration.test.ts` | Pasa; 1 archivo / 2 tests contra OpenAI/Supabase reales.                                            |
| `RUN_MIURA_CHAT_INTEGRATION=1 MIURA_RAG_MATCH_THRESHOLD=0.25 npm run test -- tests/miura-chat-api.integration.test.ts`    | Pasa; 1 archivo / 2 tests contra OpenAI/Supabase reales.                                            |
| `npm run test:e2e`                                                                                                        | Pasa; 57 passed / 1 analytics-gated skipped.                                                        |
| `npm run test:e2e:browsers`                                                                                               | Pasa; 15 passed en Chromium, Firefox y WebKit.                                                      |
| `npm run perf:lighthouse`                                                                                                 | Pasa; landing mobile LCP 2323ms, landing desktop 501ms, wizard mobile 2315ms, wizard desktop 760ms. |
| `git diff --check`                                                                                                        | Pasa.                                                                                               |
| Secret scan `.next/static`                                                                                                | Pasa; sin coincidencias para claves OpenAI/Supabase/DIRECT_URL/NEXT_PUBLIC.                         |
| Source map scan `.next/static`                                                                                            | Pasa; no se encontraron `*.map`.                                                                    |

## Revision de cobertura y orfandad

- `TASKS.md` muestra `TASK-001` a `TASK-029` como `Done`; `TASK-030` es la
  unica tarea ejecutada en este pase.
- No se agregan nuevas rutas, APIs, dependencias, migraciones, formulas MIURA ni
  cambios de UX.
- Se reconcilian como artefactos versionados los documentos aceptados de
  `TASK-029`: `docs/rag-ingestion.md` y `docs/runbook.md`.
- `PRD.md` y `TASKS.md` siguen siendo documentos de control locales ignorados
  por la politica `*.md`; `TASKS.md` se actualiza para trazabilidad operativa,
  pero no se incluye en el commit salvo cambio explicito de politica.
- Supabase/pgvector queda limitado a corpus RAG. La revision de frontera no
  encontro persistencia server-side de evaluaciones.

## Riesgos residuales conocidos

- `npm run audit` completo puede fallar por advisory moderado conocido de
  `postcss <8.5.10` transitivo de `next@16.2.6`; el criterio de release usa
  `npm run audit:critical`, que pasa.
- Las pruebas RAG gated usan credenciales reales y coste minimo de proveedor; no
  se ejecuta reingesta real del corpus en esta tarea.
- El rate limit de chat sigue siendo en memoria por instancia, aceptado para
  demo MVP y no equivalente a control distribuido de abuso.
- Browser support automatico usa Chromium, Firefox y WebKit de Playwright; Edge
  y Safari branded reales quedan para QA manual si se exige.

## Decision go/no-go

Go tecnico para QA sobre el release candidate, condicionado a que el push de
este commit complete CI/Vercel y que el Lighthouse publico contra
`https://miura-web.vercel.app` mantenga LCP <= 2500ms en landing y wizard.
