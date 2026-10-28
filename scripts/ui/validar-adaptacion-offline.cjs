/* Build servido en 5174; perfil desechable y un pesaje sintético. */
const assert = require('node:assert/strict')
const { chromium, devices } = require('playwright')
const { navegar } = require('./navegar.cjs')

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const context = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' })
  try {
    const page = await context.newPage()
    await page.addLocatorHandler(page.getByRole('button', { name: 'Genial', exact: true }), async (boton) => { await boton.click() })
    const errores = []
    page.on('pageerror', error => errores.push(error.message))
    await page.goto('http://appfit-test.localhost:5174')
    await page.getByRole('button', { name: 'Registrar peso', exact: true }).click()
    await page.getByRole('dialog', { name: 'Registrar peso', exact: true }).getByRole('button', { name: 'Guardar', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    await page.getByText('70', { exact: true }).waitFor()
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    await context.setOffline(true)
    await page.reload()
    await page.getByRole('heading', { name: 'Hoy', exact: true }).waitFor()
    await page.getByText('70', { exact: true }).waitFor()
    for (const tab of ['Nutrición', 'Entreno', 'Ajustes', 'Perfil', 'Referencias', 'Cumbres', 'Caminos', 'Ritmo', 'Vitrina']) {
      await navegar(page, tab)
      await page.getByRole('main').getByRole('heading').first().waitFor()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    }
    await navegar(page, 'Inicio')
    await page.getByRole('button', { name: 'Añadir 250 ml de agua', exact: true }).click()
    await page.getByRole('button', { name: /^Agua/ }).first().click()
    const agua = page.getByRole('dialog', { name: 'Agua', exact: true })
    // La evolución del agua son barras por día (bloque 7 del documento de mejoras), con la media en su texto accesible.
    await agua.getByRole('img', { name: /^Agua de los últimos 7 días: media de / }).waitFor()
    assert.deepEqual(errores, [])
    console.log('Producción: pesaje conservado, recarga offline y nueve destinos y evolución del agua abiertos por primera vez sin conexión: correcto.')
  } finally { await context.close(); await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
