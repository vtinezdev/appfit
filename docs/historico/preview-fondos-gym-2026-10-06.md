# Preview de fondos largos de Gym — 2026-10-06

Rama `feat/preview-fondos-gym`, desde master tras PR24. Víctor solicita únicamente probar el fondo en Gym antes de extenderlo. No commit/push/despliegue ni migración definitiva.

## Solución entregada

`AtmosferaApp` existente reconoce `?preview=fondo-gym` únicamente para Gym con tema oscuro. La URL normal, Inicio, Nutrición y Claro conservan sus fondos. Sin cambios en App, navegación, estructura, componentes de entrenamiento, tipografía, superficies, controles, motion, lógica, datos o imágenes originales.

Una sola foto local: `gym.webp`. Saturación 60%, brillo 92%, contraste 96%, opacidad 90%. Se probó 35%, pero la foto original de metales/piel ya es muy neutra y ese valor eliminaba demasiados matices. El velo superior baja del 65% vigente al 52%; luego 56%/82%, con fade final. La escena pasa de 42 a 50rem únicamente dentro de la prueba.

Foto y velo comparten una máscara gradual a transparente, de modo que desembocan sobre la capa ambiental sin un borde al acabar la imagen. Dos radiales laterales ember/ámbar, centros parcialmente fuera del lienzo al 52%/87% de la longitud real y máximos 16%/10%. En el margen derecho del tramo medio se observa un paso del fondo actual `(10,10,11)` a aproximadamente `(28,17,15)`: color de fondo perceptible y subordinado, sin cambiar los paneles. La foto deja de verse al superar el tramo superior; las luces siguen detrás del contenido.

No segunda foto: en esta sesión las luces son suficientes y evitan repetir una cabecera o sumar peso. Sin fixed, blur, parallax, eventos/animación de scroll ni nuevas dependencias. Se espera coste pequeño de CSS/rasterización estática; no se mide FPS ni hardware Safari/iOS/Android en esta revisión.

## Capturas reales

Datos sintéticos de una sesión con ocho ejercicios y 32 series. Chromium con width 375/height 812; scroll real en main, de 3.661 px de contenido. La composición no inventa UI ni modifica fotografías.

- `/tmp/appfit-preview-fondos-gym/gym-preview-cuatro-tramos.png`: superior, transición (500 px), intermedia (1.461 px) e inferior (2.922 px de scroll).
- `/tmp/appfit-preview-fondos-gym/gym-preview-scroll-completo.png`: tramos reales unidos por su scrollTop, con navegación al final; 375 px de ancho.
- Imágenes originales de cada viewport, versión anterior e informe JSON en la misma carpeta. `375-preview-scroll.json` identifica los tramos y sus posiciones.
- Reproducción de capturas: `scripts/ui/preview-fondos-gym.cjs`. La unión/contact sheet de esta sesión se hizo con Pillow instalado en el entorno, sin añadirlo al proyecto; script temporal `/tmp/componer-preview-fondos-gym.py`.

## Validación y revisión acotada

Inspección inicial conjunta móvil/escritorio y tramos de scroll: 35% demasiado apagado y luces demasiado débiles. Una tanda ajusta saturación al 60%, máximos ambientales al 16%/10% y limpia hover de las capturas. Confirmación conserva legibilidad/jerarquía; no se continúa puliendo ni se amplía el alcance.

1.267 tests / 71 archivos, TypeScript/build Vite/PWA correctos. El primer guard señaló que los dos colores experimentales necesitaban declaración explícita en oscuro; se añadió, sin relajar reglas. Contraste nuevo de cabeceras con extremos fotográficos y lectura sobre ambas luces cumple 4,5:1. Prueba Playwright correcta en 320/375/430/1440 px: misma geometría y export, una imagen, ningún fondo fixed, ninguna escritura al abrir/desplazar, capas/Claro/Forced Colors correctos. El detector no encuentra hallazgos principales; conserva un aviso de radio de 12 px en paginación del menú preexistente y ajeno al fondo. No se modifica esa área. Sin lint independiente.

Perfil efímero/origen aislado `appfit-test.localhost`, sin datos personales. Reduce Motion activo; la variante no incorpora motion. No se acreditan WebKit/VoiceOver/dispositivos físicos. A la espera de feedback, sin extender a otras áreas.

## Archivos de esta prueba

- Código: `src/app/AtmosferaApp.tsx`, `src/index.css`, `src/shared/design/tokens.css`.
- Verificación: `src/shared/design/contrast.test.ts`, `scripts/ui/preview-fondos-gym.cjs`.
- Documentación: `DESIGN.md`, `PRODUCT.md`, `docs/DESIGN-SYSTEM.md`, `docs/desarrollo.md`, `docs/PROCESO.md`, este informe.
- Impeccable: `.impeccable/design.json`, `.impeccable/surfaces/gym-fondo-preview.md`.
