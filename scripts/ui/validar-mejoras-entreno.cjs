/* RIR, notas, curvas y carga: datos sintéticos, origen aislado, sin perfiles personales. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-mejoras-entreno'
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
fs.mkdirSync(output, { recursive: true })
const MODOS = { externa: 'Carga externa', corporal: 'Peso corporal', lastre: 'Corporal \\+ lastre', asistencia: 'Corporal asistido' }
/** RIR: la celda abre un selector de 0 a 5+; «Quitar RIR» lo deja sin dato. */
async function cambiarRir(scope, label, valor) {
  const page = scope.page ? scope.page() : scope
  const celda = scope.getByRole('button', { name: new RegExp(`^${label}: `) })
  await celda.click()
  const hoja = page.locator('[role=dialog]').last()
  if (valor === undefined) {
    const quitar = hoja.getByRole('button', { name: 'Quitar RIR', exact: true })
    if (await quitar.count()) await quitar.click(); else await page.keyboard.press('Escape')
  } else await hoja.getByRole('button', { name: new RegExp(`^RIR ${valor === 5 ? '5\\+' : valor}:`) }).click()
  await hoja.waitFor({ state: 'detached' })
  // La celda se actualiza cuando IndexedDB notifica la escritura.
  const esperado = valor === undefined ? 'RIR' : valor === 5 ? '5+' : String(valor)
  for (let i = 0; i < 30 && (await celda.textContent()).trim() !== esperado; i++) await page.waitForTimeout(100)
  assert.equal((await celda.textContent()).trim(), esperado)
}
/** Nota y papelera viven en el menú «…» del ejercicio. */
async function menu(page, opcion) {
  await page.getByRole('button', { name: 'Opciones de Dominadas', exact: true }).click()
  await page.locator('[role=dialog]').last().getByRole('button', { name: opcion }).click()
}
async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt; return JSON.parse(JSON.stringify(b))
  })
}
async function check(page, tag) {
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[inert],[hidden]')
    return {
      overflow: [...document.querySelectorAll('html,main,.exercise-panel,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('.exercise-panel button,.exercise-panel select,[role=dialog] button,fieldset button')].filter(visible).filter(e => {
        const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9
      }).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(result, { overflow: [], targets: [] }, tag)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
async function carga(page, modo, masa) {
  await page.getByRole('button', { name: /^Carga de Dominadas: / }).click()
  const sheet = page.getByRole('dialog', { name: 'Carga · Dominadas', exact: true })
  await sheet.getByRole('radio', { name: new RegExp(`^${MODOS[modo]}`) }).click()
  if (masa !== undefined) await sheet.getByRole('spinbutton', { name: 'Peso corporal usado', exact: true }).fill(masa)
  await sheet.getByRole('button', { name: 'Guardar carga', exact: true }).click()
  await sheet.waitFor({ state: 'detached' })
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['dark', 'light'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'dark', large: true }, { width: 1440, theme: 'dark' })
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== tag) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
        await page.evaluate(async fixture => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
          fixture.entries.forEach(e => { e.fecha = todayISO() })
          await importarBackup(JSON.stringify(fixture))
          const { db } = await import('/src/shared/db/db.ts')
          await db.transaction('rw', db.exercises, db.routines, db.workouts, db.sets, db.pesos, async () => {
            await db.exercises.clear(); await db.routines.clear(); await db.workouts.clear(); await db.sets.clear(); await db.pesos.clear()
            await db.exercises.bulkPut([
              { id: 1, nombre: 'Dominadas', nombreNorm: 'dominadas', grupo: 'Espalda', catalogId: 'appfit:dominadas', primaryMuscles: ['espalda'], equipment: ['corporal'] },
              { id: 2, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', catalogId: 'appfit:press-banca', primaryMuscles: ['pecho'] },
            ])
            await db.routines.put({ id: 1, nombre: 'Fuerza', exerciseIds: [1, 2] })
            const ahora = Date.now()
            await db.workouts.bulkPut([
              { id: 1, inicio: ahora - 3600000, routineId: 1 },
              { id: 2, inicio: ahora - 86400000 * 3, fin: ahora - 86400000 * 3 + 3600000, notasEjercicios: { 1: 'Controlar la bajada; agarre habitual' } },
              { id: 3, inicio: ahora - 86400000 * 2, fin: ahora - 86400000 * 2 + 3600000 },
            ])
            const series = [{ id: 1, workoutId: 1, exerciseId: 1, reps: 8, peso: 20, orden: 0, createdAt: ahora, rir: undefined }, { id: 2, workoutId: 1, exerciseId: 2, reps: 8, peso: 40, orden: 0, createdAt: ahora }]
            let id = 2
            for (const workoutId of [2, 3]) {
              for (const modoCarga of ['externa', 'corporal', 'lastre', 'asistencia']) series.push({ id: ++id, workoutId, exerciseId: 1, reps: 8 + workoutId, peso: modoCarga === 'corporal' ? 0 : 10 + workoutId, modoCarga, pesoCorporal: modoCarga === 'externa' ? undefined : 70, orden: 0, createdAt: workoutId })
              series.push({ id: ++id, workoutId, exerciseId: 2, reps: 8, peso: 40 + workoutId, orden: 0, createdAt: workoutId })
            }
            await db.sets.bulkPut(series)
            await db.pesos.bulkPut([{ id: 1, fecha: addDays(todayISO(), -1), kg: 75, createdAt: ahora }, { id: 2, fecha: addDays(todayISO(), 2), kg: 99, createdAt: ahora }])
          })
        }, fixture)
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Entreno')
        const rir = page.getByRole('button', { name: /^RIR, serie 1 de Dominadas: / })
        await rir.waitFor(); assert.equal(await rir.textContent(), 'RIR')
        if (!c.large) {
          const alineados = await rir.evaluate(e => {
            const row = e.closest('.series-row'), reps = row.children[1], kg = row.children[2], rir = row.children[3]
            const centro = e => { const r = e.getBoundingClientRect(); return r.y + r.height / 2 }
            const opciones = row.children[4]
            return Math.abs(centro(reps) - centro(rir)) < 1 && Math.abs(centro(kg) - centro(rir)) < 1 && Math.abs(centro(opciones) - centro(reps)) < 1
          })
          assert.equal(alineados, true, 'Reps, Kg, RIR y opciones en la misma fila')
          const menor = await rir.evaluate(e => {
            const row = e.closest('.series-row'), input = row.querySelector('input')
            return parseFloat(getComputedStyle(e).fontSize) < parseFloat(getComputedStyle(input).fontSize)
          })
          assert.equal(menor, true, 'RIR tiene menor tamaño de texto que reps/kg')
        }
        await check(page, `${tag}-fila-rir`)
        if (tag === '375-dark') {
          // Selector: un valor extremo, sin dato y fallo de escritura con error en la propia hoja.
          await cambiarRir(page, 'RIR, serie 1 de Dominadas', 5)
          await page.waitForFunction(async () => { const { db } = await import('/src/shared/db/db.ts'); return (await db.sets.get(1)).rir === 5 }, null, { timeout: 10000 })
          await cambiarRir(page, 'RIR, serie 1 de Dominadas', undefined)
          await page.waitForFunction(async () => { const { db } = await import('/src/shared/db/db.ts'); return (await db.sets.get(1)).rir === undefined }, null, { timeout: 10000 })
          await page.evaluate(() => { window.__rirPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...args) { if (this.name === 'sets') throw new DOMException('Fallo sintético', 'QuotaExceededError'); return window.__rirPut.apply(this, args) } })
          await rir.click()
          await page.locator('[role=dialog]').last().getByRole('button', { name: /^RIR 1:/ }).click()
          await page.locator('[role=dialog]').last().getByText('No se ha podido guardar el RIR. Inténtalo de nuevo.', { exact: true }).waitFor()
          await page.evaluate(() => { IDBObjectStore.prototype.put = window.__rirPut })
          await page.keyboard.press('Escape'); await page.locator('[role=dialog]').waitFor({ state: 'detached' })
          assert.equal((await backup(page)).sets.find(s => s.id === 1).rir, undefined)
        }
        // Completar abre el selector de RIR (ajuste por defecto).
        await page.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
        await page.locator('[role=dialog]').last().getByRole('button', { name: /^RIR 0:/ }).click()
        await page.locator('[role=dialog]').waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'RIR, serie 1 de Dominadas: 0', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).getAttribute('aria-pressed'), 'true')
        await carga(page, 'corporal')
        let data = await backup(page)
        assert.deepEqual(data.sets.find(s => s.id === 1), { ...data.sets.find(s => s.id === 1), peso: 0, modoCarga: 'corporal', pesoCorporal: 75, rir: 0 })
        await page.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Completar serie 1 de Dominadas', exact: true }).click()
        await carga(page, 'corporal')
        assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Dominadas', exact: true }).getAttribute('aria-pressed'), 'true', 'guardar el mismo modo no desmarca')
        await carga(page, 'asistencia', '')
        await page.getByRole('spinbutton', { name: 'Asistencia en kg, serie 1 de Dominadas', exact: true }).fill('20')
        await page.getByRole('spinbutton', { name: 'Asistencia en kg, serie 1 de Dominadas', exact: true }).blur()
        const asistida = (await backup(page)).sets.find(s => s.id === 1)
        assert.equal(asistida.pesoCorporal, undefined, 'se puede registrar sin masa corporal')
        assert.equal(asistida.modoCarga, 'asistencia')
        await carga(page, 'lastre', '75')
        await page.getByRole('spinbutton', { name: 'Lastre en kg, serie 1 de Dominadas', exact: true }).fill('10')
        await page.getByRole('spinbutton', { name: 'Lastre en kg, serie 1 de Dominadas', exact: true }).blur()
        await page.locator('[data-exercise-id="1"]').getByRole('button', { name: 'Añadir serie', exact: true }).click()
        await page.getByRole('spinbutton', { name: 'Lastre en kg, serie 2 de Dominadas', exact: true }).waitFor()
        assert.equal(await page.getByRole('spinbutton', { name: 'Lastre en kg, serie 2 de Dominadas', exact: true }).inputValue(), '10')
        await menu(page, /^Añadir nota/)
        const nota = page.getByRole('dialog', { name: 'Nota · Dominadas', exact: true })
        await nota.getByText('Controlar la bajada; agarre habitual', { exact: true }).waitFor()
        assert.equal(await nota.getByRole('textbox', { name: 'Nota de Dominadas', exact: true }).inputValue(), '', 'la nota anterior no se copia')
        await nota.getByRole('textbox', { name: 'Nota de Dominadas', exact: true }).fill('Agarre cómodo · pausa arriba')
        await check(page, `${tag}-nota`)
        if (tag === '375-dark') {
          const original = await backup(page)
          await page.evaluate(() => {
            window.__originalPut = IDBObjectStore.prototype.put
            IDBObjectStore.prototype.put = function (...args) {
              if (this.name === 'workouts') throw new DOMException('Fallo sintético', 'QuotaExceededError')
              return window.__originalPut.apply(this, args)
            }
          })
          await nota.getByRole('button', { name: 'Guardar nota', exact: true }).click()
          await nota.getByRole('alert').filter({ hasText: 'No se ha podido guardar la nota.' }).waitFor()
          assert.deepEqual(await backup(page), original)
          assert.equal(await nota.getByRole('textbox', { name: 'Nota de Dominadas', exact: true }).inputValue(), 'Agarre cómodo · pausa arriba')
          await page.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut })
        }
        await nota.getByRole('button', { name: 'Guardar nota', exact: true }).click(); await nota.waitFor({ state: 'detached' })
        const antes = await backup(page)
        await menu(page, 'Quitar Dominadas de este entreno')
        await page.locator('[data-exercise-id="1"]').waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await page.locator('[data-exercise-id="1"]').waitFor()
        assert.deepEqual(await backup(page), antes, 'Deshacer conserva nota y carga')
        await page.locator('[data-exercise-id="1"]').evaluate(e => e.scrollIntoView({ block: 'start' }))
        await check(page, `${tag}-activo`)
        await page.reload(); await navegar(page, 'Entreno')
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await page.getByRole('button', { name: /^Nota de Dominadas: / }).waitFor()
        assert.equal(await rir.textContent(), '0')
        await page.getByRole('button', { name: 'Terminar', exact: true }).click()
        await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
        await page.getByText('Sesión guardada en el historial', { exact: true }).waitFor()
        await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').filter({ hasText: 'Fuerza' }).click()
        await page.getByRole('heading', { name: 'Dominadas', exact: true }).waitFor()
        assert.ok(await page.getByText('Agarre cómodo · pausa arriba', { exact: true }).count())
        await page.getByRole('button', { name: 'Editar', exact: true }).click()
        await cambiarRir(page, 'RIR, serie 1 de Dominadas', undefined)
        await page.getByRole('button', { name: 'Listo', exact: true }).click()
        assert.equal((await backup(page)).sets.find(s => s.id === 1).rir, undefined)
        await page.getByRole('button', { name: 'Historial', exact: true }).click()
        await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
        await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('2')
        const sinCambios = await backup(page)
        await page.getByRole('region', { name: 'Volumen externo por sesión', exact: true }).waitFor()
        await page.getByRole('region', { name: 'Repeticiones por sesión', exact: true }).waitFor()
        await check(page, `${tag}-graficas-todas`)
        await page.getByRole('button', { name: 'Peso máximo', exact: true }).click()
        await page.getByRole('button', { name: '1RM estimado', exact: true }).click()
        await page.getByRole('button', { name: 'Volumen externo', exact: true }).click()
        await page.getByRole('button', { name: 'Repeticiones', exact: true }).click()
        await page.getByText('Selecciona una métrica', { exact: true }).waitFor()
        await page.getByRole('button', { name: '1RM estimado', exact: true }).click()
        await page.locator('.recharts-line-curve').waitFor()
        assert.equal(await page.locator('.recharts-line-curve').count(), 1)
        await check(page, `${tag}-progreso`)
        await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('1')
        await page.getByRole('combobox', { name: 'Tipo de carga en Progreso', exact: true }).selectOption('corporal')
        await page.getByRole('button', { name: 'Repeticiones', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: '1RM estimado', exact: true }).count(), 0)
        await page.getByRole('combobox', { name: 'Tipo de carga en Progreso', exact: true }).selectOption('asistencia')
        await page.getByRole('button', { name: 'Asistencia mínima', exact: true }).waitFor()
        assert.deepEqual(await backup(page), sinCambios, 'las gráficas no escriben datos')
        await navegar(page, 'Nutrición'); await page.getByRole('tab', { name: 'Resumen', exact: true }).click()
        const resumen = await backup(page)
        await page.getByRole('button', { name: 'Consumo', exact: true }).click()
        await page.locator('.recharts-reference-line line').waitFor({ state: 'attached' })
        assert.ok(Number.isFinite(Number(await page.locator('.recharts-reference-line line').getAttribute('y1'))))
        assert.equal(await page.locator('.recharts-bar-rectangle').count(), 0)
        await page.getByRole('button', { name: 'Objetivo', exact: true }).click()
        await page.getByText('Selecciona una métrica', { exact: true }).waitFor()
        await check(page, `${tag}-nutricion`)
        await page.getByRole('button', { name: 'Consumo', exact: true }).click()
        assert.deepEqual(await backup(page), resumen)
        assert.deepEqual(errors, [], 'sin errores de navegador')
        reports.push({ tag, ok: true }); console.log(`${tag}: OK`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(reports, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
