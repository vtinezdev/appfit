/* Nutrición: actualización mientras el buscador está abierto y búsqueda offline.
   Requiere Vite en 5173, Playwright y Chromium. Usa un perfil nuevo de pruebas. */
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errores = []
    page.on('pageerror', e => errores.push(e.message))
    let liberar
    const pendiente = new Promise(resolve => { liberar = resolve })
    let descargaSolicitada
    const solicitada = new Promise(resolve => { descargaSolicitada = resolve })
    await context.route('**/catalogo/tipicos-*.json', async route => {
      descargaSolicitada()
      await pendiente
      await route.continue()
    })
    await page.goto('http://appfit-test.localhost:5173')
    await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
    await page.evaluate(() => {
      window.actualizacionTipicos = import('/src/features/nutricion/lib/catalogo/sincronizar.ts').then(m => m.sincronizarCatalogo())
    })
    await navegar(page, 'Nutrición')
    await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
    await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
    const buscar = page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' })
    await buscar.fill('pizza hawaiana')
    await solicitada
    await page.getByText('Sin coincidencias.', { exact: true }).waitFor()
    liberar()
    await page.evaluate(() => window.actualizacionTipicos)
    // La consulta no cambia: los resultados deben llegar por la importación.
    await page.getByText('Pizza de jamón y piña, envasada, cocinada', { exact: true }).waitFor()
    assert.equal(await buscar.inputValue(), 'pizza hawaiana')
    await context.setOffline(true)
    for (const [consulta, nombre] of [
      ['croquetas de jamón serrano', 'Croquetas de jamón serrano, caseras, fritas'],
      ['lombarda con manzana', 'Lombarda con manzana, cocinada'],
      ['pan con germen de trigo', 'Pan con germen de trigo, listo para consumir'],
      ['nigiri de atún', 'Nigiri de atún, listo para consumir'],
    ]) {
      await buscar.fill(consulta)
      await page.getByText(nombre, { exact: true }).waitFor()
    }
    assert.deepEqual(errores, [])
    console.log('OK: buscador abierto se refresca al importar; hawaiana y 4 búsquedas offline en Nutrición; sin errores de página.')
    await context.close()
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
