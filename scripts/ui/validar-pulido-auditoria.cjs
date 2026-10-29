/* UI-02/03/04/05/08. Contextos efímeros, solo origen de pruebas y datos sintéticos. */
const qa = require('./auditoria-comun.cjs')
const { assert, abrir, sembrar, navegar, datos, captura, geometria, informe } = qa
const resultados = []
async function motor(nombre) {
  let browser
  try { browser = await qa.lanzar(nombre) }
  catch (e) { resultados.push({ id: nombre, estado: 'no-disponible', error: e.message }); return }
  try {
    const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
    casos.push({ width: 375, theme: 'light', grande: true }, { width: 375, theme: 'dark', grande: true })
    for (const c of casos) {
      const id = `${nombre}-${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && !id.includes(process.env.APPFIT_UI_CASE)) continue
      const ctx = await qa.contexto(browser, { viewport: { width: c.width, height: 812 }, colorScheme: c.theme })
      const resultado = { id, estado: 'en-curso' }
      let page
      try {
        const abierto = await abrir(ctx)
        page = abierto.page
        await sembrar(page)
        await page.evaluate(async () => {
          const meals = await import('/src/features/nutricion/data/mealsRepo.ts')
          const item = (nombre, categoria) => ({ nombre, gramos: 100, kcal100: 100, prot100: 5, carb100: 10, grasa100: 4, fuenteSiNuevo: 'manual', categoria })
          await meals.crearDesdeRevision({ nombre: 'Café con leche QA', comida: 'desayuno', items: [item('Café con leche QA', 'Bebidas')] })
          await meals.crearDesdeRevision({ nombre: 'Bol de avena QA con un nombre largo para comprobar la lectura', items: [item('Avena QA', 'Cereales, arroz y pasta'), item('Leche QA', 'Leche y nata')] })
        })
        if (c.grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
        const antes = await datos(page)
        await navegar(page, 'Nutrición')
        const resumen = page.getByRole('region', { name: /^Resumen de / }).first()
        const energia = resumen.getByRole('progressbar', { name: 'Calorías', exact: true })
        const suma = antes.entries.filter(e => e.fecha === antes.pesos.at(-1).fecha).reduce((n, e) => n + e.kcal, 0)
        await page.waitForFunction(suma => document.querySelector('.nutrition-summary [aria-label="Calorías"]')?.getAttribute('aria-valuenow') === String(Math.round(suma)), suma)
        assert.equal(await energia.getAttribute('aria-valuenow'), String(Math.round(suma)))
        const desplegar = resumen.getByRole('button', { name: 'Ver detalle nutricional', exact: true })
        assert.equal(await desplegar.getAttribute('aria-expanded'), 'false')
        await desplegar.click()
        await resumen.getByRole('region', { name: 'Desglose del día', exact: true }).waitFor()
        await desplegar.click()
        assert.equal(await resumen.getByRole('region', { name: 'Desglose del día', exact: true }).count(), 0)
        const pista = page.getByRole('complementary', { name: 'Pista', exact: true })
        await pista.getByText('Desliza un alimento a la izquierda para copiar o borrar.', { exact: true }).waitFor()
        await page.getByRole('heading', { name: 'Nutrición', exact: true }).scrollIntoViewIfNeeded()
        await captura(page, `${id}-diario`)
        let g = await geometria(page, 'diario')
        assert.deepEqual(g.overflow, []); assert.deepEqual(g.tacto, [])
        for (const comida of ['desayuno', 'comida', 'cena', 'snack']) {
          await page.getByRole('button', { name: `Comidas típicas de ${comida}`, exact: true }).click()
          const selector = page.getByRole('dialog', { name: 'Comidas típicas', exact: true })
          await selector.getByRole('button', { name: /^Café con leche QA/ }).waitFor()
          await selector.getByText(/1 alimento · Guardada/).waitFor()
          await selector.getByText(/2 alimentos · Guardada/).waitFor()
          const iconos = await selector.locator('.icono-pastilla svg path').evaluateAll(es => es.map(e => e.getAttribute('d')))
          assert.ok(new Set(iconos).size >= 2, 'producto y combinación tienen iconos distintos')
          g = await geometria(page, 'tipicas')
          assert.deepEqual(g.overflow, []); assert.deepEqual(g.tacto, [])
          if (comida === 'desayuno') await captura(page, `${id}-tipicas`)
          await page.keyboard.press('Escape')
          await selector.waitFor({ state: 'detached' })
        }
        await page.getByRole('tab', { name: 'Alimentos', exact: true }).click()
        await page.getByRole('radio', { name: 'Alimentos', exact: true }).waitFor()
        await page.getByRole('radio', { name: 'Recetas', exact: true }).click()
        await page.locator('[role="radio"][aria-checked="true"]', { hasText: 'Recetas' }).waitFor()
        assert.deepEqual((await geometria(page, 'mis-alimentos')).overflow, [])
        await page.getByRole('tab', { name: 'Diario', exact: true }).click()
        assert.deepEqual(await datos(page), antes, 'navegar y consultar no escribe datos')
        await page.getByRole('button', { name: 'Cerrar pista', exact: true }).click()
        await pista.waitFor({ state: 'detached' })
        const trasPista = await datos(page)
        const esperado = structuredClone(antes)
        esperado.settings[0].pistasVistas = [...new Set([...(antes.settings[0].pistasVistas || []), 'nutricion-deslizar'])].sort()
        assert.deepEqual(trasPista, esperado, 'cerrar la pista solo cambia su ajuste')
        await page.reload()
        await navegar(page, 'Nutrición')
        await resumen.waitFor()
        assert.equal(await page.getByRole('button', { name: 'Cerrar pista', exact: true }).count(), 0)
        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
        await page.getByRole('button', { name: 'Ir a ejercicios', exact: true }).click()
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'progreso-lista')
        const destino = await page.locator('#progreso-lista').boundingBox()
        assert.ok(destino.y >= 0 && destino.y < 812, 'destino visible')
        assert.deepEqual((await geometria(page, 'progreso')).overflow, [])
        await captura(page, `${id}-ejercicios`)
        assert.deepEqual(await datos(page), trasPista, 'el atajo y la recarga no escriben datos')
        assert.deepEqual(abierto.errores, [])
        resultado.estado = 'correcto'
      } catch (e) {
        resultado.estado = 'fallo'; resultado.error = e.message
        if (page) resultado.captura = await captura(page, `${id}-fallo`).catch(() => undefined)
      } finally { await ctx.close(); resultados.push(resultado); informe('pulido-auditoria', resultados); console.log(`${id}: ${resultado.estado}${resultado.error ? ': ' + resultado.error : ''}`) }
    }
  } finally { await browser.close() }
}
Promise.all((process.env.APPFIT_AUDIT_BROWSERS || 'chromium').split(',').map(motor)).then(() => {
  informe('pulido-auditoria', resultados)
  if (resultados.some(r => r.estado !== 'correcto')) process.exitCode = 1
}).catch(e => { console.error(e); process.exitCode = 1 })
