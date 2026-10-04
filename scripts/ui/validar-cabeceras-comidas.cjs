/* Datos sintéticos y perfiles desechables; nunca accede al origen personal. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-cabeceras-comidas'
const comidas = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }

async function registros(page) {
  return page.evaluate(async () => {
    const r = await import('/src/features/nutricion/data/entriesRepo.ts')
    const d = await import('/src/shared/lib/dates.ts')
    return r.delDia(d.todayISO())
  })
}
async function geometria(page, selector = '.meal-header') {
  return page.locator(selector).evaluateAll(headers => headers.map(header => {
    const bounds = header.getBoundingClientRect()
    const content = [...header.querySelectorAll('h2,p,.meal-header-energy,button')]
    const rects = content.map(e => e.getBoundingClientRect())
    return {
      titulo: header.querySelector('h2').textContent,
      dentro: rects.every(r => r.left >= bounds.left && r.right <= bounds.right + 1 && r.top >= bounds.top && r.bottom <= bounds.bottom + 1),
      sinSolapes: rects.every((r, i) => rects.slice(i + 1).every(s => r.right <= s.left + 1 || s.right <= r.left + 1 || r.bottom <= s.top + 1 || s.bottom <= r.top + 1)),
      sinOverflow: [header, ...content].every(e => e.scrollWidth <= e.clientWidth + 1),
      tacto: [...header.querySelectorAll('button')].every(e => { const r = e.getBoundingClientRect(); return r.width >= 43.9 && r.height >= 43.9 }),
    }
  }))
}
function comprobar(resultados) {
  for (const resultado of resultados) {
    assert.ok(resultado.dentro, `${resultado.titulo}: contenido dentro de la cabecera`)
    assert.ok(resultado.sinSolapes, `${resultado.titulo}: sin solapes`)
    assert.ok(resultado.sinOverflow, `${resultado.titulo}: sin truncar contenido`)
    assert.ok(resultado.tacto, `${resultado.titulo}: controles ≥44 px`)
  }
}
async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = []
  try {
    const vistas = [320, 375, 430, 1440].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, colorScheme, grande: false })))
    vistas.push(...['light', 'dark'].map(colorScheme => ({ width: 375, colorScheme, grande: true })))
    for (const vista of vistas) {
      const etiqueta = `${vista.width}-${vista.colorScheme}${vista.grande ? '-texto200-reduce' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const context = await browser.newContext({ viewport: { width: vista.width, height: vista.width === 320 ? 568 : 900 }, colorScheme: vista.colorScheme, reducedMotion: vista.grande ? 'reduce' : 'no-preference', hasTouch: true })
      const caso = { etiqueta, correcto: false }
      try {
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await context.route('**/world.openfoodfacts.org/**', route => route.abort())
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async () => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const fecha = d.todayISO()
          const item = (nombre, gramos, kcal100) => ({ nombre, gramos, kcal100, prot100: 0, carb100: 0, grasa100: 0, fuenteSiNuevo: 'manual' })
          await r.guardarComida({ fecha, comida: 'desayuno', nombrePlato: 'Tortilla francesa', items: [item('Huevos', 150, 140), item('Aceite de oliva', 10, 900)] })
          await r.anadirRapida({ fecha, comida: 'comida', nombre: 'Arroz integral', kcal: 712, prot: 0, carb: 0, grasa: 0 })
          await r.guardarComida({ fecha, comida: 'cena', nombrePlato: 'Pollo con verduras', items: [item('Pollo', 200, 165), item('Verduras', 200, 35)] })
        })
        const antes = await registros(page)
        await navegar(page, 'Nutrición')
        await page.getByRole('heading', { name: 'Desayuno', exact: true }).waitFor()
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        await page.evaluate(() => document.fonts.ready)
        await page.getByRole('button', { name: /^Tortilla francesa/ }).click()
        // Captura todo el diario desplazable, no solo la parte visible de la pantalla.
        const main = page.locator('main')
        const estilo = await main.getAttribute('style')
        await main.evaluate(el => { el.style.height = `${el.scrollHeight}px`; el.style.flex = 'none' })
        await page.screenshot({ path: path.join(salida, `${etiqueta}-diario.png`), fullPage: true })
        await main.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), estilo)
        comprobar(await geometria(page))
        for (const [comida, titulo] of Object.entries(comidas)) {
          const section = page.locator(`[data-comida="${comida}"]`)
          const header = section.locator('.meal-header')
          const entradas = antes.filter(e => e.comida === comida)
          const total = entradas.reduce((sum, e) => sum + e.kcal, 0)
          const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(total)
          assert.equal(await header.locator('h2').textContent(), titulo)
          assert.equal(await header.locator('.meal-header-meta').textContent(), entradas.length ? `${entradas.length} ${entradas.length === 1 ? 'registro' : 'registros'}` : 'Sin registros')
          assert.equal(await header.locator('.meal-header-energy .tabular').textContent(), formatted)
          const more = header.getByRole('button', { name: `Acciones de ${titulo}`, exact: true })
          await more.click()
          const dialog = page.getByRole('dialog', { name: 'Acciones', exact: true })
          await dialog.waitFor()
          assert.equal(await dialog.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).isDisabled(), !entradas.length)
          await page.keyboard.press('Escape')
          await dialog.waitFor({ state: 'detached' })
          await assert.doesNotReject(() => more.evaluate(el => { if (document.activeElement !== el) throw Error('Foco no restaurado') }))
        }
        await page.locator('[data-comida="snack"]').getByRole('button', { name: 'Añadir', exact: true }).click()
        const anadir = page.getByRole('dialog').last()
        await anadir.waitFor()
        await page.keyboard.press('Escape')
        await anadir.waitFor({ state: 'detached' })
        assert.deepEqual(await registros(page), antes, 'navegar/abrir/cancelar conserva todos los registros')

        // Títulos/extremos fuera de los datos de producto, montando el componente real.
        await page.evaluate(async () => {
          const resources = performance.getEntriesByType('resource').map(r => r.name)
          const reactURL = resources.find(url => /\/deps\/react\.js\?/.test(url))
          const domURL = resources.find(url => /\/deps\/react-dom_client\.js\?/.test(url))
          const [react, dom, { default: Cabecera }] = await Promise.all([import(reactURL), import(domURL), import('/src/features/nutricion/components/CabeceraComida.tsx')])
          const React = react.default ?? react
          const host = document.createElement('div')
          host.id = 'cabeceras-extremas'
          host.className = 'mx-auto w-full max-w-app space-y-3 px-page py-section'
          document.body.append(host)
          const root = (dom.default ?? dom).createRoot(host)
          root.render(React.createElement(Cabecera, { comida: 'desayuno', titulo: 'Desayuno después del entrenamiento matutino', kcal: 123456789, registros: 1234, onAcciones: () => { host.dataset.accion = 'true' } }))
          window.__cabeceraPrueba = { root, host }
        })
        const extremo = page.locator('#cabeceras-extremas')
        await extremo.locator('h2').waitFor()
        await extremo.scrollIntoViewIfNeeded()
        await extremo.screenshot({ path: path.join(salida, `${etiqueta}-extremo.png`) })
        comprobar(await geometria(page, '#cabeceras-extremas .meal-header'))
        assert.equal(await extremo.locator('.meal-header-energy .tabular').textContent(), '123.456.789')
        await extremo.getByRole('button').click()
        assert.equal(await extremo.getAttribute('data-accion'), 'true')
        await page.evaluate(() => { window.__cabeceraPrueba.root.unmount(); window.__cabeceraPrueba.host.remove(); delete window.__cabeceraPrueba })
        assert.deepEqual(errores, [], 'sin excepciones del navegador')
        caso.correcto = true
      } catch (e) { caso.error = e.stack || String(e) }
      finally { await context.close() }
      casos.push(caso)
      console.log(`${etiqueta}: ${caso.correcto ? 'OK' : caso.error}`)
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(salida, 'informe.json'), JSON.stringify({ origen: ORIGEN, casos }, null, 2))
  assert.ok(casos.length && casos.every(c => c.correcto), 'todas las configuraciones deben pasar')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
