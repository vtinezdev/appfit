/* «Tu mes» (B15): tarjeta de Inicio y resumen de octubre con datos sintéticos (entrenos con récords de peso, lastre y sin
   peso, actividades, comidas, Cumbres y Caminos), con la fecha fija en el 4 de noviembre de 2026. Contextos efímeros del origen
   de pruebas: 320/375/430 px en ambos temas. Comprueba sin scroll horizontal, controles de 44 px, sin errores, desplegables
   y que consultar el resumen no escribe datos. Capturas en /tmp/appfit-tu-mes; APPFIT_UI_CASE, APPFIT_UI_OUTPUT y
   APPFIT_CHROMIUM como en el resto. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const out = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-tu-mes'; fs.mkdirSync(out, { recursive: true })
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
;(async () => {
  const browser = await chromium.launch({ ...(process.env.APPFIT_CHROMIUM ? { executablePath: process.env.APPFIT_CHROMIUM } : {}), args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = [320, 375, 430].flatMap(w => ['light', 'dark'].map(t => ({ w, t })))
  for (const c of casos) {
    const tag = `${c.w}-${c.t}`
    if (process.env.APPFIT_UI_CASE && process.env.APPFIT_UI_CASE !== tag) continue
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 900 }, timezoneId: 'Europe/Madrid', colorScheme: c.t, serviceWorkers: 'block' })
    const page = await ctx.newPage(); const errores = []
    await page.clock.setFixedTime(new Date('2026-11-04T10:00:00'))
    page.on('pageerror', e => errores.push(e.message)); page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
    await page.goto('http://appfit-test.localhost:5173')
    await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
    await page.evaluate(async ({ fixture, theme }) => {
      const { importarBackup } = await import('/src/shared/lib/backup.ts')
      const { db } = await import('/src/shared/db/db.ts')
      const { updateSettings } = await import('/src/shared/db/settings.ts')
      await importarBackup(JSON.stringify(fixture))
      await updateSettings({ gamificacionVisible: true, gamificacionConNutricion: true, resumenMesCerrado: undefined,
        cumbres: { inicio: '2026-09-01', ruta: ['aneto', 'mulhacen', 'teide'] }, caminos: { inicio: '2026-09-01', ruta: ['inca', 'ingles'] } })
      await db.workouts.clear(); await db.sets.clear(); await db.exercises.clear(); await db.routines.clear(); await db.actividades.clear(); await db.entries.clear()
      await db.exercises.bulkAdd([
        { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'pecho', primaryMuscles: ['pecho'] },
        { id: 2, nombre: 'Sentadilla', nombreNorm: 'sentadilla', grupo: 'piernas', primaryMuscles: ['cuadriceps'] },
        { id: 3, nombre: 'Flexiones', nombreNorm: 'flexiones', grupo: 'pecho', primaryMuscles: ['pecho'] },
        { id: 4, nombre: 'Dominadas con lastre y nombre largo para probar', nombreNorm: 'dominadas', grupo: 'espalda', primaryMuscles: ['dorsales'] },
      ])
      const dias = ['2026-09-10', '2026-09-20', '2026-10-01', '2026-10-03', '2026-10-06', '2026-10-08', '2026-10-10', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-17', '2026-10-20', '2026-10-22', '2026-10-27', '2026-10-29']
      let sid = 1
      for (let i = 0; i < dias.length; i++) {
        const inicio = new Date(`${dias[i]}T18:00:00`).getTime()
        await db.workouts.add({ id: i + 1, inicio, fin: inicio + (50 + i) * 60000 })
        for (let k = 0; k < 4; k++) {
          await db.sets.add({ id: sid++, workoutId: i + 1, exerciseId: 1, orden: k, reps: 5, peso: 70 + i * 1.25, createdAt: inicio })
          await db.sets.add({ id: sid++, workoutId: i + 1, exerciseId: 2, orden: 4 + k, reps: 5, peso: 90 + i * 2.5, createdAt: inicio })
          await db.sets.add({ id: sid++, workoutId: i + 1, exerciseId: 3, orden: 8 + k, reps: 15 + i, peso: 0, modoCarga: 'corporal', createdAt: inicio })
          await db.sets.add({ id: sid++, workoutId: i + 1, exerciseId: 4, orden: 12 + k, reps: 6, peso: 5 + i, modoCarga: 'lastre', createdAt: inicio })
        }
      }
      const acts = [['2026-10-04', 'correr', 10], ['2026-10-05', 'senderismo', 21.4], ['2026-10-11', 'correr', 8], ['2026-10-12', 'caminar', 6], ['2026-10-18', 'correr', 12], ['2026-10-19', 'senderismo', 14], ['2026-10-25', 'correr', 10], ['2026-10-31', 'correr', 5]]
      let aid = 1
      for (const [fecha, tipo, km] of acts) {
        const inicio = new Date(`${fecha}T09:00:00`).getTime()
        const recorrido = tipo === 'senderismo' ? [[[40.7, -4.0, 1200], [40.71, -4.01, 1300], [40.72, -4.0, 1400], [40.715, -3.99, 1350], [40.7, -3.995, 1250]]] : undefined
        await db.actividades.add({ id: aid++, tipo, fecha, inicio, duracionSeg: km * 330, distanciaM: km * 1000, desnivelM: tipo === 'senderismo' ? 640 : 40, origen: 'manual', ...(recorrido ? { recorrido, nombre: 'Ruta de Cercedilla' } : {}), createdAt: inicio })
      }
      const sin = new Set([2, 9, 16, 23, 30])
      for (let d = 1; d <= 31; d++) {
        if (sin.has(d)) continue
        const fecha = `2026-10-${String(d).padStart(2, '0')}`
        const kcal = [2300, 1800, 2500, 2900, 2200][d % 5]
        await db.entries.add({ fecha, comida: 'comida', nombre: 'Comida', gramos: 500, kcal, prot: kcal * 0.27 / 4, carb: kcal * 0.45 / 4, grasa: kcal * 0.28 / 9, createdAt: d })
      }
      localStorage.setItem('appfit:theme', theme); document.documentElement.dataset.theme = theme
    }, { fixture, theme: c.t })
    await page.reload(); await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
    const tarjeta = page.getByRole('region', { name: 'Tu octubre' })
    await tarjeta.waitFor({ timeout: 15000 })
    await page.waitForTimeout(800)
    for (let i = 0; i < 5 && await page.locator('.sheet-layer[data-visible=true]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(500) }
    await page.evaluate(() => document.fonts.ready)
    await tarjeta.screenshot({ path: `${out}/${tag}-tarjeta.png` })
    assert.match(await tarjeta.innerText(), /1 cumbre · 1 camino · 4 récords/)
    const antes = await backup(page)
    await tarjeta.getByRole('button', { name: /Ver el resumen/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('region', { name: 'Entreno' }).waitFor({ timeout: 15000 })
    // Abrir todos los desplegables
    for (const n of ['Caminos', 'Logros']) { const b = dialog.getByRole('button', { name: new RegExp('^' + n) }); if (await b.count()) await b.first().click() }
    await page.waitForTimeout(300)
    const texto = await dialog.innerText()
    for (const t of ['13 entrenos, 1 cumbre y 1 camino terminado.', 'Lo mejor del mes', 'Aneto', 'Camino Inca', 'Récords', 'Peso máximo', 'Lastre máximo', 'Sin peso', 'Tus días frente al objetivo', 'La salida más larga', 'Ruta de Cercedilla'])
      assert.ok(texto.toLowerCase().includes(t.toLowerCase()), `${tag}: falta «${t}»`)
    assert.ok(!/septiembre/.test(texto), `${tag}: sin comparaciones con el mes anterior`)
    const geo = await page.evaluate(() => {
      const sc = [...document.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'hidden' && getComputedStyle(e).overflowX !== 'clip' && e.clientWidth > 0).map(e => e.className.toString().slice(0, 60))
      const pequeños = [...document.querySelectorAll('[role=dialog] button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44) }).map(b => b.textContent.slice(0, 30))
      return { docOverflow: document.documentElement.scrollWidth > innerWidth, sc, pequeños }
    })
    // Captura completa del contenido de la página modal
    const alto = await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); const s = [...d.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return s ? s.scrollHeight + 200 : 3000 })
    await page.setViewportSize({ width: c.w, height: Math.min(alto, 7000) })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/${tag}-resumen.png` })
    assert.equal(geo.docOverflow, false, `${tag}: sin scroll horizontal`)
    assert.deepEqual(geo.sc, [], `${tag}: nada desborda`)
    assert.deepEqual(geo.pequeños, [], `${tag}: controles de 44 px`)
    assert.deepEqual(errores, [], `${tag}: sin errores`)
    assert.deepEqual(await backup(page), antes, `${tag}: consultar no escribe`)
    console.log(tag, 'correcto')
    await ctx.close()
  }
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
