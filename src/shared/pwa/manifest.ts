// Manifest de la PWA, que vite-plugin-pwa escribe en `manifest.webmanifest` (vite.config.ts). Es también lo que leen
// Bubblewrap al generar el paquete de Google Play (`android/twa-manifest.json`, docs/despliegue.md) y Chrome al
// instalarla. Solo importa tipos: lo cargan a la vez la configuración de Vite (Node) y los tests.
// `manifest.test.ts` vigila que la TWA y este manifest no se separen.
import type { ManifestOptions } from 'vite-plugin-pwa'

/** Grafito del tema oscuro: barra de estado, pantalla de arranque y `theme-color` de `index.html`. */
// design-guard-allow: hex-color — el manifest y la TWA no pueden leer variables CSS
export const COLOR_MARCA = '#0a0b09'

export const MANIFEST = {
  // Identidad estable entre builds; el almacenamiento sigue ligado al mismo origen.
  id: '/',
  name: 'Cumbra Fit',
  short_name: 'Cumbra Fit',
  description: 'Comidas, entrenos y actividades en tu móvil. Gratis, sin anuncios y con tus datos en el dispositivo.',
  lang: 'es',
  dir: 'ltr',
  categories: ['health', 'fitness', 'food', 'sports'],
  theme_color: COLOR_MARCA,
  background_color: COLOR_MARCA,
  display: 'standalone',
  // Diseñada para el móvil en vertical (DESIGN.md); en Android la TWA hereda esta orientación.
  orientation: 'portrait',
  start_url: '/',
  scope: '/',
  prefer_related_applications: false,
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
} satisfies Partial<ManifestOptions>
