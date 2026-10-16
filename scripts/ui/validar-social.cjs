/* Social ampliado: solo appfit-test.localhost y Supabase falso. Nunca usa cuentas, correo ni datos reales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const BASE = 'http://appfit-test.localhost:5174'
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-social'
fs.mkdirSync(salida, { recursive: true })
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'

async function capturar(page, target, nombre) {
  await page.evaluate(() => document.fonts.ready)
  await target.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${salida}/${nombre}.png`, animations: 'disabled' })
  const g = await target.evaluate(e => ({ ancho: e.clientWidth, contenido: e.scrollWidth, derecha: e.getBoundingClientRect().right, ventana: innerWidth }))
  assert.ok(g.contenido <= g.ancho + 1 && g.derecha <= g.ventana + 1, `${nombre}: overflow ${JSON.stringify(g)}`)
}
async function registros(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    for (const w of b.workouts) delete w.publicacion
    return JSON.parse(JSON.stringify(b))
  })
}
async function social(page) {
  await navegar(page, 'Social')
  await page.getByRole('heading', { name: 'Social', exact: true }).waitFor()
  await page.locator('main').getByRole('button', { name: 'Crear publicación', exact: true }).waitFor()
}
async function publicarTexto(page, texto) {
  const editor = page.getByRole('dialog', { name: 'Crear publicación', exact: true })
  await editor.getByRole('textbox', { name: 'Tu publicación', exact: true }).fill(texto)
  await editor.getByRole('button', { name: 'Ver vista previa', exact: true }).click()
  const vista = page.getByRole('dialog', { name: 'Vista previa', exact: true })
  await vista.getByText(texto, { exact: true }).waitFor()
  return vista
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  casos.push(...['light', 'dark'].map(theme => ({ width: 375, theme, grande: true })))
  const informe = []
  try {
    for (const c of casos) {
      const caso = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== caso) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: 932 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, reducedMotion: c.grande ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errores = [], envios = []
        page.on('pageerror', e => errores.push(e.message))
        page.on('request', r => { if (r.url().endsWith('/publicar') || r.url().endsWith('/publicar_comunidad')) envios.push(JSON.parse(r.postData())) })
        await page.request.post(`${API}simular_reinicio`, { data: {} })
        await page.request.post(`${API}crear_perfil`, { data: { p_alias: 'yo_prueba', p_nombre: 'Persona de prueba', p_acepto: true } })
        const exp = Math.floor(Date.now() / 1000) + 86400
        const user = { id: 'yo', email: 'prueba@appfit.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
        await context.addInitScript(({ session, theme }) => { localStorage.setItem('appfit-cuenta', JSON.stringify(session)); localStorage.setItem('appfit:theme', theme) }, { session: { access_token: jwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'falsa', user }, theme: c.theme })
        await page.goto(BASE)
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          const { updateSettings } = await import('/src/shared/db/settings.ts')
          const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
          await updateSettings({ gamificacionVisible: true, gamificacionConNutricion: true })
          await db.exercises.add({ id: 1, nombre: 'Press de prueba', nombreNorm: 'press de prueba', grupo: 'pecho', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps'] })
          for (let i = 0; i < 10; i++) {
            const inicio = new Date(`${addDays(todayISO(), i - 9)}T07:00:00`).getTime()
            await db.workouts.add({ id: i + 1, inicio, fin: inicio + 3600000 })
            for (let s = 0; s < 5; s++) await db.sets.add({ workoutId: i + 1, exerciseId: 1, orden: s, reps: 8, peso: 40 + i, createdAt: inicio })
          }
        })
        if (c.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important }' })
        const antes = await registros(page)

        // Texto propio, vista previa y reintento después de que el servidor haya publicado pero la respuesta falle.
        await social(page)
        const principal = page.locator('main')
        for (const titulo of ['Rodaje por el Retiro', 'Pierna pesada con nombre de rutina bastante largo']) {
          const ajena = principal.locator('li').filter({ has: page.getByText(titulo, { exact: true }) })
          await ajena.waitFor()
          assert.equal(await ajena.getByRole('button', { name: 'Borrar publicación', exact: true }).count(), 0, 'solo el autor ve el borrado')
        }
        await principal.getByRole('button', { name: 'Crear publicación', exact: true }).click()
        const editor = page.getByRole('dialog', { name: 'Crear publicación', exact: true })
        await editor.getByRole('button', { name: 'Ver vista previa', exact: true }).click()
        await editor.getByText('Escribe tu publicación.', { exact: true }).waitFor()
        const texto = 'Hoy empiezo una nueva etapa.\n¡Vamos juntos!'
        let vista = await publicarTexto(page, texto)
        await capturar(page, vista, `${caso}-texto`)
        if (caso === '375-light') {
          let primera = true
          await page.route('**/rest/v1/rpc/publicar', async route => {
            if (!primera) return route.continue()
            primera = false; await route.fetch()
            await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Fallo simulado' }) })
          })
          await vista.getByRole('button', { name: 'Publicar', exact: true }).click()
          await vista.getByRole('alert').waitFor()
        }
        await vista.getByRole('button', { name: 'Publicar', exact: true }).click()
        await vista.waitFor({ state: 'detached' })
        if (caso === '375-light') { assert.equal(envios[0].p_id, envios[1].p_id); await page.unroute('**/rest/v1/rpc/publicar') }
        await principal.getByText(texto, { exact: true }).waitFor()
        assert.equal(await principal.getByText(texto, { exact: true }).count(), 1)

        // Comunidad de una persona a la que no sigo: descubrir, unirme, comentar y crear una publicación.
        await page.getByRole('tab', { name: 'Comunidades', exact: true }).click()
        await page.getByRole('tab', { name: 'Descubrir', exact: true }).click()
        await principal.getByRole('button', { name: /^Running en compañía/ }).click()
        await principal.getByRole('button', { name: 'Unirme a la comunidad', exact: true }).click()
        await principal.getByText('¡Bienvenidos! No hace falta seguirnos para compartir aquí.', { exact: true }).waitFor()
        await principal.getByRole('button', { name: /^Comentarios\./ }).first().click()
        const comentarios = page.getByRole('dialog', { name: 'Comentarios', exact: true })
        await comentarios.getByRole('textbox', { name: 'Tu comentario', exact: true }).fill('¡Me apunto!')
        await comentarios.getByRole('button', { name: 'Enviar', exact: true }).click()
        await comentarios.getByText('¡Me apunto!', { exact: true }).waitFor()
        await page.keyboard.press('Escape'); await comentarios.waitFor({ state: 'detached' })
        await principal.getByRole('button', { name: 'Crear publicación', exact: true }).last().click()
        vista = await publicarTexto(page, 'Mi primera publicación en la comunidad')
        await vista.getByText('Para los miembros de Running en compañía', { exact: true }).waitFor()
        await vista.getByRole('button', { name: 'Publicar', exact: true }).click(); await vista.waitFor({ state: 'detached' })
        await principal.getByText('Mi primera publicación en la comunidad', { exact: true }).waitFor()
        await capturar(page, principal.getByRole('region', { name: 'Comunidad', exact: true }), `${caso}-comunidad`)
        await principal.getByRole('button', { name: 'Salir de la comunidad', exact: true }).click()
        await principal.getByRole('button', { name: 'Unirme a la comunidad', exact: true }).waitFor()
        assert.equal(await principal.getByText('Mi primera publicación en la comunidad', { exact: true }).count(), 0)
        await principal.getByRole('button', { name: 'Unirme a la comunidad', exact: true }).click()
        await principal.getByRole('button', { name: 'Volver a comunidades', exact: true }).click()

        // Una comunidad de anuncios ajena deja comentar, pero no crear ni compartir publicaciones.
        await principal.getByRole('button', { name: /^Actualizaciones de la comunidad/ }).click()
        await principal.getByRole('button', { name: 'Unirme a la comunidad', exact: true }).click()
        const comunidadAnuncios = principal.getByRole('region', { name: 'Comunidad', exact: true })
        await comunidadAnuncios.getByText('Estas son las novedades de la comunidad. Podéis comentarlas aquí.', { exact: true }).waitFor()
        assert.equal(await comunidadAnuncios.getByRole('button', { name: 'Crear publicación', exact: true }).count(), 0)
        await comunidadAnuncios.getByRole('button', { name: /^Comentarios\./ }).click()
        const respuestas = page.getByRole('dialog', { name: 'Comentarios', exact: true })
        await respuestas.getByRole('textbox', { name: 'Tu comentario', exact: true }).fill('Gracias por las novedades')
        await respuestas.getByRole('button', { name: 'Enviar', exact: true }).click()
        await respuestas.getByText('Gracias por las novedades', { exact: true }).waitFor()
        await page.keyboard.press('Escape'); await respuestas.waitFor({ state: 'detached' })
        await capturar(page, comunidadAnuncios, `${caso}-anuncios-miembro`)
        await principal.getByRole('button', { name: 'Volver a comunidades', exact: true }).click()
        await principal.getByRole('button', { name: 'Crear comunidad', exact: true }).click()
        const crear = page.getByRole('dialog', { name: 'Crear comunidad', exact: true })
        await crear.getByRole('textbox', { name: 'Nombre de la comunidad', exact: true }).fill('Nuestro grupo de entreno')
        await crear.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Un lugar para compartir progresos y aprender juntos.')
        await crear.getByRole('combobox', { name: 'Quién puede publicar', exact: true }).selectOption('creador')
        await capturar(page, crear, `${caso}-crear-solo-creador`)
        const solicitudCreacion = page.waitForRequest(r => r.url().endsWith('/crear_comunidad'))
        await crear.getByRole('button', { name: 'Crear comunidad', exact: true }).click(); await crear.waitFor({ state: 'detached' })
        assert.equal(JSON.parse((await solicitudCreacion).postData()).p_solo_creador_publica, true)
        await principal.getByRole('heading', { name: 'Nuestro grupo de entreno', exact: true }).waitFor()
        await principal.getByRole('region', { name: 'Comunidad', exact: true }).getByRole('button', { name: 'Crear publicación', exact: true }).click()
        vista = await publicarTexto(page, 'Anuncio del creador')
        await vista.getByRole('button', { name: 'Publicar', exact: true }).click(); await vista.waitFor({ state: 'detached' })
        await principal.getByText('Anuncio del creador', { exact: true }).waitFor()
        // El editor global filtra comunidades ajenas restringidas, también para adjuntar entrenos/logros.
        await principal.getByRole('button', { name: 'Crear publicación', exact: true }).first().click()
        const destinos = page.getByRole('dialog', { name: 'Crear publicación', exact: true }).getByRole('combobox', { name: 'Publicar para', exact: true })
        await destinos.locator('option').filter({ hasText: 'Nuestro grupo de entreno' }).waitFor({ state: 'attached' })
        assert.equal(await destinos.locator('option[value="grupo-anuncios"]').count(), 0)
        assert.equal(await destinos.locator('option[value="grupo-running"]').count(), 1)
        await page.keyboard.press('Escape'); await page.getByRole('dialog', { name: 'Crear publicación', exact: true }).waitFor({ state: 'detached' })

        // Logro desde la Vitrina: la pieza alcanzada, su icono y el nivel concreto.
        await page.getByRole('navigation').getByRole('button', { name: 'Más', exact: true }).click()
        await page.getByRole('dialog', { name: 'Más', exact: true }).getByRole('button', { name: /^Vitrina\b/ }).click()
        await principal.getByRole('button', { name: /^Entrenos: Nivel I$/ }).click()
        const ficha = page.getByRole('dialog', { name: 'Entrenos', exact: true })
        await ficha.getByRole('button', { name: 'Compartir logro', exact: true }).click()
        let compartir = page.getByRole('dialog', { name: 'Compartir', exact: true })
        await compartir.getByRole('button', { name: 'Ver vista previa', exact: true }).click()
        vista = page.getByRole('dialog', { name: 'Vista previa', exact: true })
        await vista.getByText('10 entrenos de 5 series efectivas o más', { exact: true }).waitFor()
        await capturar(page, vista, `${caso}-logro`)
        await vista.getByRole('button', { name: 'Publicar', exact: true }).click(); await vista.waitFor({ state: 'detached' })
        await page.keyboard.press('Escape'); await ficha.waitFor({ state: 'detached' })

        // Mapa del entreno desde su detalle, en vista previa, en comunidad y en seguidores.
        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.locator('[data-sesion="10"] button').click()
        const compartirEntreno = principal.getByRole('region', { name: 'Compartir con tus seguidores', exact: true })
        const mapa = compartirEntreno.getByRole('region', { name: 'Mapa de calor del entreno', exact: true })
        await mapa.getByText(/Pecho: Muy alto/).waitFor()
        await mapa.getByText('Frontal', { exact: true }).waitFor()
        const tamano = await mapa.locator('svg').first().evaluate(e => ({ ancho: e.getBoundingClientRect().width, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) }))
        assert.ok(tamano.ancho <= 6 * tamano.rem, 'las figuras compartidas son compactas')
        await capturar(page, compartirEntreno, `${caso}-mapa`)
        await compartirEntreno.getByRole('button', { name: 'Compartir en una comunidad', exact: true }).click()
        compartir = page.getByRole('dialog', { name: 'Compartir', exact: true })
        await compartir.getByLabel('Publicar para', { exact: true }).selectOption('grupo-running')
        await compartir.getByRole('button', { name: 'Ver vista previa', exact: true }).click()
        vista = page.getByRole('dialog', { name: 'Vista previa', exact: true })
        await vista.getByRole('button', { name: 'Publicar', exact: true }).click(); await vista.waitFor({ state: 'detached' })
        await compartirEntreno.getByRole('button', { name: 'Publicar en Social', exact: true }).click()
        await principal.getByRole('region', { name: 'Publicado en Social', exact: true }).waitFor()
        await social(page)
        await principal.getByRole('tab', { name: 'Tú', exact: true }).click()
        await principal.getByRole('region', { name: 'Mapa de calor del entreno', exact: true }).getByText(/Pecho: Muy alto/).waitFor()
        const resumenes = envios.filter(e => e.p_tipo === 'entreno').map(e => e.p_resumen)
        assert.equal(resumenes.length, 2)
        assert.ok(resumenes.every(r => r.mapa.pecho === 5 && r.mapa.triceps > 0 && !r.mapa.peso && !r.mapa.sexo))

        const marca = () => page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          return (await db.workouts.get(10)).publicacion
        })
        const idPublicado = await marca()
        assert.ok(idPublicado)
        const tarjetaMapa = () => principal.locator('li').filter({ has: page.getByRole('region', { name: 'Mapa de calor del entreno', exact: true }) })

        // Borrar la copia de comunidad no desvincula la publicación original de seguidores.
        await page.getByRole('tab', { name: 'Comunidades', exact: true }).click()
        await principal.getByRole('button', { name: /^Running en compañía/ }).click()
        let tarjeta = tarjetaMapa()
        await tarjeta.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        await tarjeta.getByRole('group', { name: 'Confirmar borrado', exact: true }).getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        await tarjeta.waitFor({ state: 'detached' })
        assert.equal(await marca(), idPublicado)

        await page.getByRole('tab', { name: 'Tú', exact: true }).click()
        tarjeta = tarjetaMapa()
        await tarjeta.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        let confirmacion = tarjeta.getByRole('group', { name: 'Confirmar borrado', exact: true })
        await capturar(page, confirmacion, `${caso}-borrar-entreno`)
        if (c.grande) {
          const apilados = await confirmacion.getByRole('button').evaluateAll(botones => botones[1].getBoundingClientRect().top >= botones[0].getBoundingClientRect().bottom)
          assert.ok(apilados, 'con texto ampliado las acciones de confirmación se apilan')
        }
        await confirmacion.getByRole('button', { name: 'Cancelar', exact: true }).click()
        assert.equal(await marca(), idPublicado, 'cancelar conserva la publicación y la marca')
        await tarjeta.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        confirmacion = tarjeta.getByRole('group', { name: 'Confirmar borrado', exact: true })
        if (caso === '375-light') {
          await page.route('**/rest/v1/rpc/borrar_publicacion', async route => {
            await route.fetch() // El servidor borra, pero se pierde la respuesta: el reintento debe completar la limpieza.
            await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'fallo_simulado' }) })
          })
          await confirmacion.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
          await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Confirmar borrado"] button')].some(b => b.textContent === 'Borrar publicación' && !b.disabled))
          assert.equal(await marca(), idPublicado, 'un fallo de red conserva la marca hasta confirmar el borrado')
          await page.unroute('**/rest/v1/rpc/borrar_publicacion')
        }
        await confirmacion.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        await tarjeta.waitFor({ state: 'detached' })
        assert.equal(await marca(), undefined, 'el borrado desde Social libera la marca local')

        // El historial conserva series y datos, y vuelve a permitir compartir el mismo entreno.
        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.locator('[data-sesion="10"] button').click()
        await principal.getByRole('region', { name: 'Compartir con tus seguidores', exact: true }).getByRole('button', { name: 'Publicar en Social', exact: true }).waitFor()
        assert.deepEqual(await registros(page), antes, 'los flujos sociales no alteran los registros, salvo la marca explícita de publicación')
        assert.deepEqual(errores, [])
        informe.push({ caso, correcto: true }); console.log(`${caso}: correcto`)
      } catch (e) {
        const pages = context.pages(); if (pages.length) await pages[0].screenshot({ path: `${salida}/${caso}-fallo.png`, animations: 'disabled' })
        throw e
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
