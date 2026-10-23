import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import { updateSettings } from '../../../shared/db/settings'
import { leerCaminos } from '../../caminos/hooks/leerCaminos'
import { leerCumbres } from '../../cumbres/hooks/leerCumbres'
import { MONTANAS } from '../../cumbres/lib/montanas'
import { RUTAS } from '../../caminos/lib/rutas'
import { leerExperiencia } from './leerExperiencia'
import { caminosDe, cumbresDe, experienciaDe } from './selectoresProgreso'
import { crearAlmacenProgreso, leerProgreso, type EstadoProgreso } from './useProgreso'

const HOY = '2026-10-23'
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Hasta que se cumpla `cond` (las notificaciones de liveQuery son asíncronas). */
async function hasta(cond: () => boolean) {
  for (let i = 0; i < 200 && !cond(); i++) await espera(5)
  expect(cond()).toBe(true)
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('crearAlmacenProgreso', () => {
  const OCULTO: EstadoProgreso = { visible: false }

  it('varias pantallas con el mismo día comparten un único cálculo y todas reciben el resultado', async () => {
    const leer = vi.fn(async (_hoy: string) => OCULTO)
    const almacen = crearAlmacenProgreso(leer, 20)
    const avisos = [vi.fn(), vi.fn(), vi.fn()]
    const soltar = avisos.map((a) => almacen.suscribir(HOY, a))
    await hasta(() => avisos.every((a) => a.mock.calls.length > 0))
    expect(leer).toHaveBeenCalledTimes(1)
    expect(almacen.valor(HOY)).toBe(OCULTO)
    soltar.forEach((s) => s())
  })

  it('cada día se calcula por separado', async () => {
    const leer = vi.fn(async (_hoy: string) => OCULTO)
    const almacen = crearAlmacenProgreso(leer, 20)
    const a = almacen.suscribir(HOY, () => {})
    const b = almacen.suscribir('2026-10-24', () => {})
    await hasta(() => leer.mock.calls.length === 2)
    expect(leer.mock.calls.map((c) => c[0]).sort()).toEqual([HOY, '2026-10-24'])
    a(); b()
  })

  it('al soltarlo la última pantalla se conserva un margen: volver dentro de él no recalcula; pasado, sí', async () => {
    const leer = vi.fn(async (_hoy: string) => OCULTO)
    const almacen = crearAlmacenProgreso(leer, 40)
    almacen.suscribir(HOY, () => {})()
    await hasta(() => almacen.valor(HOY) !== undefined)
    const otra = almacen.suscribir(HOY, () => {}) // dentro del margen: mismo cálculo
    expect(almacen.valor(HOY)).toBe(OCULTO)
    expect(leer).toHaveBeenCalledTimes(1)
    otra()
    await espera(80)
    expect(almacen.valor(HOY)).toBeUndefined() // pasado el margen se libera
    const nueva = vi.fn()
    almacen.suscribir(HOY, nueva)
    await hasta(() => nueva.mock.calls.length > 0)
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('se recalcula cuando cambian los datos que lee (liveQuery), sin volver a suscribirse', async () => {
    const almacen = crearAlmacenProgreso(async () => ({ visible: false, n: await db.pesos.count() }) as unknown as EstadoProgreso, 20)
    const aviso = vi.fn()
    const soltar = almacen.suscribir(HOY, aviso)
    await hasta(() => aviso.mock.calls.length === 1)
    await db.pesos.add({ fecha: HOY, kg: 80, createdAt: 0 } as never)
    await hasta(() => aviso.mock.calls.length === 2)
    expect((almacen.valor(HOY) as unknown as { n: number }).n).toBe(1)
    soltar()
  })
})

describe('selectores del lector compartido', () => {
  it('dan lo mismo que las lecturas de siempre sobre los mismos datos', async () => {
    const [ex] = await db.exercises.bulkAdd([{ nombre: 'Press', nombreNorm: 'press', grupo: 'pecho', primaryMuscles: ['pecho'] }], { allKeys: true })
    for (const [i, fecha] of ['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-19', '2026-10-21'].entries()) {
      const inicio = new Date(`${fecha}T18:00:00`).getTime()
      const id = await db.workouts.add({ inicio, fin: inicio + 3_600_000 } as never)
      await db.sets.bulkAdd(Array.from({ length: 6 }, (_, o) => ({ workoutId: id, exerciseId: ex, orden: o, reps: 8, peso: 50 + i * 2.5, createdAt: inicio + o })) as never)
    }
    await db.entries.bulkAdd([{ fecha: '2026-10-20', comida: 'comida', nombre: 'Arroz', gramos: 200, kcal: 260, prot: 5, carb: 56, grasa: 1, createdAt: 1 }] as never)
    await db.actividades.add({ tipo: 'caminar', fecha: '2026-10-20', inicio: new Date('2026-10-20T09:00:00').getTime(), duracionSeg: 3600, distanciaM: 5200, origen: 'manual' } as never)
    await updateSettings({ cumbres: { inicio: '2026-10-01', ruta: [MONTANAS[0].id] }, caminos: { inicio: '2026-10-01', ruta: [RUTAS[0].id] } })

    const progreso = await leerProgreso(HOY)
    expect(progreso.visible).toBe(true)
    expect(experienciaDe(progreso)).toMatchObject(await leerExperiencia(HOY))
    expect(cumbresDe(progreso)).toMatchObject(await leerCumbres(HOY))
    expect(caminosDe(progreso)).toEqual(await leerCaminos(HOY))
  })

  it('con la gamificación oculta, todos dicen «oculto»', async () => {
    await updateSettings({ gamificacionVisible: false })
    const progreso = await leerProgreso(HOY)
    expect(experienciaDe(progreso)).toEqual({ visible: false })
    expect(cumbresDe(progreso)).toEqual({ visible: false })
    expect(caminosDe(progreso)).toEqual({ visible: false })
  })
})
