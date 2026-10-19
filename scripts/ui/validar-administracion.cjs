/* Administración de Social (0017): contextos efímeros, Supabase falso y appfit-test.localhost:5174. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require('playwright-core')) }
const { navegar } = require('./navegar.cjs')

const BASE = 'http://appfit-test.localhost:5174'
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-administracion'
fs.mkdirSync(salida, { recursive: true })
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'

/** Sin scroll horizontal en la capa ni controles por debajo de 44 px. */
async function comprobar(capa) {
  const g = await capa.evaluate(e => ({
    ancho: e.clientWidth, contenido: e.scrollWidth, derecha: e.getBoundingClientRect().right, ventana: innerWidth,
    pequenos: [...e.querySelectorAll('button, input')].filter(n => n.offsetParent).map(n => n.getBoundingClientRect()).filter(r => r.height < 44 || r.width < 44).length,
  }))
  assert.ok(g.contenido <= g.ancho + 1 && g.derecha <= g.ventana + 1, 'sin desbordamiento')
  assert.equal(g.pequenos, 0, 'controles de 44 px')
}

async function abrirMasAcciones(page, titulo) {
  const tarjeta = page.getByRole('list', { name: 'Publicaciones' }).getByRole('listitem').filter({ hasText: titulo }).first()
  await tarjeta.getByRole('button', { name: 'Más acciones', exact: true }).click()
  return page.getByRole('dialog', { name: 'Más acciones', exact: true })
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

        // Sin ser administrador no aparece nada: ni Moderación ni borrar lo ajeno.
        await page.goto(BASE)
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await navegar(page, 'Social')
        const main = page.getByRole('main')
        await main.getByRole('button', { name: 'Amigos', exact: true }).waitFor()
        await page.getByRole('list', { name: 'Publicaciones' }).waitFor()
        assert.equal(await main.getByRole('button', { name: 'Moderación', exact: true }).count(), 0, 'sin Moderación')
        let menu = await abrirMasAcciones(page, 'Pierna pesada')
        await menu.getByRole('button', { name: 'Denunciar publicación', exact: true }).waitFor()
        assert.equal(await menu.getByRole('button', { name: 'Borrar publicación', exact: true }).count(), 0, 'no borra lo ajeno')
        await page.keyboard.press('Escape'); await menu.waitFor({ state: 'detached' })

        // Administrador.
        await page.request.post(`${API}simular_admin`, { data: { p_admin: true } })
        await page.reload()
        await navegar(page, 'Social')
        await main.getByRole('button', { name: 'Moderación', exact: true }).click()
        const mod = page.getByRole('dialog', { name: 'Moderación', exact: true })
        const lista = mod.getByRole('list', { name: 'Denuncias pendientes', exact: true })
        await lista.waitFor()
        assert.equal(await lista.getByRole('listitem').count(), 4)
        await mod.getByText('2 denuncias', { exact: false }).first().waitFor()
        await comprobar(mod)
        await page.screenshot({ path: `${salida}/${caso}-denuncias.png`, animations: 'disabled' })
        // Descartar no pide confirmación.
        const comunidad = lista.getByRole('listitem').filter({ hasText: 'Running en compañía' })
        await comunidad.getByRole('button', { name: 'Descartar', exact: true }).click()
        await mod.getByRole('status').filter({ hasText: 'Denuncia descartada.' }).waitFor()
        await lista.getByRole('listitem').filter({ hasText: 'Running en compañía' }).waitFor({ state: 'detached' })
        // Borrar un comentario pide confirmación.
        const comentario = lista.getByRole('listitem').filter({ hasText: 'Comentario de @lucia.run' })
        await comentario.getByRole('button', { name: 'Borrar', exact: true }).click()
        let hoja = page.getByRole('dialog', { name: 'Borrar comentario', exact: true })
        await comprobar(hoja)
        await hoja.getByRole('button', { name: 'Borrar', exact: true }).click()
        await hoja.waitFor({ state: 'detached' })
        await mod.getByRole('status').filter({ hasText: 'Borrado.' }).waitFor()
        // Suspender desde la denuncia de un perfil.
        const perfil = lista.getByRole('listitem').filter({ hasText: '@maria.fernandez.trail' })
        await perfil.getByRole('button', { name: 'Suspender a @maria.fernandez.trail', exact: true }).click()
        hoja = page.getByRole('dialog', { name: 'Suspender perfil', exact: true })
        await hoja.getByRole('button', { name: 'Suspender perfil', exact: true }).click()
        await hoja.waitFor({ state: 'detached' })
        assert.equal(await lista.getByRole('listitem').count(), 1)
        // Suspendidos: aparece y se readmite.
        await mod.getByRole('tab', { name: 'Suspendidos', exact: true }).click()
        const suspendidos = mod.getByRole('list', { name: 'Perfiles suspendidos', exact: true })
        await suspendidos.getByText('@maria.fernandez.trail', { exact: false }).waitFor()
        await comprobar(mod)
        await page.screenshot({ path: `${salida}/${caso}-suspendidos.png`, animations: 'disabled' })
        await mod.getByRole('button', { name: 'Readmitir a @maria.fernandez.trail', exact: true }).click()
        await mod.getByText('Nadie está suspendido', { exact: true }).waitFor()
        await mod.getByRole('button', { name: 'Social', exact: true }).click()
        await mod.waitFor({ state: 'detached' })

        // En el feed: borrar una publicación ajena con confirmación propia.
        menu = await abrirMasAcciones(page, 'Rodaje por el Retiro')
        await menu.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        const borrar = page.getByRole('dialog', { name: 'Borrar publicación', exact: true })
        await borrar.getByText('Se borrarán la publicación de @lucia.run', { exact: false }).waitFor()
        await borrar.getByRole('button', { name: 'Borrar publicación', exact: true }).click()
        await borrar.waitFor({ state: 'detached' })
        await page.getByRole('list', { name: 'Publicaciones' }).getByText('Rodaje por el Retiro').waitFor({ state: 'detached' })

        // Comunidades: gestionar sin ser miembro y añadir a alguien.
        await main.getByRole('tab', { name: 'Comunidades', exact: true }).click()
        await main.getByRole('tab', { name: 'Descubrir', exact: true }).click()
        await main.getByRole('button', { name: /^Entreno de fuerza/ }).click()
        await main.getByRole('button', { name: 'Más acciones de la comunidad', exact: true }).click()
        await page.getByRole('dialog', { name: 'Entreno de fuerza', exact: true }).getByRole('button', { name: 'Gestionar comunidad', exact: true }).click()
        const gestion = page.getByRole('dialog', { name: 'Gestionar comunidad', exact: true })
        await gestion.getByLabel('Añadir a alguien').fill('@Lucia.run')
        await gestion.getByRole('button', { name: 'Añadir', exact: true }).click()
        await gestion.getByRole('status').filter({ hasText: '@lucia.run ya es miembro.' }).waitFor()
        await gestion.getByText('Lucía Martín', { exact: true }).waitFor()
        await gestion.getByRole('button', { name: 'Añadir', exact: true }).waitFor()
        await gestion.getByLabel('Añadir a alguien').fill('lucia.run')
        await gestion.getByRole('button', { name: 'Añadir', exact: true }).click()
        await gestion.getByText('Esa persona ya es miembro de la comunidad.', { exact: true }).waitFor()
        await comprobar(gestion)
        await page.screenshot({ path: `${salida}/${caso}-gestionar.png`, animations: 'disabled' })
        await page.keyboard.press('Escape'); await gestion.waitFor({ state: 'detached' })

        // El aviso de quien es añadido.
        await page.request.post(`${API}simular_anadido`, { data: {} })
        await page.reload()
        await navegar(page, 'Social')
        await main.getByRole('button', { name: /^Avisos/ }).click()
        const avisos = page.getByRole('dialog', { name: 'Avisos', exact: true })
        const aviso = avisos.getByRole('button', { name: /Te añadió a la comunidad Entreno de fuerza/ })
        await aviso.waitFor()
        await comprobar(avisos)
        await page.screenshot({ path: `${salida}/${caso}-aviso.png`, animations: 'disabled' })
        await aviso.click()
        await avisos.waitFor({ state: 'detached' })
        await main.getByRole('tab', { name: 'Mis comunidades', exact: true, selected: true }).waitFor()
        await main.getByRole('button', { name: /^Entreno de fuerza/ }).waitFor()

        assert.deepEqual(errores, [])
        informe.push({ caso, correcto: true })
        console.log(`${caso}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close(); fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2)) }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
