/* Capturas de la web de la app (`public/conoce.html`) con datos de ejemplo inventados: Inicio, Hoy en Nutrición, Entreno y
   Cumbres, en claro y oscuro. Necesita Vite en 5173 (`npm run dev -- --host 127.0.0.1`) y Playwright (docs/desarrollo.md
   § Pruebas en navegador). Usa su propio origen, `appfit-demo.localhost`, con un contexto efímero: nunca toca datos reales.
   Escribe `public/conoce/<pantalla>-<tema>.webp` (540 px de ancho). Uso: node scripts/web/capturas-conoce.cjs */
const path = require('node:path')
const fs = require('node:fs')
const { chromium } = require('playwright')
const sharp = require('sharp')
const { navegar } = require('../ui/navegar.cjs')

const ORIGEN = 'http://appfit-demo.localhost:5173'
const SALIDA = path.join(__dirname, '../../public/conoce')
const HOY = '2026-11-04'

async function sembrar(page) {
  await page.evaluate(async (hoy) => {
    const { db } = await import('/src/shared/db/db.ts')
    const { updateSettings } = await import('/src/shared/db/settings.ts')
    const { addDays } = await import('/src/shared/lib/dates.ts')
    const ejercicios = await import('/src/features/gym/data/exercisesRepo.ts')
    const { PISTAS } = await import('/src/shared/lib/pistas.ts')
    const id = (catalogId) => ejercicios.resolverSeleccion({ tipo: 'catalogo', catalogId })
    const [banca, sentadilla, dominadas, muerto, militar] = await Promise.all(['appfit:press-banca', 'appfit:sentadilla', 'appfit:dominadas', 'appfit:peso-muerto', 'appfit:press-militar'].map(id))

    // Ocho semanas de entrenos (lunes, miércoles y viernes), con una progresión suave.
    let sesion = 0
    for (let d = -56; d <= -1; d++) {
      const fecha = addDays(hoy, d)
      const dia = new Date(`${fecha}T12:00:00`).getDay()
      if (![1, 3, 5].includes(dia)) continue
      const inicio = new Date(`${fecha}T19:00:00`).getTime()
      const w = await db.workouts.add({ inicio, fin: inicio + (55 + (sesion % 3) * 5) * 60000 })
      const plan = sesion % 2 === 0
        ? [[sentadilla, 60 + sesion * 1.25, 6], [banca, 40 + sesion * 0.5, 8], [dominadas, 0, 6]]
        : [[muerto, 70 + sesion * 1.5, 5], [militar, 25 + sesion * 0.25, 8], [banca, 40 + sesion * 0.5, 10]]
      let orden = 0
      for (const [exerciseId, peso, reps] of plan) {
        for (let k = 0; k < 3; k++) await db.sets.add({ workoutId: w, exerciseId, orden: orden++, reps, peso: Math.round(peso * 4) / 4, ...(peso === 0 ? { modoCarga: 'corporal' } : {}), createdAt: inicio + orden * 120000 })
      }
      sesion++
    }

    // Salidas a correr y una ruta de senderismo.
    for (const [d, tipo, km, desnivel] of [[-30, 'correr', 6.2, 40], [-23, 'correr', 7.1, 55], [-17, 'senderismo', 14.5, 720], [-9, 'correr', 8.0, 60], [-3, 'correr', 7.4, 45]]) {
      const fecha = addDays(hoy, d)
      const inicio = new Date(`${fecha}T09:30:00`).getTime()
      await db.actividades.add({ tipo, fecha, inicio, duracionSeg: Math.round(km * (tipo === 'correr' ? 330 : 900)), distanciaM: km * 1000, desnivelM: desnivel, origen: 'manual', createdAt: inicio })
    }

    // Comidas: hoy, con nombres de verdad; los días anteriores, un total por comida.
    const comidas = [
      ['desayuno', 'Tostada de pan integral con aceite y tomate', 120, 260, 7, 30, 12],
      ['desayuno', 'Café con leche', 250, 95, 6, 9, 4],
      ['comida', 'Lentejas estofadas', 350, 420, 26, 55, 9],
      ['comida', 'Ensalada de tomate y pepino', 200, 60, 2, 8, 2],
      ['comida', 'Yogur natural', 125, 75, 5, 6, 4],
      ['snack', 'Plátano', 120, 110, 1, 25, 0],
    ]
    let t = 1
    for (const [comida, nombre, gramos, kcal, prot, carb, grasa] of comidas) await db.entries.add({ fecha: hoy, comida, nombre, gramos, kcal, prot, carb, grasa, createdAt: t++ })
    for (let d = -40; d <= -1; d++) {
      if (d % 9 === 0) continue
      const fecha = addDays(hoy, d)
      for (const [comida, kcal] of [['desayuno', 420], ['comida', 760], ['cena', 640 + (d % 4) * 40]]) {
        await db.entries.add({ fecha, comida, nombre: 'Comida', gramos: 400, kcal, prot: kcal * 0.24 / 4, carb: kcal * 0.48 / 4, grasa: kcal * 0.28 / 9, createdAt: t++ })
      }
    }

    // Pesajes: de 66,0 a 63,6 kg en dos meses.
    for (let d = -60; d <= 0; d += 3) await db.pesos.add({ fecha: addDays(hoy, d), kg: Math.round((66 - (d + 60) * 0.04) * 10) / 10 })

    await updateSettings({
      bienvenidaPendiente: undefined, sinObjetivos: undefined, textosLegalesAceptados: '2026-11-05',
      perfil: { sexo: 'mujer', fechaNacimiento: '1994-03-12', alturaCm: 168, actividad: 'moderado', objetivo: 'mantenimiento' },
      cumbres: { inicio: addDays(hoy, -56), ruta: ['aneto', 'mulhacen', 'teide'] },
      caminos: { inicio: addDays(hoy, -56), ruta: ['inca', 'ingles'] },
      ultimaExportacion: Date.now(), resumenMesCerrado: '2026-10', revisionSemanalCerrada: '2026-11-02',
      pistasVistas: Object.keys(PISTAS).sort(),
    })
  }, HOY)
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true })
  const browser = await chromium.launch({ ...(process.env.APPFIT_CHROMIUM ? { executablePath: process.env.APPFIT_CHROMIUM } : {}), args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-demo.localhost 127.0.0.1'] })
  try {
    for (const tema of ['dark', 'light']) {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: tema, reducedMotion: 'reduce', timezoneId: 'Europe/Madrid', locale: 'es-ES', serviceWorkers: 'block' })
      const page = await ctx.newPage()
      await page.clock.setFixedTime(new Date(`${HOY}T21:15:00`))
      await page.addLocatorHandler(page.getByRole('button', { name: 'Genial', exact: true }), async (b) => { await b.click() })
      await page.goto(ORIGEN)
      await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
      await sembrar(page)
      await page.reload()
      await page.getByRole('button', { name: 'Registrar peso', exact: true }).waitFor()
      const capturar = async (nombre) => {
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(900)
        for (let i = 0; i < 4 && await page.locator('.sheet-layer[data-visible=true]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400) }
        const png = await page.screenshot()
        await sharp(png).resize({ width: 540 }).webp({ quality: 78 }).toFile(path.join(SALIDA, `${nombre}-${tema === 'dark' ? 'oscuro' : 'claro'}.webp`))
      }
      await capturar('inicio')
      await navegar(page, 'Nutrición'); await page.getByRole('heading').first().waitFor(); await capturar('nutricion')
      // El último entreno, desde el historial: ejercicios con su imagen, series y récords.
      await navegar(page, 'Entreno')
      await page.getByRole('main').getByRole('tab', { name: 'Historial', exact: true }).click()
      await page.getByRole('main').locator('ul button, ul a').first().click()
      await page.waitForTimeout(600)
      await capturar('entreno')
      await page.keyboard.press('Escape')
      await navegar(page, 'Cumbres'); await page.getByRole('heading').first().waitFor(); await capturar('cumbres')
      await ctx.close()
    }
  } finally { await browser.close() }
  console.log(`Capturas en ${SALIDA}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
