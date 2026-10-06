/* Contextos desechables, datos sintéticos y origen separado del perfil personal. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-referencias'
const nutrientes = { fibra: 'Fibra', azucares: 'Azúcares', sal: 'Sal', agSat: 'Grasas saturadas' }

async function backup(page) {
  return page.evaluate(async () => {
    const r = await import('/src/shared/lib/backup.ts')
    const b = await r.exportarBackup(); delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function layout(page) {
  const estado = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    // El abanico usa deliberadamente un origen de 1 px y destinos posicionados;
    // se miden sus botones, no el ancho del punto de origen.
    const elementos = [...document.querySelectorAll('main,[role="dialog"]:not(.fan-dialog),[data-nutriente],.fan-target,button,a')].filter(visible)
    return {
      overflow: elementos.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.getAttribute('aria-label') || e.textContent.trim()),
      tacto: elementos.filter(e => e.matches('button,a') && e.getBoundingClientRect().height < 43.9).map(e => e.textContent.trim()),
    }
  })
  assert.deepEqual(estado, { overflow: [], tacto: [] })
}
async function capture(page, etiqueta, estado) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  await page.screenshot({ path: path.join(salida, `${etiqueta}-${estado}.png`) })
  await layout(page)
}
async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const resultados = []
  const vistas = [320, 375, 430, 1440].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, height: width === 320 ? 568 : 900, colorScheme, grande: false })))
  vistas.push(...['light', 'dark'].map(colorScheme => ({ width: 375, height: 812, colorScheme, grande: true })))
  try {
    for (const vista of vistas) {
      const etiqueta = `${vista.width}-${vista.colorScheme}${vista.grande ? '-texto200-reduce' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const context = await browser.newContext({ viewport: { width: vista.width, height: vista.height }, colorScheme: vista.colorScheme, reducedMotion: vista.grande ? 'reduce' : 'no-preference', hasTouch: true })
      const caso = { etiqueta, correcto: false }
      try {
        await context.route('**/world.openfoodfacts.org/**', route => route.abort())
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async () => {
          const s = await import('/src/shared/db/settings.ts')
          await s.updateSettings({ objetivos: { kcal: 1800, prot: 120, carb: 240, grasa: 40 } })
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const fecha = d.todayISO()
          const item = (nombre, nutrientes) => ({ nombre, gramos: 100, kcal100: 100, prot100: 5, carb100: 20, grasa100: 0, nutrientes, fuenteSiNuevo: 'manual' })
          await r.guardarComida({ fecha, comida: 'comida', nombrePlato: 'Plato de prueba', items: [item('Alimento conocido', { fibra: 0, azucares: 35, sal: 0.5, agSat: 10 }), item('Alimento parcialmente conocido', { fibra: 5, azucares: 15, sal: 1.25 })] })
          await r.anadirRapida({ fecha, comida: 'snack', nombre: 'Registro sin datos adicionales', kcal: 80, prot: 0, carb: 0, grasa: 0 })
        })
        const antes = await backup(page)
        await navegar(page, 'Nutrición')
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        const desglose = page.getByRole('region', { name: 'Desglose del día', exact: true })
        await desglose.locator('[data-nutriente="fibra"]').waitFor()
        assert.equal(await desglose.getByRole('progressbar').count(), 4)
        assert.doesNotMatch(await desglose.innerText(), /Mín\.|Máx\.|sin máximo|Referencias diarias y fuentes|who.int/)
        assert.equal(await desglose.getByText('Información disponible en 2 de 3 alimentos', { exact: true }).count(), 3)
        assert.equal(await desglose.getByText('Información disponible en 1 de 3 alimentos', { exact: true }).count(), 1)
        assert.equal(await desglose.locator('[data-nutriente="fibra"] dd').textContent(), '5 g')
        await desglose.scrollIntoViewIfNeeded()
        await capture(page, etiqueta, 'consumo')
        for (const [id, nombre] of Object.entries(nutrientes)) {
          const info = desglose.getByRole('button', { name: `Información sobre ${nombre}`, exact: true })
          await info.click()
          const sheet = page.getByRole('dialog', { name: nombre, exact: true })
          await sheet.waitFor()
          await page.waitForFunction(() => document.querySelector('.sheet-layer')?.dataset.visible === 'true')
          const texto = await sheet.innerText()
          assert.match(texto, /Referencia diaria/)
          assert.match(texto, /Criterio utilizado/)
          assert.match(texto, /Fuente/)
          if (id === 'azucares') { assert.match(texto, /90 g\/día/); assert.match(texto, /No es un máximo recomendado/); assert.match(texto, /azúcares libres/) }
          if (id === 'agSat') assert.match(texto, /≤ 20 g\/día/)
          await capture(page, etiqueta, `info-${id}`)
          // Cerrar rápido, Escape y Atrás se apoyan en la misma capa compartida.
          if (id === 'fibra') await sheet.getByRole('button', { name: 'Cerrar', exact: true }).click()
          else if (id === 'sal') await page.goBack()
          else await page.keyboard.press('Escape')
          await sheet.waitFor({ state: 'detached' })
          assert.equal(await info.evaluate(el => document.activeElement === el), true)
          await info.click(); await sheet.waitFor(); await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'detached' })
        }
        const info = desglose.getByRole('button', { name: 'Información sobre Grasas saturadas', exact: true })
        await info.click()
        await page.getByRole('dialog', { name: 'Grasas saturadas', exact: true }).getByRole('button', { name: 'Ver en Referencias', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        await page.getByRole('heading', { name: 'Referencias', exact: true }).waitFor()
        const agSat = page.locator('[data-referencia="agSat"]')
        await agSat.getByRole('button').waitFor()
        assert.equal(await agSat.getByRole('button').getAttribute('aria-expanded'), 'true')
        assert.match(await agSat.innerText(), /≤ 20 g\/día/)
        await page.waitForFunction(() => document.activeElement?.closest('[data-referencia]')?.dataset.referencia === 'agSat')
        await capture(page, etiqueta, 'salto-referencia')
        assert.equal(await page.locator('[data-app-shell]').evaluate(el => el.inert), false)
        await page.getByRole('button', { name: 'Volver a Referencias', exact: true }).click()
        await page.getByRole('button', { name: /Catálogo de alimentos/ }).waitFor()
        await capture(page, etiqueta, 'indice')
        for (const [area, titulo] of [['catalogo', 'Catálogo de alimentos'], ['objetivos', 'Objetivos nutricionales'], ['energia', 'Energía y objetivo'], ['alimentarias', 'Recomendaciones alimentarias'], ['datos', 'Sobre los datos']]) {
          await page.locator(`[data-area="${area}"]`).click()
          await page.getByRole('heading', { name: titulo, exact: true }).waitFor()
          if (area === 'catalogo') {
            assert.equal(await page.getByRole('link').count(), 2)
            assert.equal(await page.getByRole('link', { name: 'Consultar ANSES · CIQUAL 2025', exact: true }).getAttribute('href'), 'https://ciqual.anses.fr')
            assert.doesNotMatch(await page.locator('main').innerText(), /USDA|BEDCA/)
          }
          if (area === 'objetivos') {
            for (const id of ['kcal', 'prot', 'carb', 'grasa', 'fibra', 'azucares', 'sal', 'agSat']) {
              const bloque = page.locator(`[data-referencia="${id}"]`)
              await bloque.getByRole('button').click()
              assert.match(await bloque.innerText(), /Criterio utilizado/)
              if (id === 'kcal') assert.match(await bloque.innerText(), /1.800 kcal\/día/)
              if (id === 'prot') assert.match(await bloque.innerText(), /120 g\/día/)
              if (id === 'azucares') assert.match(await bloque.innerText(), /No es un máximo recomendado/)
              await bloque.getByRole('button').click()
            }
          }
          if (area === 'alimentarias') {
            assert.match(await page.locator('main').innerText(), /Recomendaciones aún no definidas/)
            assert.doesNotMatch(await page.locator('main').innerText(), /\d.*raciones/)
          }
          if (area === 'datos') assert.match(await page.locator('main').innerText(), /Sin datos no significa cero/)
          await capture(page, etiqueta, area)
          await page.getByRole('button', { name: 'Volver a Referencias', exact: true }).click()
          await page.waitForFunction(area => document.activeElement?.dataset.area === area, area)
        }
        await page.getByRole('button', { name: 'Menú', exact: true }).click()
        const menu = page.getByRole('dialog', { name: 'Menú', exact: true })
        await page.waitForFunction(() => document.querySelector('.fan-menu')?.dataset.visible === 'true')
        await menu.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))))
        const medidas = await menu.locator('.fan-target').evaluateAll(buttons => buttons.map(b => ({ label: b.getAttribute('aria-label'), rect: b.getBoundingClientRect().toJSON() })))
        assert.equal(medidas.length, 5)
        for (const { rect } of medidas) assert.ok(rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidthFromVista(vista))
        await capture(page, etiqueta, 'menu')
        await menu.getByRole('button', { name: 'Nutrición', exact: true }).click()
        await menu.waitFor({ state: 'detached' })
        await page.getByRole('heading', { name: 'Nutrición', exact: true }).waitFor()
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        assert.equal(await desglose.locator('[data-nutriente="fibra"] dd').textContent(), '5 g')
        assert.deepEqual(await backup(page), antes, 'consultar referencias y navegar no cambia el backup')
        assert.deepEqual(errores, [])
        caso.correcto = true
      } catch (e) { caso.error = e.stack || String(e) }
      finally { await context.close() }
      resultados.push(caso)
      console.log(`${etiqueta}: ${caso.correcto ? 'OK' : caso.error}`)
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(salida, 'informe.json'), JSON.stringify({ origen: ORIGEN, casos: resultados }, null, 2))
  assert.ok(resultados.length && resultados.every(c => c.correcto), 'todos los contextos deben pasar')
}
function innerWidthFromVista(vista) { return vista.width + 1 }
main().catch(e => { console.error(e); process.exitCode = 1 })
