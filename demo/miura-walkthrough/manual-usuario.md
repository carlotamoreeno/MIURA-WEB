# Manual de usuario de MIURA Web App MVP 0.1

Este manual explica cómo usar MIURA desde la perspectiva de una persona usuaria.
Está pensado para acompañar la demo visual de `index.html` y convertirla en una
guía práctica paso a paso.

## 1. Qué permite hacer MIURA

MIURA ayuda a evaluar deuda técnica en un proyecto y traducirla a una lectura
comprensible para negocio y equipos técnicos. El flujo completo permite:

- Crear una evaluación local sin login.
- Recoger evidencia en tres pilares: código/arquitectura, documentación/conocimiento
  y personas/proceso.
- Calcular CDI, DDI, PDI y DS.
- Interpretar severidad, pilar dominante y recomendaciones.
- Revisar escenarios de capacidad y coste opcional.
- Generar un informe exportable.
- Consultar metodología, glosario, Scrum/Kanban y chat RAG de apoyo.
- Exportar, importar o borrar datos locales del navegador.

MIURA MVP 0.1 es una herramienta preliminar de diagnóstico. No sustituye una
auditoría técnica formal ni una contabilidad exacta de costes.

## 2. Antes de empezar

Necesitas tener claro:

- Nombre de la organización o equipo.
- Nombre del proyecto evaluado.
- Metodología principal: Scrum, Kanban, mixta u otra.
- Horizonte temporal de análisis.
- Capacidad mensual aproximada del equipo en horas.
- Coste/hora opcional si se quiere ver una estimación económica.
- Evidencia disponible para cada métrica: datos, observaciones, fuentes o notas.

No necesitas crear cuenta ni introducir email. La evaluación se guarda en el
navegador local.

## 3. Flujo recomendado

1. Entra en la página inicial `/`.
2. Pulsa `Crear evaluación MIURA` o abre `/evaluacion/nueva`.
3. Completa el formulario de nueva evaluación.
4. Pulsa `Crear evaluación`.
5. Rellena el asistente de métricas por pilares.
6. Guarda el borrador cuando avances.
7. Abre el cuadro de mando.
8. Revisa primero la vista ejecutiva y después la vista técnica.
9. Genera el informe exportable.
10. Revisa ajustes locales si necesitas exportar/importar JSON o borrar datos.
11. Usa metodología, Scrum/Kanban, glosario y chat como apoyo.

Para una presentación rápida, puedes usar `Cargar ejemplo`. Ese caso abre datos
reproducibles y permite explicar resultados sin crear una evaluación desde cero.

## 4. Página inicial

La página inicial presenta MIURA, el valor del diagnóstico y las acciones
principales.

Qué mirar:

- La propuesta de valor: convertir deuda técnica en lenguaje entendible para
  decisiones.
- El encuadre sin login: la evaluación funciona localmente en el navegador.
- La navegación lateral: muestra las rutas principales del MVP.
- Las llamadas a la acción: crear evaluación, cargar ejemplo o consultar
  metodología.

Acción recomendada:

- Si quieres evaluar un proyecto real, pulsa `Crear evaluación MIURA`.
- Si quieres ver el flujo completo de inmediato, pulsa `Cargar ejemplo`.

## 5. Crear una evaluación local

Ruta: `/evaluacion/nueva`

El formulario recoge el contexto mínimo para interpretar la deuda técnica.

Campos principales:

- Organización o equipo: identifica el ámbito de trabajo.
- Proyecto: nombre del sistema evaluado.
- Metodología: Scrum, Kanban, mixta u otra.
- Horizonte: periodo sobre el que se interpretan escenarios y esfuerzo.
- Capacidad mensual: horas mensuales aproximadas del equipo.
- Coste/hora: opcional; si falta, MIURA mantiene escenarios en horas.

Botones principales:

- `Crear evaluación`: crea un borrador local y abre el asistente.
- `Cargar ejemplo`: abre el caso demo reproducible.

Buenas prácticas:

- Usa datos genéricos si solo estás demostrando el producto.
- No introduzcas secretos, credenciales ni información personal innecesaria.
- Si el coste/hora no está validado, deja el campo vacío para evitar una lectura
  económica demasiado fuerte.

## 6. Completar el asistente de métricas

Ruta: `/evaluacion/[id]/wizard`

El asistente organiza la evaluación en tres pilares:

- Código y arquitectura.
- Documentación y conocimiento.
- Personas y proceso.

Cada pilar contiene cuatro métricas. En total, el MVP trabaja con doce métricas.

En cada tarjeta de métrica puedes:

- Seleccionar una interpretación simple: bajo, medio o alto.
- Cambiar a modo avanzado para añadir valor medido, unidad, fuente, ventana
  temporal y notas.
