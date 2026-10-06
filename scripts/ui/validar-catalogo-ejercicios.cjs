/* Catálogo Gym: perfiles efímeros y fixtures, nunca el origen de datos personales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-catalogo-ejercicios'
fs.mkdirSync(output, { recursive: true })
const reports = []
async function snapshot(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const value = await exportarBackup(); delete value.exportedAt
    return JSON.parse(JSON.stringify(value))
  })
}
const row = (page, name) => page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true }).locator('li').filter({ has: page.getByText(name, { exact: true }) }).getByRole('button')
async function check(page, name) {
  await page.evaluate(() => document.fonts.ready)
  const diagnostic = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[inert],[hidden]')
    return {
      overflow: [...document.querySelectorAll('html,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('button')].filter(visible).filter(e => e.getBoundingClientRect().height < 43.9).map(e => e.textContent),
      inputs: [...document.querySelectorAll('input,select')].filter(visible).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.tagName),
    }
  })
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
  if (diagnostic.overflow.length) console.log(name, await page.evaluate(() => [...document.querySelectorAll('[role=dialog]:not([inert]) *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ tag: e.tagName, text: e.textContent?.slice(0, 80), class: e.className })).slice(0, 8)))
  assert.deepEqual(diagnostic, { overflow: [], targets: [], inputs: [] }, name)
  reports.push(name)
}
async function main() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 1440, theme: 'light' }, { width: 375, theme: 'dark', large: true })
  try {
    for (const item of cases) {
      const tag = `${item.width}-${item.theme}${item.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: item.width, height: item.width === 320 ? 568 : 900 }, colorScheme: item.theme, reducedMotion: 'reduce', serviceWorkers: 'block' })
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
        await page.evaluate(async data => { const { importarBackup } = await import('/src/shared/lib/backup.ts'); await importarBackup(JSON.stringify(data)) }, fixture)
        if (item.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        const original = await snapshot(page)
        await navegar(page, 'Gym')
        await page.getByRole('tab', { name: 'Rutinas', exact: true }).click()
        await page.getByRole('button', { name: 'Nueva rutina', exact: true }).click()
        await page.getByRole('textbox', { name: 'Nombre de la rutina', exact: true }).fill('Catálogo test')
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        const selector = page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true })
        await selector.getByRole('heading', { name: 'Recientes', exact: true }).waitFor()
        assert.notEqual(await page.locator('input[aria-label="Buscar ejercicio"]').evaluate(e => document.activeElement === e), true, 'sin teclado automático')
        await check(page, `${tag}-recientes`)
        await selector.getByRole('button', { name: 'Pecho', exact: true }).click()
        await selector.getByRole('button', { name: 'Mancuernas', exact: true }).click()
        for (const n of ['Press con mancuernas', 'Press inclinado con mancuernas', 'Aperturas con mancuernas', 'Pullover con mancuerna']) await row(page, n).waitFor()
        await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('APERTURAS')
        await row(page, 'Aperturas con mancuernas').waitFor()
        assert.equal(await selector.getByRole('heading', { name: 'Recientes', exact: true }).count(), 0)
        assert.deepEqual(await snapshot(page), original, 'buscar, filtrar y abrir no escriben')
        if (item.width === 375 && item.theme === 'light') await page.setViewportSize({ width: 375, height: 430 })
        await check(page, `${tag}-filtros`)
        await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('press')
        await row(page, 'Press con mancuernas').click()
        await selector.waitFor({ state: 'detached' })
        if (item.width === 375 && item.theme === 'light') await page.setViewportSize({ width: 375, height: 900 })
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.getByRole('dialog', { name: 'Nueva rutina', exact: true }).waitFor({ state: 'detached' })
        await page.getByRole('button', { name: /Catálogo test/ }).click()
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('Mi remo personalizado de prueba con nombre largo')
        await selector.getByRole('button', { name: 'Crear ejercicio personalizado', exact: true }).click()
        const create = page.getByRole('dialog', { name: 'Ejercicio personalizado', exact: true })
        await create.getByRole('combobox', { name: 'Músculo principal', exact: true }).selectOption('espalda')
        await create.getByRole('combobox', { name: 'Equipamiento', exact: true }).selectOption('trx')
        await check(page, `${tag}-personalizado`)
        if (item.width === 375 && item.theme === 'light') {
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            const add = db.exercises.add.bind(db.exercises)
            db.exercises.add = (...args) => { db.exercises.add = add; return new Promise((resolve, reject) => { window.__rejectExercise = () => reject(new Error('Fallo simulado')) }) }
          })
          await create.getByRole('button', { name: 'Crear y añadir', exact: true }).click()
          await page.waitForFunction(() => typeof window.__rejectExercise === 'function')
          assert.equal(await create.getByRole('button', { name: 'Volver', exact: true }).isDisabled(), true)
          await page.keyboard.press('Escape')
          assert.equal(await create.count(), 1, 'no cerrar una escritura pendiente')
          await page.evaluate(() => window.__rejectExercise())
          await create.getByRole('alert').waitFor()
          assert.equal(await create.getByRole('textbox', { name: 'Nombre', exact: true }).inputValue(), 'Mi remo personalizado de prueba con nombre largo')
        }
        await create.getByRole('button', { name: 'Crear y añadir', exact: true }).click()
        await create.waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await page.getByRole('dialog', { name: 'Editar rutina', exact: true }).waitFor({ state: 'detached' })
        const saved = await snapshot(page)
        const routine = saved.routines.find(r => r.nombre === 'Catálogo test')
        assert.equal(routine.exerciseIds.length, 2)
        assert.equal(saved.exercises.find(e => e.id === routine.exerciseIds[1]).equipment[0], 'trx')
        assert.deepEqual(saved.sets, original.sets)
        for (const e of original.exercises) assert.deepEqual(saved.exercises.find(n => n.id === e.id), e)
        for (const r of original.routines) assert.deepEqual(saved.routines.find(n => n.id === r.id), r)
        await page.getByRole('tab', { name: 'Inicio', exact: true }).click()
        await page.getByRole('button', { name: 'Desde rutina', exact: true }).click()
        await page.getByRole('button', { name: 'Catálogo test', exact: true }).click()
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('press banca')
        await row(page, 'Press banca').click()
        await selector.waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).waitFor()
        const active = await snapshot(page)
        const newSets = active.sets.filter(s => !original.sets.some(old => old.id === s.id))
        assert.equal(newSets.length, 1)
        assert.equal(newSets[0].exerciseId, original.exercises.find(e => e.nombre === 'Press banca').id)
        await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
        await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await selector.getByRole('heading', { name: 'Recientes', exact: true }).waitFor()
        await check(page, `${tag}-sesion`)
        await page.keyboard.press('Escape'); await selector.waitFor({ state: 'detached' })
        assert.deepEqual(await snapshot(page), active)
        await page.reload()
        await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
        await navegar(page, 'Gym')
        await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).waitFor()
        assert.deepEqual(await snapshot(page), active)
        assert.deepEqual(errors, [])
        console.log('PASS', tag)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify({ estados: reports.length, reports }, null, 2))
    console.log('PASS', reports.length, 'estados de catálogo/rutinas/sesión')
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
