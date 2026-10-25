/* Regresión AF-01–05: solo origen de pruebas, perfiles nuevos y registros sintéticos. */
const qa = require('./auditoria-comun.cjs')
const { assert, lanzar, contexto, abrir, sembrar, navegar, datos, geometria, captura, informe } = qa
const motores = (process.env.APPFIT_AUDIT_BROWSERS || 'chromium').split(',')
const resultados = []

async function probar(browser, motor, nombre, opciones, tarea) {
  const id = `${motor}-${nombre}`
  if (process.env.APPFIT_UI_CASE && !id.includes(process.env.APPFIT_UI_CASE)) return
  const ctx = await contexto(browser, opciones)
  const resultado = { id, estado: 'en-curso' }
  try { await tarea(ctx, id); resultado.estado = 'correcto'; console.log(`${id}: correcto`) }
  catch (e) {
    resultado.estado = 'fallo'; resultado.error = e.message
    if (ctx.pages()[0]) resultado.captura = await captura(ctx.pages()[0], `${id}-fallo`).catch(() => undefined)
    console.log(`${id}: ${e.message}`)
  }
  finally { await ctx.close(); resultados.push(resultado); informe('correcciones-auditoria', resultados) }
}

async function motor(nombre) {
  let browser
  try { browser = await lanzar(nombre) }
  catch (e) { resultados.push({ id: nombre, estado: 'no-disponible', error: e.message }); return }
  try {
    await probar(browser, nombre, 'medianoche', {}, async ctx => {
      const page = await ctx.newPage()
      await page.clock.install({ time: new Date('2026-10-21T21:59:00Z') }) // 23:59 en Madrid.
      await page.goto(qa.ORIGEN)
      await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Añadir 250 ml de agua', exact: true }).click()
      await page.getByRole('button', { name: 'Deshacer', exact: true }).waitFor()
      await page.clock.setSystemTime(new Date('2026-10-21T22:01:00Z'))
      await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
      await page.getByText(/^jueves, 22 de octubre$/i).waitFor()
      await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
      await page.getByRole('button', { name: 'Añadir 250 ml de agua', exact: true }).click()
      await page.getByRole('button', { name: 'Registrar peso', exact: true }).click()
      await page.getByRole('dialog', { name: 'Registrar peso', exact: true }).getByRole('button', { name: 'Guardar', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'detached' })
      const b = await datos(page)
      assert.deepEqual(b.agua.map(a => [a.fecha, a.ml]), [['2026-10-22', 250]], 'agua y Deshacer conservan el día de su acción')
      assert.deepEqual(b.pesos.map(p => p.fecha), ['2026-10-22'], 'peso en el día nuevo')

      await navegar(page, 'Nutrición')
      await page.locator('[aria-current="date"] .semana-num').getByText('22', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
      const formulario = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
      await formulario.waitFor()
      await page.clock.setSystemTime(new Date('2026-10-22T22:01:00Z'))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await formulario.getByText('Ayer', { exact: true }).waitFor() // La tarea mantiene el destino del 22.
      await formulario.getByRole('button', { name: 'Cancelar', exact: true }).click()
      await formulario.waitFor({ state: 'detached' })
      assert.equal(await page.locator('[aria-current="date"] .semana-num').innerText(), '23', 'Diario sin fecha elegida sigue a hoy')
      await page.getByRole('button', { name: /21 de octubre/ }).click()
      await page.clock.setSystemTime(new Date('2026-10-23T22:01:00Z'))
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
      assert.equal(await page.locator('[aria-current="date"] .semana-num').innerText(), '21', 'la fecha histórica elegida se conserva')
    })

    await probar(browser, nombre, 'borrador', {}, async ctx => {
      const { page, errores } = await abrir(ctx)
      await sembrar(page)
      await navegar(page, 'Nutrición')
      await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
      let editor = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
      const antes = await datos(page)
      await editor.getByRole('textbox', { name: 'Describe lo que has comido', exact: true }).fill('100 g de arroz blanco cocido')
      for (const salida of ['atras', 'escape', 'boton', 'atras']) {
        if (salida === 'atras') await page.goBack()
        else if (salida === 'escape') await page.keyboard.press('Escape')
        else await editor.getByRole('button', { name: 'Cancelar', exact: true }).click()
        const confirmar = page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })
        await confirmar.getByRole('button', { name: 'Seguir editando', exact: true }).click()
        editor = page.getByRole('dialog', { name: 'Añadir comida', exact: true })
        assert.equal(await editor.getByRole('textbox', { name: 'Describe lo que has comido', exact: true }).inputValue(), '100 g de arroz blanco cocido')
      }
      await editor.getByRole('button', { name: 'Revisar 1 alimento', exact: true }).click()
      await editor.getByRole('button', { name: /^Añadir a / }).waitFor()
      await page.goBack()
      const confirmacion = page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })
      await captura(page, `${nombre}-descartar`)
      await confirmacion.getByRole('button', { name: 'Descartar', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'detached' })
      assert.deepEqual(await datos(page), antes, 'interpretar, seguir y descartar no escribe entradas')
      await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
      await page.getByRole('dialog', { name: 'Añadir comida', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'detached' })
      assert.deepEqual(errores, [])
    })

    await probar(browser, nombre, 'almacenamiento', {}, async ctx => {
      const { page, errores } = await abrir(ctx)
      await sembrar(page)
      const antes = await datos(page)
      await ctx.addInitScript(() => {
        const original = IDBFactory.prototype.open
        window.__falloApertura = true
        IDBFactory.prototype.open = function (...args) {
          if (window.__falloApertura) throw new DOMException('Fallo sintético de apertura', 'UnknownError')
          return original.apply(this, args)
        }
      })
      await page.reload()
      await page.getByRole('heading', { name: 'No se han podido abrir tus registros', exact: true }).waitFor()
      await captura(page, `${nombre}-fallo-almacenamiento`)
      await page.evaluate(() => { window.__falloApertura = false })
      await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
      await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
      assert.deepEqual(await datos(page), antes, 'reintentar conserva el backup completo')
      assert.deepEqual(errores, [], 'el rechazo de apertura se maneja')

      await page.evaluate(async () => {
        const { db } = await import('/src/shared/db/db.ts')
        const proto = Object.getPrototypeOf(db.entries.where('fecha').equals('2026-10-22'))
        const original = proto.toArray
        proto.toArray = function (...args) { return this._ctx.table.name === 'entries' ? Promise.reject(new Error('Fallo sintético de lectura')) : original.apply(this, args) }
      })
      await navegar(page, 'Nutrición')
      await page.getByRole('heading', { name: 'No se ha podido mostrar la pantalla', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Recargar AppFit', exact: true }).waitFor()
    })

    for (const c of [{ width: 320, theme: 'light' }, { width: 375, theme: 'dark', grande: true }, { width: 430, theme: 'light' }]) {
      await probar(browser, nombre, `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`, { viewport: { width: c.width, height: 812 }, colorScheme: c.theme }, async (ctx, id) => {
        const { page, errores } = await abrir(ctx)
        await sembrar(page)
        await page.getByText('72,5', { exact: true }).waitFor()
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          const rutina = await db.routines.toCollection().first()
          await db.routines.update(rutina.id, { nombre: 'Rutina de fuerza y movilidad con un nombre largo para leer completa' })
        })
        if (c.grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
        const antes = await datos(page)
        await navegar(page, 'Ajustes')
        await page.getByRole('button', { name: /^Objetivos diarios/ }).click()
        await page.getByRole('region', { name: 'Objetivos diarios', exact: true }).last().waitFor()
        const objetivos = await geometria(page, 'objetivos')
        assert.deepEqual(objetivos.overflow, [])
        assert.deepEqual(objetivos.inputs, [])
        await captura(page, `${id}-objetivos`)
        const campos = await page.locator('main input').evaluateAll(es => es.map(e => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })))
        assert.ok(campos.every(e => e.left >= 0 && e.right <= c.width + 1))
        await navegar(page, 'Entreno')
        const lista = page.getByRole('list', { name: 'Rutinas', exact: true })
        await lista.waitFor()
        await lista.scrollIntoViewIfNeeded()
        const medidas = await lista.locator('.rutina-fila-texto').evaluateAll(es => es.map(e => e.clientWidth))
        assert.ok(medidas.every(w => w >= 70), 'nombres con anchura útil')
        assert.deepEqual((await geometria(page, 'rutinas')).overflow, [])
        await captura(page, `${id}-rutina`)
        await lista.getByRole('button', { name: /^Rutina de fuerza/ }).click()
        await page.getByRole('region', { name: 'Ejercicios', exact: true }).waitFor()
        await navegar(page, 'Nutrición')
        await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
        const texto = page.getByRole('textbox', { name: 'Describe lo que has comido', exact: true })
        await texto.fill('100 g de arroz')
        await page.keyboard.press('Escape')
        const descartar = page.getByRole('dialog', { name: '¿Descartar los cambios?', exact: true })
        await descartar.waitFor()
        assert.deepEqual((await geometria(page, 'descartar')).overflow, [])
        await captura(page, `${id}-descartar`)
        await descartar.getByRole('button', { name: 'Seguir editando', exact: true }).click()
        assert.equal(await texto.inputValue(), '100 g de arroz')
        await page.keyboard.press('Escape')
        await descartar.getByRole('button', { name: 'Descartar', exact: true }).click()
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        assert.deepEqual(await datos(page), antes, 'consultar y medir no modifica registros')
        assert.deepEqual(errores, [])
      })
    }
  } finally { await browser.close() }
}

Promise.all(motores.map(motor)).then(() => {
  informe('correcciones-auditoria', resultados)
  if (resultados.some(r => r.estado !== 'correcto')) process.exitCode = 1
}).catch(error => { console.error(error); process.exitCode = 1 })
