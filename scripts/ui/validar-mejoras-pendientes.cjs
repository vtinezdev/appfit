/* UI-06/07/09/10: Perfil incompleto, requisitos del gasto observado, primeros pasos de Social y próximos logros.
   Solo origen de pruebas (5173) y Supabase falso (5174, scripts/ui/supabase-falso.mjs); contextos efímeros y datos sintéticos.
   Sin el Supabase falso, Social se omite y el informe lo dice (en CI, 5174 es la build de producción). */
const qa = require('./auditoria-comun.cjs')
const { assert, abrir, navegar, datos, captura, geometria, informe } = qa
const SOCIAL = process.env.APPFIT_UI_SOCIAL_URL || 'http://appfit-test.localhost:5174'
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'
const resultados = []

async function limpio(page, etiqueta) {
  const g = await geometria(page, etiqueta)
  assert.ok(g.pagina, `${etiqueta}: scroll horizontal`)
  assert.deepEqual(g.overflow, [], `${etiqueta}: overflow`)
  assert.deepEqual(g.tacto, [], `${etiqueta}: controles menores de 44 px`)
}

/** Perfil incompleto (UI-06) y requisitos del gasto observado (UI-07) con registros reales; después, Vitrina (UI-10). */
async function perfilYVitrina(ctx, id, grande) {
  const abierto = await abrir(ctx)
  const page = abierto.page
  // 18 de los últimos 28 días con comidas; pesajes 2/1/0/3 por semana (más uno de la semana anterior, que no cuenta).
  await page.evaluate(async () => {
    await (await import('/src/shared/db/settings.ts')).ensureSettings()
    const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
    const inicio = addDays(todayISO(), -28)
    const entries = await import('/src/features/nutricion/data/entriesRepo.ts')
    for (let i = 0; i < 18; i++) await entries.anadirRapida({ fecha: addDays(inicio, i), comida: 'comida', nombre: 'Comida sintética', kcal: 2100, prot: 120, carb: 220, grasa: 70 })
    const pesos = await import('/src/features/inicio/data/pesosRepo.ts')
    for (const i of [-3, 0, 3, 8, 21, 23, 25]) await pesos.registrar(addDays(inicio, i), 74 + i / 100)
  })
  if (grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
  const antes = await datos(page)
  await navegar(page, 'Perfil')
  const bloque = page.getByRole('region', { name: 'Completa tu perfil', exact: true })
  await bloque.getByText('1 de 5 datos', { exact: true }).waitFor()
  await bloque.getByText('Faltan: sexo, fecha de nacimiento, altura y actividad. Con ellos se estima tu energía diaria.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Tu energía diaria', exact: true }).count(), 0, 'sin la card larga')
  const alto = (await bloque.boundingBox()).height
  if (!grande) assert.ok(alto < 220, `bloque compacto: ${alto}px`)
  const plegado = page.getByRole('region', { name: 'Gasto observado', exact: true }).getByRole('button', { name: 'Gasto observado', exact: true })
  assert.equal(await plegado.getAttribute('aria-expanded'), 'false')
  await limpio(page, 'perfil-incompleto')
  await captura(page, `${id}-perfil-incompleto`)
  assert.deepEqual(await datos(page), antes, 'consultar Perfil no escribe')

  // El gasto observado plegado se amplía con los requisitos por separado y las cifras de los registros.
  await plegado.click()
  const gasto = page.getByRole('region', { name: 'Gasto observado', exact: true })
  await gasto.getByText('18 de 23', { exact: true }).waitFor()
  await gasto.getByText('2 de 4', { exact: true }).waitFor()
  const semanas = await gasto.getByRole('list', { name: 'Pesajes por semana', exact: true }).getByRole('listitem').allInnerTexts()
  assert.deepEqual(semanas.map(t => t.match(/(\d) de 2/)[1]), ['2', '1', '0', '3'])
  assert.equal(await gasto.getByRole('progressbar', { name: 'Días con comidas', exact: true }).getAttribute('aria-valuenow'), '18')
  // Cómo se calcula, tras la «i» (bloque 5 del documento de mejoras); el uso, con un interruptor.
  await gasto.getByRole('button', { name: 'Qué es Gasto observado', exact: true }).waitFor()
  assert.equal(await gasto.getByRole('switch', { name: /^Usar el gasto observado/ }).getAttribute('aria-checked'), 'false')
  await gasto.scrollIntoViewIfNeeded()
  await limpio(page, 'gasto-requisitos')
  await captura(page, `${id}-gasto-requisitos`)

  // La acción reutiliza el editor de «Tus datos» y pasa al siguiente dato.
  await bloque.getByRole('button', { name: 'Indicar sexo', exact: true }).click()
  const hoja = page.getByRole('dialog', { name: 'Sexo', exact: true })
  await hoja.getByRole('radio', { name: 'Hombre', exact: true }).click()
  if (await hoja.count()) { await page.keyboard.press('Escape'); await hoja.waitFor({ state: 'detached' }) }
  await bloque.getByRole('button', { name: 'Añadir fecha de nacimiento', exact: true }).waitFor()
  await bloque.getByText('2 de 5 datos', { exact: true }).waitFor()
  const trasSexo = await datos(page)
  assert.equal(trasSexo.settings[0].perfil.sexo, 'hombre')
  assert.deepEqual(trasSexo.entries, antes.entries); assert.deepEqual(trasSexo.pesos, antes.pesos)

  // Completo: vuelve la card del resultado y el gasto observado deja de estar plegado, con los mismos requisitos.
  await page.evaluate(async () => (await import('/src/features/perfil/data/perfilRepo.ts')).guardarPerfil({ fechaNacimiento: '1990-05-01', alturaCm: 178, actividad: 'moderado' }))
  await page.getByRole('heading', { name: 'Tu energía diaria', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Gasto observado', exact: true }).waitFor()
  assert.equal(await bloque.count(), 0)
  await page.getByText('18 de 23', { exact: true }).waitFor()
  await limpio(page, 'perfil-completo')
  await page.getByRole('heading', { name: 'Gasto observado', exact: true }).scrollIntoViewIfNeeded()
  await captura(page, `${id}-perfil-completo`)

  // Vitrina: 12 entrenos de 6 series, cuatro de ellos antes de las 8:00 (Madrugador, oculto, al 80 %: no debe aparecer).
  await page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    const { updateSettings } = await import('/src/shared/db/settings.ts')
    const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
    await updateSettings({ gamificacionVisible: true, gamificacionConNutricion: true })
    const exerciseId = await db.exercises.add({ nombre: 'Press de prueba', nombreNorm: 'press de prueba', grupo: 'pecho', primaryMuscles: ['pecho'] })
    for (let i = 0; i < 12; i++) {
      const inicio = new Date(`${addDays(todayISO(), i * 2 - 26)}T${i < 4 ? '07' : '18'}:00:00`).getTime()
      const workoutId = await db.workouts.add({ inicio, fin: inicio + 3600000 })
      for (let s = 0; s < 6; s++) await db.sets.add({ workoutId, exerciseId, orden: s, reps: 8, peso: 40 + i, createdAt: inicio + s })
    }
  })
  // Lo que consiguen esos entrenos queda visto, para que la hoja de nuevos logros no se abra encima del detalle.
  await qa.marcarLogrosVistos(page)
  const antesVitrina = await datos(page)
  await navegar(page, 'Vitrina')
  assert.equal(await page.getByRole('button', { name: 'Genial', exact: true }).count(), 0, 'sin celebración pendiente')
  const proximos = page.getByRole('region', { name: 'Próximos logros', exact: true })
  await proximos.waitFor()
  const filas = proximos.getByRole('list', { name: 'Logros cerca del siguiente nivel', exact: true }).getByRole('button')
  const nombres = await filas.evaluateAll(es => es.map(e => e.getAttribute('aria-label')))
  assert.ok(nombres.length >= 1 && nombres.length <= 3, `entre 1 y 3 próximos: ${nombres}`)
  assert.ok(nombres.every(n => !/Madrugador|oculto/i.test(n)), `sin ocultos: ${nombres}`)
  // Cifras reales: los 18 días con comidas, hacia el nivel I de Días registrados (30).
  assert.ok(nombres.includes('Días registrados · nivel I: 18 de 30 días'), `incluye Días registrados: ${nombres}`)
  assert.equal(await proximos.getByRole('progressbar').count(), nombres.length)
  // El catálogo completo sigue debajo y conserva el oculto como «Logro oculto».
  await page.getByRole('list', { name: 'Logros de Entreno', exact: true }).waitFor()
  await page.getByRole('list', { name: 'Logros de Ocultos', exact: true }).getByRole('button', { name: 'Logro oculto: Se revela al conseguirlo' }).first().waitFor()
  const primero = nombres[0].split(':')[0].split(' · ')[0]
  await filas.first().click()
  const detalle = page.getByRole('dialog', { name: primero, exact: true })
  await detalle.getByRole('progressbar').first().waitFor()
  await captura(page, `${id}-logro-detalle`)
  await page.keyboard.press('Escape')
  await detalle.waitFor({ state: 'detached' })
  await proximos.scrollIntoViewIfNeeded()
  await limpio(page, 'vitrina')
  await captura(page, `${id}-vitrina`)
  assert.deepEqual(await datos(page), antesVitrina, 'consultar Vitrina no escribe')
  assert.deepEqual(abierto.errores, [])
}