- Marcar `No disponible` si no hay evidencia suficiente.
- Consultar ayuda contextual para entender la métrica.

Cómo decidir entre modo simple y avanzado:

- Usa modo simple cuando solo tengas una estimación razonada.
- Usa modo avanzado cuando puedas justificar la métrica con una fuente concreta.
- Usa `No disponible` cuando sería engañoso inventar el dato.

Controles importantes:

- Progreso y cobertura por pilar: indican cuánta evidencia está disponible.
- Guardar borrador: conserva el estado local.
- Continuar: avanza al siguiente pilar.
- Ver cuadro de mando: abre los resultados cuando hay suficiente recorrido.

Interpretación de cobertura:

- Una cobertura baja no bloquea todos los resultados, pero sí reduce la fuerza
  de la lectura económica.
- Si algún pilar queda con cobertura insuficiente, MIURA recomienda mejorar
  evidencia antes de tomar decisiones fuertes.

## 7. Leer el cuadro de mando ejecutivo

Ruta: `/evaluacion/[id]/scorecard`

La vista ejecutiva es la pantalla principal para negocio y toma de decisiones.

Indicadores principales:

- CDI: índice del pilar de código y arquitectura.
- DDI: índice del pilar de documentación y conocimiento.
- PDI: índice del pilar de personas y proceso.
- DS: deuda sintética agregada.
- Severidad: semáforo textual y visual.
- Pilar dominante: área que más explica el resultado.
- Recomendación: monitorizar, mitigar, intervenir o mejorar evidencia.

Qué mirar primero:

1. DS y severidad general.
2. Pilar dominante.
3. Acciones recomendadas.
4. Cobertura por pilar.
5. Panel de escenarios.

Panel de escenarios:

- Muestra escenarios conservador, central y tensionado.
- Prioriza capacidad perdida antes que euros.
- Muestra coste solo cuando hay cobertura y coste/hora suficientes.
- Incluye avisos metodológicos para no confundir escenarios con contabilidad
  exacta.

Cómo usarlo en una conversación:

- Empieza por la severidad y el pilar dominante.
- Usa las acciones recomendadas como agenda de trabajo.
- Usa escenarios para dimensionar impacto, no para prometer ahorro exacto.

## 8. Leer la vista técnica

En el cuadro de mando, cambia a la pestaña técnica.

La vista técnica explica cómo se calculan los resultados y permite auditar la
trazabilidad.

Incluye:

- Pesos usados para DS.
- Cobertura por pilar.
- Escenarios λ.
- Tabla de trazabilidad de las doce métricas.
- Supuestos.
- Avisos y limitaciones.

Cuándo usarla:

- Cuando un equipo técnico quiere revisar de dónde sale el resultado.
- Cuando una persona decisora pide justificación.
- Cuando hay dudas sobre cobertura o evidencia.

Qué no debe hacerse:

- No usar la vista técnica para esconder la decisión. La lectura ejecutiva sigue
  siendo el resumen operativo.
- No interpretar un valor aislado sin mirar cobertura y supuestos.

## 9. Generar y usar el informe

Ruta: `/evaluacion/[id]/informe`

El informe convierte la evaluación en un artefacto compartible.

Contiene:

- Resumen ejecutivo.
- Indicadores CDI, DDI, PDI y DS.
- Severidad y recomendación.
- Escenarios de capacidad y coste opcional.
- Evidencia por métrica.
- Recomendaciones.
- Mapeo Scrum/Kanban.
- Fórmulas.
- Supuestos y avisos.

Acciones disponibles:

- Descargar Markdown.
- Copiar Markdown.
- Imprimir o guardar como PDF desde el navegador.

Advertencia de privacidad:

- El informe puede contener nombres de proyecto, notas y fuentes introducidas por
  la persona usuaria.
- Revísalo antes de compartirlo fuera del equipo.

## 10. Ajustes locales

Ruta: `/ajustes-locales`

Esta pantalla gestiona los datos guardados en el navegador.

Permite:

- Ver evaluaciones locales guardadas.
- Abrir asistente, cuadro de mando o informe de una evaluación.
- Exportar un archivo JSON.
- Importar un JSON validado.
- Borrar datos locales.

Uso recomendado:

- Exporta JSON antes de limpiar el navegador o cambiar de equipo.
- Importa JSON solo si procede de una fuente confiable.
- Usa borrar datos cuando quieras reiniciar la demo o eliminar evaluaciones.

Limitación importante:

- En el MVP no hay persistencia de evaluaciones en servidor. Si borras el
  almacenamiento local sin exportar, puedes perder la evaluación.

## 11. Chat RAG de apoyo

Ruta: `/chat`

El chat permite hacer preguntas sobre MIURA, deuda técnica, Scrum/Kanban y el
corpus controlado de conocimiento.

