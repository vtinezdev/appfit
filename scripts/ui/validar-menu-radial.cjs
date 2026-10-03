/* Abanico ascendente: contextos aislados, nunca el origen con los datos reales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const ORIGEN = 'http://appfit-test.localhost:5173'
const salida = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-menu-radial-ui'

async function backup(page) {
  return page.evaluate(async () => {
    const b = await import('/src/shared/lib/backup.ts')
    const datos = await b.exportarBackup()
    delete datos.exportedAt
    return JSON.parse(JSON.stringify(datos))
  })
}

async function abrir(page, actual) {
  const trigger = page.getByRole('button', { name: 'Menú', exact: true })
  await trigger.click()
  const menu = page.getByRole('dialog', { name: 'Menú', exact: true })
  await menu.waitFor()
  // Esperar el final de la entrada antes de medir; reducido también usa el montaje diferido.
  await page.waitForTimeout(400)
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true')
  assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), actual)
  const medidas = await menu.evaluate((el) => {
    const rects = [...el.querySelectorAll('.fan-target,.fan-hub')].map((n) => n.getBoundingClientRect().toJSON())
    const solapes = rects.flatMap((a, i) => rects.slice(i + 1).filter((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top))
    return { rects, solapes, overflow: document.documentElement.scrollWidth > innerWidth,
      inert: document.querySelector('[data-app-shell]').inert }
  })
  assert.equal(medidas.overflow, false)
  assert.equal(medidas.inert, true)
  assert.deepEqual(medidas.solapes, [])
  for (const rect of medidas.rects) {
    assert.ok(rect.width >= 44 && rect.height >= 44)
    assert.ok(rect.left >= 0 && rect.right <= page.viewportSize().width)
    assert.ok(rect.top >= 0 && rect.bottom <= page.viewportSize().height)
  }
  const [left, topLeft, topRight, right, center] = medidas.rects
  assert.ok(left.bottom < center.top && right.bottom < center.top && topLeft.bottom < left.top && topRight.bottom < right.top)
  const origin = await page.locator('[data-nav-trigger]').boundingBox()
  assert.ok(Math.abs(center.x + center.width / 2 - origin.x - origin.width / 2) < 1)
  assert.ok(Math.abs(center.y + center.height / 2 - origin.y - origin.height / 2) < 1)
  return menu
}

async function cerrado(page) {
  await page.getByRole('dialog', { name: 'Menú', exact: true }).waitFor({ state: 'detached' })
  assert.equal(await page.getByRole('button', { name: 'Menú', exact: true }).getAttribute('aria-expanded'), 'false')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Menú')
  assert.equal(await page.locator('nav[aria-label="Navegación principal"] button').count(), 1)
  assert.equal(await page.locator('[data-app-shell]').evaluate((el) => el.inert), false)
}

async function futuros(page) {
  // Monta el componente real con destinos extra, sin añadir pantallas ficticias a la app.
  await page.evaluate(async () => {
    const recursos = performance.getEntriesByType('resource').map((r) => r.name)
    const reactUrl = recursos.find((url) => /\/deps\/react\.js\?/.test(url))
    const domUrl = recursos.find((url) => /\/deps\/react-dom_client\.js\?/.test(url))
    if (!reactUrl || !domUrl) throw new Error('No se encontraron los módulos React del servidor de pruebas')
    const [reactModule, domModule, { default: Rueda }] = await Promise.all([
      import(reactUrl), import(domUrl), import('/src/app/RuedaNavegacion.tsx'),
    ])
    const React = reactModule.default ?? reactModule
    const { createRoot } = domModule.default ?? domModule
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const destinos = ['Inicio', 'Nutrición', 'Gym', 'Ajustes', 'Notas', 'Medidas'].map((label, i) => ({ key: `seccion-${i}`, label, icon: 'plus' }))
    const cerrar = () => { root.unmount(); host.remove() }
    window.__menuFuturo = null
    root.render(React.createElement('div', { role: 'dialog', 'aria-label': 'Destinos futuros', className: 'fan-dialog', style: { '--menu-origin-x': `${innerWidth / 2}px`, '--menu-origin-y': `${innerHeight - 40}px` } },
      React.createElement(Rueda, { destinos, actual: 'seccion-4', onClose: cerrar, onElegir: (key) => { window.__menuFuturo = key; cerrar() } })))
  })
  const menu = page.getByRole('dialog', { name: 'Destinos futuros', exact: true })
  await menu.getByText('2 de 2', { exact: true }).waitFor()
  assert.equal(await menu.locator('[aria-current="page"]').getAttribute('aria-label'), 'Notas')
  assert.equal(await menu.getByRole('button', { name: 'Más destinos', exact: true }).isDisabled(), true)
  await menu.getByRole('button', { name: 'Destinos anteriores', exact: true }).click()
  await menu.getByText('1 de 2', { exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Inicio')
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Inicio')
  assert.equal(await menu.getByRole('button', { name: 'Destinos anteriores', exact: true }).isDisabled(), true)
  await menu.getByRole('button', { name: 'Más destinos', exact: true }).click()
  await menu.getByText('2 de 2', { exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Notas')
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Notas')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Medidas')
  await page.keyboard.press('Space')
  await menu.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__menuFuturo), 'seccion-5')
  assert.equal(await page.locator('[data-app-shell]').evaluate((el) => el.inert), false)
}

async function main() {
  fs.mkdirSync(salida, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const resultados = []
  try {
    for (const width of [320, 375, 430]) for (const colorScheme of ['light', 'dark']) for (const reducedMotion of ['reduce', 'no-preference']) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme, reducedMotion })
      try {
        await context.route('**/world.openfoodfacts.org/**', (route) => route.abort())
        const page = await context.newPage()
        const errores = []
        page.on('pageerror', (e) => errores.push(e.message))
        await page.goto(ORIGEN)
        await page.getByRole('heading', { name: /Buenos|Buenas/ }).waitFor()
        await page.evaluate(async () => {
          const s = await import('/src/shared/db/settings.ts'); await s.ensureSettings()
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const d = await import('/src/shared/lib/dates.ts')
          await r.guardarComida({ fecha: d.todayISO(), comida: 'comida', items: [{ nombre: 'Alimento de prueba', gramos: 100, kcal100: 113, prot100: 6, carb100: 9, grasa100: 6, fuenteSiNuevo: 'manual' }] })
        })
        const antes = await backup(page)
        let menu = await abrir(page, 'Inicio')
        const tag = `${width}-${colorScheme}-${reducedMotion}`
        await page.screenshot({ path: path.join(salida, `${tag}.png`) })
        await menu.getByRole('button', { name: 'Cerrar menú', exact: true }).click()
        await cerrado(page)
        menu = await abrir(page, 'Inicio')
        await page.keyboard.press('Escape'); await cerrado(page)
        menu = await abrir(page, 'Inicio')
        await page.goBack(); await cerrado(page)
        menu = await abrir(page, 'Inicio')
        await page.mouse.click(8, 8); await cerrado(page)
        menu = await abrir(page, 'Inicio')
        await menu.getByRole('button', { name: 'Inicio', exact: true }).focus()
        for (const [tecla, esperado] of [['ArrowRight', 'Nutrición'], ['ArrowDown', 'Gym'], ['ArrowRight', 'Ajustes'], ['ArrowRight', 'Inicio'], ['ArrowLeft', 'Ajustes'], ['ArrowUp', 'Gym'], ['End', 'Ajustes'], ['Home', 'Inicio']]) {
          await page.keyboard.press(tecla)
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), esperado)
        }
        // Tab no escapa de la capa: vuelve al primer destino.
        await menu.getByRole('button', { name: 'Cerrar menú', exact: true }).focus()
        await page.keyboard.press('Tab')
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Inicio')
        await page.keyboard.press('Shift+Tab')
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Cerrar menú')
        await menu.getByRole('button', { name: 'Nutrición', exact: true }).focus()
        await page.keyboard.press('Enter'); await cerrado(page)
        await page.getByRole('heading', { name: 'Nutrición', exact: true }).waitFor()
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        const scroll = await page.locator('main').evaluate((el) => { el.scrollTop = el.scrollHeight; return el.scrollTop })
        menu = await abrir(page, 'Nutrición')
        await page.keyboard.press('Escape'); await cerrado(page)
        assert.equal(await page.locator('main').evaluate((el) => el.scrollTop), scroll)
        assert.equal(await page.getByRole('radio', { name: 'Vista detallada', exact: true }).getAttribute('aria-checked'), 'true')
        for (const destino of ['Gym', 'Ajustes', 'Inicio', 'Nutrición']) {
          await navegar(page, destino)
          assert.equal(await page.locator('main').evaluate((el) => el.scrollTop), 0)
          menu = await abrir(page, destino)
          await page.keyboard.press('Escape'); await cerrado(page)
        }
        await futuros(page)
        assert.deepEqual(await backup(page), antes, 'navegar no cambia registros ni ajustes')
        assert.deepEqual(errores, [])
        resultados.push({ width, colorScheme, reducedMotion, correcto: true })
        console.log(`Menú radial: ${tag}: correcto`)
      } finally { await context.close() }
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify({ origen: ORIGEN, completado: resultados.length === 12, casos: resultados }, null, 2))
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
