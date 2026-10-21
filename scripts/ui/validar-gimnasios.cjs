/* Regresión de gimnasios (ADR 054): historial de máquinas por gimnasio. Solo fixtures y origen aislado. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-gimnasios'
fs.mkdirSync(output, { recursive: true })

async function datos(page) {
  return page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    return { workouts: await db.workouts.toArray(), sets: await db.sets.toArray(), gimnasios: await db.gimnasios.toArray() }
  })
}
async function geometry(page, tag) {
  const diagnostic = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    return {
      horizontal: document.documentElement.scrollWidth > innerWidth,
      overflow: [...document.querySelectorAll('main,.exercise-panel,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('[role=dialog] button,[aria-label^="Gimnasio:"]')].filter(visible).filter(e => {
        const r = e.getBoundingClientRect(); return r.height < 43.9
      }).map(e => e.getAttribute('aria-label') || e.textContent),
      inputs: [...document.querySelectorAll('[role=dialog] input')].filter(visible).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length,
    }
  })
  assert.deepEqual(diagnostic, { horizontal: false, overflow: [], targets: [], inputs: 0 }, tag)
}
async function capture(page, tag) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
/** Abre el chip, crea (o elige) el gimnasio y lo usa. */
async function elegirGimnasio(page, actual, nombre, tag) {
  await page.getByRole('button', { name: `Gimnasio: ${actual}`, exact: true }).click()
  const hoja = page.getByRole('dialog', { name: 'Gimnasio', exact: true })
  await hoja.waitFor()
  const opcion = hoja.getByRole('radio', { name: new RegExp(`^${nombre}`) })
  if (!(await opcion.count())) {
    await hoja.getByRole('textbox', { name: 'Añadir gimnasio', exact: true }).fill(nombre)
    await hoja.getByRole('button', { name: 'Añadir', exact: true }).click()
    await hoja.getByRole('textbox', { name: 'Nombre', exact: true }).waitFor()
  } else await opcion.click()
  if (tag) { await capture(page, `${tag}-hoja`); await geometry(page, `${tag}-hoja`) }
  await hoja.getByRole('button', { name: 'Entrenar aquí', exact: true }).click()
  await hoja.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: `Gimnasio: ${nombre}`, exact: true }).waitFor()
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, serviceWorkers: 'block' })
      try {
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          const { updateSettings } = await import('/src/shared/db/settings.ts')
          await updateSettings({ rirAlCompletar: false })
          const ayer = Date.now() - 86400000
          await db.transaction('rw', db.exercises, db.routines, db.workouts, db.sets, async () => {
            await db.exercises.bulkPut([
              { id: 1, nombre: 'Prensa', nombreNorm: 'prensa', grupo: 'Pierna', primaryMuscles: ['cuadriceps'], secondaryMuscles: [], equipment: ['maquina'] },
              { id: 2, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'], secondaryMuscles: [], equipment: ['barra'] },
            ])
            await db.routines.put({ id: 1, nombre: 'Pierna y pecho', exerciseIds: [1, 2], objetivos: { 1: { series: 2, repsMin: 8, repsMax: 12 }, 2: { series: 1, repsMin: 5, repsMax: 5 } } })
            await db.workouts.put({ id: 1, inicio: ayer, fin: ayer + 3600000, routineId: 1 })
            await db.sets.bulkPut([
              { id: 1, workoutId: 1, exerciseId: 1, reps: 10, peso: 120, rir: 1, orden: 0, createdAt: ayer, realizada: true },
              { id: 2, workoutId: 1, exerciseId: 2, reps: 5, peso: 100, orden: 0, createdAt: ayer + 1, realizada: true },
            ])
          })
        })
        await navegar(page, 'Entreno')
        await page.getByRole('heading', { name: 'Tu entreno', exact: true }).waitFor()
        await elegirGimnasio(page, 'Gimnasio habitual', 'Gym Playa del Arenal con nombre largo', tag)
        await page.getByRole('button', { name: 'Empezar Pierna y pecho', exact: true }).click()
        const nota = page.getByText('Primera vez en Gym Playa del Arenal con nombre largo: busca RIR 1 en 10 repeticiones. En tu habitual: 10 repeticiones con 120 kg.', { exact: true })
        await nota.waitFor()
        await capture(page, `${tag}-activo`)
        await geometry(page, `${tag}-activo`)
        let d = await datos(page)
        const playa = d.gimnasios[0].id
        const activo = d.workouts.find(w => w.fin === undefined)
        assert.equal(activo.gimnasioId, playa)
        const delActivo = d.sets.filter(s => s.workoutId === activo.id)
        assert.deepEqual(delActivo.filter(s => s.exerciseId === 1).map(s => [s.reps, s.peso, s.gimnasioId]), [[10, 0, playa], [10, 0, playa]], 'máquina: reps del habitual, sin kg')
        assert.deepEqual(delActivo.filter(s => s.exerciseId === 2).map(s => [s.reps, s.peso, s.gimnasioId]), [[5, 100, undefined]], 'barra: compartida')

        // Se registran 150 kg en la prensa de fuera y se termina: no es récord frente a los 120 del habitual.
        await page.evaluate(async ids => {
          const setsRepo = await import('/src/features/gym/data/setsRepo.ts')
          for (const id of ids) await setsRepo.actualizar(id, { peso: 150 })
        }, delActivo.filter(s => s.exerciseId === 1).map(s => s.id))
        await page.getByRole('button', { name: 'Completar serie 1 de Prensa', exact: true }).click()
        await page.getByRole('button', { name: 'Completar serie 2 de Prensa', exact: true }).click()
        await page.getByRole('button', { name: 'Completar serie 1 de Press banca', exact: true }).click()
        await page.getByRole('button', { name: 'Terminar', exact: true }).click()
        await page.getByRole('button', { name: 'Guardar y terminar', exact: true }).click()
        await page.getByText('Sesión guardada en el historial', { exact: true }).waitFor()
        assert.equal(await page.getByText(/150 kg/).filter({ hasText: /Peso máximo|1RM/ }).count(), 0, 'sin récord de prensa frente al habitual')
        await page.getByRole('button', { name: 'Volver a Entreno', exact: true }).click()

        // El chip de Empezar vuelve al habitual; en el habitual la prensa propone los 120 kg de siempre.
        await page.getByRole('button', { name: 'Gimnasio: Gimnasio habitual', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Empezar Pierna y pecho', exact: true }).click()
        await page.getByRole('button', { name: 'Gimnasio: Gimnasio habitual', exact: true }).waitFor()
        assert.equal(await nota.count(), 0)
        d = await datos(page)
        const segundo = d.workouts.find(w => w.fin === undefined)
        assert.deepEqual(d.sets.filter(s => s.workoutId === segundo.id && s.exerciseId === 1).map(s => [s.reps, s.peso, s.gimnasioId]), [[10, 120, undefined], [10, 120, undefined]])
        // Cambiar a Gym Playa en curso: ya hay historial allí, propone sus 150 kg.
        await elegirGimnasio(page, 'Gimnasio habitual', 'Gym Playa del Arenal con nombre largo')
        await page.waitForFunction(async ([id, playa]) => {
          const { db } = await import('/src/shared/db/db.ts')
          return (await db.sets.where('workoutId').equals(id).toArray()).filter(s => s.exerciseId === 1).every(s => s.peso === 150 && s.gimnasioId === playa)
        }, [segundo.id, playa])
        await page.evaluate(async id => { const workoutsRepo = await import('/src/features/gym/data/workoutsRepo.ts'); await workoutsRepo.descartar(id) }, segundo.id)

        // Nombre del habitual desde la misma hoja: sale en el chip, en cada fila del historial y en el póster.
        await page.getByRole('button', { name: 'Gimnasio: Gimnasio habitual', exact: true }).click()
        const hoja = page.getByRole('dialog', { name: 'Gimnasio', exact: true })
        await hoja.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Basic-Fit Centro')
        await hoja.getByRole('button', { name: 'Guardar nombre', exact: true }).click()
        await hoja.getByRole('radio', { name: /^Basic-Fit Centro/ }).waitFor()
        await hoja.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await page.getByRole('button', { name: 'Gimnasio: Basic-Fit Centro', exact: true }).waitFor()

        // Historial: cada fila empieza por su gimnasio y el póster lo nombra. Progreso abre en el habitual y ofrece Gym Playa.
        await page.getByRole('tab', { name: 'Historial', exact: true }).click()
        const filas = page.getByRole('list', { name: 'Entrenos terminados del mes', exact: true }).getByRole('button')
        await filas.first().filter({ hasText: 'Gym Playa del Arenal con nombre largo · Pierna y pecho' }).waitFor()
        await filas.nth(1).filter({ hasText: 'Basic-Fit Centro · Pierna y pecho' }).waitFor()
        await capture(page, `${tag}-historial-lista`)
        await geometry(page, `${tag}-historial-lista`)
        await filas.first().click()
        await page.getByText(/· Gym Playa del Arenal con nombre largo$/).waitFor()
        await capture(page, `${tag}-historial`)
        await geometry(page, `${tag}-historial`)
        await page.getByRole('button', { name: 'Historial', exact: true }).click()
        await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
        await page.getByRole('button', { name: /^Prensa/ }).first().click()
        // Una sola variante (el gimnasio ya no lo es): selector de gimnasio con «Todos» y una línea por gimnasio con su leyenda.
        // Con un nombre largo, el selector de la tarjeta de la gráfica es un desplegable; con nombres cortos, segmentos.
        assert.equal(await page.getByRole('combobox', { name: 'Variante en Progreso', exact: true }).count(), 0)
        const gimnasio = page.getByRole('combobox', { name: 'Gimnasio en Progreso', exact: true })
        await gimnasio.locator('option').nth(2).waitFor({ state: 'attached' })
        assert.deepEqual(await gimnasio.locator('option').allTextContents(), ['Todos los gimnasios', 'Basic-Fit Centro', 'Gym Playa del Arenal con nombre largo'])
        const leyenda = page.getByRole('list', { name: 'Gimnasios de la gráfica', exact: true })
        assert.equal(await leyenda.getByRole('listitem').count(), 2)
        assert.equal(await page.locator('.recharts-line').count(), 2)
        await capture(page, `${tag}-progreso-todos`)
        await geometry(page, `${tag}-progreso-todos`)
        await gimnasio.selectOption({ label: 'Gym Playa del Arenal con nombre largo' })
        await leyenda.waitFor({ state: 'detached' })
        assert.equal(await page.getByRole('list', { name: 'Sesiones de Prensa', exact: true }).getByRole('listitem').count(), 1)
        await gimnasio.selectOption({ label: 'Basic-Fit Centro' })
        assert.equal(await page.getByRole('list', { name: 'Sesiones de Prensa', exact: true }).getByRole('listitem').count(), 1)
        await capture(page, `${tag}-progreso`)
        await geometry(page, `${tag}-progreso`)
        assert.deepEqual(errors, [], 'sin errores React/browser')
        reports.push({ tag, ok: true })
        console.log(`${tag}: OK`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(reports, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
