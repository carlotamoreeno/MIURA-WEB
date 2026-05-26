---
id: miura-tfg-seleccion-metodologica
title: TFG MIURA - extracto metodologico curado
source_type: academic_curated_extract
language: es
status: ready
validated_on: 2026-05-26
source:
  source_id: miura-tfg-original
  source_document: "DEUDA TECNICA.docx"
  source_basis: "extracto curado del documento final editable; no es copia integra"
  source_sections:
    - Resumen
    - 1.1-1.5 Introduccion, problema, objetivos y alcance
    - 3.1-3.5 Metodologia
    - 4.1-4.11 Desarrollo de MIURA
    - Anexo A Instrumento del cuestionario
    - Anexo B Resultados descriptivos
    - Anexo C Catalogo operativo de metricas
    - Anexo D Reglas de calculo
    - Anexo E Reglas de decision
    - Anexo F Caso ilustrativo reproducible
ingestion:
  include: true
  citation_label: "TFG MIURA - extracto metodologico curado"
---

# TFG MIURA - extracto metodologico curado

Este archivo no es una copia completa del TFG. Es una seleccion curada para RAG
del MVP, preparada desde el documento final editable `DEUDA TECNICA.docx`.
Excluye imagenes, logos, portada, plantillas, ficheros binarios, CSV bruto,
capturas y versiones antiguas.

Para comportamiento ejecutable de la aplicacion, prevalecen `PRD.md`,
`TASKS.md` y el codigo de dominio aceptado. Este extracto aporta contexto
academico y metodologico para respuestas explicativas con citas.

## Tesis central del TFG

El TFG posiciona la deuda tecnica como un problema sociotecnico situado entre
ingenieria del software, gestion de calidad, gestion del riesgo y traduccion a
lenguaje de negocio. La deuda tecnica no se reduce a codigo deteriorado:
tambien puede aparecer como documentacion insuficiente, conocimiento dificil de
transferir, friccion de coordinacion, retrabajo, dependencia de personas clave y
perdida de capacidad efectiva.

El problema de investigacion es la brecha entre senales tecnicas y criterios de
decision comprensibles para negocio. Los equipos tecnicos suelen detectar antes
el deterioro, pero la priorizacion de inversiones, roadmap y riesgo necesita una
traduccion mas clara hacia friccion, capacidad y coste proyectado.

La conclusion defendible del TFG es acotada: MIURA puede sostenerse como un
framework preliminar, estructurado y plausible para hacer mas trazable esa
conversacion, pero no como una solucion validada industrialmente ni como un
modelo exacto de monetizacion de deuda tecnica.

## Estatuto metodologico

El TFG adopta un enfoque de investigacion aplicada, exploratoria, descriptiva y
propositiva. Se apoya en:

- una revision bibliografica estructurada y critica;
- un cuestionario exploratorio bilingue con 15 respuestas validas;
- el diseno del framework MIURA como artefacto metodologico central;
- un caso ilustrativo sintetico y reproducible.

La revision bibliografica no se presenta como revision sistematica formal. La
muestra del cuestionario es de conveniencia, no probabilistica y no
representativa del sector. Por tanto, el cuestionario orienta decisiones de
diseno, pero no valida MIURA ni permite generalizar sus resultados.

## Alcance de deuda tecnica en MIURA

MIURA considera dentro de su alcance manifestaciones de deuda tecnica que
cumplan tres condiciones:

- introducen o consolidan un compromiso de corto plazo;
- generan un sobrecoste plausible en cambios futuros;
- admiten una via reconocible de remediacion o mitigacion.

Quedan fuera del alcance del framework:

- deuda de producto o estrategia sin vinculo demostrable con mantenibilidad o
  coste de cambio tecnico;
- defectos funcionales aislados sin patron estructural;
- problemas puramente contractuales o comerciales;
- patologias organizativas amplias no conectables razonablemente con el flujo de
  entrega de software;
- benchmarking intersectorial, monetizacion exacta o validacion organizacional
  fuerte.

