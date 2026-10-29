/* Tarjetas de las cuatro comidas: visual, acciones y lectura sin escrituras. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const { desplegarPlato } = require('./acciones-plato.cjs')
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-tarjetas-comidas'
async function datos(page) {
  return page.evaluate(async () => {
    const b = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
    delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function comprobar(page) {
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,main,[role="dialog"],[data-comida],.meal-header,.meal-macros,.food-record')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || visibles.filter(e => !e.matches('button')).some(e => e.scrollWidth > e.clientWidth + 1),
      tacto: visibles.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [] })
}
async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const vistas = [320, 375, 430].flatMap(width => ['light', 'dark'].map(colorScheme => ({ width, colorScheme })))
  vistas.push({ width: 375, colorScheme: 'dark', grande: true })
  try {
    for (const vista of vistas) {
      const etiqueta = `${vista.width}-${vista.colorScheme}${vista.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== etiqueta) continue
      const context = await browser.newContext({ viewport: { width: vista.width, height: 932 }, colorScheme: vista.colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'es-ES', timezoneId: 'Europe/Madrid' })
      const page = await context.newPage()
      const errores = []
      page.on('pageerror', e => errores.push(e.message))
      page.setDefaultTimeout(12000)
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async () => {
          const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
          const meals = await import('/src/features/nutricion/data/mealsRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          const item = (nombre, gramos, kcal100, prot100, carb100, grasa100, categoria) => ({ nombre, nombreCorto: nombre, gramos, kcal100, prot100, carb100, grasa100, categoria, fuenteSiNuevo: 'manual' })
          const cafe = item('Café con leche', 200, 60, 3, 6, 2.7, 'Bebidas')
          await entries.guardarComida({ fecha: todayISO(), comida: 'desayuno', items: [cafe] })
          await meals.crearDesdeRevision({ nombre: 'Café con leche', comida: 'desayuno', items: [cafe] })
          await entries.guardarComida({ fecha: todayISO(), comida: 'desayuno', nombrePlato: 'Bol de avena', items: [item('Avena', 30, 380, 13, 60, 7, 'Cereales, arroz y pasta'), item('Leche', 200, 50, 3, 5, 2, 'Leche y nata'), item('Plátano', 100, 86, 1, 20, 0.3, 'Frutas')] })
          await entries.guardarComida({ fecha: todayISO(), comida: 'comida', nombrePlato: 'Pollo con arroz', items: [item('Pollo', 150, 165, 31, 0, 3.6, 'Carnes'), item('Arroz', 300, 130, 3, 28, 0.3, 'Cereales, arroz y pasta'), item('Verduras', 165, 50, 2, 7, 0.5, 'Verduras y hortalizas')] })
          await entries.guardarComida({ fecha: todayISO(), comida: 'snack', nombrePlato: 'Yogur con fruta', items: [item('Yogur', 200, 60, 4, 5, 2.5, 'Yogures y postres lácteos'), item('Fruta', 100, 80, 1, 18, 0.2, 'Frutas')] })
        })
        const antes = await datos(page)
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Nutrición')
        await page.evaluate(() => document.fonts.ready)
        for (const [comida, nombre] of [['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']]) {
          const tarjeta = page.getByRole('region', { name: nombre, exact: true })
          await tarjeta.locator('.meal-card').waitFor()
          assert.equal(await tarjeta.locator('.meal-card').count(), 1)
          assert.ok(await tarjeta.locator('.meal-header').evaluate(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'))
          await tarjeta.getByRole('button', { name: `Añadir a ${comida}`, exact: true }).waitFor()
          await tarjeta.getByRole('button', { name: `Comidas típicas de ${comida}`, exact: true }).waitFor()
          if (comida === 'cena') {
            await tarjeta.getByText('Sin alimentos todavía.', { exact: true }).waitFor()
            assert.equal(await tarjeta.locator('.meal-macros').count(), 0)
          } else {
            const sumas = antes.entries.filter(e => e.comida === comida).reduce((r, e) => ({ kcal: r.kcal + e.kcal, prot: r.prot + e.prot, carb: r.carb + e.carb, grasa: r.grasa + e.grasa }), { kcal: 0, prot: 0, carb: 0, grasa: 0 })
            const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })
            assert.equal(await tarjeta.locator('.meal-header-energy .tabular').innerText(), formato.format(sumas.kcal))
            assert.deepEqual(await tarjeta.locator('.meal-macros dd').allTextContents(), [sumas.prot, sumas.carb, sumas.grasa].map(n => `${formato.format(n)} g`))
            assert.equal(await tarjeta.locator('[data-record-macros]').count(), 0)
          }
          await comprobar(page)
          await page.mouse.move(0, 0)
          await tarjeta.evaluate(e => e.scrollIntoView({ block: 'center' }))
          await tarjeta.screenshot({ path: path.join(salida, `${etiqueta}-${comida}.png`), animations: 'disabled' })
        }
        await desplegarPlato(page, 'Bol de avena')
        await page.getByRole('list', { name: 'Ingredientes de Bol de avena', exact: true }).waitFor()
        await comprobar(page)
        await page.getByRole('button', { name: 'Acciones del plato Bol de avena', exact: true }).click()
        await page.getByRole('dialog', { name: 'Acciones del plato', exact: true }).waitFor()
        await page.keyboard.press('Escape')
        await page.getByRole('dialog', { name: 'Acciones del plato', exact: true }).waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Añadir a cena', exact: true }).click()
        const anadir = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
        await anadir.getByRole('radiogroup', { name: 'Comida del día', exact: true }).getByRole('radio', { name: 'Cena', exact: true, checked: true }).waitFor()
        await anadir.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await anadir.waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Comidas típicas de cena', exact: true }).click()
        const tipicas = page.getByRole('dialog', { name: 'Comidas típicas', exact: true })
        await tipicas.getByRole('button', { name: /^Café con leche/ }).waitFor()
        await page.keyboard.press('Escape')
        await tipicas.waitFor({ state: 'detached' })
        assert.deepEqual(await datos(page), antes, 'consultar las tarjetas y cancelar acciones no escribe datos')
        if (vista.width === 375 && !vista.grande) {
          const bol = page.locator('[data-plato-id]').filter({ has: page.getByRole('button', { name: 'Acciones del plato Bol de avena', exact: true }) }).locator('.food-record-button').first()
          if (await bol.getAttribute('aria-expanded') === 'true') await bol.click()
          await page.evaluate(() => document.activeElement?.blur())
          await page.setViewportSize({ width: 375, height: 2400 })
          await page.mouse.move(0, 0)
          await page.locator('[data-comidas-diario]').screenshot({ path: path.join(salida, `${etiqueta}-cuatro-comidas.png`), animations: 'disabled' })
          await page.setViewportSize({ width: 375, height: 932 })
        }
        await page.evaluate(async () => {
          const { anadirRapida } = await import('/src/features/nutricion/data/entriesRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          await anadirRapida({ fecha: todayISO(), comida: 'cena', nombre: 'Registro con un nombre muy largo para comprobar la lectura completa y el acceso a todas sus acciones', kcal: 1234567, prot: 12345, carb: 98765, grasa: 54321 })
        })
        const cena = page.getByRole('region', { name: 'Cena', exact: true })
        await cena.getByText('≈ 1.234.567', { exact: true }).waitFor()
        await comprobar(page)
        await cena.screenshot({ path: path.join(salida, `${etiqueta}-cifras-largas.png`), animations: 'disabled' })
        assert.deepEqual(errores, [])
        console.log(`${etiqueta}: correcto`)
      } catch (e) {
        await page.screenshot({ path: path.join(salida, `${etiqueta}-fallo.png`), animations: 'disabled' }).catch(() => {})
        throw new Error(`${etiqueta}: ${e.message}`, { cause: e })
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
