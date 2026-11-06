# 064 — Marca: logotipo, icono y nombre en la app (Cumbra Fit)

Fecha: 2026-11-04. Estado: implementada. El nombre se decidió en [ADR 063](063-nombre-cumbra.md); aquí, cómo se ve y dónde aparece. Sustituye el nombre provisional «AppFit» en la interfaz.

## Contexto y decisión

Con el nombre decidido (**Cumbra**, visible como «Cumbra Fit»), Víctor pide el logo y que la app lo use ya, sin esperar al dominio. Tras varias rondas en un lienzo de diseño, aprueba:

- **Logotipo** (dentro de la app): «CUMBRA» con letras talladas propias que suben como una ladera, la M normal y la A sin travesaño como cumbre, con dos montañas pequeñas dentro. «FIT» va aparte, pequeño, en la letra de los rótulos. La cumbre y «FIT» van en `accent-strong` (volt claro en oscuro, oliva en claro, por contraste); el resto, en el color del texto.
- **Icono de la pantalla de inicio**: la misma A en marfil sobre grafito, con una **mancuerna en volt como travesaño** (el gimnasio) y las montañas debajo de la barra. Se descartaron la hoja y el tenedor para la nutrición, y las versiones demasiado de montaña: la app es de entreno y comida, y la cumbre queda como metáfora.
- **Icono dentro de la app**: el mismo dibujo en blanco y negro según el tema, en un círculo.
- **Textos**: «Cumbra Fit» siempre, también en etiquetas cortas (la pestaña «Cumbra Fit | Tuyas» de Recetas).

## Dónde vive

- Dibujo único en `src/shared/design/marca.ts` (icono, logotipo y su versión SVG para imágenes). Componentes en `src/shared/components/Marca.tsx`: `MarcaLogotipo`, `MarcaIcono`, `MarcaFirma` (icono + logotipo). `IconoApp` (el icono instalado) se retiró con el ADR 067.
- Aparece en el pie de Ajustes y la pantalla de error (firma), y en el pie de los pósteres de entreno y de «Tu mes» («Hecho con» + logotipo). Víctor revisa las capturas y aprueba los cuatro sitios.
- Iconos de la PWA (`public/favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` con el dibujo dentro del círculo seguro) generados con `node scripts/marca/generar-iconos.mjs`. El manifest se llama «Cumbra Fit».

## Lo que no cambia

Los identificadores internos siguen diciendo `appfit`: el nombre de la base IndexedDB, las claves de `localStorage` (`appfit-theme`, `appfit-cuenta`…), los ids `appfit:` del catálogo de ejercicios y la variable `APPFIT_BUILD_ID`. Cambiarlos haría que la app no encontrara los datos ya guardados. Los archivos que se descargan (copias, CSV, pósteres) pasan a empezar por `cumbra-fit-`; importar una copia antigua `appfit-backup-…` sigue funcionando porque se lee el contenido, no el nombre.

Siguen pendientes (ADR 063): el dominio, las redes, la marca en la OEPM y el paquete de Google Play `app.cumbrafit`.
