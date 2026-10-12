/* Cheat day: datos sintéticos, reloj fijo (jueves 15 oct 2026) y contextos efímeros, solo en el origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar } = require('./navegar.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-cheat-day'
fs.mkdirSync(output, { recursive: true })
const AHORA = new Date('2026-10-15T12:00:00')

async function datos(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    for (const s of b.settings) delete s.ultimaExportacion
    return JSON.parse(JSON.stringify(b))
  })
}
async function eventosNutricion(page) {
  return page.evaluate(async () => {
    const { leerExperiencia } = await import('/src/features/experiencia/hooks/useExperiencia.ts')
    const estado = await leerExperiencia('2026-10-15')
    return estado.resultado.eventos.filter(e => e.tipo === 'registro' || e.tipo === 'proteina').map(e => `${e.fecha} ${e.tipo}`)
  })
}
async function check(page, target, tag) {
  await page.evaluate(() => document.fonts.ready)
  const geometry = await target.evaluate(e => {
    const r = e.getBoundingClientRect()
    const visibles = [...e.querySelectorAll('button,input')].filter(n => n.getClientRects().length && !n.closest('.semana-kcal'))
    return { overflow: e.scrollWidth > e.clientWidth + 1 || r.right > innerWidth + 1 || document.documentElement.scrollWidth > innerWidth,
      targets: visibles.filter(n => { const b = n.getBoundingClientRect(); return b.height < 43.9 || b.width < 43.9 }).map(n => n.textContent || n.getAttribute('aria-label')) }
  })
  assert.deepEqual(geometry, { overflow: false, targets: [] }, tag)
  await target.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
}
const dia = (page, nombre) => page.getByRole('list', { name: 'Días de la semana' }).getByRole('button', { name: nombre })
async function accionesDia(page) {
  await page.getByRole('button', { name: 'Acciones del día', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Acciones del día', exact: true })
  await sheet.waitFor()
  return sheet
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
      const context = await browser.newContext({ viewport: { width: c.width, height: 900 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errors = []
        page.on('pageerror', e => errors.push(e.message))
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
        await page.clock.setFixedTime(AHORA)
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async ({ fixture, theme }) => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          const { db } = await import('/src/shared/db/db.ts')
          await importarBackup(JSON.stringify(fixture))
          await db.entries.clear()
          await db.settings.update(1, { objetivos: { kcal: 2000, prot: 150, carb: 200, grasa: 70 } })
          const e = (fecha, comida, kcal, prot) => ({ fecha, comida, nombre: 'Comida de prueba', gramos: 100, kcal, prot, carb: 10, grasa: 10, createdAt: 1 })
          await db.entries.bulkAdd([
            e('2026-10-12', 'comida', 2000, 150), e('2026-10-13', 'comida', 3000, 160), e('2026-10-13', 'cena', 1000, 40), e('2026-10-14', 'comida', 1800, 150),
          ])
          localStorage.setItem('appfit:theme', theme); document.documentElement.dataset.theme = theme
        }, { fixture, theme: c.theme })
        await page.reload()
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        const xpAntes = await eventosNutricion(page)
        assert.ok(xpAntes.includes('2026-10-13 proteina'), 'el martes da XP de proteína antes de marcarlo')

        await navegar(page, 'Nutrición')
        await dia(page, /^martes, 13 de octubre/).click()
        let sheet = await accionesDia(page)
        await check(page, sheet, `${tag}-acciones`)
        if (tag === '375-light') {
          // Fallo de escritura: error en línea dentro de la hoja, sin marca.
          await page.evaluate(async () => {
            const { db } = await import('/src/shared/db/db.ts')
            const add = db.cheatDays.add.bind(db.cheatDays)
            db.cheatDays.add = () => { db.cheatDays.add = add; return Promise.reject(new Error('Fallo simulado')) }
          })
          await sheet.getByRole('button', { name: /^Marcar como cheat day/ }).click()
          await sheet.getByText('No se ha podido marcar el cheat day. Inténtalo de nuevo.', { exact: true }).waitFor()
          assert.equal((await datos(page)).cheatDays.length, 0)
        }
        await sheet.getByRole('button', { name: /^Marcar como cheat day/ }).click()
        await sheet.waitFor({ state: 'detached' })
        await page.getByRole('status').getByText('Día marcado como cheat day', { exact: true }).waitFor()
        await page.getByText('Cheat day · fuera de las medias', { exact: true }).waitFor()
        await dia(page, /^martes, 13 de octubre: 4\.000 de 2\.000 kcal, cheat day$/).waitFor()
        await check(page, page.getByRole('region', { name: 'Semana' }), `${tag}-marcado`)

        // Cheat day vacío (hoy): el 2.º de la semana avisa sin bloquear.
        // Desde el botón visible bajo la semana, sin pasar por el menú.
        await dia(page, /^jueves, 15 de octubre/).click()
        const visible = page.getByRole('region', { name: 'Semana' }).getByRole('button', { name: 'Marcar como cheat day', exact: true, pressed: false })
        await check(page, page.getByRole('region', { name: 'Semana' }), `${tag}-sin-marcar`)
        await visible.click()
        await page.getByRole('region', { name: 'Semana' }).getByRole('button', { name: 'Cheat day · fuera de las medias', exact: true, pressed: true }).waitFor()
        await page.getByRole('status').getByText('Es tu 2.º cheat day esta semana', { exact: true }).waitFor()
        assert.deepEqual((await datos(page)).cheatDays.map(d => d.fecha).sort(), ['2026-10-13', '2026-10-15'])

        // Resumen: media de 12 y 14 (1.900), nota y racha que no se rompe.
        await page.getByRole('tab', { name: 'Resumen', exact: true }).click()
        const media = page.getByRole('region', { name: 'Media diaria' })
        await media.getByText('1.900', { exact: true }).waitFor()
        await media.getByText('Solo cuentan los 2 días registrados · 2 cheat days fuera de la media', { exact: true }).waitFor()
        const adherencia = page.getByRole('region', { name: 'Adherencia y hábitos' })
        assert.match(await adherencia.innerText(), /100 %[\s\S]*2 de 2 días registrados/)
        assert.match(await adherencia.innerText(), /Racha de registro\s*4\s*días/)
        await check(page, media, `${tag}-resumen`)

        assert.deepEqual((await eventosNutricion(page)).filter(e => e.startsWith('2026-10-13')), ['2026-10-13 registro'], 'sin XP de proteína el cheat day')

        // Quitar con «Deshacer»: la marca vuelve igual.
        await page.getByRole('tab', { name: 'Diario', exact: true }).click()
        await dia(page, /^martes, 13 de octubre/).click()
        const antes = (await datos(page)).cheatDays
        sheet = await accionesDia(page)
        await sheet.getByRole('button', { name: /^Quitar cheat day/ }).click()
        await page.getByRole('status').getByText('Cheat day quitado', { exact: true }).waitFor()
        assert.equal((await datos(page)).cheatDays.length, 1)
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
        await page.getByText('Cheat day · fuera de las medias', { exact: true }).waitFor()
        assert.deepEqual((await datos(page)).cheatDays, antes)

        // «Copiar el día» sigue en el mismo menú.
        sheet = await accionesDia(page)
        await sheet.getByRole('button', { name: 'Copiar el día…', exact: true }).click()
        await page.getByRole('dialog', { name: 'Copiar el día a…', exact: true }).waitFor()
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'detached' })

        const conMarcas = await datos(page)
        await page.evaluate(async () => {
          const { exportarBackup, importarBackup } = await import('/src/shared/lib/backup.ts')
          await importarBackup(JSON.stringify(await exportarBackup()))
        })
        assert.deepEqual(await datos(page), conMarcas, 'backup de ida y vuelta')
        assert.deepEqual(errors, [])
        reports.push({ ...c, passed: true }); console.log(`${tag}: correcto`)
      } finally { await context.close() }
    }
    fs.writeFileSync(`${output}/informe.json`, JSON.stringify(reports, null, 2))
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
