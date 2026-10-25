# Continuidad de fondos en AppFit — 2026-10-06

Víctor aprueba la preview anterior y autoriza implementarla en toda la app. Rama `feat/preview-fondos-gym`; sin commit/push/despliegue. Se mantiene el diseño completo de contenido: solo cambia el tratamiento de fondo.

## Implementación

`AtmosferaApp` elimina el flag y emite `data-scene` para Inicio/Nutrición/Gym; Referencias reutiliza Nutrición y Ajustes Inicio, atenuando la fotografía y las luces. Una imagen WebP existente por tema/ámbito. Los seis archivos suman 332.504 bytes y siguen precacheados. No nuevos assets/dependencias, ni consultas/escrituras a datos.

Fotografía de 50 rem con saturación 60%, contraste 96%. Oscuro: brillo 92%, opacidad 90%, velo 52/56/82%; reproduce la preview aprobada de Gym. Claro: brillo 98%, opacidad 72%, velo 76/88/95%, con las fotografías de luz natural existentes. Foto/velo comparten máscara opaca hasta 40% y transparente al final, sin costura sobre la capa ambiental.

Dos luces estáticas laterales, parcialmente fuera del lienzo, centros al 52%/87% de la altura real del contenido. Cobre/piedra en Inicio, oliva/arena en Nutrición, ember/ámbar en Gym. Máximos de 16%/10% en oscuro, 10%/7% en claro. Referencias/Ajustes mantienen foto al 20%/14% y reducen la capa de luces al 35%. Los valores viven en tokens, y los colores no se usan como acento/estado.

Sin segunda fotografía, repetición, blur, fixed, parallax, animación o listeners de scroll. Coste esperado bajo por dos radiales estáticos; no medición de FPS en hardware. Las superficies/lectura/control permanecen intactas. Forced Colors oculta toda la decoración. Fallo de foto deja fondo temático/luces y mantiene la UI; Reduce Motion no incorpora trabajo animado.

## Validación

- 1.270 tests / 71 archivos correctos. TypeScript/Vite/PWA build correcto; 31 archivos de precache. No script de lint independiente.
- Contraste de texto ≥4,5:1 sobre pares ambientales y extremos fotográficos, incluyendo posiciones intermedias del fade, ambos temas.
- `scripts/ui/validar-fondos.cjs`: ocho casos (320/375/430/1440 × oscuro/claro), todos los destinos, scroll superior/inferior, cuatro posiciones y capturas encadenadas de Gym, detalle/subvistas nutricionales, selector, cambio de tema, Forced Colors y export idéntico. Decoración sin controles, posición absoluta, una imagen, misma geometría/contenido al ocultarla. Origen aislado `appfit-test.localhost:5173` y perfiles efímeros con datos sintéticos.
- `scripts/ui/validar-build.cjs`: build de producción, service worker, recarga offline, fuentes/seis fondos locales, navegación y export íntegro en ambos temas.
- Primera inspección conjunta móvil/escritorio no detecta defectos del tratamiento; se corrige la espera del script para capturar Referencias resuelta, no su skeleton. Se limpia una declaración duplicada de tokens con idénticos valores. Una confirmación conjunta, sin ampliar alcance.
- Detector Impeccable sin hallazgos principales; un aviso preexistente de radio de 12 px en el menú, ajeno al fondo y sin modificar.
- Chromium emulado; Safari/VoiceOver/iOS y Android en dispositivos físicos pendientes.

## Evidencia

En `/tmp/appfit-fondos` quedan capturas PNG reales e informe JSON. `fondos-appfit-secciones.png` compone Inicio/Nutrición/Gym en oscuro y claro. `fondos-appfit-lectura-scroll.png` muestra Referencias, Ajustes y los finales de Nutrición/Gym. Las composiciones solo unen capturas reales; no alteran la UI. Los nombres de otras capturas indican ancho/tema/sección/posición.

## Archivos

Código: `src/app/AtmosferaApp.tsx`, `src/index.css`, `src/shared/design/tokens.css`.
Validación: `src/shared/design/contrast.test.ts`, `scripts/ui/validar-fondos.cjs` (sustituye al script opt-in de la preview).
Documentación: `DESIGN.md`, `PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/desarrollo.md`, `docs/decisiones/013-atmosferas-fotograficas.md`, `docs/PROCESO.md`, este informe.
Impeccable: `.impeccable/design.json`, `.impeccable/surfaces/gym-fondo-preview.md` (conserva origen y registra aprobación). El informe histórico de preview permanece como evidencia previa.
