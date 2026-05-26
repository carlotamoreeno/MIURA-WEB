---
id: miura-tfg-source-selection
title: Seleccion curada de fuentes TFG para corpus RAG
source_type: corpus_selection_record
language: es
status: documentation_only
validated_on: 2026-05-26
ingestion:
  include: false
generated_from:
  - carpeta local TFG analizada el 2026-05-26
  - PRD.md
  - TASKS.md
---

# Seleccion curada de fuentes TFG para corpus RAG

Este documento registra que ficheros del material local del TFG se analizaron
antes de incorporar contenido al corpus controlado de MIURA. Su objetivo es
evitar copiar archivos por inercia y dejar una decision trazable para
`TASK-018` y `TASK-022`.

## Criterios de inclusion

Un fichero entra en el corpus solo si cumple todas estas condiciones:

- aporta contenido metodologico, operativo o explicativo que mejore respuestas
  RAG sobre MIURA;
- no queda ya cubierto de forma mas fiable por `PRD.md`, `TASKS.md` o codigo de
  dominio aceptado;
- puede convertirse a Markdown legible sin depender de imagenes;
- no introduce datos administrativos, logos, portadas, plantillas, rubricas de
  evaluacion academica, CSV bruto o material privado innecesario;
- mantiene las cautelas del producto: MIURA preliminar, no validado
  industrialmente y no monetizacion exacta.

## Decision final

Se incluye un unico extracto Markdown curado:

- `knowledge/miura/tfg/tfg-miura-seleccion.md`

El extracto se basa en el documento final editable `DEUDA TECNICA.docx` y recoge
solo contenido util para RAG: problema y objetivos del TFG, metodologia,
alcance, arquitectura MIURA, catalogo de metricas, reglas de calculo,
integracion Scrum/Kanban, lectura exploratoria del cuestionario, caso
ilustrativo y limites.

No se versionan el DOCX original, el PDF final, imagenes, logos, graficos,
capturas, CSV ni versiones antiguas.

## Inventario analizado

| Fichero candidato                                      | Observacion                                                                                                   | Decision                                                      | Motivo                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEUDA TECNICA.docx`                                   | Fuente editable final; conversion textual de 2437 lineas; contiene resumen, capitulos, glosario y anexos A-F. | Usar como fuente para extracto curado, sin copiar el binario. | Es la fuente mas completa y reciente para MIURA; permite extraer texto estructurado sin imagenes.                                                |
| `DEUDA TECNICA - DISENO DE UN FRAMEWORK...pdf`         | PDF final de 111 paginas.                                                                                     | No copiar ni ingerir directamente.                            | Sirve como referencia canonica humana, pero es binario, incluye maquetacion/imagenes y no aporta mejor chunking que el extracto Markdown curado. |
| `Versiones/Preentregaobligatoria_CMG.docx`             | Version previa; conversion textual de 957 lineas.                                                             | Excluir.                                                      | Material superado por la fuente final; duplicaria contenido con menor cobertura.                                                                 |
| `Versiones/Preentregaobligatoria_CMG.pdf`              | PDF previo.                                                                                                   | Excluir.                                                      | Version antigua y binaria.                                                                                                                       |
| `Versiones/UltimaEntrgaBLCKBOARD.pdf`                  | Entrega previa en PDF.                                                                                        | Excluir.                                                      | Version antigua y binaria.                                                                                                                       |
| `Versiones/V2_TFG_EstadoDeLaCuestion_MIURA.pdf`        | Estado de la cuestion previo.                                                                                 | Excluir.                                                      | Queda integrado y actualizado en el TFG final.                                                                                                   |
| `Versiones/V1_TFG_EstadoDeLaCuestion_MIURA.docx`       | Version previa; conversion textual de 561 lineas.                                                             | Excluir.                                                      | Queda superada por el documento final.                                                                                                           |
| `Versiones/V0_TFG_MIURA_EstadodelaCuestion.docx`       | Borrador inicial; conversion textual de 223 lineas.                                                           | Excluir.                                                      | Borrador antiguo y parcial.                                                                                                                      |
| `Versiones/TFG_MIURA_versionantigua.docx`              | Version antigua; conversion textual de 637 lineas.                                                            | Excluir.                                                      | Borrador superado por el TFG final.                                                                                                              |
| `Versiones/Plantilla-inso.docx`                        | Plantilla universitaria.                                                                                      | Excluir.                                                      | No aporta conocimiento MIURA/RAG.                                                                                                                |
| `Rubrica tutor 25-26.pdf`                              | Rubrica academica del tutor.                                                                                  | Excluir.                                                      | No es fuente de producto ni metodologia MIURA para usuarios.                                                                                     |
| `Cuestionario/Cuestionario.docx`                       | Instrumento de cuestionario; conversion textual de 365 lineas.                                                | Excluir como fuente directa.                                  | El TFG final ya incluye Anexo A con estructura y logica del cuestionario; no hace falta duplicar el instrumento completo.                        |
| `Cuestionario/Cuestionario_ES.pdf`                     | PDF del cuestionario en espanol.                                                                              | Excluir.                                                      | Duplicado binario del instrumento ya resumido en el TFG final.                                                                                   |
| `Cuestionario/Cuestionario-EN.pdf`                     | PDF del cuestionario en ingles.                                                                               | Excluir.                                                      | Duplicado binario; el producto MVP responde por defecto en espanol.                                                                              |
| `Cuestionario/estadisticasgoogleformscuestionario.pdf` | Estadisticas agregadas de Google Forms.                                                                       | Excluir como fichero directo.                                 | El TFG final ya incorpora los resultados agregados necesarios y sus limites.                                                                     |
| `Cuestionario/Encuestasinestadisticas.csv`             | Exportacion CSV de respuestas.                                                                                | Excluir.                                                      | Dato bruto no necesario para RAG MVP; mayor riesgo de privacidad y de sobreexposicion.                                                           |
| `Cuestionario/*.png`                                   | Diagramas/capturas del flujo de cuestionario.                                                                 | Excluir.                                                      | Imagenes no necesarias para respuestas RAG; el flujo queda descrito textualmente en el TFG final.                                                |
| Ficheros `~$*.docx`                                    | Bloqueos temporales de Microsoft Word.                                                                        | Excluir.                                                      | Artefactos temporales sin contenido util.                                                                                                        |

## Reglas para tareas posteriores

- `TASK-018` debe ingerir el extracto curado y las fichas controladas, no los
  binarios originales.
- Si en el futuro se necesita cita por pagina exacta del PDF, debe crearse una
  tarea especifica de extraccion paginada y revision manual.
- Si se incorporan datos de cuestionario mas alla de agregados del TFG, debe
  revisarse privacidad y minimizacion antes de ingerirlos.
- El chatbot no debe afirmar que ha leido imagenes, graficos o datos brutos
  excluidos.
