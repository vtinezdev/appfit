/* AG-01–06: copia con escrituras concurrentes, variantes, precarga, Progreso y compra.
   Vite en 5173, origen aislado, IndexedDB efímera y nube en memoria. No usa cuentas ni Supabase reales. */
const qa = require('./auditoria-comun.cjs')
const { assert, navegar, abrir, geometria, captura, informe } = qa
const resultados = []

async function comprobar(page, id, paso) {
  const g = await geometria(page, paso)
  assert.equal(g.pagina, true, `${id}-${paso}: scroll horizontal`)
  assert.deepEqual(g.overflow, [], `${id}-${paso}: desbordamiento`)
  assert.deepEqual(g.tacto, [], `${id}-${paso}: controles de 44 px`)
  assert.deepEqual(g.inputs, [], `${id}-${paso}: campos de 16 px`)
  await captura(page, `${id}-${paso}`)
}

async function copiaConcurrente(page) {
  return page.evaluate(async () => {
    const { CopiaNube } = await import('/src/features/cuenta/copiaNube.ts')
    const { ServidorFalso } = await import('/src/test/fixtures/nubeFalsa.ts')
    const { cifrarCopia } = await import('/src/features/cuenta/lib/cifrado.ts')
    const backup = await import('/src/shared/lib/backup.ts')
    const { todayISO } = await import('/src/shared/lib/dates.ts')
    const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
    const servidor = new ServidorFalso(), nube = servidor.nube()
    let vinculo
    const copia = new CopiaNube({
      nube: async () => nube,
      dispositivo: {
        leer: async () => vinculo,
        guardar: async v => { vinculo = { ...v, id: 1 } },
        actualizar: async c => { vinculo = { ...vinculo, ...c } },
        borrar: async () => { vinculo = undefined },
      },
      exportar: backup.exportarBackup, importar: backup.importarBackup,
      hayDatos: async () => true, borrarDatos: backup.borrarTodosLosDatos, iteraciones: 1000,
    })
    const anadir = nombre => entries.anadirRapida({ fecha: todayISO(), comida: 'comida', nombre, kcal: 100, prot: 10, carb: 10, grasa: 2 })
    await anadir('Comida inicial')
    await copia.verificarCodigo('auditoria@appfit.invalid', ServidorFalso.CODIGO)
    await copia.crearCopia('contraseña sintética')
    const remota = await backup.exportarBackup()
    remota.entries.push({ ...remota.entries[0], id: 900, nombre: 'Comida desde otro dispositivo' })
    await nube.subir(1, await cifrarCopia(JSON.stringify(remota), vinculo.dek))
    let avisarDescarga, continuar
    const descargando = new Promise(r => { avisarDescarga = r })
    const permiso = new Promise(r => { continuar = r })
    const leer = nube.leerCopia.bind(nube)
    nube.leerCopia = async () => { avisarDescarga(); await permiso; return leer() }
    const sincronizando = copia.sincronizar({ comprobarNube: true })
    await descargando
    await anadir('Comida guardada durante la descarga')
    copia.marcarPendiente()
    continuar(); await sincronizando
    const nombres = (await backup.exportarBackup()).entries.map(e => e.nombre)
    const fase = copia.leerEstado().fase
    const revision = [...servidor.copias.values()][0].revision
    await copia.resolverConflicto('subir')
    return { nombres, fase, revision, revisionResuelta: [...servidor.copias.values()][0].revision }
  })
}

