/* Registro de series: tipo en el número, bajadas y lados como filas, RIR por selector, variante en la cabecera y progresión. Solo origen de pruebas y datos sintéticos. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-tecnicas-progresion'
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
fs.mkdirSync(output, { recursive: true })
async function datos(page) { return page.evaluate(async () => { const { exportarBackup } = await import('/src/shared/lib/backup.ts'); const b = await exportarBackup(); delete b.exportedAt; return JSON.parse(JSON.stringify(b)) }) }
async function serie(page, id) { return (await datos(page)).sets.find(s => s.id === id) }
async function hasta(page, id, f, msg) {
  for (let i = 0; i < 50; i++) { const s = await serie(page, id); if (f(s)) return s; await page.waitForTimeout(100) }
  assert.fail(`${msg}: ${JSON.stringify(await serie(page, id))}`)
}
async function check(page, tag) {
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[inert],[hidden]')
    return {
      overflow: [...document.querySelectorAll('html,main,.exercise-panel,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('.exercise-panel button,.exercise-panel input,[role=dialog] button')].filter(visible).filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9 }).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(result, { overflow: [], targets: [] }, tag)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
const hoja = page => page.locator('[role=dialog]').last()
async function cerrar(page) { const d = hoja(page); await page.keyboard.press('Escape'); await d.waitFor({ state: 'detached' }) }
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
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
      await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
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
          await db.sets.bulkPut([
            { id: 1, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: 0, createdAt: ahora },
            { id: 2, workoutId: 1, exerciseId: 2, reps: 10, peso: 30, orden: 0, createdAt: ahora },
            { id: 4, workoutId: 1, exerciseId: 2, reps: 10, peso: 30, orden: 1, createdAt: ahora + 1 },
          ])
          for (const id of [2, 3, 4]) {
            await db.workouts.put({ id, inicio: ahora - id * 86400000, fin: ahora - id * 86400000 + 3600000 })
            await db.sets.bulkPut([0, 1].map(orden => ({ id: id * 10 + orden, workoutId: id, exerciseId: 3, reps: 12, peso: 20, rir: 2, realizada: true, orden, createdAt: ahora - id * 86400000 + orden })))
          }
        })
      }, fixture)
      if (c.theme === 'light') await page.evaluate(() => { localStorage.setItem('appfit:theme', 'light'); document.documentElement.dataset.theme = 'light' })
      if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      await navegar(page, 'Entreno')
      const panel = page.locator('[data-exercise-id="1"]'), remo = page.locator('[data-exercise-id="2"]')
      await panel.getByRole('heading', { name: 'Dominadas' }).waitFor()
      await check(page, `${tag}-fila`)

      // Variante en la cabecera: unilateral por lados y agarre con chips; vacía los valores con el nuevo significado.
      await panel.getByRole('button', { name: /^Ejecución de Dominadas:/ }).click()
      let sheet = hoja(page)
      await sheet.getByRole('radio', { name: 'Unilateral', exact: true }).click()
      await sheet.getByRole('radio', { name: 'Cada lado', exact: true }).click()
      await sheet.getByRole('button', { name: 'Prono', exact: true }).click()
      await sheet.getByRole('button', { name: 'Ancho', exact: true }).click()
      await sheet.getByRole('checkbox', { name: /Recordar para próximas sesiones/ }).check()
      await check(page, `${tag}-variante`)
      await sheet.getByRole('button', { name: 'Guardar variante', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      let s = await hasta(page, 1, s => s.ejecucion === 'lados', 'variante por lados')
      assert.deepEqual(s.agarre, { orientacion: 'prono', anchura: 'ancho' }); assert.equal(s.peso, 0)
      assert.deepEqual((await datos(page)).exercises.find(e => e.id === 1).ejecucionHabitual, { ejecucion: 'lados', agarre: { orientacion: 'prono', anchura: 'ancho' } })
      assert.ok(await panel.getByRole('button', { name: 'Agarre de Dominadas: Prono · Ancho', exact: true }).isVisible())

      // Lados como filas hijas editables, con RIR propio y lado ausente vacío.
      for (const [lado, reps, kg] of [['izquierda', '8', '10'], ['derecha', '6', '5']]) {
        await panel.getByRole('spinbutton', { name: `Repeticiones ${lado}, serie 1 de Dominadas`, exact: true }).fill(reps)
        await panel.getByRole('spinbutton', { name: `Kg ${lado}, serie 1 de Dominadas`, exact: true }).fill(kg)
      }
      await panel.getByRole('button', { name: 'RIR izquierda, serie 1 de Dominadas: sin dato', exact: true }).click()
      await hoja(page).getByRole('button', { name: /^RIR 1:/ }).click()
      s = await hasta(page, 1, s => s.lados?.derecha?.peso === 5 && s.lados.izquierda?.rir === 1, 'lados')
      assert.deepEqual(s.lados, { izquierda: { reps: 8, peso: 10, rir: 1 }, derecha: { reps: 6, peso: 5 } })
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      assert.equal(await page.locator('[role=dialog]').count(), 0, 'lados distintos: el RIR se anota por lado, sin selector global')
      await hasta(page, 1, s => s.realizada === true, 'confirmada')

      // Tipo en el número: dropset con bajadas en línea, bajada lenta; cambiar tipo deja una sola técnica.
      await remo.getByRole('button', { name: /^Opciones de serie 1 de Remo/ }).click()
      sheet = hoja(page)
      await sheet.getByRole('radio', { name: /^D · Dropset/ }).click()
      await hasta(page, 2, s => s.bajadas?.length === 1 && s.bajadas[0].peso === 30, 'dropset con primera bajada copiada')
      await sheet.getByRole('radio', { name: '4 s', exact: true }).click()
      await hasta(page, 2, s => s.excentricaSeg === 4, 'bajada lenta')
      await check(page, `${tag}-serie`)
      if (tag === '375-dark') {
        await page.evaluate(async () => { const { db } = await import('/src/shared/db/db.ts'); const original = db.sets.update.bind(db.sets); db.sets.update = () => { db.sets.update = original; return Promise.reject(new Error('fallo sintético')) } })
        await sheet.getByRole('radio', { name: '5 s', exact: true }).click()
        await sheet.getByText('No se ha podido guardar la serie. Inténtalo de nuevo.', { exact: true }).waitFor()
        assert.equal((await serie(page, 2)).excentricaSeg, 4, 'el fallo no escribe')
      }
      await cerrar(page)
      await remo.getByRole('spinbutton', { name: /^Kg bajada 1, serie 1 de Remo/ }).fill('20')
      await remo.getByRole('button', { name: 'Añadir bajada', exact: true }).click()
      s = await hasta(page, 2, s => s.bajadas?.length === 2 && s.bajadas[1].peso === 20, 'segunda bajada')
      assert.ok(await remo.getByText('Bajada 4 s').isVisible())
      await check(page, `${tag}-dropset`)
      const conDos = await serie(page, 2)
      await remo.getByRole('button', { name: /^Quitar bajada 2, serie 1 de Remo/ }).click()
      await hasta(page, 2, s => s.bajadas.length === 1, 'quitar bajada')
      await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
      await hasta(page, 2, s => JSON.stringify(s.bajadas) === JSON.stringify(conDos.bajadas), 'deshacer bajada en su posición')
      await remo.getByRole('button', { name: /^Quitar bajada 2, serie 1 de Remo/ }).click()
      await hasta(page, 2, s => s.bajadas.length === 1, 'quitar bajada de nuevo')
      await remo.getByRole('button', { name: /^Opciones de serie 2 de Remo/ }).click()
      await hoja(page).getByRole('radio', { name: /^N · Negativas/ }).click()
      await hasta(page, 4, s => s.soloNegativas === true && !s.bajadas && !s.tipo, 'negativas')
      await cerrar(page)
      assert.ok(await remo.getByRole('button', { name: /^Opciones de serie 2 de Remo.*\(negativas\)$/ }).isVisible())

      // RIR al completar: se abre el selector; elegir no desmarca y «Quitar RIR» deja sin dato.
      await remo.getByRole('button', { name: /^Completar serie 2 de Remo/ }).click()
      await hoja(page).getByRole('button', { name: /^RIR 0:/ }).waitFor()
      await check(page, `${tag}-rir`)
      await hoja(page).getByRole('button', { name: /^RIR 0:/ }).click()
      await hasta(page, 4, s => s.rir === 0 && s.realizada === true, 'rir al completar')
      await remo.getByRole('button', { name: /^RIR, serie 2 de Remo.*: 0$/ }).click()
      await hoja(page).getByRole('button', { name: 'Quitar RIR', exact: true }).click()
      await hasta(page, 4, s => s.rir === undefined && s.realizada === true, 'quitar rir')

      // Quitar desde el menú del ejercicio y Deshacer conserva toda la semántica.
      const antes = await serie(page, 2)
      await remo.getByRole('button', { name: /^Opciones de Remo/ }).click()
      await page.getByRole('button', { name: /^Quitar Remo .* de este entreno$/ }).click()
      await remo.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
      await remo.waitFor()
      assert.deepEqual(await serie(page, 2), antes)
      await page.reload(); if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' }); await navegar(page, 'Entreno')
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      assert.ok(await remo.getByRole('spinbutton', { name: /^Kg bajada 1, serie 1 de Remo/ }).isVisible(), 'las bajadas sobreviven a recargar')

      // Progresión: el aviso aparece en la cabecera solo con propuesta; Aplicar sigue siendo explícito.
      await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
      const selector = page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true })
      await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('Press banca')
      await selector.getByText('Sugerencia de progresión disponible', { exact: true }).waitFor()
      await selector.getByRole('button', { name: /Press banca.*Sugerencia de progresión/ }).click(); await selector.waitFor({ state: 'detached' })
      const press = page.locator('[data-exercise-id="3"]')
      await press.getByRole('button', { name: 'Sugerencia de progresión para Press banca: Puedes probar 22,5 kg', exact: true }).click()
      sheet = page.getByRole('dialog', { name: 'Progresión · Press banca', exact: true })
      await check(page, `${tag}-progresion`)
      await sheet.getByRole('button', { name: 'Aplicar propuesta', exact: true }).click()
      await sheet.getByText('Propuesta aplicada en esta sesión.', { exact: true }).waitFor()
      const propuestos = (await datos(page)).sets.filter(s => s.exerciseId === 3 && s.workoutId === 1)
      assert.deepEqual(propuestos.map(s => [s.reps, s.peso, s.realizada]), [[8, 22.5, false], [8, 22.5, false]])
      await sheet.getByRole('button', { name: 'Cerrar', exact: true }).click(); await sheet.waitFor({ state: 'detached' })
      assert.equal(await press.getByRole('button', { name: /^Sugerencia de progresión/ }).count(), 0, 'una propuesta resuelta no se vuelve a anunciar')
      await press.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
      await hoja(page).getByRole('button', { name: /^RIR 2:/ }).click()
      await press.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Terminar', exact: true }).click()
      await page.getByRole('dialog', { name: 'Terminar entreno', exact: true }).getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
      await page.getByText('Sesión guardada en el historial', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()
      await page.getByRole('tab', { name: 'Historial', exact: true }).click()
      await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').filter({ hasText: 'Fuerza' }).click()
      await page.getByText('Solo negativas', { exact: false }).first().waitFor()
      await check(page, `${tag}-historial`)
      await page.getByRole('button', { name: 'Editar', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).waitFor()
      await panel.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
      await panel.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).waitFor()
      assert.equal(await page.locator('[role=dialog]').count(), 0, 'confirmar en el historial no pregunta el RIR')
      await check(page, `${tag}-editor`)
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
