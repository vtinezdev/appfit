/* Lista de la compra con recetas: una receta planificada sale por sus ingredientes, en proporción y sin el agua del grifo.
   Requiere Vite en 5173 (origen appfit-test.localhost, perfil nuevo), Playwright y Chromium. Importa el catálogo publicado
   y planifica 2 raciones del arroz al horno (6 raciones, 2.300 g) para hoy. Capturas en APPFIT_UI_OUTPUT. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-compra-recetas'
// Ancho a probar (320, 375 o 430); por defecto 375.
const ancho = Number(process.env.APPFIT_UI_WIDTH || 375)
const alto = { 320: 568, 375: 812, 430: 932 }[ancho] || 812

async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  await page.waitForTimeout(250)
  const problemas = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('button,input,[role="dialog"]')].filter(e => e.getClientRects().length && !e.closest('[inert]'))
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      tacto: visibles.filter(e => e.matches('button') && e.getBoundingClientRect().height < 43.9).map(e => e.textContent || e.getAttribute('aria-label')),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [] }, nombre)
  await page.screenshot({ path: path.join(salida, `${ancho}-${nombre}.png`) })
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try {
    for (const colorScheme of ['light', 'dark']) {
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== colorScheme) continue
      const context = await browser.newContext({ viewport: { width: ancho, height: alto }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'es-ES', timezoneId: 'Europe/Madrid' })
      await context.route('**/world.openfoodfacts.org/**', r => r.abort())
      const page = await context.newPage()
      try {
        const errores = []
        page.on('pageerror', e => errores.push(e.message))
        await page.goto(origen)
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        await page.evaluate(async () => {
          await (await import('/src/features/nutricion/lib/catalogo/sincronizar.ts')).sincronizarCatalogo()
          const { planificarAlimento } = await import('/src/features/nutricion/data/planificadasRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          // 2 raciones de 6 (2.300 g): un tercio del lote.
          await planificarAlimento({ fecha: todayISO(), comida: 'comida', ref: { tipo: 'catalog', id: 'tipicos:arroz-al-horno' }, gramos: 2300 / 3 }, todayISO())
        })

        await navegar(page, 'Nutrición')
        await page.getByRole('main').getByRole('tab', { name: 'Plan', exact: true }).click()
        await page.getByRole('button', { name: 'Lista de la compra', exact: true }).click()
        const lista = page.getByRole('dialog', { name: 'Lista de la compra', exact: true })
        // 400 g de arroz en el lote → un tercio, 133 g; sin el agua del grifo ni la receta entera.
        const arroz = lista.getByRole('listitem').filter({ hasText: 'Arroz blanco, crudo' })
        await arroz.waitFor()
        assert.match(await arroz.textContent(), /Para: Arroz al horno, horneado/)
        assert.match(await arroz.textContent(), /133 g/)
        assert.equal(await lista.getByText(/^Agua del grifo/).count(), 0)
        assert.equal(await lista.getByText('Arroz al horno, horneado', { exact: true }).count(), 0)
        await captura(page, `${colorScheme}-compra`)
        assert.deepEqual(errores, [])
        console.log(`OK ${colorScheme}: la receta planificada sale por sus ingredientes, en proporción y sin el agua del grifo.`)
      } catch (e) {
        await page.screenshot({ path: path.join(salida, `${colorScheme}-fallo.png`) })
        throw e
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