async function preparar(page) {
  return page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    const { updateSettings } = await import('/src/shared/db/settings.ts')
    const { todayISO } = await import('/src/shared/lib/dates.ts')
    await (await import('/src/shared/lib/backup.ts')).borrarTodosLosDatos()
    await updateSettings({ gamificacionVisible: false, rirAlCompletar: false })
    const ahora = Date.now()
    await db.exercises.bulkPut([
      { id: 1, nombre: 'Jalón de auditoría', nombreNorm: 'jalon de auditoria', grupo: 'espalda' },
      { id: 2, nombre: 'Dominadas asistidas de auditoría', nombreNorm: 'dominadas asistidas de auditoria', grupo: 'espalda' },
      { id: 3, nombre: 'Press de auditoría', nombreNorm: 'press de auditoria', grupo: 'pecho' },
    ])
    for (const [id, dias] of [[1, 3], [2, 2], [3, 1]]) await db.workouts.put({ id, inicio: ahora - dias * 86400000, fin: ahora - dias * 86400000 + 3600000 })
    await db.sets.bulkPut([
      { id: 1, workoutId: 1, exerciseId: 1, orden: 0, reps: 8, peso: 40, realizada: false, agarre: { orientacion: 'prono' }, createdAt: 1 },
      { id: 2, workoutId: 2, exerciseId: 1, orden: 0, reps: 10, peso: 50, realizada: true, agarre: { orientacion: 'supino' }, createdAt: 2 },
      { id: 3, workoutId: 1, exerciseId: 2, orden: 0, reps: 10, peso: 20, modoCarga: 'asistencia', realizada: true, createdAt: 3 },
      { id: 4, workoutId: 2, exerciseId: 2, orden: 0, reps: 10, peso: 30, modoCarga: 'asistencia', realizada: true, createdAt: 4 },
      { id: 5, workoutId: 1, exerciseId: 3, orden: 0, reps: 10, peso: 40, realizada: true, createdAt: 5 },
      { id: 6, workoutId: 1, exerciseId: 3, orden: 1, reps: 8, peso: 100, realizada: false, createdAt: 6 },
    ])
    const item = nombre => ({ nombre, gramos: 100, kcal100: 100, prot100: 10, carb100: 10, grasa100: 2, categoria: 'Otros', fuenteSiNuevo: 'manual' })
    await (await import('/src/features/nutricion/data/planificadasRepo.ts')).planificarRevision({ fecha: todayISO(), comida: 'comida', items: [item('Arroz de auditoría'), item('Huevo de auditoría')] }, todayISO())
  })
}

