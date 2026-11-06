import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MANIFEST } from './src/shared/pwa/manifest.ts'
import { RUTAS_ESTATICAS_SW } from './src/shared/lib/legal.ts'
import { cabecerasConSupabase } from './src/shared/seguridad/cspSupabase.ts'

/**
 * Las cabeceras de `public/_headers` (las que aplica Cloudflare en producción) para `npm run preview`: así los recorridos de
 * navegador sobre la build prueban la app con la misma política de seguridad. Solo el bloque `/*`, que es el único.
 */
function cabecerasDeProduccion(supabase: string | undefined): Record<string, string> {
  const cabeceras: Record<string, string> = {}
  for (const linea of cabecerasConSupabase(readFileSync(new URL('./public/_headers', import.meta.url), 'utf8'), supabase).split('\n')) {
    const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(linea)
    if (m) cabeceras[m[1]] = m[2].trim()
  }
  return cabeceras
}

// La página y el fichero remoto comparten el mismo identificador, también en builds sin commit nuevo.
const versionApp = { id: process.env.APPFIT_BUILD_ID ?? randomUUID(), fecha: new Date().toISOString() }

export default defineConfig(({ mode }) => {
  // Incluye las variables del entorno de la build (Cloudflare), no solo las de los .env.
  const supabase = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL
  let salida = 'dist'
  return {
    define: { __APP_VERSION__: JSON.stringify(versionApp) },
    preview: { headers: cabecerasDeProduccion(supabase) },
    plugins: [
      react(),
      {
        // `_headers` de la build con el proyecto de Supabase exacto en la CSP (shared/seguridad/cspSupabase.ts).
        name: 'appfit-csp-supabase',
        apply: 'build',
        configResolved(config) { salida = resolve(config.root, config.build.outDir) },
        closeBundle() {
          const ruta = `${salida}/_headers`
          writeFileSync(ruta, cabecerasConSupabase(readFileSync(ruta, 'utf8'), supabase))
        },
      },
      {
        name: 'appfit-version',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(versionApp) })
        },
      },
      VitePWA({
        registerType: 'prompt',
        // shared/pwa/actualizaciones registra y aplica el SW al pedirlo la persona.
        injectRegister: false,
        includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
        manifest: MANIFEST,
        workbox: {
          skipWaiting: false,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
          // Las imágenes de ejercicios (~0,5 MB) tampoco: se guardan al verlas por primera vez (regla de abajo).
          // La web de la app y sus capturas (~0,3 MB) tampoco: no hacen falta para usarla.
          globIgnores: ['ejercicios/**', 'conoce/**', 'conoce.html', 'conoce.css'],
          // Las páginas legales y la web de la app (shared/lib/legal.ts) se abren como lo que son, también desde la PWA instalada.
          navigateFallbackDenylist: RUTAS_ESTATICAS_SW,
          // El .wasm del escáner (~1 MB) no se precachea: pesaría en cada instalación y el escáner casi siempre
          // necesita conexión (Open Food Facts). Se guarda la primera vez que se usa y después funciona sin red.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
              handler: 'CacheFirst',
              options: { cacheName: 'wasm', expiration: { maxEntries: 4 } },
            },
            // Lugares de España (~300 KB) para las rutas propias de Caminos: solo hacen falta al crear o editar una ruta.
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/lugares/'),
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'lugares', expiration: { maxEntries: 4 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/ejercicios/'),
              handler: 'CacheFirst',
              options: { cacheName: 'ejercicios', expiration: { maxEntries: 200 } },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'node',
      setupFiles: ['./src/test/setup-db.ts'],
      // `.claude/` puede contener copias de trabajo de otras ramas (worktrees): sus tests no son de esta rama.
      exclude: [...configDefaults.exclude, '.claude/**'],
    },
  }
})
