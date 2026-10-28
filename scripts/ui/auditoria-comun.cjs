const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const playwright = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-auditoria'
fs.mkdirSync(salida, { recursive: true })

async function lanzar(nombre) {
  const opciones = nombre === 'chromium'
    ? { executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] }
    : nombre === 'firefox' ? { firefoxUserPrefs: { 'network.dns.localDomains': 'appfit-test.localhost' } } : {}
  return playwright[nombre].launch(opciones)
}

async function contexto(browser, opciones = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES', timezoneId: 'Europe/Madrid', reducedMotion: 'reduce', serviceWorkers: 'block', ...opciones })
  await context.route('https://**', r => r.abort())
  return context
}

// La hoja de nuevos logros (punto 5 del documento de mejoras) sale en cualquier pantalla cuando los datos sembrados
// consiguen piezas: se cierra sola para que no tape lo que cada recorrido pulsa.
async function cerrarCelebraciones(page) {
  await page.addLocatorHandler(page.getByRole('button', { name: 'Genial', exact: true }), async (boton) => { await boton.click() })
}

async function abrir(context) {
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  await cerrarCelebraciones(page)
  const errores = []
  const red = []
  page.on('pageerror', error => errores.push(error.message))
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(ORIGEN)) red.push({ url: r.url(), status: r.status() }) })
  await page.goto(ORIGEN)
  await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
  return { page, errores, red }
}

async function datos(page) {
  return page.evaluate(async () => {
    const b = await (await import('/src/shared/lib/backup.ts')).exportarBackup()
    delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}

async function sembrar(page) {
  await page.evaluate(async () => {
    await (await import('/src/shared/db/settings.ts')).ensureSettings()
    const json = await fetch('/src/test/fixtures/backup-v1.json').then(r => r.text())
    await (await import('/src/shared/lib/backup.ts')).importarBackup(json)
    await (await import('/src/shared/db/settings.ts')).updateSettings({ rirAlCompletar: false })
    const fechas = await import('/src/shared/lib/dates.ts')
    const hoy = fechas.todayISO()
    const ex = await import('/src/features/gym/data/exercisesRepo.ts')
    const wr = await import('/src/features/gym/data/workoutsRepo.ts')
    const sr = await import('/src/features/gym/data/setsRepo.ts')
    const exerciseId = await ex.obtenerOCrear('Press banca')
    for (const dias of [4, 2]) {
      const fin = Date.now() - dias * 86400000
      const id = await wr.crearPasado({ inicio: fin - 3600000, fin })
      const sid = await sr.agregar(id, exerciseId, fin - 1800000)
      await sr.actualizar(sid, { reps: 12, peso: dias === 4 ? 60 : 65 })
      await sr.confirmar(sid, true)
      await wr.recalcularSnapshot(id)
    }
    await (await import('/src/features/inicio/data/pesosRepo.ts')).registrar(hoy, 72.5)
    await (await import('/src/features/nutricion/data/entriesRepo.ts')).anadirRapida({ fecha: hoy, comida: 'desayuno', nombre: 'Comida sintética de auditoría con un nombre largo para comprobar el espacio de lectura', kcal: 1234, prot: 92, carb: 130, grasa: 39 })
  })
  await marcarLogrosVistos(page)
}

// Lo que consiguen los datos sembrados queda visto: si no, la hoja de nuevos logros (CelebracionLogros) se abre cuando
// la Vitrina termina de calcularse, a veces en mitad de otra hoja o de un «Atrás», y el recorrido falla de forma intermitente.
async function marcarLogrosVistos(page) {
  await page.evaluate(async () => {
    const { leerVitrina } = await import('/src/features/vitrina/hooks/leerVitrina.ts')
    const { piezasConseguidas } = await import('/src/features/vitrina/lib/logros.ts')
    const { marcarVistos } = await import('/src/features/vitrina/data/logrosVistosRepo.ts')
    const { todayISO } = await import('/src/shared/lib/dates.ts')
    const estado = await leerVitrina(todayISO())
    if (estado.visible) await marcarVistos(piezasConseguidas(estado.vitrina.logros).map(p => p.clave))
  })
}

async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  const dialogo = page.locator('[role="dialog"]:not([inert])')
  if(await dialogo.count()) await page.waitForFunction(() => {
    const d=document.querySelector('[role="dialog"]:not([inert])')
    return !d || d.closest('[data-visible]')?.getAttribute('data-visible')==='true'
  })
  const archivo = path.join(salida, `${nombre}.png`)
  await page.screenshot({ path: archivo, animations: 'disabled' })
  return archivo
}

async function geometria(page, etiqueta) {
  const medicion = await page.evaluate(() => {
    const root = document.querySelector('[role="dialog"]:not([inert])') || document.querySelector('main')
    const visibles = [...root.querySelectorAll('*')].filter(e => e instanceof HTMLElement && e.clientWidth && e.getClientRects().length && !e.closest('[inert],[hidden]'))
    const overflow = [root, ...visibles].filter(e => getComputedStyle(e).overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2)
      // Los márgenes negativos de iconos/botones pueden entrar intencionadamente en el padding del padre.
      .filter(e => {
        const margen = [...e.querySelectorAll('*')].filter(x => x instanceof HTMLElement).reduce((n,x) => Math.max(n, -parseFloat(getComputedStyle(x).marginRight) || 0), 0)
        return e.scrollWidth - e.clientWidth > margen + 2
      })
      .map(e => ({ elemento: e.tagName, clase: e.className, ancho: e.clientWidth, contenido: e.scrollWidth, texto: e.textContent.slice(0, 100) })).slice(0, 16)
    const inputs = visibles.filter(e => e.matches('input,select,textarea') && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.getAttribute('aria-label') || e.tagName)
    const botones = visibles.filter(e => e.tagName === 'BUTTON').map(e => { const r = e.getBoundingClientRect(); return { nombre: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 80), ancho: r.width, alto: r.height } })
    const tacto = botones.filter(e => e.ancho < 43.8 || e.alto < 43.8)
    return { pagina: document.documentElement.scrollWidth <= innerWidth + 1, overflow, inputs, tacto }
  })
  return { etiqueta, ...medicion }
}

function informe(nombre, datos) { fs.writeFileSync(path.join(salida, `${nombre}.json`), JSON.stringify(datos, null, 2)) }
module.exports = { cerrarCelebraciones, marcarLogrosVistos, assert, fs, path, playwright, ORIGEN, salida, lanzar, contexto, abrir, datos, sembrar, captura, geometria, informe, navegar }
