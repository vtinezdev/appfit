/* Copia de platos entre comidas del mismo día. Perfil aislado en el origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const { ejecutarAccionPlato } = require('./acciones-plato.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-copia-platos-ui'
const nombre = 'Mi desayuno con arroz y pollo para copiar a otra comida del día'

async function registros(page, fecha) {
  return page.evaluate(async (fecha) => {
    const r = await import('/src/features/nutricion/data/entriesRepo.ts')
    const d = await import('/src/shared/lib/dates.ts')
    return r.delDia(fecha || d.todayISO())
  }, fecha)
}

async function layout(page) {
  const errores = await page.evaluate(() => {
    const visible = (el) => el.getClientRects().length && !el.closest('[hidden],[inert]')
    const overflow = [...document.querySelectorAll('html,main,[role="dialog"]')].filter(visible).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.tagName)
    const tacto = [...document.querySelectorAll('button,[role="radio"]')].filter(visible).filter((el) => el.getBoundingClientRect().height < 43.9).map((el) => el.textContent)
    const campos = [...document.querySelectorAll('input')].filter(visible).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.getAttribute('aria-label'))
    return { overflow, tacto, campos }
  })
  assert.deepEqual(errores, { overflow: [], tacto: [], campos: [] })
}

function comprobarCopia(copias, originales, comida, fecha) {
  assert.equal(copias.length, originales.length)
  assert.ok(copias[0].platoId && copias[0].platoId !== originales[0].platoId)
  for (const [i, copia] of copias.entries()) {
    assert.equal(copia.fecha, fecha)
    assert.equal(copia.comida, comida)
    assert.equal(copia.platoId, copias[0].platoId)
    assert.notEqual(copia.id, originales[i].id)
    for (const campo of ['nombre', 'nombrePlato', 'gramos', 'kcal', 'prot', 'carb', 'grasa', 'nutrientes', 'foodId', 'catalogId', 'textoOriginal', 'rapida']) assert.deepEqual(copia[campo], originales[i][campo], campo)
  }
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const resultados = []
  try {
    for (const width of [320, 375, 430]) for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme, reducedMotion: 'reduce' })
      try {
        await context.route('**/world.openfoodfacts.org/**', (route) => route.abort())
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', (e) => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        const fechas = await page.evaluate(async (nombre) => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const fecha = d.todayISO()
          const items = [
            { nombre: 'Arroz', gramos: 4500, kcal100: 130, prot100: 3, carb100: 28, grasa100: 0.3, nutrientes: { fibra: 1, sal: 0.02, azucares: 0, agSat: 0.1 }, fuenteSiNuevo: 'manual' },
            { nombre: 'Pollo', gramos: 100, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'manual' },
          ]
          await r.guardarComida({ fecha, comida: 'desayuno', items, nombrePlato: nombre })
          await r.guardarComida({ fecha, comida: 'desayuno', items, nombrePlato: 'Segundo desayuno' })
          await r.anadirRapida({ fecha, comida: 'desayuno', nombre: 'Entrada suelta', kcal: 100, prot: 0, carb: 0, grasa: 0 })
          await r.guardarComida({ fecha, comida: 'comida', items, nombrePlato: 'Comida ya registrada' })
          return { fecha, ayer: d.addDays(fecha, -1) }
        }, nombre)
        const antes = await registros(page)
        const originales = antes.filter((e) => e.nombrePlato === nombre)
        await navegar(page, 'Nutrición')
        const desayuno = page.getByRole('region', { name: 'Desayuno', exact: true })
        const abrir = async () => {
          await ejecutarAccionPlato(page, nombre, 'Copiar plato', desayuno)
          await page.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).click()
        }
        const confirmar = async () => {
          await page.getByRole('button', { name: 'Copiar', exact: true }).click()
          await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
        }
        await layout(page)
        await abrir()
        assert.equal(await page.getByRole('button', { name: 'Copiar', exact: true }).isDisabled(), true)
        assert.equal(await page.getByLabel('Fecha de destino', { exact: true }).count(), 0)
        await page.getByRole('radio', { name: 'Comida', exact: true }).click()
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-destino.png`) })
        await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
        assert.deepEqual(await registros(page), antes, 'cancelar no copia')
        await abrir()
        await page.getByRole('radio', { name: 'Comida', exact: true }).click()
        await confirmar()
        const copiado = await registros(page)
        comprobarCopia(copiado.filter((e) => !antes.some((a) => a.id === e.id)), originales, 'comida', fechas.fecha)
        assert.deepEqual(copiado.filter((e) => antes.some((a) => a.id === e.id)), antes)
        const comida = page.getByRole('region', { name: 'Comida', exact: true })
        await comida.getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }).waitFor()
        await layout(page)
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await comida.getByRole('button', { name: `Acciones del plato ${nombre}`, exact: true }).waitFor({ state: 'detached' })
        assert.deepEqual(await registros(page), antes)

        for (const destino of ['Cena', 'Comida', 'Comida']) {
          const prev = await registros(page)
          await abrir()
          await page.getByRole('radio', { name: destino, exact: true }).click()
          await confirmar()
          const actuales = await registros(page)
          const nuevos = actuales.filter((e) => !prev.some((a) => a.id === e.id))
          comprobarCopia(nuevos, originales, destino.toLowerCase(), fechas.fecha)
          assert.ok(!prev.some((e) => e.platoId === nuevos[0].platoId), 'cada copia es independiente')
        }
        const hoy = await registros(page)
        assert.equal(hoy.length, antes.length + 6)
        await ejecutarAccionPlato(page, nombre, 'Copiar plato', desayuno)
        await page.getByRole('button', { name: 'Copiar a otro día…', exact: true }).click()
        await page.getByLabel('Fecha de destino', { exact: true }).fill(fechas.ayer)
        await page.getByRole('radio', { name: 'Snack', exact: true }).click()
        await layout(page)
        await confirmar()
        comprobarCopia(await registros(page, fechas.ayer), originales, 'snack', fechas.ayer)
        assert.deepEqual(await registros(page), hoy)

        await ejecutarAccionPlato(page, nombre, 'Copiar plato', desayuno)
        await page.getByRole('button', { name: 'Guardar como plantilla…', exact: true }).click()
        await page.getByLabel('Nombre de la plantilla', { exact: true }).fill('Solo este plato')
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
        const plantilla = await page.evaluate(async () => { const r = await import('/src/features/nutricion/data/mealsRepo.ts'); return (await r.listar())[0] })
        assert.equal(plantilla.items.length, 2)
        assert.equal(plantilla.nombre, 'Solo este plato')
        assert.deepEqual(plantilla.items[0].nutrientes, originales[0].nutrientes)

        // También se puede copiar la comida completa, sin perder separaciones ni la rápida.
        await desayuno.getByRole('button', { name: 'Acciones de Desayuno', exact: true }).click()
        await page.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).click()
        await page.getByRole('radio', { name: 'Snack', exact: true }).click()
        await confirmar()
        const actuales = await registros(page)
        const snack = actuales.filter((e) => e.comida === 'snack')
        assert.equal(snack.length, 5)
        assert.equal(new Set(snack.filter((e) => e.platoId).map((e) => e.platoId)).size, 2)
        assert.equal(snack.find((e) => e.rapida).nombre, 'Entrada suelta')
        assert.deepEqual(actuales.filter((e) => antes.some((a) => a.id === e.id)), antes)
        await page.reload()
        await navegar(page, 'Nutrición')
        assert.deepEqual(await registros(page), actuales)

        // En el histórico, «mismo día» es el día seleccionado, no hoy.
        await page.getByRole('button', { name: 'Día anterior', exact: true }).click()
        await ejecutarAccionPlato(page, nombre, 'Copiar plato', page.getByRole('region', { name: 'Snack', exact: true }))
        await page.getByRole('button', { name: 'Copiar a otra comida…', exact: true }).click()
        await page.getByRole('radio', { name: 'Cena', exact: true }).click()
        await confirmar()
        const historico = await registros(page, fechas.ayer)
        assert.equal(historico.length, 4)
        comprobarCopia(historico.filter((e) => e.comida === 'cena'), originales, 'cena', fechas.ayer)
        assert.deepEqual(await registros(page), actuales)
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-historico.png`) })
        assert.deepEqual(errores, [])
        resultados.push({ width, colorScheme, correcto: true })
        console.log(`Copia de platos: ${width} px, ${colorScheme}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado: resultados.length === 6, casos: resultados }, null, 2))
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
