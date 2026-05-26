---
id: miura-knowledge-readme
title: Corpus controlado MIURA para RAG
source_type: corpus_index
language: es
status: ready
validated_on: 2026-05-26
---

# Corpus controlado MIURA para RAG

Este directorio contiene el corpus local que deben ingerir las tareas RAG del
MVP 0.1. Su objetivo es mantener una base reproducible, trazable y prudente
para responder sobre MIURA, deuda tecnica, Scrum y Kanban sin inventar fuentes.

## Reglas de uso

- No ingerir documentos sin `sources.json` o front matter equivalente.
- No inventar contenido del TFG. El corpus incluye un extracto curado; si la
  pregunta exige material fuera de ese extracto, el chatbot debe indicar que no
  encuentra base suficiente.
- Las fichas MIURA incluidas aqui derivan de `PRD.md`, `TASKS.md` y codigo de
  dominio ya aceptado en `lib/miura/domain/*`.
- Las fichas Scrum y Kanban son resumenes propios en espanol basados en fuentes
  oficiales. No sustituyen a las guias oficiales completas.
- El script de ingesta debe conservar `sourceId`, `title`, `section`, `page`,
  `url`, `contentHash`, `language`, `license` y `generatedFrom`.
- Las respuestas del chatbot deben citar documento y seccion cuando haya base.

## Estructura

```text
knowledge/
  README.md
  checksums.sha256
  sources.json
  miura/
    fichas/
      00-alcance-y-disclaimers.md
      01-pilares-metricas-rubricas.md
      02-formulas-cobertura-escenarios.md
      03-recomendaciones-scrum-kanban.md
    tfg/
      README.md
      source-selection.md
      tfg-miura-seleccion.md
  scrum/
    scrum-guide-2020-miura-notes.md
  kanban/
    kanban-guide-miura-notes.md
```

## Estado de cobertura

- MIURA MVP: cubierto con fichas derivadas de fuentes locales aceptadas.
- Scrum Guide 2020: cubierto con ficha propia y enlaces oficiales.
- Kanban Guide / Kanban University: cubierto con ficha propia y enlaces oficiales.
- TFG: cubierto mediante extracto metodologico curado basado en la fuente final
  editable, sin binarios, imagenes, logos, CSV ni versiones antiguas.

## Validacion previa a la ingesta

Antes de ejecutar `scripts/ingest-knowledge.ts`, validar:

1. `sources.json` es JSON valido.
2. `shasum -a 256 -c knowledge/checksums.sha256` pasa o el cambio de corpus
   esta justificado y el manifiesto se regenera.
3. No hay archivos grandes, binarios, imagenes o CSV no esperados en
   `knowledge/`.
4. El TFG se ingiere desde `knowledge/miura/tfg/tfg-miura-seleccion.md`, no desde
   documentos binarios originales.
5. Las claves `OPENAI_API_KEY`, `SUPABASE_URL` y clave server-side Supabase estan configuradas.
6. El esquema RAG de Supabase ya incluye `knowledge_documents`, `knowledge_chunks`
   y RPC `match_knowledge_chunks`.
