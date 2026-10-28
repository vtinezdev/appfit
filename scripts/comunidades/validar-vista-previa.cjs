/* Solo el visor aislado en appfit-test.localhost; no se importa la app ni se crea una cuenta. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')

const BASE = process.env.APPFIT_COMUNIDADES_URL || 'http://appfit-test.localhost:5187/scripts/comunidades/vista-previa.html'
assert.equal(new URL(BASE).hostname, 'appfit-test.localhost')
assert.ok(new URL(BASE).pathname.endsWith('/scripts/comunidades/vista-previa.html'))
const salida = process.env.APPFIT_COMUNIDADES_OUTPUT || '/tmp/appfit-imagenes-comunidades'
fs.mkdirSync(salida, { recursive: true })

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const informe = []
  try {
    for (const c of [...[320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme, grande: false }))), ...['light', 'dark'].map(theme => ({ width: 375, theme, grande: true }))]) {
      const caso = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      const context = await browser.newContext({ viewport: { width: c.width, height: 1000 }, colorScheme: c.theme, serviceWorkers: 'block' })
      try {
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(BASE)
        await page.getByRole('heading', { name: 'Imágenes de comunidades', exact: true }).waitFor()
        await page.evaluate(({ theme, grande }) => { document.documentElement.dataset.theme = theme; if (grande) document.documentElement.style.fontSize = '200%' }, c)
        await page.evaluate(() => document.fonts.ready)
        const opciones = page.getByRole('list', { name: 'Catálogo de imágenes de comunidades', exact: true }).getByRole('button')
        assert.equal(await opciones.count(), 36)
        const tamanos = await page.evaluate(() => ({ lista: document.querySelector('[aria-label="Vista de lista"] .app-avatar').getBoundingClientRect().width, cabecera: document.querySelector('[aria-label="Vista de cabecera"] .app-avatar').getBoundingClientRect().width }))
        assert.deepEqual(tamanos, { lista: c.grande ? 80 : 40, cabecera: c.grande ? 160 : 80 })
        const imagenes = await page.locator('fieldset button img').evaluateAll(imgs => imgs.map(i => i.src))
        assert.equal(imagenes.length, 36)
        const decodificadas = await page.evaluate(async urls => Promise.all(urls.map(url => new Promise(resolve => { const i = new Image(); i.onload = () => resolve(i.naturalWidth === 256 && i.naturalHeight === 256); i.onerror = () => resolve(false); i.src = url }))), imagenes)
        assert.ok(decodificadas.every(Boolean), `${caso}: las 36 imágenes se decodifican`)
        const desbordados = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().width && (e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1)).map(e => e.tagName + '.' + e.className))
        assert.deepEqual(desbordados, [], `${caso}: sin contenido fuera de pantalla`)
        const targets = await opciones.evaluateAll(elements => elements.map(e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })))
        assert.ok(targets.every(t => t.width >= 44 && t.height >= 44), `${caso}: zonas táctiles`)
        await page.screenshot({ path: `${salida}/${caso}.png` })
        const buscar = page.getByRole('searchbox', { name: 'Buscar imagen de comunidad' })
        await buscar.fill('padel')
        assert.equal(await opciones.count(), 1)
        await opciones.first().focus()
        await page.keyboard.press('Enter')
        assert.equal(await page.getByLabel('Identificador seleccionado').textContent(), 'lugar.pista-cristal')
        assert.equal(await opciones.first().getAttribute('aria-pressed'), 'true')
        await page.waitForFunction(() => document.querySelector('[aria-label="Vista de cabecera"] img')?.complete && document.querySelector('[aria-label="Vista de cabecera"] img')?.naturalWidth === 256)
        await buscar.fill('sin coincidencias')
        await page.getByText('No hay imágenes con esa búsqueda.', { exact: true }).waitFor()
        await buscar.fill('')
        await page.getByLabel('Tipo de deporte', { exact: true }).selectOption('combate')
        assert.equal(await opciones.count(), 2)
        await page.getByLabel('Tipo de deporte', { exact: true }).selectOption('')
        await page.getByRole('button', { name: 'Usar las iniciales', exact: true }).click()
        assert.equal(await page.getByLabel('Identificador seleccionado').textContent(), 'Iniciales')
        assert.equal(await page.locator('[aria-label="Vista de cabecera"] img').count(), 0)
        assert.equal(await page.locator('[aria-label="Vista de cabecera"] .app-avatar').textContent(), 'CA')
        await page.getByRole('button', { name: 'Simular guardado' }).click()
        assert.ok(await buscar.isDisabled())
        assert.ok(await page.getByRole('button', { name: 'Usar las iniciales', exact: true }).isDisabled())
        assert.ok(await opciones.first().isDisabled())
        await page.getByRole('button', { name: 'Simular guardado' }).click()
        assert.ok(await buscar.isEnabled())
        if (caso === '375-light') {
          // Una descarga fallida vuelve al monograma; elegir otra imagen sigue funcionando.
          await page.route('**/campamento.webp*', route => route.request().resourceType() === 'image' ? route.abort() : route.continue())
          await page.reload()
          await page.waitForFunction(() => document.querySelector('[aria-label="Vista de cabecera"] .app-avatar')?.textContent === 'CA')
          await buscar.fill('baloncesto')
          await opciones.first().click()
          await page.waitForFunction(() => document.querySelector('[aria-label="Vista de cabecera"] img')?.naturalWidth === 256)
        }
        assert.deepEqual(errores, [], `${caso}: sin errores de ejecución`)
        informe.push({ caso, opciones: imagenes.length, tamanos, resultado: 'OK' })
      } finally { await context.close() }
    }
    fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2) + '\n')
    console.log(JSON.stringify(informe))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