La unidad primaria de observacion puede ser componente, repositorio, servicio o
flujo de trabajo. La unidad de decision es el proyecto o producto donde se
negocian roadmap, presupuesto, capacidad y riesgo.

## Arquitectura MIURA

MIURA combina dos ejes.

El eje sustantivo define donde se observa la deuda:

- codigo/arquitectura;
- documentacion/conocimiento;
- personas/proceso.

El eje funcional explica como se procesa la evidencia. El acronimo MIURA se
despliega como:

- Measurement: determinar que senales se observan y con que reglas;
- Integration: normalizar y agregar senales en indices comparables;
- Uncertainty: mantener visibles rangos, escenarios y cobertura;
- Recommendation: derivar reglas prudentes de decision;
- Agile Alignment: integrar la conversacion con Scrum y Kanban sin sustituirlos.

La fortaleza metodologica de MIURA no esta en una matematica compleja, sino en
la trazabilidad: cada salida debe poder retrotraerse a senales, fuentes y
supuestos declarados.

## Catalogo operativo de metricas

El TFG propone un catalogo parsimonioso de cuatro metricas por pilar. La
seleccion responde a cuatro criterios: relevancia para coste de cambio,
observabilidad razonable, interpretabilidad para perfiles no exclusivamente
tecnicos y trazabilidad hacia decisiones de backlog, priorizacion o inversion.

| Codigo | Pilar                      | Metrica                                       | Lectura de riesgo                                                                  |
| ------ | -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| C1     | Codigo/arquitectura        | Esfuerzo de remediacion observable            | Mayor valor implica mayor severidad.                                               |
| C2     | Codigo/arquitectura        | Densidad de problemas de mantenibilidad       | Mayor valor implica mayor severidad.                                               |
| C3     | Codigo/arquitectura        | Retrabajo o reaperturas                       | Mayor valor implica mayor severidad.                                               |
| C4     | Codigo/arquitectura        | Churn o inestabilidad en hotspots             | Mayor valor implica mayor severidad.                                               |
| D1     | Documentacion/conocimiento | Cobertura documental critica                  | Menor cobertura implica mayor severidad; requiere normalizacion inversa.           |
| D2     | Documentacion/conocimiento | Frescura de documentacion critica             | Menor frescura implica mayor severidad; requiere normalizacion inversa.            |
| D3     | Documentacion/conocimiento | Tiempo de onboarding a productividad          | Mayor valor implica mayor severidad.                                               |
| D4     | Documentacion/conocimiento | Dependencia de conocimiento tacito            | Mayor valor implica mayor severidad.                                               |
| P1     | Personas/proceso           | Friccion percibida atribuible a deuda tecnica | Mayor valor implica mayor severidad.                                               |
| P2     | Personas/proceso           | Degradacion de lead time o cycle time         | Mayor degradacion implica mayor severidad.                                         |
| P3     | Personas/proceso           | Trabajo urgente no planificado                | Mayor valor implica mayor severidad.                                               |
| P4     | Personas/proceso           | Capacidad reservada para reduccion de deuda   | Menor capacidad reservada implica mayor severidad; requiere normalizacion inversa. |

Cada metrica debe declarar fuente, unidad, ventana temporal, sentido de riesgo y
criterio local de interpretacion. Usar una metrica sin esos metadatos queda
fuera de especificacion metodologica.

## Reglas de normalizacion y calculo

MIURA evita una calibracion estadistica global porque el TFG no dispone de una
base historica suficiente. Por defecto, usa una rubrica de tres niveles:

| Nivel de riesgo | Valor normalizado |
| --------------- | ----------------: |
| Bajo            |               0.2 |
| Medio           |               0.5 |
| Alto            |               0.8 |

Las metricas protectoras aplican normalizacion inversa. En el MVP, esta regla
afecta especialmente a D1, D2 y P4.

Los pesos internos dentro de cada pilar son iguales cuando no hay evidencia
organizacional suficiente para defender otra jerarquia. Si faltan metricas, el
indice del pilar se calcula solo con las observadas y se conserva una lectura de
cobertura.