Qué muestra la interfaz:

- Estado vacío con ejemplos de preguntas.
- Panel de contexto de evaluación activa, si existe.
- Selector para usar o no contexto mínimo de evaluación.
- Respuestas del asistente.
- Citas y panel de últimas fuentes cuando la recuperación encuentra evidencia.
- Estado seguro sin fuentes cuando la pregunta está fuera de dominio o la
  recuperación no alcanza evidencia suficiente.

Privacidad del contexto:

- El contexto de evaluación está desactivado por defecto.
- Al activarlo, MIURA envía solo un resumen mínimo.
- No envía valores crudos de métricas, notas de evidencia, coste/hora, capacidad
  mensual ni el JSON local completo.

Cómo obtener mejores respuestas:

- Pregunta sobre conceptos MIURA concretos: DS, CDI, DDI, PDI, cobertura,
  escenarios, Scrum/Kanban o recomendaciones.
- Formula una pregunta cada vez.
- Si no salen fuentes, reformula con términos del glosario o metodología.
- Revisa siempre las citas antes de reutilizar una respuesta.

Sobre la captura de la demo:

- El RAG está implementado en la aplicación.
- La captura local usada en el storyboard no muestra una respuesta con citas
  porque la recuperación devolvió `sin evidencia suficiente`.
- La comprobación posterior confirmó que con el umbral aceptado del proyecto
  `MIURA_RAG_MATCH_THRESHOLD=0.25`, la pregunta `que es PDI` recupera citas.
- La configuración local de captura tenía un umbral más estricto, por eso la UI
  mostró el estado de resiliencia sin fuentes.

## 12. Metodología, Scrum/Kanban y glosario

Rutas:

- `/metodologia`
- `/scrum-kanban`
- `/glosario`

Estas páginas explican el marco MIURA y sirven como material de apoyo.

Metodología:

- Describe pilares, métricas, fórmula DS, cobertura, escenarios y limitaciones.

Scrum/Kanban:

- Explica cómo usar MIURA en refinamiento, planificación, revisión,
  retrospectiva, replenishment y service review.
- Mantiene una regla clave: MIURA complementa Scrum/Kanban, no los sustituye.

Glosario:

- Define términos, indicadores, métricas y fórmulas.
- Es útil cuando alguien no conoce la nomenclatura MIURA.

## 13. Uso en móvil

La app está preparada para pantallas móviles.

Recomendaciones:

- En móvil, usa el asistente paso a paso y guarda con frecuencia.
- Para leer tablas técnicas largas, prioriza el informe o una pantalla más
  amplia.
- El chat puede usarse en móvil, pero las citas y fuentes se leen mejor en
  escritorio.

## 14. Preguntas frecuentes

### ¿Necesito login?

No. El MVP funciona sin login.

### ¿Dónde se guardan mis datos?

En el navegador local mediante almacenamiento local. No se guardan evaluaciones
de usuario en servidor en el MVP.

### ¿Qué pasa si cierro la pestaña?

La evaluación debería seguir disponible si el navegador permite `localStorage`.
Para mayor seguridad, exporta JSON desde ajustes locales.

### ¿Qué pasa si no tengo datos para una métrica?

Marca `No disponible`. Es mejor declarar falta de evidencia que inventar un
valor.

### ¿Por qué no veo euros en los escenarios?

Puede faltar coste/hora, cobertura suficiente o datos de esfuerzo. MIURA mantiene
la lectura en horas cuando no hay base suficiente para monetizar.

### ¿Por qué el chat responde sin fuentes?

Porque la pregunta puede estar fuera del corpus, el umbral de recuperación puede
ser demasiado estricto o la configuración RAG puede no estar disponible en ese
entorno. Ese comportamiento es intencionado: MIURA evita fabricar citas.

### ¿El informe es definitivo?

No. Es una salida preliminar para discusión, priorización y trazabilidad. Debe
revisarse antes de compartirlo como documento formal.

## 15. Checklist para una demo completa

Antes de presentar MIURA, comprueba:

- La landing explica valor y ausencia de login.
- La nueva evaluación muestra campos, privacidad y ejemplo precargado.
- El asistente enseña modo simple, avanzado, ayuda y `No disponible`.
- El cuadro de mando muestra DS, severidad, pilar dominante y escenarios.
- La vista técnica muestra fórmulas, cobertura y trazabilidad.
- El informe muestra exportación y avisos de privacidad.
- Ajustes locales muestra JSON export/import y borrado.
- El chat muestra contexto mínimo y, si el entorno lo permite, citas.
- Metodología, Scrum/Kanban y glosario están disponibles como apoyo.
- La vista móvil de evaluación, cuadro de mando y chat es legible.
