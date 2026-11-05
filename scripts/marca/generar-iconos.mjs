// Genera los iconos de la PWA desde el dibujo de `src/shared/design/marca.ts` (ADR 064): `public/favicon.svg` y los PNG
// de 180 (apple-touch), 192, 512 y 512 maskable. Grafito, con la A en marfil y la mancuerna en volt.
//
// Uso (Node 22.18+ entiende el TypeScript de marca.ts; Playwright y Chromium fuera del proyecto, como en scripts/ui):
//   node scripts/marca/generar-iconos.mjs
// Se ejecuta a mano cuando cambia el dibujo; los archivos generados se versionan.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { interiorIcono } from '../../src/shared/design/marca.ts'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const publico = (nombre) => join(raiz, 'public', nombre)

// Colores fijos del icono instalado: no dependen del tema (son los de `tokens.css` en oscuro).
const GRAFITO = '22 23 20'
const MARFIL = '244 247 238'
const VOLT = '198 244 50'

const svg = ({ radio = 0, escala = 1 } = {}) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
  + `<rect width="100" height="100" rx="${radio}" fill="rgb(${GRAFITO})"/>`
  + `<g transform="translate(50 50) scale(${escala}) translate(-50 -50)">${interiorIcono(MARFIL, VOLT)}</g></svg>\n`

writeFileSync(publico('favicon.svg'), svg({ radio: 22 }))

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const navegador = await chromium.launch(process.env.APPFIT_CHROMIUM ? { executablePath: process.env.APPFIT_CHROMIUM } : {})
const pagina = await navegador.newPage({ deviceScaleFactor: 1 })
// Cuadrados a sangre (iOS y Android redondean ellos); la maskable deja el dibujo dentro del círculo seguro del 80 %.
for (const [nombre, lado, escala] of [['apple-touch-icon.png', 180, 1], ['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['icon-maskable-512.png', 512, 0.8]]) {
  await pagina.setViewportSize({ width: lado, height: lado })
  await pagina.setContent(`<style>html,body{margin:0}svg{display:block;width:${lado}px;height:${lado}px}</style>${svg({ escala })}`)
  await pagina.screenshot({ path: publico(nombre), omitBackground: false })
  console.log(`public/${nombre}`)
}
await navegador.close()
console.log('public/favicon.svg')
