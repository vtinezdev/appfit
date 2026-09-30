# 001 — PWA con los datos solo en el dispositivo

- **Estado**: vigente (desde la sesión 01)
- **Historia**: `PROCESO.md` §0–§13; alternativas descartadas en `../roadmap.md` § Descartadas.

## Contexto

App de uso personal para un iPhone, sin publicarla en tiendas y con coste 0 €. Un APK no sirve en iOS y la App Store no encaja con un proyecto personal.

## Decisión

- **PWA** instalable desde Safari («Añadir a pantalla de inicio»), construida con Vite + React.
- **Sin backend ni cuentas**: todos los datos en IndexedDB del dispositivo, con Dexie.
- **Hosting estático gratuito** (Cloudflare Workers con static assets): solo sirve los archivos de la app, nunca datos.

## Consecuencias

- Privacidad total y coste 0; la app funciona sin conexión (service worker de Workbox).
- **El backup JSON es la única copia de seguridad** y la única forma de cambiar de móvil: no hay sincronización.
- Todo lo que necesite un servidor queda fuera: notificaciones push, sincronización entre dispositivos, compartir hacia la app (Web Share Target no existe en iOS).
- En iOS, Safari y la PWA instalada tienen almacenamientos separados: un enlace abierto en Safari no ve los datos de la app.
- Lo que depende de WebKit (rendimiento de IndexedDB, cámara, safe areas) solo se confirma en el iPhone real.
