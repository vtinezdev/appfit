/* Inventario de comportamiento real; las mediciones son evidencias que hay que interpretar, no capturas doradas. */
const qa = require('./auditoria-comun.cjs')
const { assert, contexto, abrir, sembrar, datos, captura, geometria, informe, navegar, lanzar } = qa
const motores = (process.env.APPFIT_AUDIT_BROWSERS || 'chromium').split(',')
const tamanos = [[320,568], [360,800], [375,667], [390,844], [430,932], [768,1024], [1024,768], [1440,900]]
const resultados = []

async function motor(nombre) {
  let browser
  try { browser = await lanzar(nombre) } catch (error) {
    resultados.push({ motor: nombre, estado: 'no-disponible', error: error.message })
    informe('interfaz', resultados)
    return
  }
  try {
    const casos = tamanos.map(([width,height], i) => ({ width,height,theme:i % 2 ? 'dark' : 'light' }))
    casos.push(...['light','dark'].map(theme => ({ width:375,height:667,theme,grande:true })))
    for (const c of casos) {
      const id = `${nombre}-${c.width}x${c.height}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && !id.includes(process.env.APPFIT_UI_CASE)) continue
      const ctx = await contexto(browser, { viewport: { width:c.width,height:c.height }, colorScheme:c.theme, hasTouch:c.width <= 430, ...(nombre !== 'firefox' && c.width <= 430 ? { isMobile:true } : {}) })
      const r = { id, motor:nombre, version:browser.version(), viewport:{width:c.width,height:c.height}, tema:c.theme, texto200:!!c.grande, estado:'en-curso', medidas:[], capturas:[] }
      let page
      try {
        const abierto = await abrir(ctx)
        page = abierto.page
        await sembrar(page)
        // Dexie actualiza la UI. Recargar aquí cancelaba descargas del catálogo del arranque y contaminaba el
        // diagnóstico WebKit con errores de recursos de la página que se estaba destruyendo.
        await page.getByText('72,5',{exact:true}).waitFor()
        // Una rutina con los ejercicios sembrados, para medir su tarjeta en Rutinas y su ficha.
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          await db.routines.put({ nombre:'Rutina de auditoría con un nombre bastante largo', exerciseIds:(await db.exercises.toArray()).map(e => e.id).slice(0, 6) })
        })
        if(c.grande) await page.addStyleTag({ content:'html { font-size:200%; }' })
        const antes = await datos(page)
        async function medir(label) {
          await page.evaluate(() => document.fonts.ready)
          const m = await geometria(page,label)
          r.medidas.push(m)
          if(!m.pagina || m.overflow.length || m.inputs.length) r.capturas.push(await captura(page,`${id}-${label}`))
        }
        await medir('inicio')
        await page.getByRole('button', { name:'Registrar peso',exact:true }).click()
        await medir('peso')
        const peso = page.getByRole('dialog', { name:'Registrar peso',exact:true })
        await peso.getByLabel('Peso', { exact:true }).focus()
        await page.setViewportSize({width:c.width,height:320})
        await page.waitForFunction(() => Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--viewport-height')) - visualViewport.height) < 1)
        await medir('peso-teclado')
        const boton = await peso.getByRole('button', { name:'Guardar',exact:true }).boundingBox()
        assert.ok(boton.y >= 0 && boton.y + boton.height <= 321, 'Guardar accesible con viewport reducido')
        await page.goBack()
        await peso.waitFor({state:'detached'})
        await page.setViewportSize({width:c.width,height:c.height})
        assert.equal(await page.locator('[data-app-shell]').evaluate(e => e.inert),false)

        await navegar(page,'Nutrición')
        await page.getByRole('heading', { name:'Desayuno',exact:true }).waitFor()
        await medir('diario')
        await page.getByRole('tab', { name:'Resumen',exact:true }).click()
        await page.getByRole('radio', { name:'Mes',exact:true }).waitFor()
        await medir('resumen-nutricion')
        await page.getByRole('tab', { name: 'Alimentos', exact: true }).click()
        await medir('alimentos')
        await page.getByRole('button', { name:'Añadir comida',exact:true }).click()
        await page.getByRole('dialog', { name:'Añadir comida',exact:true }).waitFor()
        await medir('anadir-comida')
        await page.goBack()
        await page.getByRole('dialog').waitFor({state:'detached'})

        await navegar(page,'Entreno')
        await page.getByRole('tab', { name:'Rutinas',exact:true }).click()
        await medir('rutinas')
        await page.getByRole('list', { name:'Tus rutinas',exact:true }).getByRole('button').first().click()
        await page.getByRole('region', { name:'Ejercicios',exact:true }).waitFor()
        await medir('ficha-rutina')
        await page.getByRole('button', { name:'Rutinas',exact:true }).click()
        await page.getByRole('list', { name:'Tus rutinas',exact:true }).waitFor()
        await page.getByRole('tab', { name:'Historial',exact:true }).click()
        const lista = page.getByRole('region', { name: 'Sesiones del mes', exact: true }).locator('li[data-sesion]')
        await lista.getByRole('button').first().waitFor()
        await medir('historial')
        await lista.getByRole('button').first().click()
        await page.getByRole('button', { name:'Editar',exact:true }).waitFor()
        await medir('detalle-entreno')
        await page.getByRole('button', { name:'Editar',exact:true }).click()
        await medir('editor-entreno')
        await page.getByRole('button', { name:'Listo',exact:true }).click()
        await page.getByRole('button', { name:'Historial',exact:true }).click()
        await page.getByRole('tab', { name:'Progreso',exact:true }).click()
        // Por ejercicio: lista con buscador (bloque 3 del documento de mejoras), no un desplegable.
        const ejercicios = page.getByRole('list', { name:'Ejercicios con sesiones',exact:true })
        await ejercicios.getByRole('button').first().waitFor()
        await medir('progreso-lista')
        await ejercicios.getByRole('button').first().click()
        await page.locator('.recharts-wrapper').first().waitFor()
        await medir('progreso-grafica')
        await navegar(page,'Entreno')
        await page.getByRole('tab', { name:'Actividades',exact:true }).click()
        await medir('actividades')

        for(const tab of ['Perfil','Cumbres','Caminos','Ritmo','Vitrina','Referencias','Ajustes']) {
          await navegar(page,tab)
          await page.getByRole('main').getByRole('heading').first().waitFor()
          await medir(tab.toLowerCase())
          if(tab === 'Vitrina') for(const vista of ['Récords','Colecciones']) {
            await page.getByRole('tab', { name:vista,exact:true }).click()
            await medir(`vitrina-${vista}`)
          }
        }
        assert.deepEqual(await datos(page),antes,'lecturas y cancelación de formularios conservan el backup')
        assert.deepEqual(abierto.errores,[],'sin excepciones JavaScript')
        r.erroresJavaScript = abierto.errores
        r.red = abierto.red
        r.estado = r.medidas.some(m => !m.pagina || m.overflow.length || m.inputs.length) ? 'hallazgos' : 'correcto'
        console.log(`${id}: ${r.estado} (${r.medidas.length} pantallas/estados)`)
      } catch(error) {
        r.estado = 'fallo'
        r.error = error.message
        if(page) r.capturas.push(await captura(page,`${id}-fallo`).catch(() => 'captura no disponible'))
        console.log(`${id}: FALLO ${error.message.slice(0,180)}`)
      } finally {
        resultados.push(r)
        informe('interfaz',resultados)
        await ctx.close()
      }
    }
  } finally { await browser.close() }
}
Promise.all(motores.map(motor)).then(() => {
  if(resultados.some(r => r.estado !== 'correcto')) process.exitCode = 1
}).catch(error => {console.error(error);process.exitCode=1})
