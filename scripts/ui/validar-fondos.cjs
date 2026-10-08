/* Fondos compartidos: perfiles efímeros, datos sintéticos y scroll real, sin origen personal. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-fondos'
fs.mkdirSync(output, { recursive: true })
async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function seed(page) {
  await page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    const { CATALOGO_EJERCICIOS } = await import('/src/features/gym/lib/catalogoEjercicios.ts')
    const ids = ['press-banca', 'remo-barra', 'sentadilla', 'press-militar', 'curl-barra', 'extension-triceps-barra', 'hip-thrust', 'gemelos-maquina']
    await db.transaction('rw', db.workouts, db.exercises, db.sets, async () => {
      await db.workouts.put({ id: 1, inicio: Date.now() - 2100000 })
      let setId = 0
      for (const [index, id] of ids.entries()) {
        const c = CATALOGO_EJERCICIOS.find(e => e.id === `appfit:${id}`)
        if (!c) throw Error(id)
        await db.exercises.put({ id: index + 1, nombre: c.name, nombreNorm: c.name.toLowerCase(), grupo: 'General', catalogId: c.id, primaryMuscles: c.primaryMuscles, secondaryMuscles: c.secondaryMuscles })
        for (let orden = 0; orden < 4; orden++) await db.sets.put({ id: ++setId, workoutId: 1, exerciseId: index + 1, reps: orden === 3 ? 8 : 10, peso: [60, 40, 70, 30, 20, 25, 80, 40][index], orden, createdAt: Date.now() })
      }
    })
  })
}
async function ready(page) {
  await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function check(page) {
  const result = await page.evaluate(() => {
    const atmosphere = document.querySelector('.app-atmosphere')
    const before = getComputedStyle(atmosphere, '::before')
    return {
      horizontal: document.documentElement.scrollWidth > innerWidth,
      controls: atmosphere.querySelectorAll('button,input,a').length,
      backgroundPosition: getComputedStyle(atmosphere).position,
      fixed: [before.position, getComputedStyle(atmosphere).position].includes('fixed'),
      photoCount: atmosphere.querySelectorAll('img').length,
      filter: getComputedStyle(atmosphere.querySelector('img')).filter,
      scene: atmosphere.dataset.scene,
      ambient: before.backgroundImage,
      mask: getComputedStyle(atmosphere.querySelector('img')).maskImage,
      quiet: atmosphere.dataset.quiet,
    }
  })
  assert.equal(result.horizontal, false)
  assert.equal(result.controls, 0)
  assert.equal(result.fixed, false)
  assert.equal(result.photoCount, 1)
  assert.ok(result.ambient.includes('radial-gradient'), 'luz ambiental en toda la página')
  assert.ok(result.mask.includes('linear-gradient'), 'transición enmascarada')
  assert.ok(result.filter.includes('brightness'), 'tratamiento fotográfico compartido')
  return result
}
async function captureScroll(page, tag, chunks = false) {
  const main = page.locator('main')
  const geometry = await main.evaluate(e => ({ height: e.clientHeight, fullHeight: e.scrollHeight, max: e.scrollHeight - e.clientHeight }))
  assert.ok(geometry.max > 1500, 'sesión suficientemente larga para revisar el tramo inferior')
  const photo = page.locator('.app-atmosphere img')
  const still = await photo.boundingBox()
  for (const [label, top] of [['superior', 0], ['transicion', 500], ['intermedia', Math.round(geometry.max * 0.5)], ['inferior', geometry.max]]) {
    await main.evaluate((e, y) => e.scrollTo(0, y), top)
    await page.mouse.move(0, 0)
    assert.deepEqual(await photo.boundingBox(), still, 'la foto queda quieta mientras el contenido se desplaza')
    await page.screenshot({ path: `${output}/${tag}-${label}.png`, animations: 'disabled' })
  }
  if (chunks) {
    const frames = []
    for (let top = 0; top < geometry.fullHeight; top += geometry.height) {
      const actual = await main.evaluate((e, y) => { e.scrollTo(0, y); return e.scrollTop }, top)
      await page.mouse.move(0, 0)
      const file = `${tag}-tramo-${frames.length}.png`
      await main.screenshot({ path: `${output}/${file}`, animations: 'disabled' })
      frames.push({ top: actual, file })
      if (actual === geometry.max) break
    }
    await page.locator('nav').screenshot({ path: `${output}/${tag}-nav.png`, animations: 'disabled' })
    fs.writeFileSync(`${output}/${tag}-scroll.json`, JSON.stringify({ ...geometry, frames }, null, 2))
  }
  await main.evaluate(e => e.scrollTo(0, 0))
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const reports = []
  try {
    for (const width of [320, 375, 430, 1440]) for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173'); await ready(page); await seed(page)
        await page.evaluate(async () => {
          const r = await import('/src/features/nutricion/data/entriesRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          for (const comida of ['desayuno', 'comida', 'cena', 'snack']) for (let i = 0; i < 3; i++) {
            await r.guardarComida({ fecha: todayISO(), comida, nombrePlato: i === 0 ? 'Pollo con arroz y verduras' : undefined,
              items: [{ nombre: i === 0 ? 'Arroz' : i === 1 ? 'Yogur natural' : 'Manzana', gramos: 100, kcal100: 130, prot100: 4, carb100: 22, grasa100: 3, fuenteSiNuevo: 'manual', categoria: 'Otros' }] })
          }
        })
        const original = await backup(page)
        const id = `${width}-${theme}`
        for (const [label, scene] of [['Inicio', 'inicio'], ['Nutrición', 'nutricion'], ['Entreno', 'gym'], ['Perfil', 'inicio'], ['Referencias', 'nutricion'], ['Ajustes', 'inicio']]) {
          if (label !== 'Inicio') await navegar(page, label)
          if (label === 'Perfil' || label === 'Referencias' || label === 'Ajustes') await page.getByRole('heading', { name: label, exact: true }).waitFor()
          if (label === 'Entreno') await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).waitFor()
          if (label === 'Nutrición') await page.locator('[data-comida="desayuno"]').waitFor()
          await page.waitForFunction(() => { const i = document.querySelector('.app-atmosphere img'); return i?.complete && i.naturalWidth > 0 })
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          const result = await check(page)
          assert.equal(result.scene, scene)
          assert.equal(result.quiet, String(label === 'Referencias' || label === 'Ajustes'))
          const src = await page.locator('.app-atmosphere img').getAttribute('src')
          assert.equal(src, `/images/atmosferas/${scene}${theme === 'light' ? '-claro' : ''}.webp`)
          // La decoración no participa en geometría ni en texto/controles de producto.
          const geometry = await page.locator('.app-view').boundingBox()
          const content = await page.locator('.app-view').innerText()
          await page.locator('.app-atmosphere').evaluate(e => e.style.display = 'none')
          assert.deepEqual(await page.locator('.app-view').boundingBox(), geometry)
          assert.equal(await page.locator('.app-view').innerText(), content)
          await page.locator('.app-atmosphere').evaluate(e => e.style.removeProperty('display'))
          await page.locator('main').evaluate(e => e.scrollTo(0, 0)); await page.mouse.move(0, 0)
          await page.screenshot({ path: `${output}/${id}-${label}-superior.png`, animations: 'disabled' })
          if (label === 'Entreno') await captureScroll(page, `${id}-Gym`, width === 375)
          else {
            await page.locator('main').evaluate(e => e.scrollTo(0, e.scrollHeight))
            await page.screenshot({ path: `${output}/${id}-${label}-inferior.png`, animations: 'disabled' })
          }
          assert.deepEqual(await backup(page), original, 'fondos/navegación/scroll no escriben registros')
        }
        await navegar(page, 'Nutrición')
        await page.getByRole('radio', { name: 'Vista detallada', exact: true }).click()
        await check(page)
        await page.screenshot({ path: `${output}/${id}-nutrientes.png`, animations: 'disabled' })
        for (const sub of ['Resumen', 'Alimentos', 'Diario']) {
          await page.getByRole('tab', { name: sub, exact: true }).click(); await check(page)
        }
        // Menu/selector mantienen las capas; cambiar el tema sustituye una sola imagen.
        await navegar(page, 'Entreno')
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        const selector = page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true })
        await selector.waitFor()
        await page.keyboard.press('Escape'); await selector.waitFor({ state: 'detached' })
        await page.evaluate(async theme => { const { setThemePref } = await import('/src/shared/design/theme.ts'); setThemePref(theme === 'dark' ? 'light' : 'dark') }, theme)
        await page.waitForFunction(theme => document.querySelector('.app-atmosphere img').getAttribute('src').includes('-claro') === (theme === 'dark'), theme)
        await check(page)
        await page.emulateMedia({ forcedColors: 'active' })
        assert.equal(await page.locator('.app-atmosphere').evaluate(e => getComputedStyle(e).display), 'none')
        await context.setOffline(true)
        assert.deepEqual(await backup(page), original)
        assert.deepEqual(errors, [])
        reports.push({ width, theme }); console.log('PASS', width, theme)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify({ cases: reports, scope: 'todas las secciones, claro/oscuro', data: 'synthetic' }, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
