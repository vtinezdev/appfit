/* Perfiles efímeros, únicamente en appfit-test.localhost. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-agarres-ui'
fs.mkdirSync(output, { recursive: true })
const reports = []
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true })
const row = (page, name) => dialog(page, 'Añadir ejercicio').locator('li').filter({ has: page.getByText(name, { exact: true }) }).getByRole('button').first()
async function snapshot(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function check(page, name) {
  await page.evaluate(() => document.fonts.ready)
  const d = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && !e.closest('[inert],[hidden]')
    return {
      overflow: [...document.querySelectorAll('html,[role=dialog]')].filter(visible).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.tagName),
      targets: [...document.querySelectorAll('button')].filter(visible).filter(e => e.getBoundingClientRect().height < 43.9).map(e => e.textContent),
      inputs: [...document.querySelectorAll('input,select')].filter(visible).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.tagName),
    }
  })
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
  assert.deepEqual(d, { overflow: [], targets: [], inputs: [] }, name)
  reports.push(name)
}
async function choose(page, query, name) {
  const selector = dialog(page, 'Añadir ejercicio')
  await selector.getByRole('searchbox', { name: 'Buscar ejercicio', exact: true }).fill(query)
  await row(page, name).click()
  await dialog(page, 'Elegir agarre').waitFor()
  return dialog(page, 'Elegir agarre')
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push({ width: 1440, theme: 'light' }, { width: 375, theme: 'dark', large: true })
  try {
    for (const item of cases) {
      const tag = `${item.width}-${item.theme}${item.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: item.width, height: item.width === 320 ? 568 : 900 }, colorScheme: item.theme, reducedMotion: 'reduce', serviceWorkers: 'block' })
      const page = await context.newPage(), errors = []
      page.on('pageerror', e => errors.push(e.message))
      try {
        await context.route('**/world.openfoodfacts.org/**', r => r.abort())
        await page.goto(process.env.APPFIT_UI_URL || 'http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async b => { await (await import('/src/shared/lib/backup.ts')).importarBackup(JSON.stringify(b)) }, fixture)
        if (item.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        const original = await snapshot(page)
        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Rutinas', exact: true }).click()
        await page.getByRole('button', { name: 'Crear rutina', exact: true }).click()
        await dialog(page, 'Crear rutina').getByRole('button', { name: /^En blanco/ }).click()
        await page.getByRole('textbox', { name: 'Nombre de la rutina', exact: true }).fill('Agarres UI')
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        let grip = await choose(page, 'jalon pecho', 'Jalón al pecho')
        for (const name of ['Prono', 'Supino', 'Neutro', 'Estrecho', 'Medio', 'Ancho']) await grip.getByRole('button', { name, exact: true }).waitFor()
        await check(page, `${tag}-opciones`)
        await grip.getByRole('button', { name: 'Cuerda', exact: true }).click()
        assert.equal(await grip.getByRole('button', { name: 'Supino', exact: true }).count(), 0)
        assert.equal(await grip.getByRole('group', { name: 'Anchura', exact: true }).count(), 0)
        await check(page, `${tag}-cuerda`)
        await grip.getByRole('button', { name: 'Agarre en V', exact: true }).click()
        await check(page, `${tag}-agarre-v`)
        // Volver cancela solo este paso, conserva consulta/filtros/foco y no crea un ejercicio.
        await grip.getByRole('button', { name: 'Volver', exact: true }).click()
        await dialog(page, 'Añadir ejercicio').waitFor()
        assert.equal(await dialog(page, 'Añadir ejercicio').getByRole('searchbox').inputValue(), 'jalon pecho')
        assert.deepEqual(await snapshot(page), original)
        grip = await choose(page, 'jalon pecho', 'Jalón al pecho')
        await grip.getByRole('button', { name: 'Barra', exact: true }).click()
        assert.equal(await grip.getByRole('button', { name: 'Neutro', exact: true }).count(), 0)
        await grip.getByRole('button', { name: 'Prono', exact: true }).click()
        await grip.getByRole('button', { name: 'Ancho', exact: true }).click()
        await grip.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await grip.waitFor({ state: 'detached' })
        await page.getByRole('button', { name: 'Guardar', exact: true }).click()
        await dialog(page, 'Nueva rutina').waitFor({ state: 'detached' })
        let b = await snapshot(page)
        const e = b.exercises.find(e => e.catalogId === 'appfit:jalon-pecho')
        const r = b.routines.find(r => r.nombre === 'Agarres UI')
        assert.deepEqual(r.agarres[e.id], { accesorio: 'barra', orientacion: 'prono', anchura: 'ancho' })
        assert.equal(r.ejecuciones, undefined)
        // Editar la rutina conserva el nombre del ejercicio y permite cambiar su variante: ejecución y agarre.
        await page.getByRole('button', { name: /Agarres UI/ }).first().click()
        await page.getByRole('button', { name: 'Editar', exact: true }).click()
        await page.getByRole('button', { name: 'Variante de Jalón al pecho: Bilateral · Prono · Ancho · Barra', exact: true }).click()
        const editor = dialog(page, 'Editar rutina')
        const ejecucion = editor.getByRole('radiogroup', { name: 'Ejecución de Jalón al pecho', exact: true })
        assert.equal(await ejecucion.getByRole('radio', { name: 'Bilateral', exact: true }).getAttribute('aria-checked'), 'true')
        await ejecucion.getByRole('radio', { name: 'Unilateral', exact: true }).click()
        await editor.getByRole('button', { name: 'Supino', exact: true }).click()
        await editor.getByRole('button', { name: 'Medio', exact: true }).click()
        await editor.getByRole('button', { name: /^Variante de Jalón al pecho: Unilateral · Supino/ }).waitFor()
        await check(page, `${tag}-rutina`)
        await editor.getByRole('button', { name: 'Guardar', exact: true }).click()
        await editor.waitFor({ state: 'detached' })
        assert.equal((await snapshot(page)).routines.find(x => x.id === r.id).ejecuciones[e.id], 'lados')
        await page.getByRole('region', { name: 'Ejercicios', exact: true }).getByText('Unilateral', { exact: true }).waitFor()
        await check(page, `${tag}-detalle-rutina`)
        await page.getByRole('button', { name: 'Rutinas', exact: true }).click()
        await page.getByRole('tab', { name: 'Empezar', exact: true }).click()
        await page.getByRole('button', { name: 'Empezar Agarres UI', exact: true }).click()
        await page.getByRole('button', { name: 'Añadir serie', exact: true }).click()
        await page.getByRole('button', { name: 'Completar serie 1 de Jalón al pecho', exact: true }).waitFor()
        b = await snapshot(page)
        const active = b.workouts.find(w => w.fin === undefined)
        const series = b.sets.filter(s => s.workoutId === active.id)
        assert.deepEqual(series[0].agarre, { accesorio: 'barra', orientacion: 'supino', anchura: 'medio' })
        assert.equal(series[0].ejecucion, 'lados')
        await page.getByRole('button', { name: /^Ejecución de Jalón al pecho: Unilateral/ }).waitFor()
        // Cambiar la sesión no reescribe la rutina ni el habitual.
        await page.getByRole('button', { name: /^Agarre de Jalón al pecho:/ }).click()
        const variant = dialog(page, 'Variante · Jalón al pecho')
        await variant.getByRole('button', { name: 'Cuerda', exact: true }).click()
        await check(page, `${tag}-sesion`)
        await variant.getByRole('button', { name: 'Guardar variante', exact: true }).click()
        await variant.waitFor({ state: 'detached' })
        b = await snapshot(page)
        assert.deepEqual(b.sets.find(s => s.id === series[0].id).agarre, { accesorio: 'cuerda', orientacion: 'neutro' })
        assert.deepEqual(b.routines.find(x => x.id === r.id).agarres[e.id], { accesorio: 'barra', orientacion: 'supino', anchura: 'medio' })
        assert.equal(b.exercises.find(x => x.id === e.id).ejecucionHabitual, undefined)
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        grip = await choose(page, 'dominadas neutras', 'Dominadas con agarre neutro')
        assert.equal(await grip.getByRole('button', { name: 'Supino', exact: true }).count(), 0)
        await grip.getByRole('button', { name: 'Ancho', exact: true }).click()
        await check(page, `${tag}-neutro-fijo`)
        await grip.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await grip.waitFor({ state: 'detached' })
        b = await snapshot(page)
        const pull = b.exercises.find(x => x.catalogId === 'appfit:dominadas-neutras')
        assert.deepEqual(b.sets.find(s => s.workoutId === active.id && s.exerciseId === pull.id).agarre, { orientacion: 'neutro', anchura: 'ancho' })
        // Un ejercicio de la nueva tanda sin opciones de agarre se añade directamente.
        await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click()
        await dialog(page, 'Añadir ejercicio').getByRole('searchbox').fill('curl femoral deslizadores')
        await row(page, 'Curl femoral con deslizadores').click()
        await dialog(page, 'Añadir ejercicio').waitFor({ state: 'detached' })
        assert.equal(await dialog(page, 'Elegir agarre').count(), 0)
        const final = await snapshot(page)
        for (const s of original.sets) assert.deepEqual(final.sets.find(x => x.id === s.id), s)
        for (const w of original.workouts) assert.deepEqual(final.workouts.find(x => x.id === w.id), w)
        await page.reload()
        await page.getByRole('button', { name: /^Volver al entreno:/ }).click()
        await page.getByRole('button', { name: /^Agarre de Jalón al pecho:/ }).waitFor()
        assert.deepEqual(await snapshot(page), final)
        assert.deepEqual(errors, [])
        console.log('PASS', tag)
      } catch (e) {
        await page.screenshot({ path: `${output}/${tag}-error.png` }).catch(() => {})
        console.error((await page.locator('body').innerText()).slice(-3500))
        throw e
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify({ estados: reports.length, reports }, null, 2))
    console.log('PASS', reports.length, 'estados de agarres')
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
