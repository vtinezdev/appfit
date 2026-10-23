/*
 * Mide cuánto tardan las lecturas derivadas de la gamificación (experiencia, Cumbres, Caminos y Vitrina) con un historial
 * sintético de 3 años (500 entrenos, 12.500 series, 8.000 entradas, 300 actividades y 600 días con pasos), en Chromium con
 * la CPU ralentizada 4× (aprox. un móvil medio). Solo en el origen de pruebas, en un contexto efímero: no toca datos reales.
 * Compara las lecturas sueltas de siempre con el lector compartido (`experiencia/hooks/useProgreso`, REN-01).
 * Uso: node scripts/ui/medir-progreso.cjs   (con `npm run dev` en 5173; APPFIT_CHROMIUM opcional; APPFIT_CPU=1 sin ralentizar)
 */
const { chromium } = require('playwright')

const ORIGEN = 'http://appfit-test.localhost:5173'
const CPU = Number(process.env.APPFIT_CPU || 4)
const REPETICIONES = 5

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.APPFIT_CHROMIUM || undefined, args: ['--no-sandbox', '--host-resolver-rules=MAP appfit-test.localhost 127.0.0.1'] })
  const context = await browser.newContext({ timezoneId: 'Europe/Madrid', serviceWorkers: 'block' })
  const page = await context.newPage()
  await page.goto(ORIGEN)
  await page.getByRole('navigation', { name: 'Navegación principal' }).waitFor()
  const resumen = await page.evaluate(async () => {
    const { db } = await import('/src/shared/db/db.ts')
    const { updateSettings } = await import('/src/shared/db/settings.ts')
    const { MONTANAS } = await import('/src/features/cumbres/lib/montanas.ts')
    const { RUTAS } = await import('/src/features/caminos/lib/rutas.ts')
    await Promise.all(db.tables.map((t) => t.clear()))
    // Generador determinista (mismos datos en cada ejecución).
    let semilla = 42
    const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
    const dia = 86_400_000
    const fin = new Date('2026-10-23T12:00:00').getTime()
    const inicio = fin - 3 * 365 * dia
    const iso = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    const zonas = ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'cuadriceps', 'isquios', 'gluteos', 'gemelos', 'abdominales', 'trapecio', 'antebrazos']
    const exIds = await db.exercises.bulkAdd(zonas.map((z, i) => ({ nombre: `Ejercicio ${i + 1}`, nombreNorm: `ejercicio ${i + 1}`, grupo: z, primaryMuscles: [z] })), { allKeys: true })
    const workouts = [], sets = []
    for (let w = 0; w < 500; w++) {
      const ini = inicio + Math.floor((w / 500) * 3 * 365) * dia + 18 * 3_600_000
      workouts.push({ inicio: ini, fin: ini + 3_900_000 })
    }
    const wIds = await db.workouts.bulkAdd(workouts, { allKeys: true })
    wIds.forEach((id, w) => {
      for (let e = 0; e < 5; e++) {
        const ex = exIds[(w * 5 + e) % exIds.length]
        for (let s = 0; s < 5; s++) sets.push({ workoutId: id, exerciseId: ex, orden: e * 5 + s, reps: 6 + Math.floor(azar() * 6), peso: 20 + Math.round((w / 500) * 40 + azar() * 10), createdAt: workouts[w].inicio + s, realizada: true })
      }
    })
    await db.sets.bulkAdd(sets)
    const comidas = ['desayuno', 'comida', 'cena', 'snack']
    const nombres = ['Arroz', 'Pollo', 'Huevos', 'Avena', 'Leche', 'Plátano', 'Manzana', 'Pan', 'Yogur', 'Lentejas', 'Atún', 'Tomate']
    const entries = []
    for (let i = 0; i < 8000; i++) {
      const fecha = iso(inicio + Math.floor((i / 8000) * 3 * 365) * dia)
      const g = 50 + Math.round(azar() * 200)
      entries.push({ fecha, comida: comidas[i % 4], nombre: nombres[i % nombres.length], gramos: g, kcal: g * 1.5, prot: g * 0.1, carb: g * 0.15, grasa: g * 0.05, createdAt: inicio + i })
    }
    await db.entries.bulkAdd(entries)
    const actividades = []
    for (let i = 0; i < 300; i++) {
      const ini = inicio + Math.floor((i / 300) * 3 * 365) * dia + 9 * 3_600_000
      const m = 3000 + Math.round(azar() * 9000)
      actividades.push({ tipo: i % 3 === 0 ? 'correr' : 'caminar', fecha: iso(ini), inicio: ini, duracionSeg: m * 0.6, distanciaM: m, desnivelM: Math.round(azar() * 200), origen: 'manual' })
    }
    await db.actividades.bulkAdd(actividades)
    await db.pasos.bulkAdd(Array.from({ length: 600 }, (_, i) => ({ fecha: iso(inicio + i * dia), pasos: 4000 + Math.round(azar() * 8000), createdAt: inicio, updatedAt: inicio })))
    const empezo = iso(inicio)
    await updateSettings({ cumbres: { inicio: empezo, ruta: [MONTANAS[0].id] }, caminos: { inicio: empezo, ruta: [RUTAS[0].id] } })
    return { workouts: await db.workouts.count(), sets: await db.sets.count(), entries: await db.entries.count(), actividades: await db.actividades.count(), pasos: await db.pasos.count() }
  })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  const tiempos = await page.evaluate(async (repeticiones) => {
    const { leerExperiencia } = await import('/src/features/experiencia/hooks/useExperiencia.ts')
    const { leerCumbres } = await import('/src/features/cumbres/hooks/useCumbres.ts')
    const { leerCaminos } = await import('/src/features/caminos/hooks/useCaminos.ts')
    const { leerVitrina } = await import('/src/features/vitrina/hooks/useVitrina.ts')
    const { crearAlmacenProgreso } = await import('/src/features/experiencia/hooks/useProgreso.ts')
    // Con el lector compartido: n pantallas se suscriben a la vez a un almacén nuevo y se espera a que llegue el resultado.
    const pantallas = (almacen, n) => new Promise((ok) => {
      const soltar = []
      for (let i = 0; i < n; i++) soltar.push(almacen.suscribir(hoy, () => { if (almacen.valor(hoy)) { soltar.forEach((s) => s()); ok() } }))
      if (almacen.valor(hoy)) { soltar.forEach((s) => s()); ok() }
    })
    const yaCalculado = crearAlmacenProgreso(leerVitrina, 60_000)
    await pantallas(yaCalculado, 1)
    const hoy = '2026-10-23'
    const casos = {
      'experiencia (Ritmo, revisión semanal)': () => leerExperiencia(hoy),
      'Cumbres': () => leerCumbres(hoy),
      'Caminos': () => leerCaminos(hoy),
      'Vitrina (Inicio, VitrinaTab)': () => leerVitrina(hoy),
      'Fin de sesión (Cumbres + 2 × Vitrina)': () => Promise.all([leerCumbres(hoy), leerVitrina(hoy), leerVitrina(hoy)]),
      'Fin de sesión con el lector compartido (3 pantallas, 1 cálculo)': () => pantallas(crearAlmacenProgreso(leerVitrina, 0), 3),
      'Volver a otra sección dentro del margen (ya calculado)': () => pantallas(yaCalculado, 1),
    }
    const res = {}
    for (const [nombre, f] of Object.entries(casos)) {
      await f() // calentamiento (JIT, caché de módulos)
      const ms = []
      for (let i = 0; i < repeticiones; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t) }
      ms.sort((a, b) => a - b)
      res[nombre] = Math.round(ms[Math.floor(ms.length / 2)])
    }
    return res
  }, REPETICIONES)
  console.log(JSON.stringify({ cpu: `${CPU}×`, datos: resumen, medianaMs: tiempos }, null, 2))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