Los indices por pilar son:

- CDI para codigo/arquitectura;
- DDI para documentacion/conocimiento;
- PDI para personas/proceso.

El indice global de severidad se define como:

`DS = 0.40*CDI + 0.25*DDI + 0.35*PDI`

La cobertura minima por pilar es 0.50. Si algun pilar queda por debajo, MIURA
puede mostrar diagnostico parcial, pero no debe forzar una monetizacion agregada
fuerte.

## Friccion, capacidad y coste proyectado

DS no equivale directamente a horas perdidas ni euros. Para evitar ese salto,
MIURA introduce un parametro de escenario:

`CF = lambda * DS`

Escenarios iniciales:

| Escenario   | Lambda |
| ----------- | -----: |
| Conservador |   0.15 |
| Central     |   0.25 |
| Tensionado  |   0.35 |

La perdida de capacidad se calcula antes que el coste monetario:

- capacidad perdida del periodo = `CF * capacidad_planificada`;
- PWC(T) = suma de capacidad perdida por coste hora en un horizonte explicito;
- principal = esfuerzo de remediacion estimado por coste hora;
- break-even heuristico = principal dividido por coste mensual de friccion
  reducida bajo supuestos declarados.

PWC(T) debe leerse como coste proyectado de operar bajo la situacion actual. No
es coste total real de la deuda tecnica, no es prevision contable exacta y no
es comparable universalmente entre organizaciones.

## Reglas de decision

MIURA combina DS, pilar dominante, cobertura, principal, break-even, criticidad,
roadmap y gobernanza disponible. La decision no debe derivarse mecanicamente de
una sola cifra.

Bandas preliminares:

| Banda DS          | Lectura          | Respuesta base                   |
| ----------------- | ---------------- | -------------------------------- |
| DS < 0.33         | Exposicion baja  | Mantener y monitorizar.          |
| 0.33 <= DS < 0.66 | Exposicion media | Mitigar selectivamente.          |
| DS >= 0.66        | Exposicion alta  | Intervenir de forma prioritaria. |

Si falta cobertura suficiente, la recomendacion principal debe ser mejorar
evidencia antes de monetizar. Si DS es alto pero el break-even es largo, conviene
intervenir por fases o revisar el alcance. Si la criticidad es extrema, puede
elevarse la prioridad aunque la lectura economica no sea corta.

## Integracion con Scrum y Kanban

MIURA se define como complemento, no sustituto, de Scrum o Kanban. Se integra en
artefactos y cadencias ya existentes para no crear un proceso paralelo.

Artefactos sugeridos:

- registro de deuda tecnica, como backlog especifico o vista etiquetada dentro
  del backlog general;
- scorecard MIURA para revisar pilares, cobertura, friccion y coste proyectado;
- decision log para documentar decisiones de asumir, posponer, amortizar o
  escalar deuda tecnica.

Puntos de integracion Scrum:

- refinement: registrar items, revisar evidencia y preparar priorizacion;
- sprint planning: decidir capacidad reservada y seleccionar acciones;
- sprint review: comunicar impacto en entrega, calidad, riesgos o friccion;
- retrospectiva: analizar fricciones de proceso, conocimiento y coordinacion.

Puntos de integracion Kanban:

- replenishment: seleccionar opciones de deuda segun capacidad y riesgo;
- seguimiento de flujo: observar bloqueos, urgencias, retrabajo y WIP;
- service review o revision de flujo: revisar lead time, cycle time, demanda de
  fallo y politicas del servicio.

El objetivo es aumentar transparencia y sostener el equilibrio entre entrega de
valor al cliente y sostenibilidad interna del equipo.

## Evidencia exploratoria del cuestionario

El cuestionario del TFG se usa como contraste exploratorio, no como validacion
industrial. La muestra contiene 15 respuestas validas, con predominio de perfiles
tecnicos o mixtos y sin submuestra pura suficiente de negocio/gestion.

Patrones usados para orientar el diseno:

- la percepcion de deuda aparece en codigo, documentacion/proceso y transferencia
  de conocimiento, apoyando una arquitectura no centrada solo en codigo;
- onboarding o transferencia de conocimiento aparece en 8 de 15 respuestas;
- decisiones urgentes que sacrifican sostenibilidad aparecen en 6 de 15;
- las consecuencias mas senaladas son errores/incidencias (12/15), retrasos
  (10/15) y desgaste del equipo (9/15);
- coste operativo o mantenimiento aparece en 6/15 e incidencias criticas en
  5/15;
- resolver deuda tecnica se percibe como valor para negocio en 12 respuestas y
  como posibilidad en otras 3;
- la comprension actual de deuda tecnica por negocio/direccion es baja, con
  media 2.53 sobre 5 y mediana 2;
- la utilidad de una estimacion economica futura alcanza media 4.00 y mediana 4;
- 10 de 15 respuestas indican que la deuda suele pasar desapercibida hasta
  provocar problemas graves;
- las practicas actuales son heterogeneas: backlog explicito en 7 respuestas,
  capacidad reservada en 5, resolver solo cuando bloquea en 5, retrospectivas en
  4 y herramientas de medicion en 2;
- las barreras principales son falta de tiempo o presion de entrega (11/15),
  falta de visibilidad (10/15), falta de apoyo de negocio/direccion (6/15) y
  ausencia de criterios compartidos (4/15);
- la informacion mas valorada para justificar acciones es coste de resolucion y
  calidad/estabilidad, ambas con 13 menciones, seguida de impacto sobre el equipo
  (9/15), riesgo en entregas y rentabilidad o punto de equilibrio (6/15 cada
  una).

Estos datos respaldan decisiones de diseno, pero no prueban eficacia,
generalizacion sectorial ni calibracion de pesos, umbrales o lambda.

## Caso ilustrativo reproducible

El TFG incluye un caso sintetico y no empirico. Su funcion es pedagogica:
mostrar como opera MIURA desde datos de entrada hasta recomendacion final.

Supuestos principales del caso:

- equipo ficticio de consultoria con 6 desarrolladores, 1 QA y 1 tech lead;
- capacidad tecnica mensual efectiva: 840 horas;
- coste hora plenamente cargado: 42 EUR/h;
- horizonte: 12 meses;
- rubrica de tres niveles: 0.2, 0.5 y 0.8;
- pesos entre pilares: alfa 0.40, beta 0.25 y gamma 0.35;
- lambda: 0.15, 0.25 y 0.35;
- principal hipotetico de remediacion: 520 horas, equivalente a 21,840 EUR.

El caso usa tres metricas por pilar para simplificar la exposicion. Obtiene CDI
0.70, DDI 0.60, PDI 0.80 y DS 0.71. Con DS 0.71, los escenarios de CF son
0.1065, 0.1775 y 0.2485. La capacidad perdida mensual queda aproximadamente en
89.46, 149.10 y 208.74 horas. El PWC(12) se situa entre 45,087.84 EUR y
105,204.96 EUR, con escenario central de 75,146.40 EUR. El break-even central
del paquete hipotetico es aproximadamente 3.49 meses.

La lectura prudente es que el ejemplo demuestra operatividad conceptual bajo
supuestos declarados. No demuestra ahorro real, validacion de campo ni precision
contable.

## Limites y cautelas para RAG

Cuando el chatbot responda desde este extracto debe mantener estas cautelas:

- MIURA es preliminar, metodologico, calibrable y no validado industrialmente.
- El cuestionario orienta el diseno, pero no valida el framework.
- Las cifras del caso ilustrativo son sinteticas.
- PWC(T), principal y break-even son escenarios bajo supuestos, no contabilidad
  exacta.
- Si se pregunta por datos brutos del cuestionario, imagenes, logos, graficos o
  fuentes excluidas, debe indicar que no forman parte del corpus ingerible.
- Para formulas operativas del MVP, debe priorizar las fichas MIURA generadas
  desde `PRD.md`, `TASKS.md` y codigo de dominio aceptado.
