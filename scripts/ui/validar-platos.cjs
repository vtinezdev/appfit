/* Añadido a platos existentes, aislado del perfil real. Requiere Vite, Playwright y Chromium. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-platos-ui'
const nombre = 'Mi plato de arroz con pollo y acompañamientos para la comida'

async function registros(page) {
  return page.evaluate(async () => {
    const r = await import('/src/features/nutricion/data/entriesRepo.ts')
    const d = await import('/src/shared/lib/dates.ts')
    return r.delDia(d.todayISO())
  })
}

async function layout(page) {
  const errores = await page.evaluate(() => {
    const visible = (el) => el.getClientRects().length && !el.closest('[hidden],[inert]')
    const overflow = [...document.querySelectorAll('html,main,[role="dialog"]')].filter(visible).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.tagName)
    const tacto = [...document.querySelectorAll('button,summary,[role="radio"]')].filter(visible).filter((el) => el.getBoundingClientRect().height < 43.9).map((el) => el.textContent)
    const campos = [...document.querySelectorAll('input')].filter(visible).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.getAttribute('aria-label'))
    return { overflow, tacto, campos }
  })
  assert.deepEqual(errores, { overflow: [], tacto: [], campos: [] })
}

async function cerrarGuardado(page) {
  await page.getByRole('button', { name: /^Añadir al plato ·/ }).click()
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
}

async function comprobarTotales(page, entries, platoId) {
  const ingredientes = entries.filter((e) => e.platoId === platoId)
  const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })
  const cabecera = page.getByRole('button', { name: new RegExp(`^${nombre} `) })
  await cabecera.getByText(new RegExp(`^${ingredientes.length} alimentos ·`)).waitFor()
  assert.equal(await cabecera.locator('span.tabular').last().innerText(), formato.format(ingredientes.reduce((s, e) => s + e.kcal, 0)))
  const fibra = entries.filter((e) => e.nutrientes?.fibra !== undefined)
  const valor = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(fibra.reduce((s, e) => s + e.nutrientes.fibra, 0))
  const celda = page.getByRole('region', { name: 'Desglose del día', exact: true }).locator('[data-nutriente="fibra"]')
  await celda.getByText(`Información disponible en ${fibra.length} de ${entries.length} alimentos`, { exact: true }).waitFor()
  assert.equal(await celda.locator('dd').textContent(), `${valor} g`)
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const resultados = []
  try {
    for (const width of [320, 375, 430]) for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme, reducedMotion: 'reduce' })
      try {
        await context.route('**/world.openfoodfacts.org/**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"status":0}' }))
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', (e) => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async (nombre) => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const c = await import('/src/features/nutricion/lib/catalogo/sincronizar.ts')
          const d = await import('/src/shared/lib/dates.ts')
          await c.sincronizarCatalogo()
          const arroz = { nombre: 'Arroz', gramos: 150, kcal100: 130, prot100: 3, carb100: 28, grasa100: 0.3, nutrientes: { fibra: 1, sal: 0.02 }, fuenteSiNuevo: 'manual' }
          const pollo = { nombre: 'Pollo', gramos: 100, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuenteSiNuevo: 'manual' }
          await r.guardarComida({ fecha: d.todayISO(), comida: 'comida', items: [arroz, pollo], nombrePlato: nombre })
          await r.guardarComida({ fecha: d.todayISO(), comida: 'comida', items: [arroz, pollo], nombrePlato: 'Otro plato' })
        }, nombre)
        const antes = await registros(page)
        const platoId = antes[0].platoId
        const originales = antes.filter((e) => e.platoId === platoId)
        await navegar(page, 'Nutrición')
        const editar = () => page.getByRole('button', { name: `Añadir ingredientes a ${nombre}`, exact: true }).click()
        await layout(page)
        await editar()
        await page.getByRole('heading', { name: 'Añadir ingredientes', exact: true }).waitFor()
        assert.equal(await page.getByRole('tab', { name: 'Plantillas', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Solo registrar calorías', exact: true }).count(), 0)
        assert.equal(await page.getByRole('radiogroup', { name: 'Comida del día', exact: true }).count(), 0)
        await page.getByText('Ver ingredientes actuales (2)', { exact: true }).click()
        await layout(page)
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('50 g de tomate')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await page.getByRole('button', { name: /^Añadir al plato ·/ }).waitFor()
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.deepEqual(await registros(page), antes, 'cancelar no guarda')

        // Dos tandas se añaden al mismo plato; detalles siguen mostrando extras.
        await editar()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('50 g de tomate')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await page.getByRole('button', { name: 'Detalles del alimento', exact: true }).click()
        await page.getByRole('spinbutton', { name: 'Fibra/100g', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Añadir otro alimento', exact: true }).click()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('30 g de queso')
        await page.getByRole('button', { name: 'Añadir a la revisión', exact: true }).click()
        await page.getByRole('heading', { name: 'Alimentos · 2', exact: true }).waitFor()
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-revision.png`) })
        await cerrarGuardado(page)
        const conNuevos = await registros(page)
        assert.equal(conNuevos.filter((e) => e.platoId === platoId).length, 4)
        assert.ok(conNuevos.filter((e) => e.platoId === platoId).every((e) => e.nombrePlato === nombre))
        assert.deepEqual(conNuevos.filter((e) => antes.some((a) => a.id === e.id)), antes, 'snapshots anteriores intactos')
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        await page.getByRole('region', { name: 'Desglose del día', exact: true }).getByText('Fibra', { exact: true }).waitFor()
        await comprobarTotales(page, conNuevos, platoId)

        // Buscar prepara una revisión: no escribe hasta confirmar el plato.
        await editar()
        await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
        await page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' }).fill('Arroz')
        await page.getByRole('button', { name: /^Arroz 130 kcal/ }).first().click()
        await page.getByRole('spinbutton', { name: 'gramos', exact: true }).fill('25')
        await page.getByRole('button', { name: 'Revisar alimento', exact: true }).click()
        assert.deepEqual(await registros(page), conNuevos)
        await layout(page)
        await cerrarGuardado(page)
        const conBusqueda = await registros(page)
        const anadido = conBusqueda.find((e) => !conNuevos.some((a) => a.id === e.id))
        assert.equal(anadido.platoId, platoId)
        assert.equal(anadido.gramos, 25)
        assert.equal(anadido.kcal, 32.5)
        await comprobarTotales(page, conBusqueda, platoId)

        // El escáner no ofrece un guardado rápido fuera del plato.
        await editar()
        await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
        await page.getByRole('button', { name: 'Escanear código de barras', exact: true }).click()
        await page.getByRole('textbox', { name: 'O escribe el código', exact: true }).fill('3017620422003')
        await page.getByRole('dialog', { name: 'Escanear producto', exact: true }).getByRole('button', { name: 'Buscar', exact: true }).click()
        await page.getByRole('button', { name: 'Escribir valores', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Kcal rápidas', exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Escribir valores', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre del alimento', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.deepEqual(await registros(page), conBusqueda)

        // Se conserva la edición/borrado del diario, incluso con un solo ingrediente.
        await page.getByRole('button', { name: new RegExp(`^${nombre} `) }).click()
        const ingredientes = page.getByRole('list', { name: `Ingredientes de ${nombre}`, exact: true })
        await ingredientes.getByRole('button', { name: 'Borrar Pollo', exact: true }).click()
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        assert.deepEqual((await registros(page)).sort((a, b) => a.id - b.id), conBusqueda)
        await page.evaluate(async (platoId) => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          const actuales = (await r.delDia(d.todayISO())).filter((e) => e.platoId === platoId)
          await r.borrarVarias(actuales.slice(1).map((e) => e.id))
        }, platoId)
        await editar()
        await page.getByText('Ver ingredientes actuales (1)', { exact: true }).waitFor()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('20 g de tomate')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await cerrarGuardado(page)
        const reducido = await registros(page)
        assert.equal(reducido.filter((e) => e.platoId === platoId).length, 2)
        assert.deepEqual(reducido.find((e) => e.id === originales[0].id), originales[0])
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-diario.png`) })
        await page.reload()
        await navegar(page, 'Nutrición')
        await editar()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('10 g de tomate')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await page.getByRole('button', { name: /^Añadir al plato ·/ }).waitFor()
        // Si otra acción elimina el destino mientras se revisa, no se recrea silenciosamente.
        await page.evaluate(async (platoId) => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          await r.borrarVarias((await r.delDia(d.todayISO())).filter((e) => e.platoId === platoId).map((e) => e.id))
        }, platoId)
        await page.getByRole('button', { name: /^Añadir al plato ·/ }).click()
        await page.getByText(/Este plato ya no está disponible/).waitFor()
        assert.deepEqual(await registros(page), antes.filter((e) => e.platoId !== platoId))
        await layout(page)
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.deepEqual(errores, [])
        resultados.push({ width, colorScheme, correcto: true })
        console.log(`Platos: ${width} px, ${colorScheme}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado: resultados.length === 6, casos: resultados }, null, 2))
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
