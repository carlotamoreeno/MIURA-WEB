---
id: miura-pilares-metricas-rubricas
title: Pilares, metricas y rubricas MIURA MVP
source_type: miura_summary
language: es
status: ready
validated_on: 2026-05-26
generated_from:
  - lib/miura/domain/metrics.ts
  - lib/miura/schemas/local-data.ts
  - PRD.md
ingestion:
  include: true
  citation_label: "MIURA MVP - pilares y metricas"
---

# Pilares, metricas y rubricas MIURA MVP

El MVP usa exactamente 12 metricas activas, cuatro por pilar. Cada metrica puede
registrarse como nivel simple bajo/medio/alto o con evidencia avanzada. La
rubrica simple traduce bajo, medio y alto a severidad normalizada 0.20, 0.50 y
0.80. Las metricas protectoras invierten la lectura: un nivel alto reduce
severidad.

## Pilares

### Codigo/arquitectura - CDI

Observa mantenibilidad, esfuerzo de remediacion, retrabajo e inestabilidad
tecnica que elevan el coste de cambio.

Metricas:

- C1, esfuerzo de remediacion observable: estima trabajo necesario para corregir
  problemas tecnicos que ya condicionan mantenimiento, evolucion o pruebas.
- C2, densidad de problemas de mantenibilidad: resume concentracion de senales
  que dificultan comprender, modificar o probar el sistema.
- C3, retrabajo o reaperturas: mide si cambios vuelven al flujo por defectos,
  aclaraciones tardias o soluciones incompletas.
- C4, churn o inestabilidad en hotspots: detecta cambios repetidos en zonas que
  concentran valor, defectos o dependencia tecnica.

### Documentacion/conocimiento - DDI

Evalua si el conocimiento critico esta cubierto, actualizado y transferible sin
depender de pocas personas.

Metricas:

- D1, cobertura documental critica: metrica protectora sobre documentacion
  suficiente para operar y evolucionar piezas clave.
- D2, frescura de documentacion critica: metrica protectora sobre si la
  documentacion refleja el estado real del sistema.
- D3, tiempo de onboarding a productividad: estima cuanto tarda una persona
  nueva o reasignada en contribuir con autonomia razonable.
- D4, dependencia de conocimiento tacito: valora cuanto depende el proyecto de
  pocas personas para entender decisiones, riesgos o zonas criticas.

### Personas/proceso - PDI

Recoge friccion operativa, variabilidad de flujo, urgencias y capacidad real
reservada para reducir deuda.

Metricas:

- P1, friccion percibida atribuible a deuda tecnica: recoge percepcion del
  equipo sobre ralentizacion, coordinacion, entrega o calidad.
- P2, degradacion de lead time o cycle time: evalua si el flujo se ralentiza por
  dependencia tecnica, retrabajo, esperas o cambios dificiles.
- P3, trabajo urgente no planificado: mide capacidad absorbida por urgencias,
  incidencias o interrupciones ligadas a deuda tecnica.
- P4, capacidad reservada para reduccion de deuda: metrica protectora sobre si
  el equipo protege capacidad real para prevenir, reducir o amortizar deuda.

## Normalizacion simple

| Tipo de metrica               | Bajo | Medio | Alto |
| ----------------------------- | ---: | ----: | ---: |
| Riesgo directo, mayor es peor | 0.20 |  0.50 | 0.80 |
| Protectora, mayor es mejor    | 0.80 |  0.50 | 0.20 |

Metricas protectoras en MVP: D1, D2 y P4.

## Evidencia avanzada

Cada valor avanzado debe conservar:

- unidad;
- fuente;
- ventana temporal;
- nota de evidencia;
- disponibilidad;
- interpretacion MIURA bajo/medio/alto cuando el motor necesite valor
  normalizado.

Ejemplos de fuentes aceptables: backlog tecnico, revision de arquitectura,
analisis estatico, Jira/Azure DevOps, incidentes, wiki, ADRs, runbooks,
retrospectivas, health checks, mapas de ownership y metricas de flujo.

## Cautela

Cada metrica es una senal preliminar, no una prueba industrialmente validada.
Debe interpretarse junto con fuente, ventana temporal y cobertura.