async function recorrido(page, id, grande) {
  // AG-01: clase, cifrado e importación reales; la respuesta de la nube se retiene con una promesa.
  const copia = await copiaConcurrente(page)
  assert.equal(copia.fase, 'conflicto')
  assert.deepEqual(copia.nombres, ['Comida inicial', 'Comida guardada durante la descarga'])
  assert.equal(copia.revision, 2)
  assert.equal(copia.revisionResuelta, 3)
  await preparar(page)

  // AG-06: los dos cambios se emiten antes de recibir el siguiente render de Dexie.
  await navegar(page, 'Nutrición')
  await page.getByRole('tab', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Lista de la compra', exact: true }).click()
  let lista = page.getByRole('dialog', { name: 'Lista de la compra', exact: true })
  await lista.getByRole('checkbox').nth(1).waitFor()
  await lista.getByRole('checkbox').evaluateAll(es => { es[0].click(); es[1].click() })
  await page.waitForFunction(async () => ((await (await import('/src/shared/db/settings.ts')).getSettings()).compraMarcada ?? []).length === 2)
  await lista.getByRole('checkbox', { checked: true }).nth(1).waitFor()
  assert.deepEqual(await lista.getByRole('checkbox').evaluateAll(es => es.map(e => e.checked)), [true, true])
  await comprobar(page, id, 'compra-concurrente')
  await page.reload()
  if (grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
  await navegar(page, 'Nutrición')
  await page.getByRole('tab', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Lista de la compra', exact: true }).click()
  lista = page.getByRole('dialog', { name: 'Lista de la compra', exact: true })
  await lista.getByRole('checkbox', { checked: true }).nth(1).waitFor()
  await page.keyboard.press('Escape'); await lista.waitFor({ state: 'detached' })

  // AG-04: la variante pendiente no oculta el ejercicio ni su sesión efectiva.
  await navegar(page, 'Entreno')
  await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
  const ejercicios = page.getByRole('list', { name: 'Ejercicios con sesiones', exact: true })
  await ejercicios.getByRole('button', { name: /^Jalón de auditoría/ }).click()
  let sesiones = page.getByRole('region', { name: 'Sesiones', exact: true })
  await sesiones.getByRole('listitem', { name: /50 kg/ }).waitFor()
  assert.equal(await sesiones.getByRole('listitem').count(), 1)
  await comprobar(page, id, 'progreso-variante-valida')
  await page.getByRole('button', { name: 'Todos los ejercicios', exact: true }).click()

  // AG-05: más ayuda no es un récord; menos ayuda sí, incluido el color del cambio.
  await ejercicios.getByRole('button', { name: /^Dominadas asistidas de auditoría/ }).click()
  sesiones = page.getByRole('region', { name: 'Sesiones', exact: true })
  const peor = sesiones.getByRole('listitem', { name: /Mejor serie: −30 kg/ })
  await peor.waitFor()
  assert.ok(!(await peor.getAttribute('aria-label')).includes('Récord'))
  assert.equal(await peor.locator('.text-success').count(), 0)
  await comprobar(page, id, 'asistencia-sin-falso-record')
  await page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    await db.sets.add({ workoutId: 3, exerciseId: 2, orden: 0, reps: 10, peso: 10, modoCarga: 'asistencia', realizada: true, createdAt: 10 })
  })
  const mejor = sesiones.getByRole('listitem', { name: /Mejor serie: −10 kg.*Récord/ })
  await mejor.waitFor()
  assert.equal(await mejor.locator('.text-success').count(), 1)
  await comprobar(page, id, 'asistencia-mejora-real')

  // AG-02/03: los repositorios conservan la selección y la referencia realizada; el editor lee esos valores.
  const guardado = await page.evaluate(async () => {
    const routines = await import('/src/features/gym/data/routinesRepo.ts')
    const workouts = await import('/src/features/gym/data/workoutsRepo.ts')
    const sets = await import('/src/features/gym/data/setsRepo.ts')
    const { db } = await import('/src/shared/db/db.ts')
    const agarre = { orientacion: 'supino', anchura: 'estrecho', accesorio: 'barra' }
    const id = await routines.guardarCompartida('Rutina adaptada', [{ seleccion: { tipo: 'catalogo', catalogId: 'appfit:jalon-pecho', agarre } }])
    const r = await routines.obtener(id)
    const w = await workouts.empezar()
    const s = await sets.agregar(w, 3)
    const precarga = await db.sets.get(s)
    const cambio = await workouts.sustituirEnSesion(w, 3, { tipo: 'local', id: r.exerciseIds[0], agarre })
    const sustitucion = await db.sets.get(s)
    await workouts.deshacerSustitucion(cambio)
    return { agarreGuardado: r.agarres[r.exerciseIds[0]], agarreSerie: sustitucion.agarre, precarga: { peso: precarga.peso, reps: precarga.reps }, vuelta: (await db.sets.get(s)).exerciseId }
  })
  const agarre = { orientacion: 'supino', anchura: 'estrecho', accesorio: 'barra' }
  assert.deepEqual(guardado.agarreGuardado, agarre)
  assert.deepEqual(guardado.agarreSerie, agarre)
  assert.deepEqual(guardado.precarga, { peso: 40, reps: 10 })
  assert.equal(guardado.vuelta, 3)
  await page.getByRole('button', { name: /^Volver al entreno: Entreno libre/ }).click()
  await page.getByLabel('Peso en kg, serie 1 de Press de auditoría', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('Peso en kg, serie 1 de Press de auditoría', { exact: true }).inputValue(), '40')
  await comprobar(page, id, 'precarga-realizada')
}

async function main() {
  const browser = await qa.lanzar('chromium')
  const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  casos.push(...['light', 'dark'].map(theme => ({ width: 375, theme, grande: true })))
  try {
    for (const c of casos) {
      const id = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== id) continue
      const ctx = await qa.contexto(browser, { viewport: { width: c.width, height: 812 }, colorScheme: c.theme })
      const r = { id, estado: 'en-curso' }
      try {
        await ctx.addInitScript(theme => localStorage.setItem('appfit:theme', theme), c.theme)
        const { page, errores } = await abrir(ctx)
        if (c.grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
        await recorrido(page, id, c.grande)
        assert.deepEqual(errores, [])
        r.estado = 'correcto'
      } catch (e) {
        r.estado = 'fallo'; r.error = e.message
        if (ctx.pages()[0]) await captura(ctx.pages()[0], `${id}-fallo`).catch(() => {})
      } finally { resultados.push(r); informe('correcciones-auditoria-general', resultados); await ctx.close() }
      console.log(`${id}: ${r.estado}${r.error ? ': ' + r.error : ''}`)
    }
  } finally { await browser.close() }
  if (resultados.some(r => r.estado !== 'correcto')) process.exitCode = 1
}
main().catch(e => { console.error(e); process.exitCode = 1 })
