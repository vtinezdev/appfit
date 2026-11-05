# 063 — Nombre y marca: Cumbra Fit

Fecha: 2026-11-04. Estado: implementada. Sustituye el nombre provisional «AppFit». La criba de nombres está en `docs/nombre-vetta.md`.

## Contexto y decisión

Víctor elige **Cumbra Fit** para abrir la app a otras personas: «cumbra» suena a «cumbre» (la meta, llegar arriba) y enlaza con Cumbres, sin ser una palabra del diccionario, lo que la hace más fácil de registrar. Tras varias rondas en un lienzo de diseño, aprueba:

- **Logotipo** (dentro de la app): «CUMBRA» con letras talladas propias que suben como una ladera, la M normal y la A sin travesaño como cumbre, con dos montañas pequeñas dentro. «FIT» va aparte, pequeño, en la letra de los rótulos. La cumbre y «FIT» van en `accent-strong` (volt claro en oscuro, oliva en claro, por contraste); el resto, en el color del texto.
- **Icono de la pantalla de inicio**: la misma A en marfil sobre grafito, con una **mancuerna en volt como travesaño** (el gimnasio) y las montañas debajo de la barra. Se descartaron la hoja y el tenedor para la nutrición, y las versiones demasiado de montaña: la app es de entreno y comida, y la cumbre queda como metáfora.
- **Icono dentro de la app**: el mismo dibujo en blanco y negro según el tema, en un círculo.
- **Textos**: «Cumbra Fit» siempre, también en etiquetas cortas (la pestaña «Cumbra Fit | Tuyas» de Recetas).

## Dónde vive

- Dibujo único en `src/shared/design/marca.ts` (icono, logotipo y su versión SVG para imágenes). Componentes en `src/shared/components/Marca.tsx`: `MarcaLogotipo`, `MarcaIcono`, `MarcaFirma` (icono + logotipo) e `IconoApp` (el icono instalado).
- Aparece en el pie de Ajustes y la pantalla de error (firma), en «Primeros pasos» y en el aviso de traslado de Inicio (icono instalado), y en el pie de los pósteres de entreno y de «Tu mes» («Hecho con» + logotipo). Víctor revisa las capturas y aprueba los cuatro sitios.
- Iconos de la PWA (`public/favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` con el dibujo dentro del círculo seguro) generados con `node scripts/marca/generar-iconos.mjs`. El manifest se llama «Cumbra Fit».

## Lo que no cambia

Los identificadores internos siguen diciendo `appfit`: el nombre de la base IndexedDB, las claves de `localStorage` (`appfit-theme`, `appfit-cuenta`…), los ids `appfit:` del catálogo de ejercicios y la variable `APPFIT_BUILD_ID`. Cambiarlos haría que la app no encontrara los datos ya guardados. Los archivos que se descargan (copias, CSV, pósteres) pasan a empezar por `cumbra-fit-`; importar una copia antigua `appfit-backup-…` sigue funcionando porque se lee el contenido, no el nombre.
