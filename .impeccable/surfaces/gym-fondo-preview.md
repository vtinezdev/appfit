# Preview de fondo largo de Gym

Target: `src/app/AtmosferaApp.tsx`; related: tokens.css, index.css.
Visitor mode: Operate. Refinamiento exclusivo del fondo; no reorganizar producto, tipografía, superficies, navegación ni entrenamiento.

THESIS: Mantener una atmósfera continua al recorrer una sesión larga, sin competir con el registro de series.
OWN-WORLD: Identidad actual de AppFit; foto de Gym existente, grafito y matices ember/ámbar apagados. Color y luz discretos, sin gaming.
STORY: Foto superior → foto/velo enmascarados → luces ambientales → fondo oscuro. Un único cuerpo de página, sin repetir fotos ni una segunda cabecera.
FIRST VIEWPORT: Cabecera, métricas y primeras series existentes conservan posiciones/lectura. La foto sigue siendo secundaria.
FORM: Capa absoluta decorativa, scroll natural, una imagen local y dos radiales estáticos detrás del contenido. Sin fixed, blur, parallax, listeners de scroll o animación adicional.
FINISH: Inspección inicial batched móvil/escritorio y tramos de scroll; una sola tanda de corrección si hace falta, una confirmación. Sin agentes según CLAUDE.md.

## Scope and activation

Solo Gym oscuro con `?preview=fondo-gym`; sin preferencia guardada y sin cambiar navegación. Inicio/Nutrición/Claro y la URL normal conservan el diseño vigente. No extender ni publicar definitivamente hasta que Víctor revise la captura. No commit/push.

## Photo and light

Saturación 60%, brightness 92%, contrast 96%, opacity 90%; velo 52% → 56% → 82%, altura 50rem. El 35% inicial perdía demasiado color en esta foto de metales/piel de por sí muy neutra; el ajuste conserva matices reales. Máscara conjunta de foto/velo elimina el borde al integrarse con la luz ambiental. Dos radiales laterales grandes, ember/ámbar a 16%/10% como máximos centrales, con centros parcialmente fuera del lienzo. Sus posiciones relativas acompañan la longitud real del contenido. No se añade raster.

## Evidence

Capturas de interfaz real con datos sintéticos y scroll normal en `/tmp/appfit-preview-fondos-gym`, generadas por `scripts/ui/preview-fondos-gym.cjs`. Hardware Safari/iOS/Android no acreditado mediante Chromium.

Inspección inicial conjunta detecta saturación/ambiente demasiado apagados; una tanda ajusta valores y declara ambos colores en oscuro según guard. Confirmación móvil/escritorio y cuatro tramos correcta. 1.267 tests / 71 archivos, TypeScript/build y Playwright sin regresiones de geometría/datos/capas. Detector sin hallazgos principales; aviso preexistente de radio del menú fuera de alcance. Evidencia: `docs/historico/preview-fondos-gym-2026-10-06.md`. Veredicto: preview preparada, pendiente de feedback; no ampliar ni publicar definitivamente.

## Aprobación y extensión

2026-10-06: Víctor aprueba la captura («Me gusta como queda, implementalo en toda la app»). El tratamiento pasa al shell habitual, sin flag, y se adapta a todos los ámbitos y Claro/Oscuro. Este documento conserva el origen de la preview; el contrato vigente se documenta en DESIGN.md y docs/DESIGN-SYSTEM.md. Misma geometría/UI/datos/motion; una foto y dos luces estáticas, vistas de lectura más tenues.
