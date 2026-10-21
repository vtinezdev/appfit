/* Combinaciones habituales: historial por días y marcado explícito. Datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-comidas-tipicas'

async function datos(page) {
  return page.evaluate(async () => {
    const backup = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
    delete backup.exportedAt
    return JSON.parse(JSON.stringify(backup))
  })
}
async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,input,textarea,[role="dialog"]')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || visibles.some(e => e.scrollWidth > e.clientWidth + 1 && !e.matches('input,textarea')),
      tacto: visibles.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.textContent || e.getAttribute('aria-label')),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [] })
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) })
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
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        await page.evaluate(async () => {
          const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
          const meals = await import('/src/features/nutricion/data/mealsRepo.ts')
          const foods = await import('/src/features/nutricion/data/foodsRepo.ts')
          const fechas = await import('/src/shared/lib/dates.ts')
          const hoy = fechas.todayISO()
          const item = (nombre, gramos) => ({ nombre, gramos, kcal100: 100, prot100: 10, carb100: 10, grasa100: 2, categoria: 'Otros', fuenteSiNuevo: 'manual' })
          for (const [dias, gramos] of [[5, 40], [3, 50], [1, 60]]) {
            const fecha = fechas.addDays(hoy, -dias)
            await entries.guardarComida({ fecha, comida: 'desayuno', items: [item('Avena de prueba', gramos)] })
            await entries.guardarComida({ fecha, comida: 'desayuno', items: [item('Leche de prueba', 200)] })
          }
          for (const dias of [4, 2]) await entries.guardarComida({ fecha: fechas.addDays(hoy, -dias), comida: 'cena', items: [item('Yogur de prueba', 125)] })
          await meals.crearDesdeRevision({ nombre: 'Mis tostadas', comida: 'desayuno', items: [item('Tostada de prueba', 80)] })
          await foods.crear({ nombre: 'Fruta de prueba', kcal100: 60, prot100: 1, carb100: 15, grasa100: 0, categoria: 'Frutas', fuente: 'manual' })
        })
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Nutrición')
        // Acceso desde el pie de las cuatro comidas, con secciones vacías y sin depender de ayer.
        const tipicasDesayuno = page.getByRole('button', { name: 'Comidas típicas de desayuno', exact: true })
        for (const comida of ['desayuno', 'comida', 'cena', 'snack']) await page.getByRole('button', { name: `Comidas típicas de ${comida}`, exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: /^Repetir / }).count(), 0)
        const antesSelector = await datos(page)
        await tipicasDesayuno.scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-diario`)
        await tipicasDesayuno.click()
        const selector = page.getByRole('dialog', { name: 'Comidas típicas', exact: true })
        await selector.getByRole('button', { name: /^Mis tostadas/ }).waitFor()
        await selector.getByRole('button', { name: /Avena de prueba \+ Leche de prueba/ }).waitFor()
        assert.equal(await tipicasDesayuno.getAttribute('aria-expanded'), 'true')
        await captura(page, `${etiqueta}-selector-diario`)
        await page.keyboard.press('Escape')
        await selector.waitFor({ state: 'detached' })
        assert.deepEqual(await datos(page), antesSelector)
        assert.equal(await tipicasDesayuno.evaluate(el => el === document.activeElement), true)
        await page.getByRole('button', { name: 'Comidas típicas de comida', exact: true }).click()
        const vacio = page.getByRole('dialog', { name: 'Comidas típicas', exact: true })
        await vacio.getByRole('button', { name: /^Mis tostadas/ }).waitFor()
        await vacio.getByRole('button', { name: /Avena de prueba \+ Leche de prueba/ }).waitFor()
        await captura(page, `${etiqueta}-selector-vacio`)
        await page.keyboard.press('Escape')
        await vacio.waitFor({ state: 'detached' })
        for (const nombre of [/^Mis tostadas/, /Avena de prueba \+ Leche de prueba/]) {
          const antesUso = await datos(page)
          await tipicasDesayuno.click()
          await selector.getByRole('button', { name: nombre }).click()
          const vistaPrevia = page.getByRole('dialog', { name: 'Añadir comida típica', exact: true })
          await vistaPrevia.waitFor()
          await selector.waitFor({ state: 'detached' })
          assert.equal(await page.locator('[role="dialog"]:not([inert])').count(), 1)
          await vistaPrevia.getByRole('button', { name: 'Añadir a Desayuno', exact: true }).click()
          await vistaPrevia.waitFor({ state: 'detached' })
          assert.equal((await datos(page)).entries.length, antesUso.entries.length + (nombre.source.includes('Mis tostadas') ? 1 : 2))
          assert.equal((await datos(page)).meals.length, antesUso.meals.length)
          await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
          await page.waitForFunction(async cantidad => {
            const b = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
            return b.entries.length === cantidad
          }, antesUso.entries.length)
          assert.deepEqual((await datos(page)).entries, antesUso.entries)
        }
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('desayuno')
        const seccion = page.getByRole('region', { name: 'Tus comidas típicas', exact: true })
        const auto = () => seccion.getByRole('button', { name: /Avena de prueba \+ Leche de prueba/ })
        await auto().waitFor()
        await seccion.getByRole('button', { name: /^Mis tostadas/ }).waitFor()
        assert.equal(await seccion.getByText(/^Guardada ·/).count(), 1)
        const antes = await datos(page)
        await seccion.scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-tipicas`)
        await auto().click()
        const preview = page.getByRole('dialog', { name: 'Añadir comida típica', exact: true })
        await preview.getByText('60 g', { exact: false }).waitFor()
        await captura(page, `${etiqueta}-revision`)
        await page.keyboard.press('Escape')
        await preview.waitFor({ state: 'detached' })
        assert.deepEqual(await datos(page), antes)
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('cena')
        await auto().waitFor()
        assert.equal(await seccion.locator('ul button').count(), 2)
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('desayuno')
        await auto().click()
        await preview.getByRole('button', { name: 'Añadir a Desayuno', exact: true }).click()
        await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).waitFor({ state: 'detached' })
        const actual = await datos(page)
        assert.equal(actual.meals.length, 1)
        assert.equal(actual.entries.length, antes.entries.length + 2)
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('cena')
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('100 g de fruta de prueba')
        await page.getByRole('button', { name: /^Revisar \d+ alimentos?$/, exact: true }).click()
        await page.getByRole('checkbox', { name: 'Guardar como comida típica', exact: true }).check()
        await captura(page, `${etiqueta}-marcar`)
        await page.getByRole('button', { name: /^(?:Añadir a (?:desayuno|comida|cena|snack)|Guardar cambios) ·/ }).click()
        await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).waitFor({ state: 'detached' })
        assert.equal((await datos(page)).meals.length, 2)
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('cena')
        await seccion.getByRole('button', { name: /^Fruta de prueba/ }).waitFor()
        assert.equal(await seccion.getByText(/^Guardada ·/).count(), 2)
        await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click()
        await page.getByRole('button', { name: 'Acciones de Desayuno', exact: true }).click()
        await page.getByRole('button', { name: 'Marcar como comida típica…', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill('Mi bol de siempre')
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.getByRole('dialog', { name: 'Guardar comida típica', exact: true }).waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('combobox', { name: 'Comida del día', exact: true }).selectOption('desayuno')
        await seccion.getByRole('button', { name: /^Mi bol de siempre/ }).waitFor()
        assert.equal(await auto().count(), 0)
        assert.equal(await seccion.locator('ul button').count(), 2)
        await seccion.scrollIntoViewIfNeeded()
        await captura(page, `${etiqueta}-marcada`)
        const fin = await datos(page)
        await page.reload()
        assert.deepEqual(await datos(page), fin)
        assert.deepEqual(errores, [])
        console.log(`${etiqueta}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
