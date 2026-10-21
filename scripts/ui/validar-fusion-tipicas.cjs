/* Una sola lista de típicas: legado, detección y creación manual sin registrar comidas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-fusion-tipicas'

async function datos(page) {
  return page.evaluate(async () => {
    const b = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
    delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,input,textarea,[role="dialog"]')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || visibles.some(e => e.matches('[role="dialog"]') && e.scrollWidth > e.clientWidth + 1),
      tacto: visibles.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [] })
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) })
}
async function crear(page, nombre, texto) {
  const editor = page.getByRole('dialog', { name: 'Nueva comida típica', exact: true })
  await editor.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill(nombre)
  await editor.getByRole('textbox', { name: 'Describe lo que has comido' }).fill(texto)
  await editor.getByRole('button', { name: 'Interpretar', exact: true }).click()
  await editor.getByRole('button', { name: /^Guardar comida típica/ }).click()
  await editor.waitFor({ state: 'detached' })
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
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        await page.evaluate(async () => {
          const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
          const meals = await import('/src/features/nutricion/data/mealsRepo.ts')
          const foods = await import('/src/features/nutricion/data/foodsRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const item = (nombre, gramos) => ({ nombre, gramos, kcal100: 100, prot100: 10, carb100: 10, grasa100: 2, nutrientes: { fibra: 2, sal: 0.05 }, categoria: 'Otros', fuenteSiNuevo: 'manual' })
          for (const dias of [1, 3, 5]) {
            await entries.guardarComida({ fecha: d.addDays(d.todayISO(), -dias), comida: 'desayuno', items: [item('Avena de prueba', 40), item('Leche de prueba', 200)] })
            await entries.guardarComida({ fecha: d.addDays(d.todayISO(), -dias), comida: 'cena', items: [item('Yogur de prueba', 125)] })
          }
          for (const [nombre, gramos] of [['Mi café corto', 100], ['Mi café grande', 200]]) await meals.crearDesdeRevision({ nombre, comida: 'desayuno', items: [item('Café de prueba', gramos)] })
          await foods.crear({ nombre: 'Manzana de prueba', kcal100: 60, prot100: 1, carb100: 15, grasa100: 0, categoria: 'Frutas', fuente: 'manual' })
        })
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Nutrición')
        const antes = await datos(page)
        await page.getByRole('button', { name: 'Comidas típicas de desayuno', exact: true }).click()
        const selector = page.getByRole('dialog', { name: 'Comidas típicas de desayuno', exact: true })
        await selector.getByRole('button', { name: /^Mi café corto/ }).waitFor()
        await selector.getByRole('button', { name: /^Mi café grande/ }).waitFor()
        await captura(page, `${etiqueta}-selector-unificado`)
        await selector.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await selector.waitFor({ state: 'detached' })
        await crear(page, 'Mi fruta de siempre', '150 g de manzana de prueba')
        assert.deepEqual((await datos(page)).entries, antes.entries)
        assert.deepEqual((await datos(page)).objetivosDia, antes.objetivosDia)
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        const anadir = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
        assert.equal(await anadir.getByRole('tab', { name: 'Plantillas', exact: true }).count(), 0)
        await anadir.getByRole('radio', { name: 'Desayuno', exact: true }).click()
        await anadir.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await crear(page, 'Mi bol pequeño', '30 g de avena de prueba\n100 g de leche de prueba')
        await anadir.getByRole('button', { name: /^Mi bol pequeño/ }).waitFor()
        await captura(page, `${etiqueta}-escribir-unificado`)
        await anadir.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.deepEqual((await datos(page)).entries, antes.entries)
        await page.getByRole('tab', { name: 'Alimentos', exact: true }).click()
        assert.equal(await page.getByRole('radio', { name: 'Plantillas', exact: true }).count(), 0)
        await page.getByRole('radio', { name: 'Típicas', exact: true }).click()
        await page.getByRole('radio', { name: 'Desayuno', exact: true }).click()
        const lista = page.getByRole('region', { name: 'Tus comidas típicas', exact: true })
        await lista.getByRole('button', { name: /^Mi café corto/ }).waitFor()
        await lista.getByRole('button', { name: /^Mi café grande/ }).waitFor()
        await lista.getByRole('button', { name: /^Mi bol pequeño/ }).click()
        const gestion = page.getByRole('dialog', { name: 'Editar comida típica', exact: true })
        await gestion.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill('Mi bol fijo')
        await gestion.getByRole('textbox', { name: 'Gramos de Avena de prueba', exact: true }).fill('60')
        await gestion.getByRole('button', { name: 'Guardar comida típica', exact: true }).click()
        await gestion.waitFor({ state: 'detached' })
        assert.equal((await datos(page)).meals.find(m => m.nombre === 'Mi bol fijo').items[0].gramos, 60)
        await lista.getByRole('button', { name: /^Mi café grande/ }).click()
        await gestion.getByRole('button', { name: 'Dejar de guardar', exact: true }).click()
        await gestion.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await gestion.getByRole('button', { name: 'Dejar de guardar', exact: true }).click()
        await gestion.getByRole('button', { name: 'Sí, quitar', exact: true }).click()
        await gestion.waitFor({ state: 'detached' })
        await lista.getByRole('button', { name: /^Mi café corto/ }).waitFor()
        assert.equal((await datos(page)).meals.some(m => m.nombre === 'Mi café grande'), false)
        await page.getByRole('radio', { name: 'Cena', exact: true }).click()
        await lista.getByRole('button', { name: /^Yogur de prueba/ }).click()
        const fijar = page.getByRole('dialog', { name: 'Guardar comida típica', exact: true })
        await fijar.getByRole('textbox', { name: 'Nombre de la comida típica', exact: true }).fill('Mi yogur fijo')
        await captura(page, `${etiqueta}-fijar-sugerencia`)
        await fijar.getByRole('button', { name: 'Guardar comida típica', exact: true }).click()
        await fijar.waitFor({ state: 'detached' })
        await lista.getByRole('button', { name: /^Mi yogur fijo/ }).waitFor()
        assert.equal(await lista.locator('ul button').count(), 1)
        await lista.getByRole('button', { name: 'Nueva comida típica', exact: true }).click()
        await crear(page, 'Mi café de la cena', '100 g de café de prueba')
        await lista.getByRole('button', { name: /^Mi café de la cena/ }).waitFor()
        await captura(page, `${etiqueta}-biblioteca-unificada`)
        const fin = await datos(page)
        assert.deepEqual(fin.entries, antes.entries)
        assert.deepEqual(fin.objetivosDia, antes.objetivosDia)
        assert.equal(fin.meals.find(m => m.nombre === 'Mi café corto').items[0].gramos, 100)
        assert.equal(fin.meals.find(m => m.nombre === 'Mi yogur fijo').items[0].nutrientes.sal, 0.063)
        await page.reload()
        assert.deepEqual(await datos(page), fin)
        assert.deepEqual(errores, [])
        console.log(`${etiqueta}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
