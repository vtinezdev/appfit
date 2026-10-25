/* Copiar/Borrar tras deslizar alimentos e ingredientes, con datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const { desplegarPlato } = require('./acciones-plato.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-copiar-alimento'

async function datos(page) {
  return page.evaluate(async () => {
    const b = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
    delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function estabilizar(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
}
async function captura(page, nombre) {
  await estabilizar(page)
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,input,textarea,[role="dialog"]')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      tacto: visibles.filter(e => e.matches('button') && (e.getBoundingClientRect().height < 43.9 || e.getBoundingClientRect().width < 43.9)).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [] })
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) })
}
async function deslizar(page, fila, tactil = false, largo = false) {
  await fila.evaluate(el => el.scrollIntoView({ block: 'center' }))
  const b = await fila.boundingBox()
  const x = b.x + b.width * 0.9, y = b.y + b.height / 2
  const dx = b.width * (largo ? 0.85 : 0.42)
  if (tactil) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - dx * i / 6, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - dx, y, { steps: 8 })
    await page.mouse.up()
  }
  await estabilizar(page)
  const accesibles = await fila.locator('.fila-deslizable-acciones button').evaluateAll(botones => botones.every(el => {
    const r = el.getBoundingClientRect()
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
  }))
  assert.equal(accesibles, true, 'Copiar y Borrar deben poder tocarse tras deslizar')
}
async function deshacer(page, originales) {
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await page.waitForFunction(async cantidad => (await (await import('/src/shared/lib/backup.ts')).exportarBackup()).entries.length === cantidad, originales.length)
  assert.deepEqual((await datos(page)).entries, originales)
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
      const context = await browser.newContext({ viewport: { width: vista.width, height: 932 }, colorScheme: vista.colorScheme, reducedMotion: 'reduce', hasTouch: true, serviceWorkers: 'block' })
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        const page = await context.newPage()
        page.setDefaultTimeout(10000)
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        const semilla = await page.evaluate(async () => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const hoy = d.todayISO(), ayer = d.addDays(hoy, -1)
          const item = (nombre, catalogId) => ({ nombre, catalogId, gramos: 125, kcal100: 100, prot100: 10, carb100: 10, grasa100: 2, nutrientes: { sal: 0.05, fibra: 2 }, categoria: 'Otros', fuenteSiNuevo: 'manual' })
          const [cafe] = await r.guardarComida({ fecha: hoy, comida: 'desayuno', items: [item('Café de prueba')] })
          const ingredientes = await r.guardarComida({ fecha: hoy, comida: 'desayuno', nombrePlato: 'Mi bol', items: [item('Avena de prueba'), item('Leche de prueba', 'ciqual:leche-prueba')] })
          const rapido = await r.anadirRapida({ fecha: hoy, comida: 'snack', nombre: 'Comida rápida de prueba', kcal: 300, prot: 10, carb: 20, grasa: 15 })
          await r.anadirRapida({ fecha: ayer, comida: 'cena', nombre: 'Destino ocupado', kcal: 200, prot: 10, carb: 10, grasa: 5 })
          return { cafe, ingredientes, rapido, hoy, ayer }
        })
        if (vista.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Nutrición')
        const originales = (await datos(page)).entries
        const fila = id => page.locator(`[data-entry-id="${id}"] .fila-deslizable`)
        await deslizar(page, fila(semilla.cafe))
        await captura(page, `${etiqueta}-acciones`)
        await fila(semilla.cafe).getByRole('button', { name: 'Copiar Café de prueba', exact: true }).click()
        const menu = page.getByRole('dialog', { name: 'Copiar alimento', exact: true })
        await menu.waitFor()
        assert.equal(await menu.getByRole('button', { name: /típica/ }).count(), 0)
        await page.keyboard.press('Escape')
        await menu.waitFor({ state: 'detached' })
        assert.deepEqual((await datos(page)).entries, originales)
        // Teclado: abrir acciones con foco, pasar de Copiar a Borrar y volver.
        await page.keyboard.press('Tab')
        await fila(semilla.cafe).getByRole('button', { name: 'Copiar Café de prueba', exact: true }).focus()
        await page.keyboard.press('Tab')
        assert.equal(await page.getByRole('button', { name: 'Borrar Café de prueba', exact: true }).evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Enter')
        await menu.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).click()
        const copia = page.getByRole('dialog', { name: 'Copiar a otra comida', exact: true })
        assert.equal(await copia.getByRole('button', { name: 'Copiar', exact: true }).isDisabled(), true)
        await copia.getByRole('radio', { name: 'Cena', exact: true }).click()
        await captura(page, `${etiqueta}-destino`)
        await copia.getByRole('button', { name: 'Copiar', exact: true }).click()
        await copia.waitFor({ state: 'detached' })
        let nuevas = (await datos(page)).entries.filter(e => !originales.some(o => o.id === e.id))
        assert.equal(nuevas.length, 1)
        assert.equal(nuevas[0].nombre, 'Café de prueba')
        assert.equal(nuevas[0].comida, 'cena')
        await deshacer(page, originales)
        // Táctil: copiar solo el ingrediente, con sus nutrientes y referencia, a otro día.
        await desplegarPlato(page, 'Mi bol')
        await deslizar(page, fila(semilla.ingredientes[1]), true)
        await fila(semilla.ingredientes[1]).getByRole('button', { name: 'Copiar Leche de prueba', exact: true }).click()
        await menu.getByRole('button', { name: 'Copiar a otro día…', exact: true }).click()
        const otroDia = page.getByRole('dialog', { name: 'Copiar a otro día', exact: true })
        await otroDia.getByLabel('Fecha de destino', { exact: true }).fill(semilla.ayer)
        await otroDia.getByRole('radio', { name: 'Cena', exact: true }).click()
        await otroDia.getByRole('button', { name: 'Copiar', exact: true }).click()
        await otroDia.waitFor({ state: 'detached' })
        nuevas = (await datos(page)).entries.filter(e => !originales.some(o => o.id === e.id))
        assert.equal(nuevas.length, 1)
        assert.equal(nuevas[0].fecha, semilla.ayer)
        assert.equal(nuevas[0].catalogId, 'ciqual:leche-prueba')
        assert.equal(nuevas[0].platoId, undefined)
        assert.equal(nuevas[0].nombrePlato, undefined)
        assert.deepEqual(nuevas[0].nutrientes, originales.find(e => e.id === semilla.ingredientes[1]).nutrientes)
        await deshacer(page, originales)
        // El deslizamiento largo revela ambas opciones; no ejecuta una acción automáticamente.
        await deslizar(page, fila(semilla.rapido), true, true)
        assert.deepEqual((await datos(page)).entries, originales)
        await fila(semilla.rapido).getByRole('button', { name: 'Borrar Comida rápida de prueba', exact: true }).click()
        await deshacer(page, originales)
        await page.reload()
        assert.deepEqual((await datos(page)).entries, originales)
        assert.deepEqual(errores, [])
        console.log(`${etiqueta}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
