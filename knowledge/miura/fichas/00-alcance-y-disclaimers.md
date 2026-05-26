---
id: miura-alcance-disclaimers
title: Alcance metodologico y disclaimers MIURA
source_type: miura_summary
language: es
status: ready
validated_on: 2026-05-26
generated_from:
  - PRD.md
  - TASKS.md
  - lib/miura/domain/help.ts
ingestion:
  include: true
  citation_label: "MIURA MVP - alcance y cautelas"
---

# Alcance metodologico y disclaimers MIURA

MIURA Web App MVP 0.1 es una demo guiada sin login para explicar y evaluar
deuda tecnica mediante un framework sociotecnico preliminar. La aplicacion no
debe presentarse como validacion industrial, auditoria financiera ni mecanismo
automatico de decision.

## Principios de alcance

- MIURA organiza la deuda tecnica en tres pilares: codigo/arquitectura,
  documentacion/conocimiento y personas/proceso.
- La evaluacion se realiza en navegador y no persiste evaluaciones de usuario en
  Supabase.
- Supabase pgvector se usa para corpus RAG, no para almacenar evaluaciones de
  usuario.
- El chatbot debe responder desde corpus controlado. Si no hay evidencia
  suficiente, debe decirlo claramente.
- Las recomendaciones MIURA complementan Scrum y Kanban; no sustituyen sus
  reglas, eventos, artefactos ni politicas de flujo.

## Cautelas obligatorias

- MIURA es un framework metodologico preliminar y no esta validado
  industrialmente.
- DS es un indice sintetico de severidad relativa; no mide por si solo horas,
  euros ni probabilidad de fallo.
- Los escenarios de friccion y PWC son proyecciones parametricas bajo supuestos
  declarados, no contabilidad exacta ni prediccion calibrada.
- La monetizacion fuerte requiere cobertura minima en los tres pilares.
- Si falta evidencia, la recomendacion debe priorizar mejorar cobertura antes de
  defender coste, principal o break-even.

## Privacidad y datos

- No hay login, cuentas ni roles en MVP 0.1.
- Las evaluaciones viven en `localStorage` con fallback de sesion.
- El chat no debe recibir el JSON completo de la evaluacion.
- Si se usa contexto de evaluacion, debe ser un resumen minimo y controlado por
  toggle.
- No se deben registrar preguntas completas ni datos personales en logs.

## Respuesta esperada del chatbot cuando falta corpus

Si una pregunta requiere el TFG original, una fuente no ingerida o evidencia
fuera del corpus, el chatbot debe responder con una formula equivalente a:

> No encuentro base suficiente en el corpus controlado para responder con rigor.

Despues puede orientar al usuario sobre que fuente falta o que parte del corpus
deberia aportarse.
