/* Creatina: datos sintéticos y contextos efímeros, solo en el origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-creatina'
fs.mkdirSync(output, { recursive: true })
async function datos(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    for (const s of b.settings) delete s.ultimaExportacion
    return JSON.parse(JSON.stringify(b))
  })
}
async function experiencia(page) {
  return page.evaluate(async () => {
    const { leerExperiencia } = await import('/src/features/experiencia/hooks/useExperiencia.ts')
    const { todayISO } = await import('/src/shared/lib/dates.ts')
    return JSON.parse(JSON.stringify(await leerExperiencia(todayISO())))
  })
}
async function ajustes(page) {
  await navegar(page, 'Ajustes')
  const section = page.getByRole('region', { name: 'Creatina', exact: true })
  await section.waitFor()
  return section
}
async function check(page, target, tag) {
  await page.evaluate(() => document.fonts.ready)
  const geometry = await target.evaluate(e => {
    const r = e.getBoundingClientRect()
    const visibles = [...e.querySelectorAll('button,input:not([type=checkbox]),label')].filter(n => n.getClientRects().length)
    return { overflow: e.scrollWidth > e.clientWidth + 1 || r.right > innerWidth + 1,
      targets: visibles.filter(n => { const b = n.getBoundingClientRect(); return b.height < 43.9 || b.width < 43.9 }).map(n => n.textContent) }
  })
  assert.deepEqual(geometry, { overflow: false, targets: [] }, tag)
  await target.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const cases = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  cases.push(...['light', 'dark'].map(theme => ({ width: 375, theme, large: true })))
  const reports = []
  try {
    for (const c of cases) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: 900 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errors = []
        page.on('pageerror', e => errors.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async ({ fixture, theme }) => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          const { db } = await import('/src/shared/db/db.ts')
          await importarBackup(JSON.stringify(fixture)); await db.pesos.clear()
          localStorage.setItem('appfit:theme', theme); document.documentElement.dataset.theme = theme
        }, { fixture, theme: c.theme })
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        assert.equal(await page.getByRole('button', { name: /^Creatina/ }).count(), 0, 'oculta por defecto')
        let section = await ajustes(page)
        const toggle = () => section.getByRole('switch', { name: 'Activar Creatina', exact: true })
        await toggle().click(); await section.getByRole('switch', { name: 'Activar Creatina', checked: true }).waitFor()
        await section.getByText('Mantenimiento: 3 g al día.', { exact: true }).waitFor()
        assert.equal(await section.getByRole('button', { name: 'Empezar fase de carga', exact: true }).isDisabled(), true, 'carga sin pesaje no inventa masa')
        await check(page, section, `${tag}-ajustes-sin-peso`)
        const dose = () => section.getByRole('textbox', { name: 'Dosis manual de mantenimiento (g)', exact: true })
        await dose().fill('4,5'); await section.getByRole('button', { name: 'Guardar dosis', exact: true }).click()
        await section.getByText('Mantenimiento: 4,5 g al día.', { exact: true }).waitFor()
        await navegar(page, 'Inicio')
        const card = () => page.getByRole('button', { name: /^Creatina/ })
        await card().filter({ hasText: '4,5' }).waitFor()
        const xp = await experiencia(page)
        const control = pressed => page.getByRole('button', { name: 'Tomada hoy', exact: true, ...(pressed === undefined ? {} : { pressed }) })
        await control(false).click(); await control(true).waitFor()
        assert.equal((await datos(page)).suplementos.length, 1)
        assert.deepEqual(await experiencia(page), xp, 'marcar no cambia XP ni Ritmo')
        await check(page, card().locator('..'), `${tag}-inicio-manual`)
        await card().click()
        let sheet = page.getByRole('dialog', { name: 'Creatina', exact: true })
        await sheet.getByRole('region', { name: 'Últimos 7 días', exact: true }).waitFor()
        assert.equal(await sheet.locator('li').count(), 7)
        assert.equal(await sheet.getByText('Tomada', { exact: true }).count(), 1)
        await check(page, sheet, `${tag}-historial`)
        await sheet.getByRole('button', { name: 'Tomada hoy', exact: true, pressed: true }).click()
        await sheet.getByRole('button', { name: 'Tomada hoy', exact: true, pressed: false }).waitFor()
        assert.equal((await datos(page)).suplementos.length, 0)
        await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'detached' })
        if (tag === '375-light') {
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            const add = db.suplementos.add.bind(db.suplementos)
            db.suplementos.add = (...args) => { db.suplementos.add = add; return Promise.reject(new Error('Fallo simulado')) }
          })
          await control(false).click()
          await page.getByText('No se ha podido guardar la toma. Inténtalo de nuevo.', { exact: true }).waitFor()
          assert.equal((await datos(page)).suplementos.length, 0)
        }
        await control(false).click(); await control(true).waitFor()
        await page.reload()
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await control(true).waitFor()
        await page.evaluate(async () => {
          const { registrar } = await import('/src/features/inicio/data/pesosRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          await registrar(todayISO(), 80)
        })
        section = await ajustes(page)
        await dose().fill('0'); await section.getByRole('button', { name: 'Guardar dosis', exact: true }).click()
        await section.getByText('Introduce una dosis mayor que 0 g, o deja el campo vacío para usar la automática.', { exact: true }).waitFor()
        await dose().fill(''); await section.getByRole('button', { name: 'Guardar dosis', exact: true }).click()
        await section.getByText('Mantenimiento: 4 g al día.', { exact: true }).waitFor()
        await section.getByRole('button', { name: 'Empezar fase de carga', exact: true }).click()
        await section.getByText('Fase de carga · día 1 de 5', { exact: true }).waitFor()
        await section.getByText('24 g al día, repartidos en 4 tomas. Después pasa automáticamente a mantenimiento.', { exact: true }).waitFor()
        await check(page, section, `${tag}-carga`)
        for (let n = 1; n <= 5; n++) {
          await page.evaluate(async n => {
            const { db } = await import('/src/shared/db/db.ts')
            const { getSettings } = await import('/src/shared/db/settings.ts')
            const { todayISO, addDays } = await import('/src/shared/lib/dates.ts')
            const s = await getSettings(); await db.settings.update(1, { creatina: { ...s.creatina, inicioCarga: addDays(todayISO(), -n) } })
          }, n)
          await section.getByText(n < 5 ? `Fase de carga · día ${n + 1} de 5` : 'Fase de carga terminada. Ahora estás en mantenimiento.', { exact: true }).waitFor()
        }
        await navegar(page, 'Inicio'); await card().filter({ hasText: /4\s*g hoy/ }).waitFor()
        const finalCarga = await datos(page)
        await card().click(); await sheet.waitFor()
        await sheet.getByText('Fase de carga terminada.', { exact: true }).waitFor()
        await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'detached' })
        assert.deepEqual(await datos(page), finalCarga, 'el fin de carga se deriva sin escribir al consultar')
        section = await ajustes(page)
        await section.getByRole('button', { name: 'Empezar fase de carga', exact: true }).click()
        await section.getByRole('button', { name: 'Cancelar fase de carga', exact: true }).click()
        await section.getByRole('button', { name: 'Empezar fase de carga', exact: true }).waitFor()
        await toggle().click(); await section.getByRole('switch', { name: 'Activar Creatina', checked: false }).waitFor()
        await navegar(page, 'Inicio')
        assert.equal(await card().count(), 0, 'desactivar oculta la tarjeta')
        assert.equal((await datos(page)).suplementos.length, 1, 'desactivar conserva la toma')
        await page.evaluate(async () => {
          const { registrar } = await import('/src/features/inicio/data/pesosRepo.ts')
          const { todayISO } = await import('/src/shared/lib/dates.ts')
          await registrar(todayISO(), 40)
        })
        section = await ajustes(page); await toggle().click(); await section.getByRole('switch', { name: 'Activar Creatina', checked: true }).waitFor()
        await section.getByText('Mantenimiento: 3 g al día.', { exact: true }).waitFor()
        const antesBackup = await datos(page)
        await page.evaluate(async () => {
          const { exportarBackup, importarBackup } = await import('/src/shared/lib/backup.ts')
          await importarBackup(JSON.stringify(await exportarBackup()))
        })
        assert.deepEqual(await datos(page), antesBackup, 'backup nuevo de ida y vuelta')
        await page.evaluate(async fixture => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          await importarBackup(JSON.stringify(fixture))
        }, fixture)
        const antigua = await datos(page)
        assert.equal(antigua.suplementos.length, 0); assert.equal(antigua.settings[0].creatina, undefined)
        assert.deepEqual(errors, [])
        reports.push({ ...c, passed: true }); console.log(`${tag}: correcto`)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify(reports, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
