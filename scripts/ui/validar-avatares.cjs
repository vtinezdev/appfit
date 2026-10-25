/* Catálogo de avatares: contextos efímeros, diario sintético y Supabase falso. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')

const BASE = 'http://appfit-test.localhost:5174'
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-avatares'
fs.mkdirSync(salida, { recursive: true })
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'

async function abrirEditor(page) {
  await navegar(page, 'Social')
  await page.getByRole('main').getByRole('button', { name: 'Tu perfil', exact: true }).click()
  await page.getByRole('dialog', { name: 'Tu perfil', exact: true }).getByRole('button', { name: 'Editar perfil', exact: true }).click()
  const perfil = page.getByRole('dialog', { name: 'Editar perfil', exact: true })
  const form = perfil.getByRole('form', { name: 'Perfil deportivo', exact: true })
  await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).waitFor()
  return form
}

async function guardar(page, form, id) {
  const envio = page.waitForRequest(r => r.url().endsWith('/editar_avatar'))
  await form.getByRole('button', { name: 'Guardar perfil', exact: true }).click()
  assert.deepEqual(JSON.parse((await envio).postData()), { p_avatar: id })
  // Guardar cierra «Editar perfil».
  await page.getByRole('dialog', { name: 'Editar perfil', exact: true }).waitFor({ state: 'detached' })
}

async function comprobar(hoja) {
  const geometria = await hoja.evaluate(e => ({
    ancho: e.clientWidth, contenido: e.scrollWidth, derecha: e.getBoundingClientRect().right, ventana: innerWidth,
    opciones: [...e.querySelectorAll('.avatar-opcion')].map(n => {
      const r = n.getBoundingClientRect(), svg = n.querySelector('svg')
      return { ancho: r.width, alto: r.height, svg: svg?.getAttribute('aria-hidden'), dibujo: !!svg?.querySelector('path, rect, circle') }
    }),
  }))
  assert.ok(geometria.contenido <= geometria.ancho + 1 && geometria.derecha <= geometria.ventana + 1, 'sin desbordamiento')
  assert.ok(geometria.opciones.every(o => o.ancho >= 44 && o.alto >= 44 && o.svg === 'true' && o.dibujo), 'opciones táctiles con arte decorativo')
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
        const page = await context.newPage(), errores = []
        page.setDefaultTimeout(15000)
        page.on('pageerror', e => errores.push(e.message))
        await page.request.post(`${API}simular_reinicio`, { data: {} })
        await page.request.post(`${API}crear_perfil`, { data: { p_alias: 'yo_prueba', p_nombre: 'Persona de prueba', p_acepto: true } })
        const exp = Math.floor(Date.now() / 1000) + 86400
        const user = { id: 'yo', email: 'prueba@appfit.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
        await context.addInitScript(({ session, theme, grande }) => {
          localStorage.setItem('appfit-cuenta', JSON.stringify(session)); localStorage.setItem('appfit:theme', theme)
          if (grande) document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '200%' })
        }, { session: { access_token: jwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'falsa', user }, theme: c.theme, grande: c.grande })
        await page.goto(BASE)
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          const { updateSettings } = await import('/src/shared/db/settings.ts')
          const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
          await updateSettings({ gamificacionVisible: true, gamificacionConNutricion: true })
          // Dos salidas de 30 km desbloquean Valle y Cascada; Glaciar sigue bloqueado.
          for (let i = 0; i < 2; i++) {
            const fecha = addDays(todayISO(), i - 1), inicio = new Date(`${fecha}T07:00:00`).getTime()
            await db.actividades.add({ id: i + 1, tipo: 'senderismo', fecha, inicio, duracionSeg: 21600, distanciaM: 30000, desnivelM: 600, origen: 'manual', createdAt: inicio })
          }
        })
        const catalogo = await page.evaluate(async () => {
          const a = await import('/src/features/social/lib/avatar.ts')
          return { disciplinas: a.DISCIPLINAS_AVATAR, tonos: a.TONOS_AVATAR, paisajes: a.PAISAJES_AVATAR }
        })
        assert.equal(catalogo.disciplinas.length, 23); assert.equal(catalogo.paisajes.length, 20)
        const antes = await page.evaluate(async () => (await import('/src/shared/lib/backup.ts')).exportarBackup())
        let form = await abrirEditor(page)
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        let hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        await hoja.getByRole('tab', { name: 'Disciplinas', exact: true }).click()
        assert.equal(await hoja.getByRole('list', { name: 'Disciplinas', exact: true }).getByRole('button').count(), 23)
        // Elegir todas las incorporaciones usa el mismo estado que se guarda, sin escribir el diario.
        for (const d of catalogo.disciplinas.slice(10)) {
          const opcion = hoja.getByRole('button', { name: d.nombre, exact: true })
          await opcion.click(); assert.equal(await opcion.getAttribute('aria-pressed'), 'true')
        }
        for (const t of catalogo.tonos) {
          await hoja.getByRole('button', { name: t.nombre, exact: true }).click()
          await hoja.getByText(`Snowboard · ${t.nombre}`, { exact: true }).waitFor()
          await comprobar(hoja)
        }
        await hoja.getByRole('button', { name: 'Snowboard', exact: true }).scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${salida}/${caso}-disciplinas.png`, animations: 'disabled' })
        await hoja.getByRole('button', { name: 'Hecho', exact: true }).click(); await hoja.waitFor({ state: 'detached' })
        await guardar(page, form, 'disciplina.snowboard.oro')
        await page.reload(); form = await abrirEditor(page)
        await form.getByText('Snowboard · Oro', { exact: true }).waitFor()
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        await hoja.getByRole('tab', { name: 'Paisajes', exact: true }).click()
        const paisajes = hoja.getByRole('list', { name: 'Paisajes', exact: true })
        await paisajes.getByRole('button').first().waitFor()
        assert.equal(await paisajes.getByRole('button').count(), 20)
        const glaciar = paisajes.getByRole('button', { name: /^Glaciar / })
        assert.equal(await glaciar.getAttribute('aria-disabled'), 'true')
        await glaciar.click({ force: true }); assert.equal(await glaciar.getAttribute('aria-pressed'), 'false')
        const valle = paisajes.getByRole('button', { name: 'Valle', exact: true })
        await valle.click(); assert.equal(await valle.getAttribute('aria-pressed'), 'true')
        await comprobar(hoja)
        await page.screenshot({ path: `${salida}/${caso}-paisajes.png`, animations: 'disabled' })
        await hoja.getByRole('button', { name: 'Hecho', exact: true }).click(); await hoja.waitFor({ state: 'detached' })
        await guardar(page, form, 'paisaje.valle')
        await page.reload(); form = await abrirEditor(page)
        await form.getByText('Paisaje · Valle', { exact: true }).waitFor()
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        assert.equal(await hoja.getByRole('button', { name: 'Tinez · Exclusivo', exact: true }).count(), 0, 'sin permiso no aparece')
        await page.request.post(`${API}simular_admin`, { data: { p_admin: true } })
        await page.reload(); form = await abrirEditor(page)
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        assert.equal(await hoja.getByRole('button', { name: 'Tinez · Exclusivo', exact: true }).count(), 0, 'ser administrador no concede el avatar')
        await page.request.post(`${API}simular_avatar_exclusivo`, { data: { p_permiso: true } })
        await page.reload(); form = await abrirEditor(page)
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        const exclusivo = hoja.getByRole('button', { name: 'Tinez · Exclusivo', exact: true })
        await exclusivo.click(); assert.equal(await exclusivo.getAttribute('aria-pressed'), 'true')
        await exclusivo.locator('img').evaluate(img => img.decode())
        assert.deepEqual(await exclusivo.locator('img').evaluate(img => ({ ancho: img.naturalWidth, alto: img.naturalHeight, alt: img.alt })), { ancho: 512, alto: 512, alt: '' }, 'el retrato real carga y es decorativo')
        assert.match(await exclusivo.locator('img').getAttribute('src'), /tinez.*\.webp/, 'recurso original optimizado de Tinez')
        const rect = await exclusivo.boundingBox(); assert.ok(rect.width >= 44 && rect.height >= 44)
        const ancho = await hoja.evaluate(e => [e.scrollWidth, e.clientWidth]); assert.ok(ancho[0] <= ancho[1] + 1, 'sin desbordamiento con exclusivo')
        await page.screenshot({ path: `${salida}/${caso}-exclusivo.png`, animations: 'disabled' })
        await hoja.getByRole('button', { name: 'Hecho', exact: true }).click(); await hoja.waitFor({ state: 'detached' })
        await page.request.post(`${API}simular_avatar_exclusivo`, { data: { p_permiso: false } })
        await form.getByRole('button', { name: 'Guardar perfil', exact: true }).click()
        await form.getByText('Este avatar es exclusivo de otra cuenta. Elige otro.', { exact: true }).waitFor()
        const rechazado = await (await page.request.post(`${API}avatares_perfil`, { data: { p_alias: ['yo_prueba'] } })).json()
        assert.equal(rechazado.yo_prueba, 'paisaje.valle', 'permiso retirado con editor abierto no guarda')
        await page.request.post(`${API}simular_avatar_exclusivo`, { data: { p_permiso: true } })
        await guardar(page, form, 'exclusivo.tinez')
        await page.reload(); form = await abrirEditor(page)
        await form.getByText('Tinez · Exclusivo', { exact: true }).waitFor()
        const retrato = form.locator('.app-avatar img').first()
        await retrato.evaluate(img => img.decode())
        assert.equal(await retrato.evaluate(img => img.naturalWidth), 512, 'el retrato se conserva tras guardar y recargar')
        await page.request.post(`${API}simular_avatar_exclusivo`, { data: { p_permiso: false } })
        await page.reload(); form = await abrirEditor(page)
        await form.getByText('Tus iniciales', { exact: true }).waitFor()
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        assert.equal(await hoja.getByRole('button', { name: 'Tinez · Exclusivo', exact: true }).count(), 0, 'no conserva permisos entre aperturas')
        await page.route('**/rest/v1/rpc/mis_avatares_exclusivos', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST202', message: 'RPC no instalada' }) }))
        await page.reload(); form = await abrirEditor(page)
        await form.getByRole('button', { name: 'Cambiar avatar', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Avatar', exact: true })
        assert.equal(await hoja.getByRole('button', { name: 'Tinez · Exclusivo', exact: true }).count(), 0, 'sin migración no se ofrece')
        const despues = await page.evaluate(async () => (await import('/src/shared/lib/backup.ts')).exportarBackup())
        delete antes.exportedAt; delete despues.exportedAt
        assert.deepEqual(despues, antes, 'el catálogo y el avatar no cambian los datos locales')
        assert.deepEqual(errores, [])
        informe.push({ caso, disciplinas: 23, paisajes: 20, guardadoYRecarga: true, exclusivo: true })
        console.log(`${caso}: correcto`)
      } catch (e) { const p = context.pages()[0]; if (p) { await p.screenshot({ path: `${salida}/${caso}-error.png` }); console.error(await p.locator('body').innerText()) } throw e } finally { await context.close() }
    }
  } finally { await browser.close(); fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2)) }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
