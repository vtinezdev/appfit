/* Dos builds locales de producción. Solo appfit-test.localhost y datos de prueba; no usa cuentas reales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const a = path.resolve(process.argv[2] || '/tmp/appfit-actualizaciones-a')
const b = path.resolve(process.argv[3] || '/tmp/appfit-actualizaciones-b')
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-actualizaciones'
const BASE = 'http://appfit-test.localhost:5173'
const versionA = JSON.parse(fs.readFileSync(path.join(a, 'version.json')))
const versionB = JSON.parse(fs.readFileSync(path.join(b, 'version.json')))
assert.notEqual(versionA.id, versionB.id, 'las dos builds deben tener distinta identidad')
fs.mkdirSync(salida, { recursive: true })
let raiz = a, bloquearDescarga = false
const entradaB = fs.readFileSync(path.join(b, 'index.html'), 'utf8').match(/src="([^"]+\.js)"/)[1]
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, BASE).pathname)
  if (bloquearDescarga && ruta === entradaB) { res.writeHead(503); res.end('Descarga de prueba interrumpida'); return }
  let archivo = path.resolve(raiz, '.' + ruta)
  if (!archivo.startsWith(raiz + path.sep) && archivo !== raiz) { res.writeHead(403); res.end(); return }
  if (ruta === '/' || (!fs.existsSync(archivo) && req.headers.accept?.includes('text/html'))) archivo = path.join(raiz, 'index.html')
  if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': mime[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(archivo).pipe(res)
})
const args = ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1']
const opciones = { executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args }
async function aislar(context) {
  await context.route('https://**', r => r.abort())
  await context.route('**/catalogo/**', r => r.abort())
}
async function captura(page, nombre) {
  await page.evaluate(() => document.fonts.ready)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const anchos = await page.locator('main').evaluate(e => ({ cliente: e.clientWidth, contenido: e.scrollWidth }))
  assert.ok(anchos.contenido <= anchos.cliente + 1, JSON.stringify(anchos))
  await page.screenshot({ path: `${salida}/${nombre}.png`, animations: 'disabled' })
}
async function ajustes(page) {
  await page.getByRole('button', { name: /^Actualizaciones\./ }).click()
  await page.getByRole('heading', { name: 'Actualizaciones', exact: true }).waitFor()
}
async function estado(page, texto) {
  await page.locator('main').getByRole('status').filter({ hasText: texto }).waitFor()
}
async function registros(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const solicitud = indexedDB.open('appfit')
    solicitud.onerror = () => reject(solicitud.error)
    solicitud.onsuccess = () => {
      const db = solicitud.result, nombres = [...db.objectStoreNames]
      const tx = db.transaction(nombres, 'readonly'), salida = {}
      for (const nombre of nombres) {
        const r = tx.objectStore(nombre).getAll()
        r.onsuccess = () => { salida[nombre] = r.result }
      }
      tx.oncomplete = () => { db.close(); resolve(salida) }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  }))
}
async function importarFixture(page) {
  await navegar(page, 'Ajustes')
  await page.getByRole('button', { name: /^Copias de seguridad/ }).click()
  await page.locator('input[type=file]').setInputFiles('src/test/fixtures/backup-v1.json')
  await page.getByRole('group', { name: 'Confirmar importación', exact: true }).getByRole('button', { name: 'Importar copia', exact: true }).click()
  await page.getByText('Copia importada correctamente.', { exact: true }).waitFor()
}
async function main() {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5173, '127.0.0.1', resolve) })
  const informe = []
  let browser
  try {
    browser = await chromium.launch(opciones)
    const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
    casos.push(...['light', 'dark'].map(theme => ({ width: 375, theme, grande: true })))
    for (const c of casos) {
      const caso = `${c.width}-${c.theme}${c.grande ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== caso) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: 932 }, colorScheme: c.theme, reducedMotion: c.grande ? 'reduce' : 'no-preference', serviceWorkers: 'block', timezoneId: 'Europe/Madrid' })
      try {
        await aislar(context)
        await context.addInitScript(theme => localStorage.setItem('appfit:theme', theme), c.theme)
        let remota = versionA, fallar = false
        await context.route('**/version.json?*', r => r.fulfill({ status: fallar ? 503 : 200, contentType: 'application/json', body: JSON.stringify(remota) }))
        const page = await context.newPage()
        await page.goto(BASE)
        await page.getByRole('button', { name: 'Actualizaciones. App al día', exact: true }).waitFor()
        if (c.grande) await page.addStyleTag({ content: 'html { font-size: 200% !important }' })
        await captura(page, `${caso}-inicio`)
        await ajustes(page)
        await estado(page, 'App al día')
        await context.setOffline(true)
        await estado(page, 'Sin conexión para comprobar')
        await captura(page, `${caso}-sin-conexion`)
        await context.setOffline(false)
        await estado(page, 'App al día')
        fallar = true
        await page.getByRole('button', { name: 'Comprobar actualizaciones', exact: true }).click()
        await estado(page, 'No se ha podido comprobar')
        fallar = false; remota = versionB
        await page.getByRole('button', { name: 'Comprobar actualizaciones', exact: true }).click()
        await estado(page, 'Actualización disponible')
        await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Si sigue apareciendo una versión anterior', exact: true }).click()
        await page.getByText(/cierra AppFit por completo/).waitFor()
        await captura(page, `${caso}-disponible`)
        await navegar(page, 'Inicio')
        await page.getByRole('button', { name: 'Actualizaciones. Actualización disponible', exact: true }).waitFor()
        await captura(page, `${caso}-aviso`)
        informe.push({ caso, correcto: true }); console.log(`${caso}: correcto`)
      } finally { await context.close() }
    }
    await browser.close(); browser = undefined

    // Actualización real con SW, dos pestañas y reapertura del mismo perfil sin conexión.
    const perfil = fs.mkdtempSync('/tmp/appfit-pwa-perfil-')
    let context = await chromium.launchPersistentContext(perfil, { ...opciones, viewport: { width: 375, height: 932 }, timezoneId: 'Europe/Madrid' })
    let paginaActual
    try {
      await aislar(context)
      let page = context.pages()[0]
      paginaActual = page
      await page.goto(BASE)
      await page.waitForFunction(() => !!navigator.serviceWorker.controller)
      await importarFixture(page)
      await navegar(page, 'Inicio')
      await page.getByRole('button', { name: 'Actualizaciones. App al día', exact: true }).waitFor()
      await ajustes(page)
      const antes = await registros(page)
      await page.evaluate(() => { window.pruebaPagina = 'primera' })
      const otra = await context.newPage()
      await otra.goto(BASE)
      await otra.getByRole('button', { name: 'Actualizaciones. App al día', exact: true }).waitFor()
      await ajustes(otra)
      await otra.evaluate(() => { window.pruebaPagina = 'segunda' })
      raiz = b; bloquearDescarga = true
      for (const p of [page, otra]) {
        await p.getByRole('button', { name: 'Comprobar actualizaciones', exact: true }).click()
        await estado(p, 'Actualización disponible')
      }
      await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).click()
      await page.getByText('No se ha podido actualizar. Comprueba la conexión y vuelve a intentarlo.', { exact: true }).waitFor()
      assert.equal(await page.evaluate(() => window.pruebaPagina), 'primera', 'no recargar una descarga fallida')
      assert.deepEqual(await registros(page), antes)
      bloquearDescarga = false
      await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).click()
      await page.getByRole('button', { name: 'Actualizaciones. App al día', exact: true }).waitFor()
      assert.equal(await page.evaluate(() => window.pruebaPagina), undefined, 'la actualización recarga la página que la solicita')
      assert.equal(await otra.evaluate(() => window.pruebaPagina), 'segunda', 'no recargar otras pestañas')
      assert.deepEqual(await registros(page), antes)
      await otra.getByRole('button', { name: 'Actualizar ahora', exact: true }).click()
      await otra.getByRole('button', { name: 'Actualizaciones. App al día', exact: true }).waitFor()
      assert.deepEqual(await registros(otra), antes)
      console.log('Actualización A→B y dos pestañas: correctas; comprobando reapertura offline.')
      await context.close()
      context = await chromium.launchPersistentContext(perfil, { ...opciones, viewport: { width: 375, height: 932 } })
      await aislar(context)
      await context.setOffline(true)
      page = context.pages()[0]
      paginaActual = page
      await page.goto(BASE)
      // Chromium puede conservar onLine=true en la primera pestaña de un perfil reabierto.
      // La red está cortada de verdad: ambas respuestas deben indicar que no se pudo comprobar.
      await assert.rejects(page.evaluate(() => fetch('/version.json?prueba-offline', { cache: 'no-store' })))
      const sinComprobar = await page.evaluate(() => navigator.onLine ? 'No se ha podido comprobar' : 'Sin conexión para comprobar')
      await page.getByRole('button', { name: `Actualizaciones. ${sinComprobar}`, exact: true }).waitFor()
      assert.deepEqual(await registros(page), antes, 'reabrir offline conserva todas las tablas')
      await ajustes(page)
      await estado(page, sinComprobar)
      await captura(page, 'produccion-reabierta-offline')
      informe.push({ caso: 'actualizacion-real-dos-pestanas-offline', correcto: true })
      console.log('Actualización real: fallo/reintento, dos pestañas, reapertura offline y todas las tablas conservadas.')
    } catch (e) {
      if (paginaActual && !paginaActual.isClosed()) {
        await paginaActual.screenshot({ path: `${salida}/produccion-fallo.png` })
        console.error(await paginaActual.evaluate(() => ({ url: location.href, enLinea: navigator.onLine, titulo: document.title, texto: document.body.innerText.slice(0, 1800), controlada: !!navigator.serviceWorker?.controller })))
      }
      throw e
    } finally { await context.close() }
    fs.writeFileSync(`${salida}/informe.json`, JSON.stringify(informe, null, 2))
  } finally { if (browser) await browser.close(); server.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
