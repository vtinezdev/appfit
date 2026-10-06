# Mapa muscular por entrenamiento — 2026-10-06

Extensión de `feat/catalogo-ejercicios`, antes de cerrar la rama. Sin commit ni push.

## Resultado y límites de producto

El resumen final y el historial muestran el mismo mapa frontal/trasero, calculado con series/reps/kg y clasificación muscular. Once grupos anatómicos, detalle de ejercicios por grupo, cobertura de datos y metodología desplegable. Los ocho ejercicios de la categoría «Cuerpo completo» reciben asociaciones concretas y conservan su filtro de búsqueda. Personalizados con músculo concreto participan; no se atribuye reparto arbitrario a desconocidos.

Se guarda un snapshot opcional de nombres y músculos junto a `fin`, en la misma transacción que consulta ejercicios/series. El cierre repetido es idempotente y el fallo revierte fin/snapshot. Las series existentes no se transforman; backup v2 conserva el snapshot. El SVG no calcula, almacena ni interpreta carga: utiliza los niveles de la lógica pura. Las sesiones antiguas se reconstruyen con asociaciones actuales y avisan de esa limitación.

Fórmula y decisiones vigentes: [ADR 015](../decisiones/015-mapa-muscular-de-sesion.md). La escala compara dentro de una sesión, sin medición fisiológica de intensidad, fatiga, recuperación o riesgo. Todas las series con reps cuentan, marcadas o no, según el comportamiento de guardado existente. No se implementan mapas temporales ni recomendaciones nuevas.

## Revisión Impeccable, acotada y manual

Se conserva el sistema de AppFit (modo Operate). El SVG original esquemático bilateral da protagonismo al cuerpo; rojo semántico independiente de errores y acento naranja, con paleta por tema. La lista textual ofrece detalle mediante controles ≥44 px; no requiere acertar en una región corporal pequeña. Hombros comparte clasificación en ambas vistas, sin aparentar datos de porciones distintas.

Inspección inicial conjunta: resumen, detalle/historial, claro/oscuro, 320/375/430 px, vacío, texto al 200% y Forced Colors. Sin desbordamiento ni targets pequeños. Se detecta una mejora de legibilidad al 200%: pasar el nivel debajo del nombre al estrecharse el contenedor para evitar palabras partidas. Una tanda de corrección y una confirmación, sin cambios de estilo adicionales. La consulta del historial identifica la sesión de su respuesta para evitar mostrar series anteriores durante una apertura rápida.

Auditoría: datos/interpretación honestos, SVG sin red/dependencias/motion continuo, tokens comunes, niveles textuales en contraste forzado, reglas de acceso a IndexedDB y backup intactas. Detector estático en mapa/geometría/historial/resumen: **cero hallazgos** (`/tmp/appfit-mapa-detector.json`). No se realiza overlay de detector en navegador ni revisión mediante agentes; se usa evidencia Playwright y revisión manual según CLAUDE.md. Safari/VoiceOver y dispositivos físicos no se acreditan mediante Chromium.

## Validación

- **1.264 tests / 71 archivos**, incluidos cálculo, ponderación, agregación, personalizados, peso corporal, vacío/extremos/normalización, persistencia transaccional, rollback/reintento/idempotencia y restauración de backup.
- **TypeScript + Vite + PWA** correctos (`npm run build`); sin comando de lint independiente. El guard de diseño, contraste y acceso a datos forma parte de los tests.
- **32 estados del mapa / ocho contextos**: seis combinaciones de 320/375/430 px y temas, 375 oscuro con texto al 200%, 430 claro con Forced Colors. Reduce Motion, cierre real, detalle, historial, recarga, clasificación parcial, vacío y export sin escrituras al leer. Script: `scripts/ui/validar-mapa-muscular.cjs`, capturas/informe en `/tmp/appfit-mapa-muscular`.
- Regresión del catálogo: **32 estados / ocho contextos**, captura en `/tmp/appfit-mapa-catalogo`; selección/rutinas/personalizado/ids/series siguen disponibles.
- Motion/entrenamiento: **doce contextos**, incluidos iPhone 13 y Pixel 7 emulados con Reduce Motion. Aperturas/cierres interrumpidos, Atrás, gesto cancelado, series/deshacer/descanso y fallo/reintento de fin siguen funcionando (`/tmp/appfit-mapa-motion`).
- Producción: service worker/primera apertura del mapa antiguo y selector sin conexión en ambos temas, fuentes/fotos locales presentes y export íntegro. Script `validar-build.cjs`, log `/tmp/appfit-mapa-offline.log`.

Los perfiles son efímeros, con datos sintéticos en `appfit-test.localhost`; no se toca el origen personal. Servidores de desarrollo/preview ya existentes reutilizados. Capturas y logs de revisión quedan en `/tmp`, fuera del producto. No se añaden librerías ni servicios.
