/* Iconos topográficos: datos sintéticos, componentes reales y contextos efímeros del origen de pruebas. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { navegar, cerrarCelebraciones, marcarLogrosVistos } = require('./auditoria-comun.cjs')
const fixture = JSON.parse(fs.readFileSync('src/test/fixtures/backup-v1.json', 'utf8'))
const output = process.env.APPFIT_UI_OUTPUT || '/tmp/appfit-insignias'
fs.mkdirSync(output, { recursive: true })

async function backup(page) {
  return page.evaluate(async () => {
    const { exportarBackup } = await import('/src/shared/lib/backup.ts')
    const b = await exportarBackup(); delete b.exportedAt
    return JSON.parse(JSON.stringify(b))
  })
}
async function comprobar(page, target, tag) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${output}/${tag}.png`, animations: 'disabled' })
  const geometria = await target.evaluate(e => {
    const r = e.getBoundingClientRect()
    return { overflow: e.scrollWidth > e.clientWidth + 1 || r.right > innerWidth + 1,
      recortes: [...e.querySelectorAll('svg.app-insignia clipPath')].map(n => n.id),
      iconos: [...e.querySelectorAll('svg.app-insignia')].map(n => {
        const b = n.getBoundingClientRect()
        return { oculto: n.getAttribute('aria-hidden'), ancho: b.width, alto: b.height }
      }) }
  })
  assert.equal(geometria.overflow, false, `${tag}: sin desbordamiento`)
  assert.equal(new Set(geometria.recortes).size, geometria.recortes.length, `${tag}: recortes únicos`)
  assert.ok(geometria.iconos.every(i => i.oculto === 'true' && i.ancho >= 40 && i.alto >= 40), `${tag}: decorativos y sin encoger`)
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const casos = [320, 375, 430].flatMap(width => ['light', 'dark'].map(theme => ({ width, theme })))
  casos.push(...['light', 'dark'].map(theme => ({ width: 375, theme, large: true })))
  const informe = []
  try {
    for (const c of casos) {
      const tag = `${c.width}-${c.theme}${c.large ? '-texto200' : ''}`
      if (process.env.APPFIT_UI_CASE && tag !== process.env.APPFIT_UI_CASE) continue
      const context = await browser.newContext({ viewport: { width: c.width, height: 932 }, timezoneId: 'Europe/Madrid', colorScheme: c.theme, reducedMotion: c.large ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      try {
        const page = await context.newPage(), errores = []
        await cerrarCelebraciones(page)
        page.on('pageerror', e => errores.push(e.message))
        await page.goto('http://appfit-test.localhost:5173')
        await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
        await page.evaluate(async ({ fixture, theme }) => {
          const { importarBackup } = await import('/src/shared/lib/backup.ts')
          const { db } = await import('/src/shared/db/db.ts')
          const { updateSettings } = await import('/src/shared/db/settings.ts')
          const { todayISO, addDays, startOfWeek } = await import('/src/shared/lib/dates.ts')
          await importarBackup(JSON.stringify(fixture))
          await updateSettings({ gamificacionVisible: true, gamificacionConNutricion: true })
          await db.workouts.clear(); await db.sets.clear(); await db.exercises.clear(); await db.routines.clear()
          const semanas = [1, 4, 7, 10, 13, 16]
          const nombres = ['Press banca', 'Remo con mancuerna', 'Sentadilla frontal', 'Curl de bíceps con barra', 'Elevaciones laterales', 'Press militar con barra de pie y agarre abierto']
          await db.exercises.bulkAdd(nombres.map((nombre, i) => ({ id: i + 1, nombre, nombreNorm: nombre.toLowerCase(), grupo: 'hombros', primaryMuscles: ['hombros'] })))
          let id = 1
          for (let semana = 0; semana < 16; semana++) {
            const fecha = addDays(startOfWeek(todayISO()), -7 * (15 - semana))
            const inicio = new Date(`${fecha}T07:00:00`).getTime()
            await db.workouts.add({ id: semana + 1, inicio, fin: inicio + 3600000 })
            for (let ejercicio = 0; ejercicio < semanas.length; ejercicio++) {
              if (semana < 16 - semanas[ejercicio]) continue
              for (let serie = 0; serie < 5; serie++) await db.sets.add({ id: id++, workoutId: semana + 1, exerciseId: ejercicio + 1, orden: serie, reps: 10, peso: 20 + semana, createdAt: inicio })
            }
          }
          localStorage.setItem('appfit:theme', theme); document.documentElement.dataset.theme = theme
        }, { fixture, theme: c.theme })
        if (c.large) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await marcarLogrosVistos(page)
        const antes = await backup(page)
        await navegar(page, 'Vitrina')
        await page.getByRole('heading', { name: 'Vitrina', exact: true }).waitFor()
        const principal = page.locator('main')
        await principal.getByRole('region', { name: 'Ocultos', exact: true }).waitFor()
        assert.equal(await principal.locator('.logros-rejilla svg.app-insignia').count(), 59)
        const ocultos = principal.getByRole('region', { name: 'Ocultos', exact: true })
        const cerrados = ocultos.locator('li').filter({ hasText: 'Logro oculto' })
        const dibujos = await cerrados.evaluateAll(filas => filas.map(l => l.querySelector('svg').outerHTML.replace(/id="[^"]+"/g, 'id="ID"').replace(/url\(#[^)]+\)/g, 'url(#ID)')))
        assert.ok(dibujos.length >= 2)
        assert.equal(new Set(dibujos).size, 1, 'todos los ocultos sin conseguir tienen el mismo candado, sin pistas en el SVG')
        await comprobar(page, principal, `${tag}-vitrina`)

        await navegar(page, 'Entreno')
        await page.getByRole('tab', { name: 'Progreso', exact: true }).click()
        await page.getByRole('heading', { name: 'Ligas', exact: true }).waitFor()
        assert.equal(await principal.locator('svg.app-insignia').count(), 6)
        await comprobar(page, principal, `${tag}-ligas`)
        await principal.getByRole('region', { name: 'Ligas', exact: true }).getByRole('button', { name: /^Press militar con barra de pie/ }).click()
        await principal.getByRole('heading', { name: 'Liga', exact: true }).waitFor()
        await comprobar(page, principal, `${tag}-detalle-elite`)
        assert.deepEqual(await backup(page), antes, 'consultar Vitrina y ligas no cambia registros')

        // Galería con todos los estados usando los componentes reales; no altera datos ni la navegación de la app.
        await page.evaluate(async () => {
          const recursos = performance.getEntriesByType('resource').map(r => r.name)
          const [react, dom, { default: Logros }, { default: IconoLiga }, { default: Ascensos }, { default: Nuevos }, { leerCumbres }, { calcularVitrina }, { divisionDe }, { todayISO }] = await Promise.all([
            import(recursos.find(u => /\/deps\/react\.js\?/.test(u))), import(recursos.find(u => /\/deps\/react-dom_client\.js\?/.test(u))),
            import('/src/features/vitrina/components/LogrosVista.tsx'), import('/src/features/liga/components/IconoLiga.tsx'),
            import('/src/features/liga/components/AscensosLiga.tsx'), import('/src/features/vitrina/components/NuevosLogros.tsx'),
            import('/src/features/cumbres/hooks/useCumbres.ts'), import('/src/features/vitrina/lib/vitrina.ts'),
            import('/src/features/liga/lib/liga.ts'), import('/src/shared/lib/dates.ts'),
          ])
          const R = react.default ?? react, estado = await leerCumbres(todayISO())
          const originales = calcularVitrina({ hoy: todayISO(), experiencia: estado.resultado, ...estado.datos, categorias: new Map(), conNutricion: true, pausas: estado.pausas, cumbres: estado.cumbres }).logros
          const conseguidos = originales.map(l => ({ ...l, niveles: l.umbrales ? l.umbrales.map(() => ({ fecha: todayISO(), workoutId: 16 })) : [], veces: l.umbrales ? undefined : [{ fecha: todayISO(), workoutId: 16 }] }))
          const pendientes = originales.map(l => ({ ...l, niveles: l.umbrales ? l.umbrales.map(() => null) : [], veces: [] }))
          const host = document.createElement('div')
          host.id = 'insignias-prueba'
          host.className = 'fixed inset-0 z-50 overflow-y-auto bg-bg px-page py-5 space-y-section'
          document.body.append(host)
          const root = (dom.default ?? dom).createRoot(host)
          const render = logros => root.render(R.createElement(R.Fragment, null,
            R.createElement('div', { className: 'flex flex-wrap gap-3', 'aria-label': 'Todas las ligas' }, [1, 4, 7, 10, 13, 16].map(p => R.createElement('div', { key: p }, R.createElement(IconoLiga, { liga: divisionDe(p).liga, tamano: 'lg' }), R.createElement('p', { className: 'text-body text-fg' }, divisionDe(p).liga)))),
            R.createElement(Logros, { logros }), R.createElement(Ascensos, { workoutId: 16, nombres: { 6: 'Press militar' } }), R.createElement(Nuevos, { workoutId: 16 })))
          render(conseguidos)
          window.__insigniasPrueba = { root, host, render, pendientes }
        })
        const galeria = page.locator('#insignias-prueba')
        await galeria.getByText('152 piezas', { exact: false }).waitFor()
        await galeria.getByRole('region', { name: 'Nuevo en la Vitrina' }).waitFor()
        await galeria.getByRole('region', { name: 'Ligas', exact: true }).locator('svg.app-insignia').first().waitFor()
        await galeria.getByRole('region', { name: 'Nuevo en la Vitrina' }).locator('svg.app-insignia').first().waitFor()
        await comprobar(page, galeria, `${tag}-conseguidos`)
        for (const grupo of ['Entreno', 'Constancia', 'Cumbres', 'Caminos', 'Nutrición', 'Ocultos']) {
          const seccion = galeria.getByRole('region', { name: grupo, exact: true })
          await seccion.screenshot({ path: `${output}/${tag}-${grupo}.png`, animations: 'disabled' })
        }
        await page.evaluate(() => window.__insigniasPrueba.render(window.__insigniasPrueba.pendientes))
        await galeria.getByRole('region', { name: 'Ocultos', exact: true }).getByText('Logro oculto', { exact: true }).first().waitFor()
        await comprobar(page, galeria, `${tag}-pendientes`)
        assert.deepEqual(await backup(page), antes)
        assert.deepEqual(errores, [])
        informe.push({ caso: tag, logros: 59, ligas: 6, correcto: true })
        console.log(`${tag}: correcto`)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  fs.writeFileSync(`${output}/informe.json`, JSON.stringify(informe, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
