/* Cabeceras de seguridad sobre la build (`npm run preview` en 5174 aplica public/_headers, como Cloudflare): la respuesta
   las trae, la app abre todos sus destinos sin una sola violación de la política de contenido (CSP), el lector de códigos
   (WebAssembly) compila, Open Food Facts y Supabase están permitidos y cualquier otro origen queda bloqueado. Perfil
   desechable, sin datos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium, devices } = require('playwright')
const { navegar } = require('./navegar.cjs')

const ORIGEN = 'http://appfit-test.localhost:5174'
const CABECERAS = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'cross-origin-opener-policy', 'permissions-policy']

async function main() {
  const wasm = fs.readdirSync(path.join(__dirname, '../../dist/assets')).find(f => f.endsWith('.wasm'))
  assert.ok(wasm, 'la build incluye el .wasm del lector de códigos')
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const context = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' })
  try {
    const page = await context.newPage()
    await page.addLocatorHandler(page.getByRole('button', { name: 'Genial', exact: true }), async (boton) => { await boton.click() })
    await page.addInitScript(() => {
      window.__violaciones = []
      document.addEventListener('securitypolicyviolation', e => window.__violaciones.push(`${e.effectiveDirective} ${e.blockedURI}`))
    })
    const errores = []
    page.on('pageerror', error => errores.push(error.message))
    page.on('console', m => { if (/Content Security Policy|Permissions policy/i.test(m.text())) errores.push(m.text()) })

    const respuesta = await page.goto(ORIGEN)
    const cabeceras = respuesta.headers()
    for (const c of CABECERAS) assert.ok(cabeceras[c], `falta la cabecera ${c}`)
    assert.match(cabeceras['content-security-policy'], /frame-ancestors 'none'/)

    await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
    for (const destino of ['Nutrición', 'Recetas', 'Entreno', 'Perfil', 'Ajustes', 'Referencias', 'Cumbres', 'Caminos', 'Ritmo', 'Vitrina', 'Inicio']) {
      await navegar(page, destino)
      await page.getByRole('main').getByRole('heading').first().waitFor()
    }

    const red = await page.evaluate(async (wasmUrl) => {
      const intento = async (url) => { try { await fetch(url, { mode: 'no-cors' }) } catch { /* sin red o bloqueado: lo dice la violación */ } }
      const modulo = await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer()).then(() => 'compila', (e) => e.message)
      const antes = window.__violaciones.length
      await intento('https://world.openfoodfacts.org/api/v2/product/0.json')
      await intento('https://proyecto-de-prueba.supabase.co/rest/v1/')
      const permitidas = window.__violaciones.slice(antes)
      await intento('https://origen-no-permitido.invalid/datos')
      await new Promise(r => setTimeout(r, 200))
      return { modulo, permitidas, bloqueada: window.__violaciones.slice(antes) }
    }, `/assets/${wasm}`)
    assert.equal(red.modulo, 'compila', 'el lector de códigos (WebAssembly) puede compilar')
    assert.deepEqual(red.permitidas, [], 'Open Food Facts y Supabase están permitidos')
    assert.ok(red.bloqueada.some(v => v.includes('origen-no-permitido.invalid')), 'un origen cualquiera queda bloqueado')

    const violaciones = await page.evaluate(() => window.__violaciones.filter(v => !v.includes('origen-no-permitido.invalid')))
    assert.deepEqual(violaciones, [], 'la app no provoca violaciones de la CSP')
    assert.deepEqual(errores.filter(e => !e.includes('origen-no-permitido.invalid')), [])
    console.log('Seguridad: cabeceras presentes, once destinos sin violaciones de la CSP, WebAssembly permitido, solo Open Food Facts y Supabase fuera del origen: correcto.')
  } finally { await context.close(); await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
