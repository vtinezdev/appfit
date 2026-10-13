/*
 * Cuenta y copia en la nube: Supabase simulado con page.route (nunca se llama al proyecto real), dos «móviles» como
 * contextos efímeros en el origen de pruebas. Crear la cuenta, guardar ahora, entrar en otro móvil con datos y elegir,
 * conflicto desde Inicio, cerrar sesión. Overflow y targets en 320/375/430 × claro/oscuro.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
let pw
try { pw = require('playwright') } catch { pw = require('playwright-core') }
const { navegar } = require('./navegar.cjs')

const BASE = process.env.APPFIT_UI_URL || 'http://appfit-test.localhost:5173'
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-cuenta'
fs.mkdirSync(output, { recursive: true })
const EMAIL = 'prueba@example.com'
const CONTRASENA = 'contraseña de prueba'

/** Estado del «servidor» compartido por todos los contextos de un caso. */
function servidorFalso() {
  return { copia: null, revisiones: [], llamadas: [] }
}

const jwt = (payload) => ['{"alg":"HS256","typ":"JWT"}', JSON.stringify(payload)].map((s) => Buffer.from(s).toString('base64url')).join('.') + '.firma'

async function simularSupabase(context, srv) {
  await context.route(/\.supabase\.co\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    srv.llamadas.push(`${req.method()} ${url.pathname}`)
    if (url.pathname === '/auth/v1/otp') return json({})
    if (url.pathname === '/auth/v1/verify') {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: EMAIL, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }
      return json({ access_token: jwt({ sub: user.id, email: EMAIL, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r', user })
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })
    if (url.pathname === '/rest/v1/copias') {
      return json(srv.copia ? [srv.copia] : [])
    }
    if (url.pathname === '/rest/v1/rpc/subir_copia') {
      const { p_revision_base: base, p_datos: datos, p_claves: claves } = req.postDataJSON()
      const actual = srv.copia?.revision ?? 0
      if (base !== actual) return json(null)
      srv.copia = { revision: actual + 1, actualizada: new Date().toISOString(), datos, claves: claves ?? srv.copia.claves }
      srv.revisiones.push(srv.copia.revision)
      return json(srv.copia.revision)
    }
    if (url.pathname === '/rest/v1/rpc/actualizar_claves') {
      srv.copia.claves = req.postDataJSON().p_claves
      return route.fulfill({ status: 204 })
    }
    if (url.pathname === '/rest/v1/rpc/borrar_cuenta') {
      srv.copia = null
      return route.fulfill({ status: 204 })
    }
    return json({ message: `no simulado: ${url.pathname}` }, 404)
  })
}

async function comidas(page) {
  return page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    return (await db.entries.toArray()).map((e) => e.nombre)
  })
}

async function anadirComida(page, nombre) {
  await page.evaluate(async (nombre) => {
    const { db } = await import('/src/shared/db/db.ts')
    await db.entries.add({ fecha: '2026-10-13', comida: 'cena', nombre, gramos: 100, kcal: 200, prot: 10, carb: 20, grasa: 5, createdAt: Date.now() })
  }, nombre)
}

async function revisar(page, nombre) {
  const r = await page.evaluate(() => {
    // Solo lo de esta feature: la sección Cuenta, la hoja abierta y el aviso de Inicio.
    const pequenos = [...document.querySelectorAll(':is(section[aria-label="Cuenta"], [role="dialog"], [aria-label="Recordatorio de copia de seguridad"]) :is(button, input, [role="button"])')]
      .filter((el) => el.offsetParent !== null && !el.closest('[inert]'))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 - 0.5))
      .map(({ el }) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40))
    return { horizontal: document.documentElement.scrollWidth > innerWidth, pequenos }
  })
  assert.equal(r.horizontal, false, `${nombre}: scroll horizontal`)
  assert.deepEqual(r.pequenos, [], `${nombre}: controles de menos de 44 px`)
  await page.screenshot({ path: `${output}/${nombre}.png`, fullPage: false })
}

