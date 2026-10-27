/* Recetas al añadir comida: marcadas en Buscar, hoja de receta, cambiar ingredientes y variantes.
   Requiere Vite en 5173 (origen appfit-test.localhost, perfil nuevo), Playwright y Chromium. Importa el catálogo
   publicado (con las recetas de típicos) y siembra una receta propia. Capturas en APPFIT_UI_OUTPUT. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origen = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-recetas-anadir'
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
      campos: visibles.filter(e => e.matches('input') && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.getAttribute('aria-label') || e.type),
    }
  })
  assert.deepEqual(problemas, { overflow: false, tacto: [], campos: [] }, nombre)
  await page.screenshot({ path: path.join(salida, `${ancho}-${nombre}.png`) })
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try {
    for (const colorScheme of ['light', 'dark']) {
      let page
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== colorScheme) continue
      const context = await browser.newContext({ viewport: { width: ancho, height: alto }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'es-ES', timezoneId: 'Europe/Madrid' })
      await context.route('**/world.openfoodfacts.org/**', r => r.abort())
      page = await context.newPage()
      try {
      const errores = []
      page.on('pageerror', e => errores.push(e.message))
      await page.goto(origen)
      await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
      await page.evaluate(async () => {
        await (await import('/src/features/nutricion/lib/catalogo/sincronizar.ts')).sincronizarCatalogo()
        const recetas = await import('/src/features/nutricion/data/recetasRepo.ts')
        const i = (nombre, gramos, kcal, prot, carb, grasa) => ({ nombre, gramos, kcal, prot, carb, grasa })
        await recetas.crear({ nombre: 'Lentejas de la abuela', categoria: 'Platos preparados', pesoCocinadoG: 2400, raciones: 4, pasos: ['Cuece las lentejas.'],
          ingredientes: [i('Lentejas pardinas', 320, 1005, 76.8, 153.6, 5.8), i('Chorizo para guisar', 150, 683, 36, 3, 58), i('Patata', 300, 231, 6, 51, 0.3)] })
      })

      await navegar(page, 'Nutrición')
      await page.getByRole('main').getByRole('button', { name: /^Añadir/ }).first().click()
      await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
      const buscar = page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' })
      await buscar.fill('lentejas')
      const recetas = page.getByRole('heading', { name: 'Recetas', exact: true })
      await recetas.waitFor()
      await page.getByText('Lentejas con chorizo, estofadas', { exact: true }).waitFor()
      await page.getByText('Receta · Tuya · 4 raciones', { exact: true }).waitFor()
      await captura(page, `${colorScheme}-1-buscar`)

      // Hoja de una receta del catálogo con preparación: una ración de 417 g.
      await page.getByText('Lentejas con chorizo, estofadas', { exact: true }).click()
      const hoja = page.getByRole('dialog', { name: 'Receta', exact: true })
      await hoja.getByText('Receta · AppFit · 6 raciones · 1 h 10 min', { exact: true }).waitFor()
      await hoja.getByText(/417 g cocinados/).waitFor()
      await captura(page, `${colorScheme}-2-hoja`)
      await hoja.getByRole('button', { name: /^Ingredientes para/ }).click()
      await hoja.getByText('Chorizo', { exact: true }).waitFor()
      await hoja.getByText('Chorizo', { exact: true }).scrollIntoViewIfNeeded()
      await captura(page, `${colorScheme}-3-hoja-ingredientes`)

      // Cambiar ingredientes: quitar el chorizo → pregunta → guardar como variante.
      await hoja.getByRole('button', { name: 'Cambiar ingredientes', exact: true }).click()
      await hoja.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: 'Editar Chorizo', exact: true }).click()
      await page.getByRole('button', { name: 'Quitar Chorizo', exact: true }).click()
      await page.getByRole('button', { name: /^Añadir a .* kcal$/ }).click()
      const pregunta = page.getByRole('dialog', { name: 'Has cambiado la receta', exact: true })
      await pregunta.getByRole('list', { name: 'Cambios' }).getByText(/Sin chorizo/).waitFor()
      assert.equal(await pregunta.getByRole('textbox', { name: 'Nombre de la variante' }).inputValue(), 'Sin chorizo')
      await captura(page, `${colorScheme}-4-pregunta`)
      await pregunta.getByRole('button', { name: 'Guardar como variante', exact: true }).click()
      const plato = page.getByText('Lentejas con chorizo, estofadas · Sin chorizo', { exact: true }).first()
      await plato.waitFor()
      await plato.scrollIntoViewIfNeeded()
      await captura(page, `${colorScheme}-5-diario`)

      // Otra vez: la hoja ofrece la normal y la variante.
      await page.getByRole('main').getByRole('button', { name: /^Añadir/ }).first().click()
      await page.getByRole('tab', { name: 'Buscar', exact: true }).click()
      await page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' }).fill('lentejas con chorizo')
      await page.getByText('Lentejas con chorizo, estofadas', { exact: true }).click()
      const hoja2 = page.getByRole('dialog', { name: 'Receta', exact: true })
      await hoja2.getByRole('radio', { name: /Sin chorizo/ }).click()
      await captura(page, `${colorScheme}-6-hoja-variante`)
      const variante = await hoja2.getByRole('button', { name: /^Añadir a .* kcal$/ }).textContent()
      await hoja2.getByRole('radio', { name: /^Normal/ }).click()
      const normal = await hoja2.getByRole('button', { name: /^Añadir a .* kcal$/ }).textContent()
      assert.notEqual(variante, normal, 'la variante sin chorizo aporta menos que la normal')
      await page.keyboard.press('Escape')
      await hoja2.waitFor({ state: 'detached' })

      // La receta propia: la normal se registra como un alimento.
      await page.getByRole('searchbox', { name: 'Buscar en tus alimentos y en el catálogo' }).fill('lentejas de la abuela')
      await page.getByText('Lentejas de la abuela', { exact: true }).click()
      const hoja3 = page.getByRole('dialog', { name: 'Receta', exact: true })
      await hoja3.getByText('Receta · Tuya · 4 raciones', { exact: true }).waitFor()
      await hoja3.getByRole('button', { name: /^Añadir a .* kcal$/ }).click()
      await page.waitForFunction(async () => {
        const { delDia } = await import('/src/features/nutricion/data/entriesRepo.ts')
        const { todayISO } = await import('/src/shared/lib/dates.ts')
        return (await delDia(todayISO())).some(e => e.nombre === 'Lentejas de la abuela' && e.foodId !== undefined)
      }, null, { polling: 250 })
      // Escribir: una sola receta abre su hoja directamente, con los gramos escritos.
      await page.getByRole('main').getByRole('button', { name: /^Añadir/ }).first().click()
      const describir = page.getByRole('textbox', { name: 'Describe lo que has comido' })
      await describir.fill('400 g de arroz al horno')
      await page.getByRole('button', { name: /^Revisar/ }).click()
      const hojaEscrita = page.getByRole('dialog', { name: 'Receta', exact: true })
      await hojaEscrita.getByText('Arroz al horno, horneado', { exact: true }).waitFor()
      assert.equal(await hojaEscrita.getByRole('textbox', { name: 'gramos' }).inputValue(), '400')
      await captura(page, `${colorScheme}-9-escribir-receta`)
      await page.keyboard.press('Escape')
      await hojaEscrita.waitFor({ state: 'detached' })

      // Con más alimentos: la fila de la receta abre su hoja y lo elegido la sustituye.
      await describir.fill('arroz al horno\n1 manzana')
      await page.getByRole('button', { name: /^Revisar/ }).click()
      const filaReceta = page.getByRole('button', { name: 'Ver receta Arroz al horno, horneado', exact: true })
      await filaReceta.waitFor()
      await captura(page, `${colorScheme}-10-revision-con-receta`)
      await filaReceta.click()
      const hojaFila = page.getByRole('dialog', { name: 'Receta', exact: true })
      await hojaFila.getByRole('button', { name: 'Quitar de la comida', exact: true }).waitFor()
      await hojaFila.getByRole('button', { name: /^Cambiar ingredientes/ }).click()
      await hojaFila.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: /^Editar Arroz blanco, crudo/ }).waitFor()
      assert.equal(await filaReceta.count(), 0, 'los ingredientes sustituyen a la fila de la receta')
      await page.getByRole('button', { name: 'Cancelar', exact: true }).first().click()
      const descartar = page.getByRole('button', { name: 'Descartar', exact: true })
      if (await descartar.count()) await descartar.click()

      // Pantalla Recetas: tus recetas y el recetario AppFit con buscador y ficha de solo lectura.
      await navegar(page, 'Recetas')
      const recetario = page.getByRole('region', { name: 'Recetario AppFit' })
      await recetario.getByRole('searchbox', { name: 'Buscar en el recetario AppFit' }).fill('arroz al horno')
      await recetario.getByText('Arroz al horno, horneado', { exact: true }).waitFor()
      await captura(page, `${colorScheme}-7-recetario`)
      await recetario.getByText('Arroz al horno, horneado', { exact: true }).click()
      const ficha = page.getByRole('dialog', { name: 'Receta', exact: true })
      await ficha.getByText(/Recetario AppFit · 6 raciones/).waitFor()
      assert.equal(await ficha.getByRole('button', { name: 'Editar', exact: true }).count(), 0)
      await ficha.getByRole('region', { name: 'Preparación' }).evaluate(e => e.scrollIntoView({ block: 'start' }))
      await captura(page, `${colorScheme}-8-ficha-recetario`)

      // Copiar a mis recetas: la ficha pasa a la copia, editable, y sale en «Tus recetas».
      await ficha.getByRole('button', { name: 'Copiar a mis recetas', exact: true }).click()
      await ficha.getByText(/^Copiada a tus recetas/).waitFor()
      await ficha.getByText(/^Tuya · 6 raciones/).waitFor()
      await ficha.getByRole('button', { name: 'Editar', exact: true }).waitFor()
      await ficha.getByRole('button', { name: 'Editar', exact: true }).scrollIntoViewIfNeeded()
      await captura(page, `${colorScheme}-11-copiada`)
      await page.keyboard.press('Escape')
      await ficha.waitFor({ state: 'detached' })
      await page.getByRole('region', { name: 'Tus recetas' }).getByText('Arroz al horno, horneado', { exact: true }).waitFor()
      assert.deepEqual(errores, [])
      console.log(`OK ${colorScheme}: recetas en Buscar, hoja, variante «Sin chorizo» guardada y registrada, receta propia registrada, receta del recetario copiada.`)
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
