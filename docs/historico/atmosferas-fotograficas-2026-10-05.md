# Atmósferas fotográficas — 2026-10-05

Rama: `feat/identidad-enfocada-energica`. Víctor aprueba primero una preview estática de Inicio, Nutrición y Entrenamiento, y después pide «Me gusta mucho, implementa todo».

## Implementación

- Tres imágenes generadas con acabado fotográfico, sin texto ni UI. Inicio: fitness/bienestar/nutrición; Nutrición: meal prep; Gym: pesas/esfuerzo. No son fotografías documentales ni datos del usuario. Prompts exactos, hashes y transformación técnica en `public/images/atmosferas/`.
- `AtmosferaApp` comparte la integración en el shell. Decoración oculta a tecnologías de asistencia, sin eventos ni temporizadores; no modifica datos, cálculos, persistencia, navegación ni acciones. Referencias y Ajustes son más discretos.
- Overlay, desaturación y degradado de integración hacen desaparecer la foto antes de las zonas inferiores de lectura. Paneles casi opacos y cabeceras protegidas; modos claro/oscuro y Forced Colors contemplados. Sin parallax ni animación nueva: Reduce Motion conserva el sistema anterior.
- Se adapta la preview para no insertar altura decorativa encima del entrenamiento. La primera serie mantiene su posición operativa. Las cifras ilustrativas del mockup no se trasladan a los datos reales.
- Tres WebP de 960 × 1440, 175.712 bytes en total, incluidos en precache. Sin dependencias nuevas ni servicios remotos.

## Auditoría y cierre Impeccable

Revisión y documentación manual en la sesión principal según CLAUDE.md. Inspección inicial conjunta de las capturas reales de Inicio/Nutrición/sesión a 375 px oscuro e Inicio a 1440 px claro. Se comprueban lectura, jerarquía, separación, densidad, integración y posición de las primeras series. No se identifican defectos materiales que requieran una tanda de fixes. No se inicia otro ciclo subjetivo de polish.

Detector sobre cuatro objetivos afectados: cero hallazgos principales; un aviso no bloqueante de radio de 12 px en `.fan-pages`, preexistente y perteneciente a paginación futura. Procedencia: tres rasters, cero prompts ausentes. Veredicto manual: listo para integrar dentro del alcance comprobado.

## Evidencia

- `npm test`: 1.208 tests en 66 archivos, incluidos contratos de atmósferas y contraste sobre extremos claros/oscuros de la imagen.
- `npm run build`: TypeScript, Vite y PWA correctos; 28 entradas de precache. No existe script separado de lint.
- `validar-rediseno.cjs`: 514 estados; `/tmp/appfit-atmosferas-matriz/resultado.json`.
- `validar-motion.cjs`: 12 contextos, interrupciones/cierres rápidos, menú, series, descanso, fallo/reintento de finalización y persistencia; `/tmp/appfit-atmosferas-motion/motion-results.json`.
- `validar-build.cjs`: CacheStorage contiene los tres fondos; navegación/decodificación offline, ambas fuentes, export y datos intactos en ambos temas.
- Capturas reales móvil oscuro y escritorio claro: `/tmp/appfit-atmosferas-inicial/`. Perfiles efímeros, origen aislado `appfit-test.localhost`, fixtures sintéticos.
- Comprobación adicional con las imágenes bloqueadas: los cinco destinos siguen accesibles, sin overflow ni errores a 320 px con Reduce Motion. Forced Colors oculta la decoración. Sidecar, presupuesto, sintaxis del script y diff check correctos.

Chromium emulado, tamaños móviles/tablet/escritorio y Reduce Motion comprobados. Esto no valida Safari, iPhone/Android físicos, lectores de pantalla o rendimiento/haptics en hardware. No se hace commit, push ni despliegue.
