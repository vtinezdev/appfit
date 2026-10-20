/* Flujo diario por controles públicos, con comprobación independiente del backup y fallos de IndexedDB. */
const { assert, lanzar, contexto, abrir, datos, captura, informe, navegar } = require('./auditoria-comun.cjs')
const motores = (process.env.APPFIT_AUDIT_BROWSERS || 'chromium').split(',')
const resultados = []

async function caso(nombre) {
  let browser
  const r = { motor:nombre, estado:'en-curso', pasos:[] }
  let ctx, page, paso = 'arranque'
  try {
    browser = await lanzar(nombre)
    r.version = browser.version()
    ctx = await contexto(browser)
    let abierto = await abrir(ctx)
    const gruposErrores = [abierto.errores]
    page = abierto.page
    await page.evaluate(async () => {
      await (await import('/src/shared/db/settings.ts')).ensureSettings()
      await (await import('/src/shared/db/settings.ts')).updateSettings({ rirAlCompletar:false })
    })
    async function comprobar(label, accion) { paso=label; await accion(); r.pasos.push(label) }
    const campos = () => page.locator('[data-exercise-id]').first()
    const peso = () => campos().getByLabel(/^Peso en kg, serie 1/)
    async function esperarSerie(predicate, mensaje) {
      try { await page.waitForFunction(async ({predicate}) => {
        const s = (await (await import('/src/features/gym/data/setsRepo.ts')).todas())[0]
        return Function('s', `return (${predicate})`)(s)
      }, {predicate}) } catch(error) { throw new Error(`${mensaje}: ${error.message}`) }
    }
    await comprobar('inicio vacío y doble acción sin duplicar entrenos', async () => {
      await navegar(page,'Entreno')
      await page.getByRole('button',{name:'Entreno vacío',exact:true}).evaluate(e => {e.click();e.click()})
      await page.getByRole('button',{name:'Añadir ejercicio',exact:true}).waitFor()
      assert.equal((await datos(page)).workouts.filter(w=>w.fin===undefined).length,1)
    })
    await comprobar('búsqueda, cancelación y alta de ejercicio desde catálogo', async () => {
      const antes=await datos(page)
      await page.getByRole('button',{name:'Añadir ejercicio',exact:true}).click()
      let selector=page.getByRole('dialog',{name:'Añadir ejercicio',exact:true})
      await selector.getByRole('searchbox').fill('resultado inexistente xyz')
      await page.goBack();await selector.waitFor({state:'detached'})
      assert.deepEqual(await datos(page),antes)
      await page.getByRole('button',{name:'Añadir ejercicio',exact:true}).click()
      selector=page.getByRole('dialog',{name:'Añadir ejercicio',exact:true})
      await selector.getByRole('searchbox').fill('Press banca')
      await selector.getByRole('button').filter({has:page.getByText('Press banca',{exact:true})}).click()
      await page.getByRole('dialog',{name:'Elegir agarre',exact:true}).getByRole('button',{name:'Añadir sin especificar agarre',exact:true}).click()
      await selector.waitFor({state:'detached'})
      await peso().waitFor()
      assert.equal((await datos(page)).sets.length,1)
    })
    await comprobar('coma, punto, edición parcial y teclado de incremento', async () => {
      await campos().getByLabel(/^Repeticiones, serie 1/).fill('12')
      await peso().fill('')
      await peso().pressSequentially('72,5',{delay:35})
      await peso().blur()
      await esperarSerie('s.peso === 72.5 && s.reps === 12','coma interpretada')
      await peso().fill('70.25');await peso().blur()
      await esperarSerie('s.peso === 70.25','punto interpretado')
      await peso().fill('72,5');await peso().press('ArrowUp');await peso().blur()
      await esperarSerie('s.peso === 75','flecha incrementa 2,5 kg')
      await peso().fill('72,5');await peso().blur()
      await esperarSerie('s.peso === 72.5','valor final')
      r.capturaDecimal=await captura(page,`${nombre}-decimal-corregido`)
    })
    await comprobar('añadir series rápidamente conserva órdenes únicos', async () => {
      await campos().getByRole('button',{name:'Añadir serie',exact:true}).evaluate(e => {e.click();e.click()})
      await page.waitForFunction(async()=> (await (await import('/src/features/gym/data/setsRepo.ts')).todas()).length===3)
      const ss=(await datos(page)).sets
      assert.equal(new Set(ss.map(s=>s.orden)).size,3)
    })
    await comprobar('confirmación reversible y campos incompletos', async () => {
      await campos().getByRole('button',{name:'Completar serie 1 de Press banca',exact:true}).click()
      await esperarSerie('s.realizada === true','confirmada')
      await peso().fill('73');await peso().blur()
      await esperarSerie('s.realizada === false && s.peso === 73','editar desmarca')
      await campos().getByLabel(/^Repeticiones, serie 1/).fill('0')
      await campos().getByLabel(/^Repeticiones, serie 1/).blur()
      await esperarSerie('s.reps === 0','incompleta')
      assert.ok(await campos().getByRole('button',{name:'Completar serie 1 de Press banca',exact:true}).isDisabled())
      await campos().getByLabel(/^Repeticiones, serie 1/).fill('12')
    })
    await comprobar('error de escritura de serie visible, rollback y reintento', async () => {
      const antes=(await datos(page)).sets[0]
      await page.evaluate(async()=>{
        const {db}=await import('/src/shared/db/db.ts')
        const original=db.sets.update.bind(db.sets)
        db.sets.update=(...args)=>{db.sets.update=original;return Promise.reject(new Error('Fallo sintético de serie'))}
      })
      await peso().fill('74')
      await page.getByRole('alert').filter({hasText:'No se ha podido guardar la serie'}).waitFor()
      assert.deepEqual((await datos(page)).sets[0],antes)
      await peso().fill('72,5');await peso().blur()
      await esperarSerie('s.peso === 72.5','reintento')
    })
    await comprobar('cambiar pestaña, minimizar y continuar conserva series', async () => {
      const antes=(await datos(page)).sets
      await navegar(page,'Nutrición')
      await page.getByRole('button',{name:/^Volver al entreno:/}).click()
      await peso().waitFor()
      assert.deepEqual((await datos(page)).sets,antes)
      await page.getByRole('button',{name:'Minimizar entreno',exact:true}).click()
      await page.getByRole('button',{name:'Continuar',exact:true}).first().click()
      await peso().waitFor()
    })
    await comprobar('recarga y cierre/reapertura conservan datos confirmados', async () => {
      await campos().getByRole('button',{name:'Completar serie 1 de Press banca',exact:true}).click()
      await esperarSerie('s.realizada === true','confirmada antes de cerrar')
      const antes=(await datos(page)).sets
      await page.reload()
      await page.getByRole('button',{name:/^Volver al entreno:/}).click()
      await peso().waitFor()
      assert.deepEqual((await datos(page)).sets,antes)
      await page.close()
      abierto=await abrir(ctx);page=abierto.page
      gruposErrores.push(abierto.errores)
      await page.getByRole('button',{name:/^Volver al entreno:/}).click()
      await peso().waitFor()
      assert.deepEqual((await datos(page)).sets,antes)
    })
    await comprobar('borrado de serie y Deshacer recupera valores e identidad', async () => {
      const antes=(await datos(page)).sets
      await campos().getByRole('button',{name:'Opciones de serie 3 de Press banca',exact:true}).click()
      const menu=page.getByRole('dialog')
      await menu.getByRole('button',{name:'Borrar serie',exact:true}).click()
      await menu.waitFor({state:'detached'})
      await page.getByRole('button',{name:'Deshacer',exact:true}).click()
      await page.waitForFunction(async()=> (await (await import('/src/features/gym/data/setsRepo.ts')).todas()).length===3)
      assert.deepEqual((await datos(page)).sets,antes)
    })
    await comprobar('cancelar fin mantiene activo; fallo de notas bloquea cierre y permite reintentar', async () => {
      await page.getByRole('button',{name:'Terminar',exact:true}).click()
      let fin=page.getByRole('dialog',{name:'Terminar entreno',exact:true})
      await fin.getByRole('button',{name:'Seguir entrenando',exact:true}).click()
      await fin.waitFor({state:'detached'})
      await page.evaluate(async()=>{
        const {db}=await import('/src/shared/db/db.ts')
        window.__auditoriaWorkoutsUpdate=db.workouts.update.bind(db.workouts)
        db.workouts.update=(id,patch)=>patch.notas!==undefined ? Promise.reject(new Error('Fallo sintético de notas')) : window.__auditoriaWorkoutsUpdate(id,patch)
      })
      await page.getByRole('textbox',{name:'Notas del entreno',exact:true}).fill('Nota de auditoría que debe sobrevivir al fallo')
      await page.getByRole('button',{name:'Terminar',exact:true}).click()
      fin=page.getByRole('dialog',{name:'Terminar entreno',exact:true})
      await fin.getByRole('button',{ name: /^(Guardar y terminar|Guardar solo las marcadas|Guardar sin marcar)$/ }).click()
      await fin.getByRole('alert').waitFor()
      assert.equal((await datos(page)).workouts[0].fin,undefined)
      await page.evaluate(async()=>{(await import('/src/shared/db/db.ts')).db.workouts.update=window.__auditoriaWorkoutsUpdate})
      await fin.getByRole('button',{ name: /^(Guardar y terminar|Guardar solo las marcadas|Guardar sin marcar)$/ }).click()
      await page.getByText('Sesión guardada en el historial',{exact:true}).waitFor()
      assert.equal((await datos(page)).workouts[0].notas,'Nota de auditoría que debe sobrevivir al fallo')
      assert.ok((await datos(page)).workouts[0].fin)
    })
    await comprobar('historial editable conserva borrador de notas ante fallo', async () => {
      await page.getByRole('button',{name:'Volver a Entreno',exact:true}).click()
      await page.getByRole('tab',{name:'Historial',exact:true}).click()
      await page.getByRole('list',{name:'Entrenos terminados del mes',exact:true}).getByRole('button').first().click()
      await page.getByRole('button',{name:'Editar',exact:true}).click()
      await page.evaluate(async()=>{
        const {db}=await import('/src/shared/db/db.ts')
        window.__auditoriaWorkoutsUpdate=db.workouts.update.bind(db.workouts)
        db.workouts.update=(id,patch)=>patch.notas!==undefined ? Promise.reject(new Error('Fallo sintético de notas')) : window.__auditoriaWorkoutsUpdate(id,patch)
      })
      await page.getByRole('textbox',{name:'Notas del entreno',exact:true}).fill('Nota corregida en el historial')
      await page.getByRole('button',{name:'Listo',exact:true}).click()
      await page.getByRole('alert').waitFor()
      assert.ok(await page.getByRole('button',{name:'Listo',exact:true}).isVisible())
      assert.equal(await page.getByRole('textbox',{name:'Notas del entreno',exact:true}).inputValue(),'Nota corregida en el historial')
      await page.evaluate(async()=>{(await import('/src/shared/db/db.ts')).db.workouts.update=window.__auditoriaWorkoutsUpdate})
      await page.getByRole('button',{name:'Listo',exact:true}).click()
      await page.getByRole('button',{name:'Editar',exact:true}).waitFor()
      assert.equal((await datos(page)).workouts[0].notas,'Nota corregida en el historial')
    })
    assert.deepEqual(gruposErrores.flat(),[])
    r.estado='correcto'
  } catch(error) {
    r.estado='fallo';r.paso=paso;r.error=error.message
    if(page) r.captura=await captura(page,`${nombre}-entreno-fallo`).catch(()=>null)
  } finally {
    resultados.push(r);informe('entreno',resultados)
    console.log(`${nombre}: ${r.estado}; ${r.pasos.length} escenarios; ${r.error||''}`)
    if(ctx) await ctx.close();if(browser) await browser.close()
  }
}
Promise.all(motores.map(caso)).then(()=>{if(resultados.some(r=>r.estado!=='correcto'))process.exitCode=1}).catch(error=>{console.error(error);process.exitCode=1})
