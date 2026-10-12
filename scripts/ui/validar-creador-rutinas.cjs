/* Creador de rutinas: datos sintéticos y contextos efímeros, solo en el origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-creador-rutinas'
fs.mkdirSync(output, { recursive: true })

async function datos(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    for (const s of b.settings) delete s.ultimaExportacion
    return JSON.parse(JSON.stringify(b))
  })
}
async function check(page, target, tag) {
  await page.evaluate(() => document.fonts.ready)
  const geometry = await target.evaluate(e => {
    const visibles = [...e.querySelectorAll('button,input')].filter(n => n.getClientRects().length)
    return { overflow: e.scrollWidth > e.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
      targets: visibles.filter(n => { const b = n.getBoundingClientRect(); return b.height < 43.9 || b.width < 43.9 }).map(n => n.textContent || n.getAttribute('aria-label')) }
  })
  assert.deepEqual(geometry, { overflow: false, targets: [] }, tag)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
const nombres = (dialog, dia) => dialog.getByRole('list', { name: `Ejercicios de ${dia}`, exact: true }).getByRole('button', { name: /^Cambiar / })
  .evaluateAll(bs => bs.map(b => b.getAttribute('aria-label').slice('Cambiar '.length)))

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'light', large: true })
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errors = []
        page.on('pageerror', e => errors.push(e.message))
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async ({ fixture, theme }) => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          const { updateSettings } = await import('/src/shared/db/settings.ts')
          const { db } = await import('/src/shared/db/db.ts')
          await importarBackup(JSON.stringify(fixture))
          await updateSettings({ rirAlCompletar: false, planSemanal: [{ desde: '2026-01-05', entrenos: 4, diasRegistro: 5 }] })
          await db.routines.add({ nombre: 'Torso A', exerciseIds: [] })
          localStorage.setItem('appfit:theme', theme); document.documentElement.dataset.theme = theme
        }, { fixture, theme: c.theme })
        await page.reload()
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        const original = await datos(page)

        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Rutinas', exact: true }).click()
        await page.getByRole('button', { name: 'Crear rutina', exact: true }).click()
        const crear = page.getByRole('dialog', { name: 'Crear rutina', exact: true })
        await check(page, crear, `${tag}-crear`)
        await crear.getByRole('button', { name: /^Con el asistente/ }).click()
        const asistente = page.getByRole('dialog', { name: 'Crear con el asistente', exact: true })
        await asistente.waitFor()
        // Días por defecto: los de Ritmo.
        await asistente.getByRole('radiogroup', { name: 'Días por semana' }).getByRole('radio', { name: '4', checked: true }).waitFor()
        await asistente.getByText('Torso / pierna: Torso A · Pierna A · Torso B · Pierna B.', { exact: true }).waitFor()
        await asistente.getByRole('radio', { name: /^Casa/ }).click()
        await asistente.getByRole('radio', { name: 'Fuerza', exact: true }).click()
        await asistente.getByRole('button', { name: 'Bíceps', exact: true }).click()
        await check(page, asistente, `${tag}-preguntas`)
        await asistente.getByRole('button', { name: 'Ver el plan', exact: true }).click()

        const plan = page.getByRole('dialog', { name: 'Tu plan', exact: true })
        await plan.waitFor()
        for (const dia of ['Torso A', 'Pierna A', 'Torso B', 'Pierna B']) assert.equal((await nombres(plan, dia)).length, 5, dia)
        await check(page, plan, `${tag}-plan`)
        assert.deepEqual(await datos(page), original, 'ver el plan no escribe')

        const torso = plan.getByRole('region', { name: 'Torso A', exact: true })
        const antes = (await nombres(plan, 'Torso A'))[0]
        await torso.getByRole('button', { name: `Otra sugerencia para ${antes}`, exact: true }).click()
        const otra = (await nombres(plan, 'Torso A'))[0]
        assert.notEqual(otra, antes, 'otra sugerencia')

        await torso.getByRole('button', { name: `Cambiar ${otra}`, exact: true }).click()
        const cambio = page.getByRole('dialog', { name: `Cambiar ${otra}`, exact: true })
        await cambio.waitFor()
        await check(page, cambio, `${tag}-cambiar`)
        const sugerida = cambio.getByRole('list', { name: 'Sugerencias' }).getByRole('button').first()
        const nombreSugerida = (await sugerida.locator('span.block').first().innerText()).trim()
        await sugerida.click()
        await cambio.waitFor({ state: 'detached' })
        assert.equal((await nombres(plan, 'Torso A'))[0], nombreSugerida, 'sugerencia elegida')

        await torso.getByRole('button', { name: `Cambiar ${nombreSugerida}`, exact: true }).click()
        await page.getByRole('dialog', { name: `Cambiar ${nombreSugerida}`, exact: true }).getByRole('button', { name: 'Elegir otro…', exact: true }).click()
        const selector = page.getByRole('dialog', { name: 'Añadir ejercicio', exact: true })
        await selector.waitFor()
        await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill('dead bug')
        await selector.getByRole('button', { name: /^Dead bug/ }).click()
        await selector.waitFor({ state: 'detached' })
        assert.ok((await nombres(plan, 'Torso A')).includes('Dead bug'), 'elegido en el selector')
        assert.deepEqual(await datos(page), original, 'cambiar no escribe')

        await plan.getByRole('button', { name: 'Regenerar todo', exact: true }).click()
        for (const dia of ['Torso A', 'Pierna A', 'Torso B', 'Pierna B']) assert.equal((await nombres(plan, dia)).length, 5, `regenerado ${dia}`)
        const guardado = await Promise.all(['Torso A', 'Pierna A', 'Torso B', 'Pierna B'].map(d => nombres(plan, d)))
        await plan.getByRole('button', { name: 'Guardar 4 rutinas', exact: true }).click()
        await plan.waitFor({ state: 'detached' })
        await page.getByRole('status').getByText('4 rutinas creadas', { exact: true }).waitFor()
        const despues = await datos(page)
        const nuevas = despues.routines.filter(r => !original.routines.some(o => o.id === r.id))
        assert.deepEqual(nuevas.map(r => r.nombre), ['Torso A (2)', 'Pierna A', 'Torso B', 'Pierna B'])
        const porId = new Map(despues.exercises.map(e => [e.id, e.nombre]))
        assert.deepEqual(nuevas.map(r => r.exerciseIds.map(id => porId.get(id))), guardado)
        for (const r of nuevas) assert.equal(Object.keys(r.objetivos).length, r.exerciseIds.length)
        await page.getByRole('button', { name: 'Editar Torso A (2)', exact: true }).waitFor()

        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await page.getByRole('button', { name: 'Editar Pierna A', exact: true }).waitFor({ state: 'detached' })
        assert.equal((await datos(page)).routines.length, original.routines.length, 'deshacer quita las rutinas creadas')

        if (tag === '375-light') {
          // Guardar y empezar un entreno desde una rutina generada (gimnasio, hipertrofia, 3 días).
          await page.getByRole('button', { name: 'Crear rutina', exact: true }).click()
          await page.getByRole('dialog', { name: 'Crear rutina', exact: true }).getByRole('button', { name: /^Con el asistente/ }).click()
          await asistente.getByRole('radio', { name: '3', exact: true }).click()
          await asistente.getByRole('button', { name: 'Ver el plan', exact: true }).click()
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            const add = db.routines.add.bind(db.routines)
            db.routines.add = () => { db.routines.add = add; return Promise.reject(new Error('Fallo simulado')) }
          })
          await plan.getByRole('button', { name: 'Guardar 3 rutinas', exact: true }).click()
          await plan.getByText('No se han podido guardar las rutinas. Inténtalo de nuevo.', { exact: true }).waitFor()
          assert.equal((await datos(page)).routines.length, original.routines.length, 'el fallo no deja rutinas a medias')
          await plan.getByRole('button', { name: 'Guardar 3 rutinas', exact: true }).click()
          await plan.waitFor({ state: 'detached' })
          await page.getByRole('button', { name: 'Empezar Cuerpo completo A', exact: true }).click()
          const estado = await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            const w = await db.workouts.filter(x => x.fin === undefined).first()
            const r = await db.routines.get(w.routineId)
            return { series: await db.sets.where('workoutId').equals(w.id).count(), objetivo: Object.values(r.objetivos).reduce((n, o) => n + o.series, 0) }
          })
          assert.equal(estado.series, estado.objetivo, 'series objetivo')
        }
        assert.deepEqual(errors, [])
        reports.push({ ...c, passed: true }); console.log(`${tag}: correcto`)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify(reports, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
