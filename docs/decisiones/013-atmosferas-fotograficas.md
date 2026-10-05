# ADR 013: Atmósferas fotográficas desde la preview aprobada

Fecha: 2026-10-05. Estado: aceptado por Víctor («Me gusta mucho, implementa todo»).

## Contexto

La identidad enfocada/enérgica ya estaba implementada. Antes de modificar fondos, Víctor pide una preview de Inicio/Nutrición/Entrenamiento con fotografía oscurecida, visible pero secundaria; aprueba la composición y autoriza integrarla.

## Decisión

Tres escenas locales generadas con acabado fotográfico, sin rasterizar texto/control del mockup. `AtmosferaApp` en el shell selecciona imagen por destino; `.app-view` contiene foto/fade sin añadir altura de layout. Referencias y Ajustes reutilizan escenas con intensidad mínima. Menú, controles y tareas siguen con superficies propias.

Overlay/saturación/opacidades mediante tokens; headers/tabs protegidos y paneles prácticamente opacos. Claro se mantiene más tenue, Forced Colors elimina la decoración y Reduce Motion no recibe movimiento nuevo. Fallo de descarga conserva toda la interfaz.

WebP 960×1440, menos de 200 KB en total, decodificación async y precache de las tres imágenes. Sin red externa, nueva dependencia, parallax, blur de interfaz o vídeo. No modificar repositorios, cálculos, schema, backup o estados de sesión.

## Consecuencias

La atmósfera alcanza también subpantallas mediante el shell, sin soluciones separadas por feature. En entrenamiento la adaptación móvil conserva la primera serie visible en 320×568, evitando añadir la franja fotográfica libre del mockup. Los datos ilustrativos de la preview se sustituyen por registros reales; no se incorporan sus cifras como defaults.

Se comprueban contraste con extremos de luminancia, origen local/peso/semántica de imágenes, navegación y capas, datos intactos, precache y descarga offline. Evidencia en el informe de implementación; hardware iOS/Android pendiente.
