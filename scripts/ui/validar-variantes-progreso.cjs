/* Progreso con tarjetas de variante, chip de tipo de carga y gimnasio en la tarjeta de la gráfica. Solo fixtures y origen aislado. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-variantes-progreso'
fs.mkdirSync(output, { recursive: true })

async function geometry(page, tag) {
  const diagnostic = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[hidden],[inert]')
    return {
      horizontal: document.documentElement.scrollWidth > innerWidth,
      overflow: [...document.querySelectorAll('main')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('.tarjeta-variante, [role=radiogroup] button, [aria-label^="Tipo de carga:"]')].filter(visible).filter(e => {
        const r = e.getBoundingClientRect(); return r.height < 43.9
      }).map(e => e.getAttribute('aria-label') || e.textContent),
    }
  })
  assert.deepEqual(diagnostic, { horizontal: false, overflow: [], targets: [] }, tag)
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 375, theme: 'light', large: true })
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: c.width === 320 ? 568 : 900 }, colorScheme: c.theme, serviceWorkers: 'block' })
      try {
        const page = await context.newPage(); const errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
        // Remo en polea: agarre neutro (habitual y Gym Playa), prono ancho y lados separados; una sesión asistida.
        await page.evaluate(async () => {
          const { db } = await import('/src/shared/db/db.ts')
          await db.exercises.put({ id: 3, nombre: 'Remo sentado en polea', nombreNorm: 'remo sentado en polea', grupo: 'Espalda', primaryMuscles: ['espalda'], secondaryMuscles: [], equipment: ['polea'] })
          await db.gimnasios.put({ id: 1, nombre: 'Gym Playa', nombreNorm: 'gym playa' })
          const dia = 86400000, base = Date.now() - 120 * dia
          const neutro = { orientacion: 'neutro' }, prono = { orientacion: 'prono', anchura: 'ancho' }
          const plan = [
            ...[50, 52.5, 52.5, 55, 55, 57.5, 57.5, 60, 62.5].map((kg, i) => ({ d: i * 9, kg, agarre: neutro })),
            ...[45, 47.5].map((kg, i) => ({ d: 20 + i * 30, kg, agarre: neutro, g: 1 })),
            ...[50, 50, 52.5, 55].map((kg, i) => ({ d: 5 + i * 20, kg, agarre: prono })),
            ...[22.5, 25].map((kg, i) => ({ d: 50 + i * 20, kg, lados: true })),
            { d: 100, kg: 20, modo: 'asistencia' },
          ]
          let id = 100
          for (const x of plan) {
            const inicio = base + x.d * dia + id
            const wid = await db.workouts.add({ inicio, fin: inicio + 3600000, ...(x.g ? { gimnasioId: x.g } : {}) })
            await db.sets.add({ id: id++, workoutId: wid, exerciseId: 3, reps: 8, peso: x.lados ? 0 : x.kg, orden: 0, createdAt: inicio, realizada: true,
              ...(x.agarre ? { agarre: x.agarre } : {}), ...(x.g ? { gimnasioId: x.g } : {}), ...(x.modo ? { modoCarga: x.modo } : {}),
              ...(x.lados ? { ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: x.kg }, derecha: { reps: 8, peso: x.kg } } } : {}) })
          }
        })
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await navegar(page, 'Entreno'); await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
        await page.getByRole('combobox', { name: 'Ejercicio', exact: true }).selectOption('3')
        const grupo = page.getByRole('group', { name: 'Variante', exact: true })
        await grupo.waitFor()
        // Tres tarjetas, la de más sesiones elegida; segmentos de gimnasio en la tarjeta de la gráfica.
        assert.equal(await grupo.getByRole('button').count(), 3)
        assert.equal(await grupo.getByRole('button').first().getAttribute('aria-pressed'), 'true')
        await page.getByRole('radiogroup', { name: 'Gimnasio en Progreso', exact: true }).waitFor()
        assert.equal(await page.locator('.recharts-line').count(), 2)
        await page.screenshot({ path: `${output}/${tag}-tarjetas.png`, animations: 'disabled' })
        await geometry(page, `${tag}-tarjetas`)
        await page.getByRole('radiogroup', { name: 'Gimnasio en Progreso', exact: true }).getByRole('radio', { name: 'Gym Playa', exact: true }).click()
        await page.locator('.recharts-area').waitFor()
        // Una variante de un solo gimnasio lo dice en lugar del selector.
        await grupo.getByRole('button').nth(1).click()
        await page.getByText(/^Todas las sesiones de esta variante son de Gimnasio habitual\.$/).waitFor()
        assert.equal(await page.getByRole('radiogroup', { name: 'Gimnasio en Progreso', exact: true }).count(), 0)
        // El tipo de carga es un chip con su hoja.
        await page.getByRole('button', { name: 'Tipo de carga: Carga externa', exact: true }).click()
        await page.getByRole('radiogroup', { name: 'Tipo de carga en Progreso', exact: true }).getByRole('radio', { name: 'Corporal asistido', exact: true }).click()
        await page.getByRole('button', { name: 'Tipo de carga: Corporal asistido', exact: true }).waitFor()
        assert.equal(await page.getByRole('group', { name: 'Variante', exact: true }).count(), 0, 'una sola variante: sin tarjetas')
        await geometry(page, `${tag}-asistido`)
        assert.deepEqual(errors, [], 'sin errores React/browser')
        reports.push({ tag, ok: true })
        console.log(`${tag}: OK`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(reports, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
