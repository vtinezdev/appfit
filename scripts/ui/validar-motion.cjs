/* Capturas y regresión del lenguaje de movimiento. Solo datos sintéticos y origen aislado. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium, devices } = require('playwright')
const { navegar } = require('./navegar.cjs')
const origin = 'http://appfit-test.localhost:5173'
const output = process.env.APPFIT_UI_OUTPUT || path.resolve('.impeccable/review')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const results = []
fs.mkdirSync(output, { recursive: true })

async function snapshot(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="status"]')).some(e => e.getClientRects().length && /Cargando/.test(e.textContent)))
  await page.locator('main').evaluate(e => e.scrollTo(0, 0))
  await page.waitForTimeout(450)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true })
}
async function backup(page) {
  return page.evaluate(async () => {
    const b = await import('/src/shared/lib/backup.ts')
    const value = await b.exportarBackup(); delete value.exportedAt
    return JSON.parse(JSON.stringify(value))
  })
}
async function seed(page) {
  await page.evaluate(async fixture => {
    const b = await import('/src/shared/lib/backup.ts')
    const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
    fixture.entries.forEach(e => { e.fecha = addDays(todayISO(), e.id <= 4 ? 0 : -1) })
    fixture.workouts.forEach(w => { w.inicio = Date.now() - 3 * 86400000; w.fin = w.inicio + 3600000 })
    await b.importarBackup(JSON.stringify(fixture))
  }, fixture)
}
async function closed(page) {
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.locator('[data-app-shell]').evaluate(e => e.inert), false)
}
async function geometry(page) {
  const diagnostic = await page.locator('.fan-target').evaluateAll(elements => {
    const rects = elements.map(e => e.getBoundingClientRect())
    return { collisions: rects.some((a, i) => rects.slice(i + 1).some(b => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1)),
      outside: rects.some(r => r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1),
      tiny: rects.some(r => r.width < 44 || r.height < 44) }
  })
  assert.deepEqual(diagnostic, { collisions: false, outside: false, tiny: false })
  const selected = await page.locator('.fan-target[aria-current="page"]').evaluate(button => {
    const mark = button.querySelector('svg.absolute')
    if (!mark) return false
    const a = button.getBoundingClientRect(), b = mark.getBoundingClientRect()
    return b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom
  })
  assert.equal(selected, true, 'el check pertenece al destino activo, también en compacto')
}
async function run(browser, variant) {
  const context = await browser.newContext(variant.options)
  try {
    await context.route('**/world.openfoodfacts.org/**', route => route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error' && !/Failed to load resource/.test(e.text())) errors.push(e.text()) })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
    await seed(page)
    await snapshot(page, `${variant.name}-inicio`)
    if (variant.name === '375-light') await snapshot(page, 'mobile')
    if (variant.name === '1440-light') await snapshot(page, 'desktop')
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    await snapshot(page, `${variant.name}-menu`); await geometry(page)
    await page.keyboard.press('Escape'); await closed(page)
    // Cierre interrumpiendo la entrada, repetido; no quedan capas, scroll bloqueado ni historia residual.
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-nav-trigger]').evaluate(e => e.click())
      await page.waitForTimeout(25)
      await page.keyboard.press('Escape'); await closed(page)
    }
    await navegar(page, 'Nutrición'); await snapshot(page, `${variant.name}-nutricion`)
    await page.getByRole('button', { name: 'Añadir comida', exact: true }).click()
    await snapshot(page, `${variant.name}-anadir`)
    if (variant.name.startsWith('320-')) {
      const lines = await page.getByRole('radio', { name: 'Desayuno', exact: true }).evaluate(button => {
        const range = document.createRange(); range.selectNodeContents(button)
        return range.getClientRects().length
      })
      assert.equal(lines, 1, 'Desayuno completo en una línea a 320 px')
    }
    await page.keyboard.press('Escape'); await closed(page)
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click()
    await page.getByRole('radio', { name: 'Mes', exact: true }).waitFor()
    await snapshot(page, `${variant.name}-estadisticas`)
    await page.getByRole('tab', { name: 'Alimentos', exact: true }).click()
    await snapshot(page, `${variant.name}-alimentos`)
    await navegar(page, 'Gym'); await snapshot(page, `${variant.name}-entreno`)
    await page.getByRole('button', { name: 'Desde rutina', exact: true }).click()
    await page.getByRole('button', { name: 'Full body', exact: true }).click()
    await page.getByRole('button', { name: 'Añadir serie', exact: true }).first().click()
    await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).waitFor()
    await page.getByRole('button', { name: /^Descanso:/ }).click()
    await page.getByRole('radio', { name: '60 s', exact: true }).click()
    const beforeComplete = await backup(page)
    await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).getAttribute('aria-pressed'), 'true')
    await page.getByRole('region', { name: 'Descanso en curso', exact: true }).waitFor()
    assert.deepEqual(await backup(page), beforeComplete, 'marcar y descansar no modifican ninguna tabla')
    await snapshot(page, `${variant.name}-activo`)
    if (variant.name.startsWith('320-')) {
      const row = await page.locator('.series-row[data-motion-id]').first().boundingBox()
      const nav = await page.locator('[data-nav-trigger]').evaluate(button => button.closest('nav').getBoundingClientRect().top)
      assert.ok(row.height >= 44 && row.y + row.height <= nav, 'la primera serie editable queda completa antes de la navegación con descanso activo')
    }
    await page.getByRole('button', { name: 'Finalizar descanso', exact: true }).click()
    await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).click()
    await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
    // Simula tiempo de pared transcurrido; no espera un minuto ni cambia la base de datos.
    await page.evaluate(() => { window.__realNow = Date.now; Date.now = () => window.__realNow() + 65000 })
    await page.getByRole('region', { name: 'Descanso en curso', exact: true }).waitFor({ state: 'detached' })
    await page.evaluate(() => { Date.now = window.__realNow })
    await navegar(page, 'Inicio'); await navegar(page, 'Gym')
    assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).getAttribute('aria-pressed'), 'true')
    await page.reload(); await navegar(page, 'Gym')
    await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).waitFor()
    const reps = page.getByRole('spinbutton', { name: 'Repeticiones, serie 1 de Press banca', exact: true })
    await reps.fill('12'); await reps.blur()
    await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Añadir serie', exact: true }).first().click()
    await page.getByRole('button', { name: 'Borrar serie 2', exact: true }).click()
    await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
    await page.getByRole('spinbutton', { name: 'Repeticiones, serie 2 de Press banca', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
    await page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true }).waitFor()
    await page.goBack(); await closed(page)
    await page.getByRole('button', { name: 'Terminar', exact: true }).click()
    await snapshot(page, `${variant.name}-terminar`)
    if (variant.name === '375-light') {
      // Un gesto cancelado vuelve al estado estable: no se interpreta como confirmar cierre.
      await page.waitForTimeout(350)
      const session = await context.newCDPSession(page)
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
      const header = await page.locator('.sheet-panel .cursor-grab').boundingBox()
      const point = { x: header.x + 20, y: header.y + 24 }
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y + 60 }] })
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      await page.waitForTimeout(350)
      assert.equal(await page.getByRole('dialog', { name: 'Terminar entreno', exact: true }).count(), 1)
      assert.equal(await page.locator('.sheet-panel').evaluate(e => e.style.transform), '')
      await session.detach()
    }
    await page.getByRole('button', { name: 'Seguir entrenando', exact: true }).click()
    await closed(page)
    await page.getByRole('button', { name: 'Terminar', exact: true }).click()
    if (variant.name === '375-light') {
      const beforeFailure = await backup(page)
      await page.evaluate(() => {
        window.__originalPut = IDBObjectStore.prototype.put
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === 'workouts') throw new DOMException('Fallo sintético', 'QuotaExceededError')
          return window.__originalPut.apply(this, args)
        }
      })
      await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'No se ha podido terminar el entreno.' }).waitFor()
      assert.deepEqual(await backup(page), beforeFailure, 'el error conserva sesión activa y registros')
      assert.equal(await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).isDisabled(), false)
      await page.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut })
    }
    await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
    await page.getByRole('heading', { name: 'Sesión guardada', exact: true }).waitFor()
    await snapshot(page, `${variant.name}-finalizado`)
    await page.getByRole('button', { name: /Volver a Entreno/ }).click()
    await navegar(page, 'Ajustes'); await snapshot(page, `${variant.name}-ajustes`)
    if (variant.name === '375-light') {
      // Texto al 200% y viewport bajo: el patrón cambia a dos columnas accesibles.
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
      await page.getByRole('button', { name: 'Menú', exact: true }).click()
      await snapshot(page, '375-text-200-menu'); await geometry(page)
      await page.keyboard.press('Escape'); await closed(page)
      await page.evaluate(() => { document.documentElement.style.fontSize = '' })
      await page.setViewportSize({ width: 812, height: 320 })
      await page.getByRole('button', { name: 'Menú', exact: true }).click()
      await snapshot(page, '812-landscape-menu'); await geometry(page)
      await page.keyboard.press('Escape'); await closed(page)
      await page.setViewportSize({ width: 320, height: 568 })
      await page.getByRole('button', { name: 'Menú', exact: true }).click()
      await page.setViewportSize({ width: 430, height: 932 })
      await page.waitForTimeout(400); await geometry(page)
      await page.keyboard.press('Escape'); await closed(page)
    }
    assert.deepEqual(errors, [], variant.name)
    results.push({ name: variant.name, status: 'passed' })
    console.log(`Motion y flujos: ${variant.name}: correcto`)
  } finally { await context.close() }
}
async function main() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  try {
    const variants = [320, 375, 430, 768, 1440].flatMap(width => ['light', 'dark'].map(colorScheme => ({ name: `${width}-${colorScheme}`, options: { viewport: { width, height: width === 320 ? 568 : width === 1440 ? 1000 : 812 }, colorScheme, reducedMotion: 'no-preference' } })))
    variants.push({ name: 'ios-emulado-reduce', options: { ...devices['iPhone 13'], colorScheme: 'light', reducedMotion: 'reduce', defaultBrowserType: undefined } })
    variants.push({ name: 'android-emulado-reduce', options: { ...devices['Pixel 7'], colorScheme: 'dark', reducedMotion: 'reduce', defaultBrowserType: undefined } })
    for (const variant of variants) await run(browser, variant)
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(output, 'motion-results.json'), JSON.stringify({ origin, results, allPassed: results.length === 12, limitation: 'Device profiles in Chromium are not native iOS/Android or Safari verification.' }, null, 2))
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
