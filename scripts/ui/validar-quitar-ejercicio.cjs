/* Regresión de quitar un ejercicio de una sesión. Solo fixtures y origen aislado. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-quitar-ejercicio'
const nombre = 'Press banca'
const largo = 'Mi ejercicio personalizado de core con un nombre bastante largo'
fs.mkdirSync(output, { recursive: true })

async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const value = await exportarBackup(); delete value.exportedAt
    return JSON.parse(JSON.stringify(value))
  })
}
async function geometry(page, tag) {
  const diagnostic = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    return {
      overflow: [...document.querySelectorAll('html,main,.exercise-panel')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('.exercise-panel button,[data-add-exercise]')].filter(visible).filter(e => {
        const r = e.getBoundingClientRect(); return r.height < 43.9 || r.width < 43.9
      }).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  if (diagnostic.overflow.length) console.log(await page.locator('main').evaluate(e => [...e.querySelectorAll('*')].filter(n => {
    const r = n.getBoundingClientRect(); return r.width && r.right > innerWidth + 1
  }).map(n => ({ tag: n.tagName, class: n.className, text: n.textContent?.slice(0, 60), width: n.getBoundingClientRect().width }))))
  assert.deepEqual(diagnostic, { overflow: [], targets: [] }, tag)
}
async function capture(page, tag) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-exercise-id="1"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
/** La papelera vive en el menú «…» del ejercicio; la acción se ejecuta al cerrarse el menú. */
async function abrirMenu(page, label) {
  await page.getByRole('button', { name: `Opciones de ${label}`, exact: true }).click()
  return page.getByRole('button', { name: `Quitar ${label} de este entreno`, exact: true })
}
async function quitar(page, id, label) {
  await (await abrirMenu(page, label)).click()
  await page.locator(`[data-exercise-id="${id}"]`).waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Deshacer', exact: true }).waitFor()
}
async function undo(page, id) {
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await page.locator(`[data-exercise-id="${id}"]`).waitFor()
  await page.waitForFunction(id => document.activeElement === document.querySelector(`[data-exercise-id="${id}"] h2`), id)
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'dark', large: true }, { width: 1440, theme: 'dark' })
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Registrar', exact: true }).waitFor()
        await page.evaluate(async largo => {
          const { db } = await import('/src/shared/db/db.ts')
          await db.transaction('rw', db.exercises, db.routines, db.workouts, db.sets, async () => {
            await db.exercises.bulkPut([
              { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps'] },
              { id: 2, nombre: 'Remo con barra', nombreNorm: 'remo con barra', primaryMuscles: ['espalda'], secondaryMuscles: ['biceps'] },
              { id: 3, nombre: largo, nombreNorm: largo.toLowerCase(), primaryMuscles: ['core'], secondaryMuscles: [] },
            ])
            await db.routines.put({ id: 1, nombre: 'Fuerza', exerciseIds: [1, 2, 3], createdAt: 100 })
            await db.workouts.bulkPut([
              { id: 1, inicio: Date.now() - 3600000, routineId: 1, ordenEjercicios: [2, 1, 3] },
              { id: 2, inicio: Date.now() - 86400000, fin: Date.now() - 83000000 },
            ])
            await db.sets.bulkPut([
              { id: 1, workoutId: 1, exerciseId: 1, reps: 8, peso: 60, rir: 0, orden: 0, createdAt: 100 },
              { id: 2, workoutId: 1, exerciseId: 1, reps: 12, peso: 20, tipo: 'calentamiento', rir: 3, orden: 1, createdAt: 101 },
              { id: 3, workoutId: 1, exerciseId: 2, reps: 10, peso: 40, orden: 0, createdAt: 102 },
              { id: 4, workoutId: 2, exerciseId: 1, reps: 10, peso: 50, orden: 0, createdAt: 1 },
            ])
          })
        }, largo)
        // Sin el selector de RIR al completar: este recorrido prueba la papelera.
        await page.evaluate(async () => { const { updateSettings } = await import('/src/shared/db/settings.ts'); await updateSettings({ rirAlCompletar: false }) })
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Entreno')
        await page.locator('[data-exercise-id="1"]').waitFor()
        await capture(page, `${tag}-activo`)
        await geometry(page, tag)
        await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
        const before = await backup(page)
        await quitar(page, 1, nombre)
        const removed = await backup(page)
        assert.deepEqual(removed.exercises, before.exercises)
        assert.deepEqual(removed.routines, before.routines)
        assert.deepEqual(removed.sets.filter(s => s.workoutId === 2), before.sets.filter(s => s.workoutId === 2))
        assert.deepEqual(removed.workouts.find(w => w.id === 1).ejerciciosOmitidos, [1])
        await page.waitForFunction(() => document.activeElement === document.querySelector('[data-exercise-id="3"] h2'))
        await undo(page, 1)
        assert.deepEqual(await backup(page), before, 'Deshacer restaura los datos exactos')
        assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).getAttribute('aria-pressed'), 'true')
        assert.deepEqual(await page.locator('[data-exercise-id]').evaluateAll(es => es.map(e => +e.dataset.exerciseId)), [2, 1, 3])

        if (tag === '375-dark') {
          // Fallo transaccional real: no se pierden series ni marcas; reintento disponible.
          await page.evaluate(() => {
            window.__originalPut = IDBObjectStore.prototype.put
            IDBObjectStore.prototype.put = function (...args) {
              if (this.name === 'workouts') throw new DOMException('Fallo sintético', 'QuotaExceededError')
              return window.__originalPut.apply(this, args)
            }
          })
          await (await abrirMenu(page, nombre)).click()
          await page.getByRole('alert').filter({ hasText: 'No se ha podido quitar el ejercicio.' }).waitFor()
          assert.deepEqual(await backup(page), before)
          assert.equal(await page.getByRole('button', { name: 'Desmarcar serie 1 de Press banca', exact: true }).getAttribute('aria-pressed'), 'true')
          await page.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut })
          // Dos llamadas en el mismo frame; una sola eliminación y un Deshacer íntegro.
          await (await abrirMenu(page, nombre)).evaluate(b => { b.click(); b.click() })
          await page.locator('[data-exercise-id="1"]').waitFor({ state: 'detached' })
          await undo(page, 1)
          assert.deepEqual(await backup(page), before)
          await quitar(page, 1, nombre)
          await page.reload(); await navegar(page, 'Entreno')
          await page.locator('[data-exercise-id="2"]').waitFor()
          assert.equal(await page.locator('[data-exercise-id="1"]').count(), 0, 'la omisión sobrevive a recargar')
          await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
          await page.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill(nombre)
          await page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true }).getByRole('button', { name: /^Press banca Pecho/ }).click()
          await page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true }).waitFor({ state: 'detached' })
          await page.locator('[data-exercise-id="1"]').waitFor()
          assert.equal((await backup(page)).workouts.find(w => w.id === 1).ejerciciosOmitidos, undefined)
        }

        await page.getByRole('button', { name: 'Terminar', exact: true }).click()
        await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
        await page.getByText('Sesión guardada en el historial', { exact: true }).waitFor()
        await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        await page.getByRole('list', { name: 'Entrenos terminados', exact: true }).getByRole('button').filter({ hasText: 'Fuerza' }).click()
        assert.equal(await page.getByRole('button', { name: /^Quitar .* de este entreno$/ }).count(), 0, 'el historial de lectura no borra')
        await page.getByRole('button', { name: 'Editar', exact: true }).click()
        await page.locator('[data-exercise-id="1"]').waitFor()
        const historical = await backup(page)
        await capture(page, `${tag}-historial`)
        await geometry(page, `${tag}-historial`)
        await quitar(page, 1, nombre)
        assert.equal((await backup(page)).workouts.find(w => w.id === 1).muscleSnapshot.exercises.some(e => e.exerciseId === 1), false)
        await undo(page, 1)
        assert.deepEqual(await backup(page), historical, 'Deshacer conserva la clasificación histórica')
        // También se puede quitar un ejercicio de rutina todavía sin series.
        await quitar(page, 3, largo)
        await quitar(page, 1, nombre)
        await quitar(page, 2, 'Remo con barra')
        await page.waitForFunction(() => document.activeElement?.matches('[data-add-exercise]'))
        assert.equal(await page.locator('[data-exercise-id]').count(), 0)
        await undo(page, 2)
        assert.deepEqual((await backup(page)).routines, before.routines)
        assert.deepEqual(errors, [], 'sin errores React/browser')
        reports.push({ tag, ok: true })
        console.log(`${tag}: OK`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(reports, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
