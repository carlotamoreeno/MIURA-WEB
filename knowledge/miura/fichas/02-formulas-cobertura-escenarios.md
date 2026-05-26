---
id: miura-formulas-cobertura-escenarios
title: Formulas, cobertura y escenarios economicos MIURA
source_type: miura_summary
language: es
status: ready
validated_on: 2026-05-26
generated_from:
  - lib/miura/domain/calculate.ts
  - lib/miura/domain/help.ts
  - PRD.md
ingestion:
  include: true
  citation_label: "MIURA MVP - formulas y escenarios"
---

# Formulas, cobertura y escenarios economicos MIURA

MIURA MVP calcula indices por pilar, severidad global, cobertura y escenarios de
friccion. Las salidas monetarias son opcionales y se bloquean cuando falta
evidencia suficiente.

## Indices por pilar

Cada indice de pilar es la media de las metricas observadas de ese pilar. Los
pesos internos son iguales entre metricas observadas. Las metricas no
disponibles no se imputan.

- CDI: indice de codigo/arquitectura.
- DDI: indice de documentacion/conocimiento.
- PDI: indice de personas/proceso.

## Cobertura

Cada pilar tiene cuatro metricas base. La cobertura del pilar es:

`cobertura_pilar = metricas_observadas_validas / 4`

La monetizacion fuerte solo esta permitida si todos los pilares tienen cobertura
mayor o igual que 0.50. Si algun pilar queda por debajo, el diagnostico pasa a
parcial.

En diagnostico parcial:

- se mantienen CDI, DDI, PDI y DS;
- se mantiene capacidad perdida como lectura diagnostica;
- se bloquean PWC, principal y break-even;
- la recomendacion debe pedir mejorar evidencia.

## Debt Severity

DS resume la severidad relativa global en escala 0 a 1.

`DS = 0.40*CDI + 0.25*DDI + 0.35*PDI`

Bandas de decision:

- DS menor que 0.33: monitorizar o mantener observacion.
- DS desde 0.33 y menor que 0.66: mitigar selectivamente.
- DS mayor o igual que 0.66: intervenir.

Si la cobertura es parcial, la recomendacion se reemplaza por mejorar evidencia
aunque DS sea alto.

## Escenarios de friccion

MIURA calcula Cost of Friction con tres escenarios prudentes:

`CF = lambda * DS`

| Escenario   | lambda |
| ----------- | -----: |
| Conservador |   0.15 |
| Central     |   0.25 |
| Tensionado  |   0.35 |

La capacidad perdida se calcula antes que euros:

`horas_perdidas_mes = capacidad_mensual * CF`

`horas_perdidas_total = horas_perdidas_mes * horizonte_meses`

## Salidas economicas condicionadas

PWC requiere cobertura suficiente, coste hora positivo, capacidad mensual y
horizonte.

`PWC = horas_perdidas_total * coste_hora`

El principal de remediacion requiere coste hora positivo y esfuerzo avanzado
positivo en C1.

`principal = esfuerzo_remediacion_C1 * coste_hora`

El break-even usa el escenario central y se expresa en meses.

`break_even = principal / coste_mensual_de_friccion_central`

## Supuestos obligatorios

- MIURA es preliminar y no esta validado industrialmente.
- DS es severidad relativa, no coste directo.
- PWC, principal y break-even son escenarios heuristicos bajo supuestos
  declarados.
- Si falta cobertura, se debe mejorar evidencia antes de monetizar.
