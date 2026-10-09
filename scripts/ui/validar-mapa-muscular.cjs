/* Datos efímeros: cierre real, persistencia y lectura del mapa en el origen aislado. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-mapa-muscular'
fs.mkdirSync(output, { recursive: true })
async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const result = await exportarBackup(); delete result.exportedAt
    return JSON.parse(JSON.stringify(result))
  })
}
async function check(page, name) {
  const diagnostic = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    return {
      overflow: [...document.querySelectorAll('html,[role=dialog],.muscle-map')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('button')].filter(visible).filter(e => e.getBoundingClientRect().height < 43.9).map(e => e.textContent),
      splitWords: [...document.querySelectorAll('.muscle-level')].filter(visible).flatMap(e => {
        const node = e.firstChild
        if (!node || node.nodeType !== Node.TEXT_NODE) return []
        return [...node.textContent.matchAll(/\S+/g)].filter(m => {
          const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length)
          return range.getClientRects().length > 1
        }).map(m => m[0])
      }),
    }
  })
  assert.deepEqual(diagnostic, { overflow: [], targets: [], splitWords: [] }, name)
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
}
async function levels(page) {
  return page.getByRole('region', { name: 'Mapa muscular', exact: true }).locator('g[data-muscle]').evaluateAll(es => es.map(e => [e.dataset.muscle, e.dataset.level]))
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'dark', large: true }, { width: 430, theme: 'light', forced: true })
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}${c.forced ? '-contraste' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, reducedMotion: 'reduce', forcedColors: c.forced ? 'active' : 'none', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          const { CATALOGO_EJERCICIOS } = await import('/src/features/gym/lib/catalogoEjercicios.ts')
          const names = ['Press banca', 'Remo con barra', 'Sentadilla', 'Flexiones']
          const exercises = names.map((nombre, i) => {
            const cat = CATALOGO_EJERCICIOS.find(e => e.name === nombre)
            if (!cat) throw Error(nombre)
            return { id: i + 1, nombre, nombreNorm: nombre.toLowerCase(), catalogId: cat.id, primaryMuscles: cat.primaryMuscles, secondaryMuscles: cat.secondaryMuscles }
          })
          exercises.push({ id: 5, nombre: 'Mi ejercicio de core personalizado con un nombre bastante largo', nombreNorm: 'core personalizado', primaryMuscles: ['core'], secondaryMuscles: [] })
          exercises.push({ id: 6, nombre: 'Ejercicio antiguo sin clasificación', nombreNorm: 'antiguo', primaryMuscles: [], secondaryMuscles: [] })
          await db.transaction('rw', db.exercises, db.workouts, db.sets, async () => {
            await db.exercises.bulkPut(exercises)
            await db.workouts.put({ id: 1, inicio: Date.now() - 4080000 })
            let id = 0
            for (const [exerciseId, count, reps, peso] of [[1, 4, 8, 60], [2, 2, 10, 40], [3, 3, 10, 80], [4, 2, 12, 0], [5, 1, 8, 0], [6, 1, 8, 20]]) {
              for (let orden = 0; orden < count; orden++) await db.sets.put({ id: ++id, workoutId: 1, exerciseId, reps, peso, orden, createdAt: Date.now() + id })
            }
          })
        })
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Entreno')
        await page.getByRole('button', { name: 'Terminar', exact: true }).click()
        await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
        const map = page.getByRole('region', { name: 'Mapa muscular', exact: true })
        await map.waitFor()
        await map.evaluate(e => e.scrollIntoView({ block: 'start' }))
        await check(page, `${tag}-final`)
        assert.equal(await map.locator('svg.muscle-body').count(), 2)
        assert.equal(await map.locator('g[data-muscle="pecho"]').getAttribute('data-level'), '5')
        await map.getByText('Clasificación disponible en 5 de 6 ejercicios.', { exact: true }).waitFor()
        await map.getByRole('button', { name: 'Pecho Muy alto', exact: true }).click()
        await map.locator('li').filter({ hasText: /^Press banca/ }).first().waitFor()
        await map.locator('li').filter({ hasText: /^Flexiones/ }).first().waitFor()
        await check(page, `${tag}-detalle`)
        const originalLevels = await levels(page)
        const saved = await backup(page)
        assert.equal(saved.workouts[0].muscleSnapshot.version, 1)
        assert.equal(saved.workouts[0].muscleSnapshot.exercises.length, 6)
        await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').first().click()
        await map.waitFor()
        assert.deepEqual(await levels(page), originalLevels)
        await check(page, `${tag}-historial`)
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        assert.deepEqual(await backup(page), saved, 'leer historial no escribe')
        await page.reload()
        await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').first().click()
        await map.waitFor()
        assert.deepEqual(await levels(page), originalLevels, 'mapa reconstruido tras recargar')
        assert.deepEqual(await backup(page), saved)
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        // Fixture antiguo sin snapshot: modo de compatibilidad visible, sin migrar al leer.
        await page.evaluate(async () => { const { db } = await import('/src/shared/db/db.ts'); await db.workouts.add({ inicio: Date.now() - 60000, fin: Date.now() }) })
        await page.waitForFunction(() => document.querySelectorAll('ul[aria-label="Entrenos terminados"] button').length === 2)
        await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').last().click()
        await map.getByText('No hay series con repeticiones para calcular el mapa.', { exact: true }).waitFor()
        await check(page, `${tag}-vacio`)
        await map.getByRole('button', { name: 'Cómo se estima el trabajo', exact: true }).click()
        await map.getByText(/Sesión antigua:/).waitFor()
        assert.deepEqual(errors, [])
        reports.push(tag); console.log('PASS', tag)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify({ cases: reports, estados: reports.length * 4 }, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
