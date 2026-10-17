/* Las ocho mejoras de uso: controles públicos, fallos sintéticos y lecturas independientes. */
const { assert, lanzar, contexto, abrir, sembrar, datos, captura, geometria, informe, navegar } = require('./auditoria-comun.cjs')
const motores = (process.env.APPFIT_AUDIT_BROWSERS || 'chromium').split(',')
const resultados = []
async function caso(motor, ampliado) {
  const r = { motor, caso: ampliado ? '375-dark-texto200' : '320-light', pasos: [], estado: 'en-curso' }
  if (process.env.APPFIT_UI_CASE && !r.caso.includes(process.env.APPFIT_UI_CASE)) return
  let browser, ctx, page, paso = 'arranque'
  try {
    browser = await lanzar(motor); r.version = browser.version()
    ctx = await contexto(browser, { viewport: { width: ampliado ? 375 : 320, height: ampliado ? 667 : 568 }, colorScheme: ampliado ? 'dark' : 'light' })
    const abierto = await abrir(ctx); page = abierto.page
    await sembrar(page)
    await page.evaluate(async ampliado => {
      const { setThemePref } = await import('/src/shared/design/theme.ts')
      setThemePref(ampliado ? 'dark' : 'light')
      if (ampliado) document.documentElement.style.fontSize = '200%'
      const { todayISO, addDays } = await import('/src/shared/lib/dates.ts'), hoy = todayISO()
      const foods = await import('/src/features/nutricion/data/foodsRepo.ts')
      const arroz = await foods.buscarPorNombre('Arroz blanco cocido')
      await foods.actualizar(arroz.id,{ nombre:arroz.nombre, kcal100:arroz.kcal100, prot100:arroz.prot100, carb100:arroz.carb100, grasa100:arroz.grasa100, categoria:'Cereales, arroz y pasta' })
      const agua = await import('/src/features/inicio/data/aguaRepo.ts')
      const medidas = await import('/src/features/perfil/data/medidasRepo.ts')
      for (const [dias, ml] of [[0,750],[2,500],[10,1000]]) await agua.anadir(addDays(hoy,-dias),ml)
      await medidas.registrar(addDays(hoy,-10),{ cintura:84, brazo:32 })
      await medidas.registrar(hoy,{ cintura:82.5, brazo:33 })
    }, ampliado)
    async function comprobar(label, fn) { paso=label; await fn(); r.pasos.push(label) }
    async function medir(label, tacto=false) {
      const m=await geometria(page,label)
      assert.ok(m.pagina,`${label}: página ancha`); assert.deepEqual(m.overflow,[],`${label}: overflow`)
      assert.deepEqual(m.inputs,[],`${label}: inputs pequeños`)
      if(tacto) assert.deepEqual(m.tacto,[],`${label}: targets pequeños`)
    }
    await comprobar('calendarios con targets de 44 px y alternativa compacta',async()=>{
      await navegar(page,'Nutrición')
      await page.getByRole('list',{name:'Días de la semana'}).waitFor()
      await medir('diario',true)
      await navegar(page,'Entreno'); await page.getByRole('tab',{name:'Historial',exact:true}).click()
      await page.getByRole('list',{name:'Días entrenados',exact:true}).waitFor()
      await medir('historial',true)
      await captura(page,`${motor}-${r.caso}-calendario`)
    })
    await comprobar('pestañas ampliadas: selección por teclado sin perder el rótulo',async()=>{
      const tab=page.getByRole('tab',{name:'Historial',exact:true})
      await tab.focus(); await tab.press('ArrowRight')
      const progreso=page.getByRole('tab',{name:'Progreso',exact:true})
      assert.equal(await progreso.getAttribute('aria-selected'),'true')
      await medir('pestañas')
    })
    await comprobar('filtro de categorías en búsqueda y preparación explícita antes de guardar',async()=>{
      await navegar(page,'Nutrición')
      await page.getByRole('button',{name:'Añadir comida',exact:true}).click()
      let sheet=page.getByRole('dialog',{name:'Añadir comida',exact:true})
      await sheet.getByRole('tab',{name:'Buscar',exact:true}).click()
      await sheet.getByLabel('Filtrar alimentos por categoría',{exact:true}).selectOption('Frutas')
      await sheet.getByRole('searchbox').fill('arroz')
      await sheet.getByText('Sin coincidencias.',{exact:true}).waitFor()
      await sheet.getByLabel('Filtrar alimentos por categoría',{exact:true}).selectOption('Cereales, arroz y pasta')
      await sheet.getByRole('searchbox').fill('arroz blanco cocido')
      await sheet.getByRole('button').filter({has:page.getByText('Arroz blanco cocido',{exact:true})}).first().click()
      const gramos=page.getByRole('dialog').filter({has:page.getByText(/Indica los gramos pesados en ese estado/)})
      await gramos.getByText('Ya cocinado',{exact:true}).waitFor()
      const antes=(await datos(page)).entries.length
      await page.waitForFunction(() => Array.from(document.querySelectorAll('[role=dialog]')).some(d => d.querySelector('h3')?.textContent === 'Arroz blanco cocido' && d.closest('[data-visible]')?.getAttribute('data-visible') === 'true'))
      // Firefox 153 headless ignora el centro de ciertos botones bajos incluso en HTML mínimo.
      // Se pulsa una zona interior real del botón, sin force ni invocar el handler (ver desarrollo.md).
      await gramos.getByRole('button',{name:/^Añadir/}).click(motor === 'firefox' ? { position:{x:20,y:10} } : {})
      await gramos.waitFor({state:'detached'})
      assert.equal((await datos(page)).entries.length,antes+1)
    })
    await comprobar('gráfica de agua con periodos y tabla de los registros reales',async()=>{
      await navegar(page,'Inicio')
      await page.getByRole('button',{name:/^Agua/}).first().click()
      const sheet=page.getByRole('dialog',{name:'Agua',exact:true})
      await sheet.getByRole('radio',{name:'30 días',exact:true}).click()
      await sheet.getByRole('button',{name:'Ver datos de agua',exact:true}).click()
      assert.equal(await sheet.getByRole('table').getByRole('row').count(),4)
      await sheet.getByRole('img',{name:/agua en ml/}).waitFor()
      await medir('agua')
      await captura(page,`${motor}-${r.caso}-agua`)
      await sheet.getByRole('button',{name:'Cerrar',exact:true}).click(); await sheet.waitFor({state:'detached'})
    })
    await comprobar('gráfica de medidas: campo, unidades, variación y tabla',async()=>{
      await navegar(page,'Perfil')
      await page.getByRole('button',{name:'Evolución de las medidas',exact:true}).click()
      await page.getByRole('button',{name:'Ver datos de cintura',exact:true}).click()
      const tabla=page.getByRole('table',{name:'Registros de cintura en el periodo elegido'})
      assert.equal(await tabla.getByRole('row').count(),3)
      await page.getByLabel('Medida que quieres ver',{exact:true}).selectOption('brazo')
      await page.getByRole('img',{name:/brazo en cm/}).waitFor()
      await medir('medidas')
      await captura(page,`${motor}-${r.caso}-medidas`)
    })
    await comprobar('estado local y reintento recuperan el valor tras un fallo de escritura',async()=>{
      await navegar(page,'Entreno'); await page.getByRole('tab',{name:'Empezar',exact:true}).click()
      await page.getByRole('button',{name:'Entreno vacío',exact:true}).click()
      await page.getByRole('button',{name:'Añadir ejercicio',exact:true}).click()
      const selector=page.getByRole('dialog',{name:'Añadir ejercicio',exact:true})
      await selector.getByRole('searchbox').fill('Press banca')
      await selector.getByRole('button').filter({has:page.getByText('Press banca',{exact:true})}).click()
      await selector.waitFor({state:'detached'})
      const peso=page.getByLabel(/^Peso en kg, serie 1/)
      await page.evaluate(async()=>{
        const {db}=await import('/src/shared/db/db.ts'), original=db.sets.update.bind(db.sets)
        db.sets.update=(...args)=>{db.sets.update=original;return Promise.reject(new Error('Fallo sintético'))}
      })
      await peso.fill('74'); await peso.blur()
      const reintentar=page.getByRole('button',{name:'Reintentar guardado',exact:true})
      await reintentar.evaluate(e=>e.scrollIntoView({block:'center'}))
      await reintentar.click()
      await page.getByRole('region',{name:'Guardado local',exact:true}).getByText('Guardado en este dispositivo',{exact:true}).waitFor()
      const copia=await datos(page), activo=copia.workouts.find(w=>w.fin===undefined)
      assert.equal(copia.sets.find(s=>s.workoutId===activo.id).peso,74)
    })
    await comprobar('carga inusual permite revisar o conservar sin imponer máximos',async()=>{
      const peso=page.getByLabel(/^Peso en kg, serie 1/)
      await peso.fill('725'); await peso.blur()
      await page.getByRole('complementary',{name:'Revisar carga',exact:true}).waitFor()
      await captura(page,`${motor}-${r.caso}-carga`)
      await page.getByRole('button',{name:'El peso es correcto',exact:true}).click()
      const copia=await datos(page), activo=copia.workouts.find(w=>w.fin===undefined)
      assert.equal(copia.sets.find(s=>s.workoutId===activo.id).peso,725)
      await peso.focus(); await peso.blur()
      assert.equal(await page.getByRole('complementary',{name:'Revisar carga',exact:true}).count(),0)
      await peso.fill('7,25'); await peso.blur()
      await page.getByRole('button',{name:'Corregir peso',exact:true}).click()
      assert.ok(await peso.evaluate(e=>e===document.activeElement))
      await peso.fill('72,5'); await peso.blur()
      assert.equal(await page.getByRole('complementary',{name:'Revisar carga',exact:true}).count(),0)
    })
    await comprobar('el reintento de notas conserva el texto y actualiza el estado local',async()=>{
      await page.evaluate(async()=>{
        const {db}=await import('/src/shared/db/db.ts'), original=db.workouts.update.bind(db.workouts)
        db.workouts.update=(id,cambio)=>{
          if(Object.hasOwn(cambio,'notas')){db.workouts.update=original;return Promise.reject(new Error('Fallo sintético de notas'))}
          return original(id,cambio)
        }
      })
      const notas=page.getByRole('textbox',{name:/Notas del entreno/})
      await notas.fill('Nota sintética que debe conservarse'); await notas.blur()
      const reintentar=page.getByRole('button',{name:'Reintentar guardado',exact:true})
      await reintentar.evaluate(e=>e.scrollIntoView({block:'center'}))
      await reintentar.click()
      await page.getByRole('region',{name:'Guardado local',exact:true}).getByText('Guardado en este dispositivo',{exact:true}).waitFor()
      const copia=await datos(page)
      assert.equal(copia.workouts.find(w=>w.fin===undefined).notas,'Nota sintética que debe conservarse')
      assert.equal(await notas.inputValue(),'Nota sintética que debe conservarse')
    })
    await comprobar('pista contextual RIR descartable y ayuda recuperable desde Ajustes',async()=>{
      await page.getByLabel(/^RIR, serie 1/).click()
      let sheet=page.getByRole('dialog',{name:/^RIR ·/})
      await sheet.getByText(/RIR significa repeticiones en reserva/).waitFor()
      await sheet.getByRole('button',{name:'Entendido',exact:true}).click()
      await sheet.getByRole('complementary',{name:'Pista'}).waitFor({state:'detached'})
      await sheet.getByRole('button',{name:'Cerrar',exact:true}).click(); await sheet.waitFor({state:'detached'})
      await page.getByLabel(/^RIR, serie 1/).click(); sheet=page.getByRole('dialog',{name:/^RIR ·/})
      assert.equal(await sheet.getByRole('complementary',{name:'Pista'}).count(),0)
      await sheet.getByRole('button',{name:'Cerrar',exact:true}).click();await sheet.waitFor({state:'detached'})
      await navegar(page,'Ajustes'); await page.getByRole('button',{name:/^Primeros pasos/}).click()
      await page.getByRole('button',{name:'Ayuda para registrar un entreno',exact:true}).click()
      await page.getByText(/RIR significa repeticiones en reserva/).waitFor()
      await page.getByRole('button',{name:'Volver a Ajustes',exact:true}).click()
    })
    await comprobar('diagnóstico revisable y copia con fallback sin red ni datos personales',async()=>{
      await page.getByRole('button',{name:/^Comunicar un problema/}).click()
      await page.getByLabel('Pasos para reproducir el problema',{exact:true}).fill('Abrí el historial y cambié de mes.')
      const texto=await page.getByLabel('Diagnóstico para revisar y copiar',{exact:true}).inputValue()
      assert.ok(texto.includes('Abrí el historial y cambié de mes.')); assert.ok(texto.includes('Error de operación'))
      assert.ok(!texto.includes('Press banca'));assert.ok(!texto.includes('Arroz blanco cocido'))
      await page.getByRole('button',{name:'Copiar diagnóstico',exact:true}).click()
      await page.getByText(/Diagnóstico copiado\.|No se ha podido copiar automáticamente\./).waitFor()
      await medir('diagnóstico')
      await captura(page,`${motor}-${r.caso}-diagnostico`)
    })
    assert.deepEqual(abierto.errores,[]);r.estado='correcto'
  }catch(error){r.estado='fallo';r.paso=paso;r.error=error.message;process.exitCode=1;if(page)r.captura=await captura(page,`${motor}-${r.caso}-fallo`).catch(()=>null)}
  finally{if(ctx)await ctx.close();if(browser)await browser.close();resultados.push(r);informe('mejoras-uso',resultados);console.log(`${motor} ${r.caso}: ${r.estado}; ${r.pasos.length} escenarios; ${r.error||''}`)}
}
;(async()=>{for(const motor of motores)for(const ampliado of [false,true])await caso(motor,ampliado)})().catch(e=>{console.error(e);process.exitCode=1})
