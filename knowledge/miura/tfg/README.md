---
id: miura-tfg-curated-corpus
title: Corpus curado del TFG MIURA
source_type: corpus_placeholder
language: es
status: curated_extract_available
validated_on: 2026-05-26
---

# Corpus curado del TFG MIURA

Este directorio contiene una incorporacion curada del TFG para RAG. No se
versionan documentos binarios ni se copia el TFG completo.

Fuente academica de referencia:

`Deuda tecnica: diseno de un framework de cuantificacion y prevencion para la estrategia de negocio`

## Ficheros incluidos

- `tfg-miura-seleccion.md`: extracto metodologico curado e ingerible para RAG.
- `source-selection.md`: registro de los ficheros analizados, incluidos y
  excluidos.

## Criterio seguido

La fuente primaria textual usada para el extracto es el documento final editable
`DEUDA TECNICA.docx`, convertido temporalmente a Markdown para analisis. Solo se
conserva en el repo el extracto curado. Quedan fuera:

- PDF final y DOCX original;
- versiones antiguas;
- plantillas y rubricas academicas;
- imagenes, logos, figuras, capturas y graficos;
- CSV bruto o estadisticas completas de Google Forms;
- ficheros temporales de Word.

## Uso esperado

El script de ingesta de `TASK-018` debe ingerir `tfg-miura-seleccion.md` junto
con las fichas MIURA, Scrum y Kanban. El documento `source-selection.md` sirve
para auditoria y no necesita ingestion directa.

Si una pregunta requiere informacion que no aparece en el extracto curado ni en
las fichas del corpus, el chatbot debe indicar que no encuentra base suficiente.
No debe afirmar haber leido imagenes, graficos, datos brutos o versiones
excluidas.

## Metadatos de ingesta

El extracto debe asociarse con:

- `sourceId`: `miura-tfg-original`
- `sourceType`: `academic_curated_extract`
- `title`: titulo completo del TFG
- `section`: heading Markdown citado
- `contentHash`: hash del fichero curado
- `generatedFrom`: documento final editable y registro `source-selection.md`
