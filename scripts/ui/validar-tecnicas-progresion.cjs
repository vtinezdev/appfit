/* Ejecución, variantes, técnicas y propuestas. Solo origen de pruebas y datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-tecnicas-progresion'
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
fs.mkdirSync(output, { recursive: true })
async function datos(page) { return page.evaluate(async () => { const { exportarBackup } = await import('/src/shared/lib/backup.ts'); const b = await exportarBackup(); delete b.exportedAt; return JSON.parse(JSON.stringify(b)) }) }
async function check(page, tag) {
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[inert],[hidden]')
    return {
      overflow: [...document.querySelectorAll('html,main,.exercise-panel,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('.exercise-panel button,.exercise-panel select,[role=dialog] button,[role=dialog] select')].filter(visible).filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9 }).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(result, { overflow: [], targets: [] }, tag)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
async function tecnica(panel, page) {
  await panel.getByRole('button', { name: 'Opciones de serie 1 de Dominadas', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Serie 1 · Dominadas', exact: true })
  await sheet.getByRole('button', { name: 'Ejecución, agarre y técnica', exact: true }).click()
  return sheet
}
async function main() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['dark', 'light'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'dark', large: true }, { width: 1440, theme: 'dark' })
  const reports = []
  try { for (const c of cases) {
    const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
    if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== tag) continue
    const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
    try {
      const page = await context.newPage(), errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto('http://appfit-test.localhost:5173')
      await page.getByRole('button', { name: 'Menú', exact: true }).waitFor()
      await page.evaluate(async fixture => {
        const { importarBackup } = await import('/src/shared/lib/backup.ts'); await importarBackup(JSON.stringify(fixture))
        const { db } = await import('/src/shared/db/db.ts')
        await db.transaction('rw', db.exercises, db.routines, db.workouts, db.sets, async () => {
          await db.exercises.clear(); await db.routines.clear(); await db.workouts.clear(); await db.sets.clear()
          await db.exercises.bulkPut([
            { id: 1, nombre: 'Dominadas', nombreNorm: 'dominadas', grupo: 'Espalda', catalogId: 'appfit:dominadas' },
            { id: 2, nombre: 'Remo en máquina con apoyo y recorrido controlado', nombreNorm: 'remo propio', grupo: 'Espalda', primaryMuscles: ['espalda'] },
            { id: 3, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', catalogId: 'appfit:press-banca', progresion: { series: 2, repsMin: 8, repsMax: 12, incrementoKg: 2.5, rirMin: 1 } },
          ])
          const ahora = Date.now()
          await db.routines.put({ id: 1, nombre: 'Fuerza', exerciseIds: [1, 2] })
          await db.workouts.put({ id: 1, inicio: ahora - 3600000, routineId: 1 })
          await db.sets.bulkPut([{ id: 1, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: 0, createdAt: ahora }, { id: 2, workoutId: 1, exerciseId: 2, reps: 10, peso: 30, orden: 0, createdAt: ahora }])
          for (const id of [2, 3, 4]) {
            await db.workouts.put({ id, inicio: ahora - id * 86400000, fin: ahora - id * 86400000 + 3600000 })
            await db.sets.bulkPut([0, 1].map(orden => ({ id: id * 10 + orden, workoutId: id, exerciseId: 3, reps: 12, peso: 20, rir: 2, realizada: true, orden, createdAt: ahora - id * 86400000 + orden })))
          }
        })
      }, fixture)
      if (c.theme === 'light') await page.evaluate(() => { localStorage.setItem('appfit:theme', 'light'); document.documentElement.dataset.theme = 'light' })
      if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      await navegar(page, 'Entreno')
      const panel = page.locator('[data-exercise-id="1"]')
      await panel.getByRole('heading', { name: 'Dominadas' }).waitFor()
      await panel.getByRole('button', { name: /^Ejecución y agarre/ }).click()
      let sheet = page.getByRole('dialog', { name: 'Ejecución · Dominadas', exact: true })
      await sheet.getByRole('combobox', { name: 'Ejecución', exact: true }).selectOption('unilateral')
      await sheet.getByRole('combobox', { name: 'Orientación del agarre', exact: true }).selectOption('prono')
      await sheet.getByRole('combobox', { name: 'Anchura del agarre', exact: true }).selectOption('ancho')
      await sheet.getByRole('checkbox', { name: /Usar como ejecución habitual/ }).check()
      await check(page, `${tag}-ejecucion`)
      await sheet.getByRole('button', { name: 'Guardar ejecución', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      assert.equal((await datos(page)).sets.find(s => s.id === 1).peso, 0)
      await panel.getByRole('spinbutton', { name: 'Repeticiones, serie 1 de Dominadas', exact: true }).fill('8')
      await panel.getByRole('spinbutton', { name: 'Peso en kg, serie 1 de Dominadas', exact: true }).fill('15')
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      assert.equal((await datos(page)).sets.find(s => s.id === 1).realizada, true)
      sheet = await tecnica(panel, page)
      await sheet.getByRole('combobox', { name: 'Ejecución', exact: true }).selectOption('lados')
      await sheet.getByRole('checkbox', { name: 'Izquierda registrada', exact: true }).check()
      await sheet.getByRole('checkbox', { name: 'Derecha registrada', exact: true }).check()
      for (const [lado, reps, kg] of [['izquierda', '8', '20'], ['derecha', '6', '15']]) {
        await sheet.getByRole('textbox', { name: `Reps tramo inicial ${lado}`, exact: true }).fill(reps)
        await sheet.getByRole('textbox', { name: `Kg tramo inicial ${lado}`, exact: true }).fill(kg)
        await sheet.getByRole('combobox', { name: `RIR tramo inicial ${lado}`, exact: true }).selectOption('1')
      }
      await sheet.getByRole('combobox', { name: 'Fase de la repetición', exact: true }).selectOption('negativa')
      await sheet.getByRole('textbox', { name: 'Segundos de descenso', exact: true }).fill('3')
      await sheet.getByRole('button', { name: 'Añadir bajada', exact: true }).click()
      const bajada = sheet.getByRole('region', { name: 'Bajadas de dropset', exact: true })
      await bajada.getByRole('checkbox', { name: 'Izquierda registrada', exact: true }).check()
      await bajada.getByRole('textbox', { name: 'Reps bajada 1 izquierda', exact: true }).fill('6')
      await bajada.getByRole('textbox', { name: 'Kg bajada 1 izquierda', exact: true }).fill('10')
      await check(page, `${tag}-tecnica`)
      if (tag === '375-dark') {
        await page.evaluate(async () => { const { db } = await import('/src/shared/db/db.ts'); const original = db.sets.update.bind(db.sets); db.sets.update = (...args) => { db.sets.update = original; return Promise.reject(new Error('fallo sintético')) } })
        await sheet.getByRole('button', { name: 'Guardar técnica', exact: true }).click()
        await sheet.getByText('No se ha podido guardar la serie. Inténtalo de nuevo.', { exact: true }).waitFor()
        assert.equal(await sheet.getByRole('textbox', { name: 'Reps bajada 1 izquierda', exact: true }).inputValue(), '6')
      }
      await sheet.getByRole('button', { name: 'Guardar técnica', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).waitFor()
      let almacen = await datos(page), guardada = almacen.sets.find(s => s.id === 1)
      assert.deepEqual(guardada.lados, { izquierda: { reps: 8, peso: 20, rir: 1 }, derecha: { reps: 6, peso: 15, rir: 1 } })
      assert.equal(guardada.soloNegativas, true); assert.equal(guardada.bajadas.length, 1); assert.equal(guardada.realizada, false)
      // Cancelar elimina únicamente cambios del borrador.
      sheet = await tecnica(panel, page)
      await sheet.getByRole('button', { name: 'Quitar bajada 1', exact: true }).click()
      await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      assert.deepEqual((await datos(page)).sets.find(s => s.id === 1), guardada)
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      const antes = (await datos(page)).sets.find(s => s.id === 1)
      await panel.getByRole('button', { name: 'Quitar Dominadas de este entreno', exact: true }).click()
      await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      assert.deepEqual((await datos(page)).sets.find(s => s.id === 1), antes)
      await check(page, `${tag}-activo`)
      await page.reload(); if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' }); await navegar(page, 'Entreno')
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
      let selector = page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true })
      await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('Press banca')
      await selector.getByText('Sugerencia de progresión disponible', { exact: true }).waitFor()
      await selector.getByRole('button', { name: /Press banca.*Sugerencia de progresión/ }).click(); await selector.waitFor({ state: 'detached' })
      const press = page.locator('[data-exercise-id="3"]')
      await press.getByRole('button', { name: 'Puedes probar 22,5 kg', exact: true }).click()
      sheet = page.getByRole('dialog', { name: 'Progresión · Press banca', exact: true })
      await check(page, `${tag}-progresion`)
      await sheet.getByRole('button', { name: 'Aplicar propuesta', exact: true }).click()
      await sheet.getByText('Propuesta aplicada en esta sesión.', { exact: true }).waitFor()
      const propuestos = (await datos(page)).sets.filter(s => s.exerciseId === 3 && s.workoutId === 1)
      assert.deepEqual(propuestos.map(s => [s.reps, s.peso, s.realizada]), [[8, 22.5, false], [8, 22.5, false]])
      await sheet.getByRole('button', { name: 'Cerrar', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      await press.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
      await press.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Terminar', exact: true }).click()
      await page.getByRole('dialog', { name: 'Terminar entreno', exact: true }).getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
      await page.getByRole('heading', { name: 'Sesión guardada', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()
      await page.getByRole('tab', { name: 'Historial', exact: true }).click()
      await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').filter({ hasText: 'Fuerza' }).click()
      await page.getByText('Solo negativas', { exact: false }).first().waitFor()
      await check(page, `${tag}-historial`)
      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).waitFor()
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
      await page.getByRole('button', { name: 'Listo', exact: true }).click()
      await page.getByRole('button', { name: 'Historial', exact: true }).click()
      await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
      await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('3')
      await page.locator('.recharts-line-curve').first().waitFor()
      assert.deepEqual(errors, [], 'sin errores de navegador')
      reports.push({ tag, ok: true }); console.log(`${tag}: OK`)
    } finally { await context.close() }
  } } finally { await browser.close() }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(reports, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
