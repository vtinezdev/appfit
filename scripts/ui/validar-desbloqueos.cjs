/* Desbloqueos de Cumbra Fit (0031, ADR 068 parte 2): Supabase falso, appfit-test.localhost:5174 y `?preview=cobro`. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
let chromium
try { ({ chromium } = require('playwright')) } catch { ({ chromium } = require('playwright-core')) }
const { navegar } = require('./navegar.cjs')

const BASE = 'http://appfit-test.localhost:5174'
const API = 'http://127.0.0.1:54329/rest/v1/rpc/'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-desbloqueos'
fs.mkdirSync(salida, { recursive: true })
const jwt = p => [JSON.stringify({ alg: 'HS256', typ: 'JWT' }), JSON.stringify(p)].map(s => Buffer.from(s).toString('base64url')).join('.') + '.firma'

/** Sin scroll horizontal ni controles por debajo de 44 px. */
async function comprobar(capa) {
  const g = await capa.evaluate(e => ({
    ancho: e.clientWidth, contenido: e.scrollWidth, derecha: e.getBoundingClientRect().right, ventana: innerWidth,
    pequenos: [...e.querySelectorAll('button, input')].filter(n => n.offsetParent).map(n => n.getBoundingClientRect()).filter(r => r.height < 43.5 || r.width < 43.5).length,
  }))
  assert.ok(g.contenido <= g.ancho + 1 && g.derecha <= g.ventana + 1, 'sin desbordamiento')
  assert.equal(g.pequenos, 0, 'controles de 44 px')
}

/** Prueba terminada hace 10 días: lo de pago, en solo lectura. */
async function pruebaTerminada(page) {
  await page.evaluate(async () => {
    const s = await import('/src/shared/db/settings.ts'); const d = await import('/src/shared/lib/dates.ts')
    await s.updateSettings({ bienvenidaPendiente: undefined, primeraApertura: d.addDays(d.todayISO(), -40) })
  })
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = [{ width: 320, theme: 'light' }, { width: 375, theme: 'dark' }, { width: 430, theme: 'light' }]
  try {
    for (const c of casos) {
      const caso = `${c.width}-${c.theme}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== caso) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: 900 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errores = []
        page.setDefaultTimeout(15000)
        page.on('pageerror', e => errores.push(e.message))
        await page.request.post(`${API}simular_reinicio`, { data: {} })
        await page.request.post(`${API}crear_perfil`, { data: { p_alias: 'yo_prueba', p_nombre: 'Persona de prueba', p_acepto: true } })
        const exp = Math.floor(Date.now() / 1000) + 86400
        const user = { id: 'yo', email: 'prueba@appfit.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
        await context.addInitScript(({ session, theme }) => {
          localStorage.setItem('appfit-cuenta', JSON.stringify(session)); localStorage.setItem('appfit:theme', theme)
        }, { session: { access_token: jwt({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'falsa', user }, theme: c.theme })

        // Mi cuenta sin desbloquear: con la prueba terminada, Nutrición avisa.
        await page.goto(`${BASE}/?preview=cobro`)
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await pruebaTerminada(page)
        await page.reload()
        await navegar(page, 'Nutrición')
        await page.getByRole('region', { name: 'Prueba terminada' }).waitFor()

        // Desbloqueada en la nube: al abrir, la app pregunta y lo recuerda; el aviso desaparece.
        await page.request.post(`${API}simular_desbloqueo`, { data: { p_desbloqueado: true } })
        await page.reload()
        await navegar(page, 'Ajustes')
        await page.getByRole('main').getByText('Desbloqueada', { exact: true }).waitFor()
        assert.equal(await page.evaluate(() => localStorage.getItem('appfit-desbloqueo')), '1', 'recordado en el móvil')
        await navegar(page, 'Nutrición')
        await page.getByRole('heading', { name: 'Nutrición' }).waitFor()
        assert.equal(await page.getByRole('region', { name: 'Prueba terminada' }).count(), 0, 'sin aviso')
        await page.screenshot({ path: `${salida}/${caso}-desbloqueada.png`, animations: 'disabled' })

        // Quitado en la nube: vuelve el aviso.
        await page.request.post(`${API}simular_desbloqueo`, { data: { p_desbloqueado: false } })
        await page.reload()
        await navegar(page, 'Nutrición')
        await page.getByRole('region', { name: 'Prueba terminada' }).waitFor()
        assert.equal(await page.evaluate(() => localStorage.getItem('appfit-desbloqueo')), null, 'olvidado')

        // Sin ser administrador, Moderación no sale; siéndolo, la pestaña Desbloqueos.
        await page.request.post(`${API}simular_admin`, { data: { p_admin: true } })
        await page.reload()
        await navegar(page, 'Social')
        const main = page.getByRole('main')
        await main.getByRole('button', { name: 'Moderación', exact: true }).click()
        const mod = page.getByRole('dialog', { name: 'Moderación', exact: true })
        await mod.getByRole('tab', { name: 'Desbloqueos', exact: true }).click()
        await mod.getByText('Nadie desbloqueado a mano', { exact: true }).waitFor()
        await comprobar(mod)
        const campo = mod.getByRole('textbox', { name: 'Desbloquear por alias' })
        await campo.fill('nadie_aqui')
        await mod.getByRole('button', { name: 'Desbloquear', exact: true }).click()
        await mod.getByText('No hay ningún perfil con el alias @nadie_aqui.', { exact: true }).waitFor()
        await campo.fill(' Jon_92 ')
        await mod.getByRole('button', { name: 'Desbloquear', exact: true }).click()
        const lista = mod.getByRole('list', { name: 'Desbloqueados a mano', exact: true })
        await lista.getByText('@jon_92', { exact: false }).waitFor()
        await mod.getByText('@jon_92 tiene Cumbra Fit desbloqueada.', { exact: true }).waitFor()
        assert.equal(await campo.inputValue(), '', 'el campo se vacía')
        await comprobar(mod)
        await page.screenshot({ path: `${salida}/${caso}-moderacion.png`, animations: 'disabled' })
        await lista.getByRole('button', { name: 'Quitar el desbloqueo a @jon_92', exact: true }).click()
        await mod.getByText('Nadie desbloqueado a mano', { exact: true }).waitFor()

        // Desbloqueada otra vez en la nube: al abrir se vuelve a recordar (cerrar la sesión lo olvida: `lib/consulta`, con test).
        await page.request.post(`${API}simular_desbloqueo`, { data: { p_desbloqueado: true } })
        await page.keyboard.press('Escape'); await mod.waitFor({ state: 'detached' })
        await page.reload()
        await page.waitForFunction(() => localStorage.getItem('appfit-desbloqueo') === '1')

        assert.deepEqual(errores, [], 'sin errores')
        console.log(`${caso}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exit(1) })
