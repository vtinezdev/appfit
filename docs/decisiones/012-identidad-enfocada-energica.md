# ADR 012: Identidad enfocada y enérgica

Fecha: 2026-10-05. Estado: aceptado por el encargo de rediseño.

## Contexto

La opción 3 aportada por Víctor fija la dirección: herramienta deportiva premium, grafito/blanco/naranja, títulos contundentes y métricas legibles. Se interpreta para los flujos reales de la PWA, sin copiar fotografías, datos ni navegación del mockup.

## Decisión

- Cambiar primero tokens y primitives, después composición. ~~Negro/grafito neutro, superficies por tono, naranja como acción/acento~~ (paleta sustituida por [017](017-paleta-cobalto-y-composicion-respirada.md)), radios de 6/10/14/20 px. Mantener Claro/Sistema y sus contrastes.
- ~~Barlow Condensed 700 local para títulos/métricas; Manrope existente para nombres, formularios y lectura.~~ Sustituido por [016](016-tipografia-saira.md): Saira en una sola familia.
- Inicio prioriza entrenamiento y luego consumo/peso. «Tu próxima sesión» abre Gym: no implica una rutina programada. Nutrición se integra en página; Hoy conserva su panel y las decisiones de consumo/referencias.
- Entrenamiento enfatiza ejercicio, cifras y campos de series. Menú/overlays utilizan el mismo sistema; se preservan geometría, navegación, foco y Reduce Motion.
- No añadir fotografía genérica: no identifica el ejercicio actual ni aporta información operativa. Mantener iconografía SVG y datos reales.

## Consecuencias

La identidad llega a las vistas compartidas sin duplicar layouts ni alterar repositorios, cálculos, tablas, historial o backup. Las superficies no requieren un marco; controles y registros conservan límites reconocibles. La presentación concreta y valores normativos viven en DESIGN.md y docs/DESIGN-SYSTEM.md.

El comportamiento nativo en Safari/iPhone y Android físicos necesita comprobación en dispositivo; Chromium móvil sirve como regresión responsive, no como certificación de plataforma.
