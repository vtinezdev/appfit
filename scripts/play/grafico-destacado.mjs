// Gráfico destacado de la ficha de Google Play (1024 × 500, PNG sin transparencia; docs/play/ficha.md): el logotipo de
// `src/shared/design/marca.ts`, el lema y el móvil con Inicio (de `scripts/web/capturas-conoce.cjs --play`).
//
// Uso (Node 22.18+, Playwright y Chromium fuera del proyecto, como en scripts/ui):
//   node scripts/web/capturas-conoce.cjs --play && node scripts/play/grafico-destacado.mjs
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { interiorIcono, svgLogotipo } from '../../src/shared/design/marca.ts'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const graficos = join(raiz, 'docs', 'play', 'graficos')
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const sharp = require('sharp')

// Colores de `tokens.css` en oscuro, los del icono instalado. El dibujo de la marca recibe los canales («R G B»).
const C = { fondo: '10 11 9', grafito: '22 23 20', marfil: '244 247 238', volt: '198 244 50', tenue: '195 199 186' }
const [FONDO, GRAFITO, MARFIL, VOLT, TENUE] = [C.fondo, C.grafito, C.marfil, C.volt, C.tenue].map((c) => `rgb(${c})`)
const datos = (ruta, tipo) => `data:${tipo};base64,${readFileSync(ruta).toString('base64')}`
const fuente = datos(join(raiz, 'public', 'fonts', 'saira-latin-variable.woff2'), 'font/woff2')
const captura = datos(join(graficos, 'captura-1-inicio.png'), 'image/png')

const icono = `<svg viewBox="0 0 100 100" width="88" height="88" aria-hidden="true"><rect width="100" height="100" rx="22" fill="${GRAFITO}"/>${interiorIcono(C.marfil, C.volt)}</svg>`
const { svg: logo, ancho } = svgLogotipo(0, 56, 56, { texto: C.marfil, acento: C.volt })

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Saira; src: url(${fuente}) format('woff2'); font-weight: 100 900; font-stretch: 50% 125%; }
* { margin: 0; box-sizing: border-box; }
body { width: 1024px; height: 500px; overflow: hidden; background: radial-gradient(ellipse at 78% 60%, rgb(42 51 17) 0%, ${FONDO} 58%); font-family: Saira, sans-serif; color: ${MARFIL}; position: relative; }
.texto { position: absolute; left: 72px; top: 84px; width: 560px; }
.marca { display: flex; align-items: center; gap: 22px; margin-bottom: 44px; }
h1 { font-size: 58px; line-height: 1.02; font-weight: 800; font-stretch: 75%; letter-spacing: -0.5px; }
h1 span { color: ${VOLT}; }
p { margin-top: 22px; font-size: 25px; font-weight: 500; color: ${TENUE}; }
.movil { position: absolute; right: 70px; top: 52px; width: 262px; height: 520px; border-radius: 38px; padding: 9px; background: rgb(30 31 27); box-shadow: 0 30px 80px rgb(0 0 0 / .55), inset 0 0 0 1px rgb(255 255 255 / .08); transform: rotate(5deg); }
.movil img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 30px; }
</style></head><body>
<div class="texto">
  <div class="marca">${icono}<svg viewBox="0 0 ${ancho} 56" width="${ancho}" height="56">${logo}</svg></div>
  <h1>Nutrición y gimnasio,<br><span>en tu móvil</span></h1>
  <p>Gratis · Sin anuncios · Tus datos en tu móvil</p>
</div>
<div class="movil"><img src="${captura}" alt=""></div>
</body></html>`

const navegador = await chromium.launch(process.env.APPFIT_CHROMIUM ? { executablePath: process.env.APPFIT_CHROMIUM } : {})
try {
  const pagina = await navegador.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })
  await pagina.setContent(html)
  await pagina.evaluate(() => document.fonts.ready)
  await sharp(await pagina.screenshot()).removeAlpha().png().toFile(join(graficos, 'destacado-1024x500.png'))
} finally { await navegador.close() }
console.log(`Gráfico destacado en ${join(graficos, 'destacado-1024x500.png')}`)