/** Primeros pasos de Social (UI-09): plegados, progreso real del Supabase falso, ampliar, acción y cierre persistente. */
async function primerosPasos(browser, c, id) {
  const ctx = await browser.newContext({ viewport: { width: c.width, height: 812 }, colorScheme: c.theme, locale: 'es-ES', timezoneId: 'Europe/Madrid', reducedMotion: 'reduce', serviceWorkers: 'block' })
  try {
    const page = await ctx.newPage(), errores = []
    await qa.cerrarCelebraciones(page)
    page.on('pageerror', e => errores.push(e.message))
    await page.request.post(`${API}simular_reinicio`, { data: {} })
    await page.request.post(`${API}crear_perfil`, { data: { p_alias: 'yo_prueba', p_nombre: 'Persona de prueba', p_acepto: true } })
    const exp = Math.floor(Date.now() / 1000) + 86400
    const user = { id: 'yo', email: 'prueba@appfit.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
    await ctx.addInitScript(({ session, theme }) => { localStorage.setItem('appfit-cuenta', JSON.stringify(session)); localStorage.setItem('appfit:theme', theme) },
      { session: { access_token: jwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'falsa', user }, theme: c.theme })
    await page.goto(SOCIAL)
    await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
    if (c.grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
    await navegar(page, 'Social')
    const plegar = page.getByRole('button', { name: /^Primeros pasos/ })
    // En el Supabase falso, jon te sigue (código hecho) y no eres miembro de ninguna comunidad; sin entrenos compartidos.
    await page.getByRole('progressbar', { name: 'Primeros pasos hechos', exact: true }).waitFor()
    assert.equal(await page.getByRole('progressbar', { name: 'Primeros pasos hechos', exact: true }).getAttribute('aria-valuenow'), '1')
    await plegar.getByText('1 de 3', { exact: true }).waitFor()
    assert.equal(await plegar.getAttribute('aria-expanded'), 'false')
    assert.equal(await page.getByRole('button', { name: /^Únete a una comunidad/ }).count(), 0, 'plegado al entrar')
    await limpio(page, 'social-plegado')
    await captura(page, `${id}-social-plegado`)
    await plegar.click()
    await page.getByRole('button', { name: /^Comparte tu código Ya tienes seguidores/ }).waitFor()
    await page.getByRole('button', { name: /^Comparte tu último entreno/ }).waitFor()
    await limpio(page, 'social-ampliado')
    await captura(page, `${id}-social-ampliado`)
    await page.getByRole('button', { name: /^Únete a una comunidad/ }).click()
    await page.getByRole('tab', { name: 'Comunidades', selected: true }).waitFor()
    await page.getByRole('button', { name: 'Cerrar primeros pasos', exact: true }).click()
    await plegar.waitFor({ state: 'detached' })
    const vistas = await page.evaluate(async () => (await (await import('/src/shared/db/settings.ts')).getSettings()).pistasVistas)
    assert.ok(vistas.includes('social-primeros-pasos'))
    await page.reload()
    if (c.grande) await page.addStyleTag({ content: 'html { font-size:200%; }' })
    await navegar(page, 'Social')
    await page.getByRole('heading', { name: 'Social', exact: true }).waitFor()
    await page.locator('main').getByRole('button', { name: 'Comparte algo con tus seguidores', exact: true }).waitFor()
    assert.equal(await plegar.count(), 0, 'el cierre se conserva al recargar')
    assert.deepEqual(errores, [])
  } finally { await ctx.close() }
}

async function main() {
  const browser = await qa.lanzar('chromium')
  const vivo = url => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(r => r.ok).catch(() => false)
  const conSocial = await vivo(`${API}simular_reinicio`) && await fetch(SOCIAL.replace('appfit-test.localhost', '127.0.0.1')).then(r => r.ok).catch(() => false)
  if (!conSocial) console.log('Social omitido: no responde el Supabase falso (scripts/ui/supabase-falso.mjs)')
  try {
    const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
    casos.push({ width: 375, theme: 'light', grande: true }, { width: 375, theme: 'dark', grande: true })
    for (const c of casos) {
      const id = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && !id.includes(process.env.APPFIT_UI_CASE)) continue
      const resultado = { id, estado: 'en-curso' }
      const ctx = await qa.contexto(browser, { viewport: { width: c.width, height: 812 }, colorScheme: c.theme })
      try {
        await ctx.addInitScript(theme => localStorage.setItem('appfit:theme', theme), c.theme)
        await perfilYVitrina(ctx, id, c.grande)
        if (conSocial) await primerosPasos(browser, c, id)
        else resultado.social = 'omitido'
        resultado.estado = 'correcto'
      } catch (e) {
        resultado.estado = 'fallo'; resultado.error = e.message
        const page = ctx.pages()[0]
        if (page) resultado.captura = await captura(page, `${id}-fallo`).catch(() => undefined)
      } finally { await ctx.close(); resultados.push(resultado); informe('mejoras-pendientes', resultados); console.log(`${id}: ${resultado.estado}${resultado.error ? ': ' + resultado.error : ''}`) }
    }
  } finally { await browser.close() }
  if (resultados.some(r => r.estado !== 'correcto')) process.exitCode = 1
}
main().catch(e => { console.error(e); process.exitCode = 1 })
