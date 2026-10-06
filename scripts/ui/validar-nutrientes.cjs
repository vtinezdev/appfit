/* Regresión aislada del detalle nutricional. Requiere Vite, Playwright y Chromium.
   Usa contextos nuevos en el origen de pruebas; no consulta APIs externas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-nutrientes-ui'
const nutrientes = ['Fibra', 'Azúcares', 'Sal', 'Grasas saturadas']
const claves = ['fibra', 'azucares', 'sal', 'agSat']

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

async function registros(page) {
  return page.evaluate(async () => {
    const r = await import('/src/features/nutricion/data/entriesRepo.ts')
    const d = await import('/src/shared/lib/dates.ts')
    return r.delDia(d.todayISO())
  })
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
        await page.evaluate(async () => { const c = await import('/src/features/nutricion/lib/catalogo/sincronizar.ts'); await c.sincronizarCatalogo() })
        await navegar(page, 'Nutrición')
        assert.equal(await page.getByRole('radio', { name: 'Vista sencilla', exact: true }).getAttribute('aria-checked'), 'true')
        assert.equal(await page.getByRole('region', { name: 'Desglose del día', exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('200 g de arroz')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await page.getByRole('button', { name: 'Detalles del alimento', exact: true }).click()
        const por100 = {}
        for (let i = 0; i < nutrientes.length; i++) {
          const input = page.getByRole('spinbutton', { name: `${nutrientes[i]}/100g`, exact: true })
          assert.equal(await input.isVisible(), true)
          const valor = await input.inputValue()
          if (valor !== '') por100[claves[i]] = Number(valor)
        }
        assert.ok(Object.keys(por100).length > 0, 'el alimento real del catálogo trae extras')
        await page.getByRole('spinbutton', { name: 'gramos', exact: true }).fill('50')
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-detalles.png`) })
        await page.getByRole('button', { name: /^Guardar ·/ }).click()
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
        const [registrado] = await registros(page)
        const esperado = Object.fromEntries(Object.entries(por100).map(([clave, valor]) => [clave, Math.round(valor * 0.5 * 1000) / 1000]))
        assert.deepEqual(registrado.nutrientes, esperado)
        assert.equal(await page.getByRole('region', { name: 'Desglose del día', exact: true }).count(), 0)
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        const desglose = page.getByRole('region', { name: 'Desglose del día', exact: true })
        await desglose.waitFor()
        for (const label of nutrientes) assert.equal(await desglose.getByText(label, { exact: true }).isVisible(), true)
        const texto = await desglose.innerText()
        assert.ok(!texto.includes('Parcial'))
        for (let i = 0; i < nutrientes.length; i++) {
          const celda = desglose.locator('[data-nutriente]').filter({ has: page.getByText(nutrientes[i], { exact: true }) })
          const esperadoVisible = esperado[claves[i]] === undefined ? 'Sin datos' : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(esperado[claves[i]])} g`
          assert.equal(await celda.locator('dd').innerText(), esperadoVisible)
        }
        await layout(page)
        await page.screenshot({ path: path.join(salida, `${width}-${colorScheme}-diario.png`) })

        // Una entrada antigua sin extras no se interpreta como cero.
        await page.evaluate(async () => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          await r.anadirRapida({ fecha: d.todayISO(), comida: 'snack', nombre: 'Sin información', kcal: 100, prot: 0, carb: 0, grasa: 0 })
        })
        await desglose.getByText('Información disponible en 1 de 2 alimentos', { exact: true }).first().waitFor()
        await page.getByRole('radio', { name: 'Vista sencilla', exact: true }).click()
        assert.equal(await desglose.count(), 0)

        // Introducción manual, cero conocido y borrado de un dato opcional.
        await page.getByRole('tab', { name: 'Alimentos', exact: true }).click()
        await page.getByRole('button', { name: 'Nuevo', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre del alimento', exact: true }).fill('Alimento de prueba')
        for (const [name, value] of [['Kcal/100g', '100'], ['Prot/100g', '5'], ['Carb/100g', '10'], ['Grasa/100g', '4'], ['Fibra/100g', '2'], ['Azúcares/100g', '0'], ['Sal/100g', '0.15'], ['Grasas saturadas/100g', '1']]) {
          await page.getByRole('spinbutton', { name, exact: true }).fill(value)
        }
        await layout(page)
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.getByRole('button', { name: /^Alimento de prueba/ }).click()
        await page.getByRole('spinbutton', { name: 'Sal/100g', exact: true }).fill('')
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.getByRole('tab', { name: 'Diario', exact: true }).click()
        assert.equal(await page.getByRole('radio', { name: 'Vista sencilla', exact: true }).getAttribute('aria-checked'), 'true')
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        await page.getByRole('textbox', { name: 'Describe lo que has comido' }).fill('50 g de Alimento de prueba')
        await page.getByRole('button', { name: 'Interpretar', exact: true }).click()
        await page.getByRole('button', { name: 'Detalles del alimento', exact: true }).click()
        assert.equal(await page.getByRole('spinbutton', { name: 'Azúcares/100g', exact: true }).inputValue(), '0')
        assert.equal(await page.getByRole('spinbutton', { name: 'Sal/100g', exact: true }).inputValue(), '')
        await page.getByRole('button', { name: /^Guardar ·/ }).click()
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
        const manual = (await registros(page)).find((e) => e.nombre === 'Alimento de prueba')
        assert.deepEqual(manual.nutrientes, { fibra: 1, azucares: 0, agSat: 0.5 })
        await page.reload()
        await navegar(page, 'Nutrición')
        assert.equal(await page.getByRole('radio', { name: 'Vista sencilla', exact: true }).getAttribute('aria-checked'), 'true')
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        await layout(page)
        assert.deepEqual(errores, [])
        resultados.push({ width, colorScheme, correcto: true })
        console.log(`Nutrientes: ${width} px, ${colorScheme}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado: resultados.length === 6, casos: resultados }, null, 2))
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
