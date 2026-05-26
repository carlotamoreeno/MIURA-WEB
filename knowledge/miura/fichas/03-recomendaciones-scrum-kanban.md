---
id: miura-recomendaciones-scrum-kanban
title: Recomendaciones MIURA y mapeo Scrum/Kanban
source_type: miura_summary
language: es
status: ready
validated_on: 2026-05-26
generated_from:
  - lib/miura/domain/recommendations.ts
  - PRD.md
ingestion:
  include: true
  citation_label: "MIURA MVP - recomendaciones"
---

# Recomendaciones MIURA y mapeo Scrum/Kanban

MIURA genera recomendaciones a partir de DS, cobertura y pilar dominante. Las
recomendaciones deben traducir evidencia tecnica a conversaciones de negocio y
gestion, no sustituir el criterio del equipo.

## Niveles

- `monitor`: DS menor que 0.33. Mantener observacion y prevenir crecimiento de
  senales.
- `mitigate`: DS desde 0.33 y menor que 0.66. Mitigar selectivamente senales
  dominantes y convertir deuda visible en trabajo priorizable.
- `intervene`: DS mayor o igual que 0.66. Intervenir con foco ejecutivo,
  capacidad explicita y seguimiento.
- `improve_evidence`: cobertura parcial. Completar evidencia antes de monetizar
  o elevar decisiones fuertes.

## Pilar dominante

El pilar dominante se selecciona por mayor indice de pilar. Si hay empate, se
usa la contribucion ponderada al DS como desempate. El orden de pilares del MVP
es codigo/arquitectura, documentacion/conocimiento y personas/proceso.

## Acciones por foco

### Codigo/arquitectura

El foco esta en coste de cambio, hotspots, remediacion y calidad tecnica
observable. Las acciones deben trocear remediacion, reforzar tests, revisar
arquitectura y vincular cambios a zonas criticas o impacto de negocio.

### Documentacion/conocimiento

El foco esta en cobertura critica, frescura y dependencia de conocimiento
tacito. Las acciones deben actualizar ADRs, runbooks y documentacion usada,
ademas de planificar transferencia de conocimiento.

### Personas/proceso

El foco esta en friccion operativa, flujo, urgencias y capacidad protegida. Las
acciones deben revisar WIP, politicas de urgencia, capacidad reservada para
deuda y senales de flujo.

## Mapeo Scrum/Kanban en MIURA

- Product Backlog refinement: convertir senales MIURA en elementos pequenos,
  ordenables y con evidencia suficiente.
- Sprint Planning: reservar capacidad coherente con la severidad y conectar
  deuda con el Sprint Goal cuando aporte foco real.
- Sprint Review: mostrar a stakeholders friccion reducida, evidencia cambiada y
  decisiones mejor informadas.
- Sprint Retrospective: inspeccionar como deuda, herramientas, procesos e
  interacciones afectaron calidad y efectividad.
- Release planning: usar DS, cobertura y capacidad perdida para conversaciones
  de roadmap.
- Kanban replenishment: seleccionar opciones de deuda segun capacidad, riesgo y
  criterios explicitos de preparacion.
- Kanban service review: revisar lead time, WIP, bloqueos, retrabajo y demanda
  de fallo para ajustar el servicio con datos.

## Cautela

MIURA complementa Scrum y Kanban como mecanismo de transparencia, evidencia y
priorizacion de deuda tecnica. No reemplaza eventos Scrum, artefactos Scrum,
roles, accountability, Definition of Done, politicas de flujo ni cadencias
Kanban.