async function abrirAjustesCuenta(page) {
  await navegar(page, 'Ajustes')
  const seccion = page.getByRole('region', { name: 'Cuenta' })
  await seccion.scrollIntoViewIfNeeded()
  return seccion
}

async function caso(browser, { width, theme }) {
  const id = `${width}-${theme}`
  const srv = servidorFalso()
  const errores = []
  const nuevo = async () => {
    const context = await browser.newContext({ viewport: { width, height: 860 }, colorScheme: theme, timezoneId: 'Europe/Madrid', serviceWorkers: 'block' })
    await simularSupabase(context, srv)
    const page = await context.newPage()
    page.on('pageerror', (e) => errores.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    await page.goto(BASE)
    await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
    return { context, page }
  }

  // Móvil A: crear la cuenta con una comida.
  const a = await nuevo()
  await anadirComida(a.page, 'Tortilla')
  let cuenta = await abrirAjustesCuenta(a.page)
  await revisar(a.page, `${id}-1-sin-cuenta`)
  await cuenta.getByRole('button', { name: 'Entrar o crear cuenta' }).click()
  let hoja = a.page.getByRole('dialog', { name: 'Tu cuenta' })
  await hoja.getByLabel('Email').fill(EMAIL)
  await revisar(a.page, `${id}-2-email`)
  await hoja.getByRole('button', { name: 'Enviarme un código' }).click()
  hoja = a.page.getByRole('dialog', { name: 'Revisa tu correo' })
  await hoja.getByLabel('Código').fill('123456')
  await hoja.getByRole('button', { name: 'Entrar', exact: true }).click()
  hoja = a.page.getByRole('dialog', { name: 'Protege tu copia' })
  await hoja.getByLabel('Contraseña', { exact: true }).fill('corta')
  await hoja.getByLabel('Repite la contraseña').fill('corta')
  await hoja.getByRole('button', { name: 'Crear la copia' }).click()
  await hoja.getByText('Usa al menos 8 caracteres.').waitFor()
  await hoja.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA)
  await hoja.getByLabel('Repite la contraseña').fill(CONTRASENA)
  await revisar(a.page, `${id}-3-crear`)
  await hoja.getByRole('button', { name: 'Crear la copia' }).click()
  hoja = a.page.getByRole('dialog', { name: 'Tu clave de recuperación' })
  await hoja.getByText(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/).waitFor()
  await revisar(a.page, `${id}-4-clave`)
  assert.deepEqual(srv.revisiones, [1])
  assert.ok(!srv.copia.datos.includes('Tortilla'), 'la copia sube cifrada')
  await hoja.getByRole('button', { name: 'Ya la he guardado' }).click()
  await hoja.waitFor({ state: 'detached' })
  await cuenta.getByText('Copia guardada ahora mismo.').waitFor()
  await revisar(a.page, `${id}-5-al-dia`)

  // Guardar ahora sube los cambios.
  await anadirComida(a.page, 'Lentejas')
  await cuenta.getByRole('button', { name: 'Guardar ahora' }).click()
  await a.page.waitForFunction(() => true)
  await cuenta.getByText('Copia guardada ahora mismo.').waitFor()
  for (let i = 0; i < 20 && srv.revisiones.length < 2; i++) await a.page.waitForTimeout(100)
  assert.deepEqual(srv.revisiones, [1, 2])

  // Móvil B con datos propios: entrar, contraseña incorrecta, elegir la copia de la nube.
  const b = await nuevo()
  await anadirComida(b.page, 'Pizza')
  cuenta = await abrirAjustesCuenta(b.page)
  await cuenta.getByRole('button', { name: 'Entrar o crear cuenta' }).click()
  hoja = b.page.getByRole('dialog', { name: 'Tu cuenta' })
  await hoja.getByLabel('Email').fill(EMAIL)
  await hoja.getByRole('button', { name: 'Enviarme un código' }).click()
  hoja = b.page.getByRole('dialog', { name: 'Revisa tu correo' })
  await hoja.getByLabel('Código').fill('123456')
  await hoja.getByRole('button', { name: 'Entrar', exact: true }).click()
  hoja = b.page.getByRole('dialog', { name: 'Abre tu copia' })
  await hoja.getByLabel('Contraseña').fill('no es esta')
  await hoja.getByRole('button', { name: 'Abrir la copia' }).click()
  await hoja.getByText('La contraseña no es correcta.').waitFor()
  await hoja.getByLabel('Contraseña').fill(CONTRASENA)
  await hoja.getByRole('button', { name: 'Abrir la copia' }).click()
  hoja = b.page.getByRole('dialog', { name: '¿Qué datos se quedan?' })
  await hoja.getByText('2 comidas · 0 entrenos').waitFor()
  await hoja.getByText('1 comida · 0 entrenos').waitFor()
  await revisar(b.page, `${id}-6-elegir`)
  await hoja.getByRole('button', { name: 'Quedarme con la copia de la nube' }).click()
  await hoja.getByRole('button', { name: 'Usar la copia de la nube' }).click()
  await hoja.waitFor({ state: 'detached' })
  assert.deepEqual(await comidas(b.page), ['Tortilla', 'Lentejas'])
  assert.deepEqual(srv.revisiones, [1, 2], 'traer la copia no sube nada')

  // Conflicto: A y B cambian; B sube primero, A queda en conflicto y lo resuelve desde Inicio.
  await anadirComida(b.page, 'Ensalada')
  await cuenta.getByRole('button', { name: 'Guardar ahora' }).click()
  for (let i = 0; i < 30 && srv.revisiones.length < 3; i++) await b.page.waitForTimeout(100)
  await anadirComida(a.page, 'Paella')
  cuenta = a.page.getByRole('region', { name: 'Cuenta' })
  await cuenta.getByRole('button', { name: 'Guardar ahora' }).click()
  await cuenta.getByRole('button', { name: 'Elegir qué copia se queda' }).waitFor()
  await navegar(a.page, 'Inicio')
  const aviso = a.page.getByRole('region', { name: 'Recordatorio de copia de seguridad' })
  await aviso.getByText('Elige qué copia se queda').waitFor()
  await revisar(a.page, `${id}-7-aviso-inicio`)
  await aviso.getByRole('button', { name: 'Revisar' }).click()
  cuenta = a.page.getByRole('region', { name: 'Cuenta' })
  await cuenta.getByRole('button', { name: 'Elegir qué copia se queda' }).click()
  hoja = a.page.getByRole('dialog', { name: '¿Qué datos se quedan?' })
  await hoja.getByRole('button', { name: 'Quedarme con este móvil' }).click()
  await hoja.getByRole('button', { name: 'Usar este móvil' }).click()
  await hoja.waitFor({ state: 'detached' })
  assert.deepEqual(srv.revisiones, [1, 2, 3, 4])

  // Cerrar sesión conservando los datos.
  await cuenta.getByRole('button', { name: 'Gestionar la cuenta' }).click()
  await revisar(a.page, `${id}-8-gestionar`)
  await cuenta.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await cuenta.getByRole('button', { name: 'Cerrar sesión y conservar los datos aquí' }).click()
  await cuenta.getByRole('button', { name: 'Entrar o crear cuenta' }).waitFor()
  assert.deepEqual(await comidas(a.page), ['Tortilla', 'Lentejas', 'Paella'])

  assert.deepEqual(errores.filter((e) => !/favicon|Failed to load resource/.test(e)), [], `${id}: errores en consola`)
  await a.context.close()
  await b.context.close()
  return id
}

;(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = [320, 375, 430].flatMap((width) => ['light', 'dark'].map((theme) => ({ width, theme })))
    .filter((c) => !process.env.APPFIT_UI_CASE || `${c.width}-${c.theme}` === process.env.APPFIT_UI_CASE)
  try {
    for (const c of casos) console.log('ok', await caso(browser, c))
  } catch (e) {
    for (const ctx of browser.contexts()) for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: `${output}/fallo-${i}.png` }).catch(() => {})
    throw e
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
