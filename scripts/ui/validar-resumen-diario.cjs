/* Resumen diario en Inicio/Nutrición. Vite + Playwright + Chromium, solo origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-resumen-diario-ui'
const casos = {
  vacio: { kcal: 0, prot: 0, carb: 0, grasa: 0 },
  habitual: { kcal: 113, prot: 6, carb: 9, grasa: 6 },
  exceso: { kcal: 2500, prot: 200, carb: 250, grasa: 80 },
  extremo: { kcal: 123456789.9, prot: 9999999.9, carb: 8888888.8, grasa: 7777777.7 },
}

async function backup(page) {
  return page.evaluate(async () => {
    const b = await import('/src/shared/lib/backup.ts')
    const datos = await b.exportarBackup()
    delete datos.exportedAt
    return JSON.parse(JSON.stringify(datos))
  })
}

async function comprobar(page, resumen, totales) {
  await resumen.locator(`[role="progressbar"][aria-label="Calorías"][aria-valuenow="${Math.round(totales.kcal)}"]`).waitFor()
  const tarjeta = resumen.locator(':scope > div')
  await tarjeta.waitFor()
  const medidas = await tarjeta.evaluate((el) => {
    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const siguiente = el.parentElement.nextElementSibling?.getBoundingClientRect()
    const shell = getComputedStyle(document.querySelector('main'))
    const visible = (n) => n.getClientRects().length && !n.closest('[hidden],[inert]')
    const desbordes = [...document.querySelectorAll('html,main'), el, ...el.querySelectorAll('div,p,strong,span')]
      .filter(visible).filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).display !== 'inline').map((n) => n.tagName)
    const tacto = [...document.querySelectorAll('button,[role="radio"],[role="tab"]')].filter(visible).filter((n) => n.getBoundingClientRect().height < 43.9).map((n) => n.textContent)
    return { border: style.borderTopWidth, radius: parseFloat(style.borderTopLeftRadius), padding: parseFloat(style.paddingLeft), bg: style.backgroundColor, fondo: shell.backgroundColor, separacion: siguiente ? siguiente.top - rect.bottom : null, desbordes, tacto }
  })
  assert.equal(medidas.border, '1px')
  assert.equal(medidas.radius, 16)
  assert.equal(medidas.padding, 16)
  assert.notEqual(medidas.bg, medidas.fondo)
  assert.ok(medidas.separacion >= 27.9, `separación: ${medidas.separacion}`)
  assert.deepEqual(medidas.desbordes, [])
  assert.deepEqual(medidas.tacto, [])
  for (const [label, clave] of [['Calorías', 'kcal'], ['Proteína', 'prot'], ['Carbohidratos', 'carb'], ['Grasa', 'grasa']]) {
    assert.equal(await resumen.getByRole('progressbar', { name: label, exact: true }).getAttribute('aria-valuenow'), String(Math.round(totales[clave])))
  }
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const resultados = []
  try {
    for (const width of [320, 375, 430]) for (const colorScheme of ['light', 'dark']) for (const [estado, totales] of Object.entries(casos)) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme, reducedMotion: 'reduce' })
      try {
        await context.route('**/world.openfoodfacts.org/**', (route) => route.abort())
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', (e) => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        // Completa el arranque antes del backup base: el primer inicio guarda los ajustes por defecto.
        await page.evaluate(async () => { const s = await import('/src/shared/db/settings.ts'); await s.ensureSettings() })
        if (estado !== 'vacio') await page.evaluate(async ({ totales, estado }) => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          await r.guardarComida({ fecha: d.todayISO(), comida: 'comida', items: [{ nombre: estado === 'extremo' ? 'Alimento con un nombre muy largo para comprobar el resumen y su separación del contenido del diario sin recortar los datos guardados' : 'Alimento de prueba', gramos: 100, kcal100: totales.kcal, prot100: totales.prot, carb100: totales.carb, grasa100: totales.grasa, nutrientes: { fibra: 1.2, azucares: 3, sal: 0.2, agSat: 1.1 }, fuenteSiNuevo: 'manual' }] })
        }, { totales, estado })
        const antes = await backup(page)
        const inicio = page.getByRole('region', { name: 'Resumen de hoy', exact: true })
        const tag = `${width}-${colorScheme}-${estado}`
        await comprobar(page, inicio, totales)
        if (estado === 'habitual') {
          await inicio.getByText('Quedan 2.087 kcal', { exact: true }).waitFor()
          await page.screenshot({ path: path.join(salida, `${tag}-inicio.png`) })
        }
        await inicio.getByRole('button', { name: 'Ver día', exact: true }).click()
        await page.getByRole('heading', { name: 'Nutrición', exact: true }).waitFor()
        const diario = page.getByRole('region', { name: /^Resumen de / }).first()
        await comprobar(page, diario, totales)
        assert.equal(await diario.getByRole('region', { name: 'Desglose del día', exact: true }).count(), 0)
        if (estado === 'habitual') await page.screenshot({ path: path.join(salida, `${tag}-nutricion.png`) })
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        await diario.getByRole('region', { name: 'Desglose del día', exact: true }).waitFor()
        await comprobar(page, diario, totales)
        if (estado === 'habitual') await page.screenshot({ path: path.join(salida, `${tag}-detallada.png`) })
        await page.getByRole('radio', { name: 'Vista sencilla', exact: true }).click()
        assert.equal(await diario.getByRole('region', { name: 'Desglose del día', exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Día anterior', exact: true }).click()
        await comprobar(page, diario, casos.vacio)
        await page.getByRole('button', { name: 'Día siguiente', exact: true }).click()
        await comprobar(page, diario, totales)
        await page.getByRole('button', { name: 'Inicio', exact: true }).click()
        await comprobar(page, inicio, totales)
        assert.deepEqual(await backup(page), antes, 'la presentación no modifica datos')
        assert.deepEqual(errores, [])
        resultados.push({ width, colorScheme, estado, correcto: true })
        console.log(`Resumen diario: ${tag}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado: resultados.length === 24, casos: resultados }, null, 2))
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
