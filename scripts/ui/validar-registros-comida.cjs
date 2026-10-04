/* Registros equivalentes y acciones secundarias, en perfiles nuevos con datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const { ejecutarAccionPlato, desplegarPlato } = require('./acciones-plato.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-registros-comida'
const nombre = 'Café + Leche + Saladas'

async function backup(page) {
  return page.evaluate(async () => {
    const r = await import('/src/shared/lib/backup.ts')
    const datos = await r.exportarBackup(); delete datos.exportedAt
    return JSON.parse(JSON.stringify(datos))
  })
}
async function layout(page) {
  const resultado = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    const elementos = [...document.querySelectorAll('main,[role="dialog"]:not(.fan-dialog),[data-registro],button')].filter(visible)
    return {
      overflow: elementos.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.getAttribute('aria-label') || e.textContent.trim()),
      tacto: elementos.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.getAttribute('aria-label') || e.textContent.trim()),
    }
  })
  assert.deepEqual(resultado, { overflow: [], tacto: [] })
}
async function captura(page, etiqueta, estado) {
  await page.waitForFunction(() => !document.querySelector('.sheet-layer[data-visible="false"]'))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  await page.screenshot({ path: path.join(salida, `${etiqueta}-${estado}.png`) })
  await layout(page)
}
async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = []
  const vistas = [320, 375, 430, 1440].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, colorScheme, grande: false })))
  vistas.push(...['light', 'dark'].map(colorScheme => ({ width: 375, colorScheme, grande: true })))
  try {
    for (const vista of vistas) {
      const etiqueta = `${vista.width}-${vista.colorScheme}${vista.grande ? '-texto200-reduce' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const context = await browser.newContext({ viewport: { width: vista.width, height: vista.width === 320 ? 700 : 900 }, colorScheme: vista.colorScheme, reducedMotion: vista.grande ? 'reduce' : 'no-preference', hasTouch: true })
      const caso = { etiqueta, correcto: false }
      try {
        const page = await context.newPage(); page.setDefaultTimeout(10000)
        const errores = []; page.on('pageerror', e => errores.push(e.message))
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        await page.goto(origen)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async nombre => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts'); const fecha = d.todayISO()
          const item = (nombre, gramos, kcal100, prot100, carb100, grasa100) => ({ nombre, gramos, kcal100, prot100, carb100, grasa100, fuenteSiNuevo: 'manual' })
          await r.guardarComida({ fecha, comida: 'desayuno', nombrePlato: nombre, items: [item('Café', 100, 2, 0, 0, 0), item('Leche', 100, 90, 5, 7, 5), item('Saladas', 30, 450, 20, 50, 20)] })
          await r.guardarComida({ fecha, comida: 'desayuno', items: [item('Bizcocho', 40, 435, 5, 50, 25)] })
          await r.anadirRapida({ fecha, comida: 'snack', nombre: 'Registro rápido de prueba', kcal: 80, prot: 3, carb: 10, grasa: 3 })
          await r.guardarComida({ fecha, comida: 'cena', nombrePlato: 'Un conjunto con nombre muy largo para comprobar que no se recorta la descripción ni desaparecen sus cifras', items: [item('Ingrediente de cantidad grande', 999999, 100, 10, 50, 20), item('Otro ingrediente', 100, 100, 10, 50, 20)] })
        }, nombre)
        const antes = await backup(page)
        await navegar(page, 'Nutrición')
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        const desayuno = page.locator('[data-comida="desayuno"]')
        const grupo = desayuno.locator('[data-registro="plato"]')
        const grupoBoton = grupo.locator('.food-record-button').first()
        const individual = desayuno.locator('[data-registro="individual"]')
        const trigger = desayuno.getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true })
        await trigger.waitFor()
        const estadoProtegido = await page.evaluate(() => ({ cabecera: document.querySelector('[data-comida="desayuno"] .meal-header').outerHTML, resumen: document.querySelector('.nutrition-summary').outerHTML, nav: document.querySelector('.app-nav').outerHTML }))
        assert.equal(await grupoBoton.getAttribute('aria-expanded'), 'false')
        assert.equal(await grupoBoton.locator('[data-record-kcal]').innerText(), '227')
        assert.equal(await grupoBoton.locator('[data-record-macros]').innerText(), 'P 11 · C 22 · G 11')
        assert.equal(await individual.locator('[data-record-quantity]').innerText(), '40 g')
        assert.equal(await individual.locator('[data-record-kcal]').innerText(), '174')
        assert.equal(await individual.locator('[data-record-macros]').innerText(), 'P 2 · C 20 · G 10')
        for (const accion of ['Añadir ingredientes a', 'Mover plato', 'Copiar plato', 'Borrar plato']) assert.equal(await page.getByRole('button', { name: `${accion} ${nombre}`, exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: `Arrastrar plato ${nombre}`, exact: true }).count(), 0)
        const estilo = await desayuno.locator('[data-registro="plato"],[data-registro="individual"]').evaluateAll(es => es.map(e => {
          const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { height: r.height, padding: c.padding, borde: c.border, fondo: c.backgroundColor, radio: c.borderRadius }
        }))
        assert.equal(estilo[0].borde, estilo[1].borde); assert.equal(estilo[0].fondo, estilo[1].fondo); assert.equal(estilo[0].radio, estilo[1].radio)
        if (!vista.grande) assert.ok(Math.abs(estilo[0].height - estilo[1].height) <= 24, 'altura similar para el ejemplo real')
        await desayuno.getByRole('heading').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
        await captura(page, etiqueta, 'desayuno')

        // Desplegar solo añade ingredientes; no reaparece una barra permanente de acciones.
        await desplegarPlato(page, nombre, desayuno)
        const ingredientes = page.getByRole('list', { name: `Ingredientes de ${nombre}`, exact: true })
        assert.equal(await ingredientes.locator('[data-registro="ingrediente"]').count(), 3)
        assert.equal(await ingredientes.locator('[data-record-kcal]').first().innerText(), '2')
        await captura(page, etiqueta, 'ingredientes')
        await grupoBoton.click()
        await trigger.focus(); await page.keyboard.press('Enter')
        const menu = page.getByRole('dialog', { name: 'Acciones del plato', exact: true })
        await menu.waitFor()
        for (const accion of ['Añadir ingredientes a', 'Mover plato', 'Copiar plato', 'Borrar plato']) await menu.getByRole('button', { name: `${accion} ${nombre}`, exact: true }).waitFor()
        assert.equal(await page.getByRole('dialog').count(), 1)
        await captura(page, etiqueta, 'acciones')
        await page.keyboard.press('Escape'); await menu.waitFor({ state: 'detached' })
        assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
        await trigger.click(); await menu.waitFor(); await page.goBack(); await menu.waitFor({ state: 'detached' })
        assert.equal(await trigger.evaluate(el => document.activeElement === el), true)
        await trigger.click(); await menu.waitFor(); await page.keyboard.press('Escape'); await menu.waitFor({ state: 'detached' })
        assert.deepEqual(await backup(page), antes)

        await ejecutarAccionPlato(page, nombre, 'Añadir ingredientes a', desayuno)
        await page.getByRole('heading', { name: 'Añadir ingredientes', exact: true }).waitFor()
        assert.equal(await page.getByRole('dialog').count(), 1)
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        assert.deepEqual(await backup(page), antes)

        await ejecutarAccionPlato(page, nombre, 'Mover plato', desayuno)
        const destinos = page.getByRole('dialog', { name: 'Mover plato', exact: true })
        await destinos.getByRole('button', { name: 'Mover a Cena', exact: true }).click()
        await destinos.waitFor({ state: 'detached' })
        await page.locator('[data-comida="cena"]').getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }).waitFor()
        await page.waitForFunction(nombre => document.activeElement?.getAttribute('aria-label') === `Acciones del plato ${nombre}`, nombre)
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await trigger.waitFor(); assert.deepEqual(await backup(page), antes)

        await ejecutarAccionPlato(page, nombre, 'Copiar plato', desayuno)
        await page.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).click()
        await page.getByRole('radio', { name: 'Snack', exact: true }).click()
        await page.getByRole('button', { name: 'Copiar', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        await page.locator('[data-comida="snack"]').getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }).waitFor()
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        assert.deepEqual(await backup(page), antes)

        await individual.locator('.food-record-button').click()
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        await individual.getByRole('button', { name: 'Borrar Bizcocho', exact: true }).click()
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await individual.waitFor(); assert.deepEqual(await backup(page), antes)
        await ejecutarAccionPlato(page, nombre, 'Borrar plato', desayuno)
        await trigger.waitFor({ state: 'detached' })
        assert.equal(await page.getByRole('dialog').count(), 0)
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await trigger.waitFor(); assert.deepEqual(await backup(page), antes)
        await desplegarPlato(page, nombre, desayuno)
        await ingredientes.getByRole('button', { name: 'Borrar Leche', exact: true }).click()
        await grupoBoton.locator('[data-record-quantity]').getByText('2 alimentos', { exact: true }).waitFor()
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        assert.deepEqual(await backup(page), antes)
        await grupoBoton.click()
        assert.deepEqual(await page.evaluate(() => ({ cabecera: document.querySelector('[data-comida="desayuno"] .meal-header').outerHTML, resumen: document.querySelector('.nutrition-summary').outerHTML, nav: document.querySelector('.app-nav').outerHTML })), estadoProtegido, 'cabecera/resumen/navegación conservados')
        await page.locator('[data-comida="cena"]').getByRole('heading').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
        await captura(page, etiqueta, 'contenido-largo')
        const rapido = page.locator('[data-comida="snack"] [data-registro="individual"]')
        assert.equal(await rapido.locator('[data-record-kcal]').innerText(), '≈ 80')
        assert.equal(await rapido.locator('[data-record-quantity]').innerText(), 'Registro rápido')
        await rapido.locator('.food-record-button').click()
        await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        assert.deepEqual(await backup(page), antes)
        await page.reload(); await navegar(page, 'Nutrición')
        assert.deepEqual(await backup(page), antes)
        assert.deepEqual(errores, [])
        caso.correcto = true
      } catch (e) { caso.error = e.stack || String(e) }
      finally { await context.close() }
      casos.push(caso); console.log(`${etiqueta}: ${caso.correcto ? 'OK' : caso.error}`)
    }
  } finally { await browser.close() }
  fs.writeFileSync(path.join(salida, 'informe.json'), JSON.stringify({ origen, casos }, null, 2))
  assert.ok(casos.length && casos.every(c => c.correcto), 'todos los contextos deben pasar')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
