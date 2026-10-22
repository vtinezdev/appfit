/* Entrada de comida y creación directa de comidas típicas, solo con datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-entrada-nutricion'

async function datos(page) {
  return page.evaluate(async () => {
    const meals = await (await import('/src/features/nutricion/data/mealsRepo.ts')).listar()
    const fecha = (await import('/src/shared/lib/dates.ts')).todayISO()
    const entries = await (await import('/src/features/nutricion/data/entriesRepo.ts')).delDia(fecha)
    return { meals, entries }
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
      const context = await browser.newContext({ viewport: { width: vista.width, height: 900 }, colorScheme: vista.colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' })
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.fulfill({ json: { status: 1, product: { product_name: 'Yogur de prueba', categories_tags: ['en:yogurts'], nutriments: { 'energy-kcal_100g': 60, proteins_100g: 4, carbohydrates_100g: 5, fat_100g: 2 } } } }))
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        await page.evaluate(async () => {
          const foods = await import('/src/features/nutricion/data/foodsRepo.ts')
          await foods.crear({ nombre: 'Avena de prueba', kcal100: 380, prot100: 13, carb100: 60, grasa100: 7, fuente: 'manual', categoria: 'Cereales, arroz y pasta' })
          await foods.crear({ nombre: 'Leche de prueba', kcal100: 50, prot100: 3, carb100: 5, grasa100: 2, fuente: 'manual', categoria: 'Leche y nata' })
        })
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Nutrición')
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('heading', { name: '¿Qué has comido?', exact: true }).waitFor()
        await page.getByRole('tab', { name: 'Escribir', exact: true }).waitFor()
        await captura(page, `${etiqueta}-escribir`)
        const texto = page.getByRole('textbox', { name: 'Describe lo que has comido' })
        await texto.fill('40 g de avena de prueba')
        await page.getByRole('button', { name: 'Escanear producto', exact: true }).click()
        await page.getByRole('dialog', { name: 'Escanear producto', exact: true }).waitFor()
        await page.keyboard.press('Escape')
        await page.getByRole('dialog', { name: 'Escanear producto', exact: true }).waitFor({ state: 'detached' })
        assert.equal(await texto.inputValue(), '40 g de avena de prueba')
        await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
        await page.getByRole('button', { name: 'Escanear producto', exact: true }).waitFor()
        await page.getByRole('tab', { name: 'Escribir', exact: true }).click()
        await captura(page, `${etiqueta}-plantillas-vacias`)
        await page.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill('Mi desayuno habitual con un nombre largo para revisar el espacio')
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).getByRole('textbox', { name: 'Describe lo que has comido' }).fill('40 g de avena de prueba\n200 g de leche de prueba')
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).getByRole('button', { name: /^Revisar \d+ alimentos?$/, exact: true }).click()
        await page.getByRole('button', { name: 'Guardar comida típica', exact: false }).waitFor()
        await page.getByRole('button', { name: 'Añadir otro alimento', exact: true }).click()
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).getByRole('button', { name: 'Escanear producto', exact: true }).click()
        await page.getByRole('textbox', { name: 'O escribe el código', exact: true }).fill('8410000000000')
        await page.getByRole('dialog', { name: 'Escanear producto', exact: true }).getByRole('button', { name: 'Buscar', exact: true }).click()
        await page.getByRole('button', { name: 'Revisar alimento', exact: true }).click()
        await captura(page, `${etiqueta}-crear`)
        await page.getByRole('button', { name: /^Guardar comida típica/ }).click()
        await page.getByText('Comida típica guardada. Ya la tienes a mano.', { exact: true }).waitFor()
        let actual = await datos(page)
        assert.equal(actual.entries.length, 0)
        assert.equal(actual.meals.length, 1)
        assert.equal(actual.meals[0].items.length, 3)
        await captura(page, `${etiqueta}-plantilla-creada`)
        await page.getByRole('button', { name: /^Mi desayuno habitual/ }).click()
        await page.getByRole('dialog', { name: 'Añadir comida típica', exact: true }).getByRole('button', { name: /^Añadir a / }).click()
        await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).waitFor({ state: 'detached' })
        actual = await datos(page)
        assert.equal(actual.entries.length, 3)
        assert.equal(actual.meals[0].usos, 1)
        await page.getByRole('tab', { name: 'Mis alimentos', exact: true }).click()
        await page.getByRole('radio', { name: 'Típicas', exact: true }).click()
        await page.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.deepEqual(await datos(page), actual)
        await page.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill('Solo avena')
        await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
        await page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' }).fill('Avena de prueba')
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).getByRole('button', { name: /Avena de prueba/ }).click()
        await page.getByRole('button', { name: 'Revisar alimento', exact: true }).click()
        await page.getByRole('button', { name: /^Guardar comida típica/ }).click()
        await page.getByRole('dialog', { name: 'Nueva comida típica', exact: true }).waitFor({ state: 'detached' })
        assert.deepEqual((await datos(page)).entries, actual.entries)
        assert.equal((await datos(page)).meals.length, 2)
        await page.reload()
        assert.equal((await datos(page)).meals.length, 2)
        assert.deepEqual(errores, [])
        console.log(`${etiqueta}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
