import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { anadirLectura, pausar } from '../lib/grabacion'
import * as repo from './actividadesRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const ahora = new Date(2026, 9, 12, 12).getTime()
const base: repo.NuevaActividad = { tipo: 'caminar', inicio: new Date(2026, 9, 12, 8).getTime(), duracionSeg: 3600, distanciaM: 5000.4, origen: 'manual' }

describe('actividades terminadas', () => {
  it('crea con la fecha local del inicio, cifras redondeadas y sin textos vacíos', async () => {
    const id = await repo.crear({ ...base, nombre: '  ', notas: ' Con niebla ' }, ahora)
    const a = await repo.obtener(id)
    expect(a).toMatchObject({ fecha: '2026-10-12', distanciaM: 5000, notas: 'Con niebla', createdAt: ahora })
    expect(a).not.toHaveProperty('nombre')
    expect(a).not.toHaveProperty('recorrido')
  })

  it('no guarda una actividad inválida', async () => {
    await expect(repo.crear({ ...base, distanciaM: 0 }, ahora)).rejects.toThrow(repo.ActividadInvalida)
    expect(await db.actividades.count()).toBe(0)
  })

  it('simplifica el recorrido importado', async () => {
    const recta = Array.from({ length: 100 }, (_, i): [number, number] => [42.88 + i * 0.0001, -8.54])
    const id = await repo.crear({ ...base, origen: 'gpx', recorrido: [recta] }, ahora)
    expect((await repo.obtener(id))?.recorrido?.[0]).toHaveLength(2)
  })

  it('actualiza, recalcula la fecha y quita el desnivel vacío', async () => {
    const id = await repo.crear({ ...base, desnivelM: 300 }, ahora)
    await repo.actualizar(id, { inicio: new Date(2026, 9, 10, 9).getTime(), desnivelM: undefined, tipo: 'senderismo' }, ahora)
    const a = await repo.obtener(id)
    expect(a).toMatchObject({ fecha: '2026-10-10', tipo: 'senderismo' })
    expect(a).not.toHaveProperty('desnivelM')
    await expect(repo.actualizar(id, { duracionSeg: 0 }, ahora)).rejects.toThrow(repo.ActividadInvalida)
  })

  it('borra y restaura con el mismo id', async () => {
    const id = await repo.crear(base, ahora)
    const borrada = await repo.borrar(id)
    expect(await repo.terminadas()).toEqual([])
    await repo.restaurar(borrada!)
    expect((await repo.terminadas()).map((a) => a.id)).toEqual([id])
  })

  it('las lecturas no incluyen la grabación en curso', async () => {
    await repo.crear(base, ahora)
    await repo.empezarGrabacion('correr', ahora)
    expect(await repo.terminadas()).toHaveLength(1)
    expect(await repo.entreFechas('2026-10-01', '2026-10-31')).toHaveLength(1)
    expect((await repo.enCurso())?.tipo).toBe('correr')
  })
})

describe('grabación', () => {
  it('como mucho una en curso', async () => {
    const a = await repo.empezarGrabacion('caminar', ahora)
    expect(await repo.empezarGrabacion('correr', ahora)).toBe(a)
    expect(await db.actividades.count()).toBe(1)
  })

  it('guarda el estado y al terminar cierra el tiempo y simplifica', async () => {
    const id = await repo.empezarGrabacion('caminar', ahora)
    let e = repo.estadoDe((await repo.obtener(id))!)
    for (let i = 0; i < 30; i++) e = anadirLectura(e, { lat: 42.88 + i * 0.0005, lon: -8.54, ele: 100 + i, precision: 5, t: ahora + i * 30_000 }).estado
    e = pausar(e, ahora + 900_000)
    await repo.guardarGrabacion(id, e)
    const guardada = (await repo.obtener(id))!
    expect(guardada.enCurso).toBe(true)
    expect(guardada).not.toHaveProperty('reanudadaEn')
    expect(guardada.duracionSeg).toBe(900)
    await repo.terminarGrabacion(id, repo.estadoDe(guardada), { tipo: 'senderismo', nombre: 'Monte Pedroso' }, ahora + 2_000_000)
    const a = (await repo.obtener(id))!
    expect(a).not.toHaveProperty('enCurso')
    expect(a).toMatchObject({ tipo: 'senderismo', nombre: 'Monte Pedroso', duracionSeg: 900, desnivelM: 20, origen: 'gps' })
    expect(a.distanciaM).toBeGreaterThan(1600)
    expect(a.recorrido?.[0]).toHaveLength(2) // una recta
  })

  it('sin distancia no se puede terminar y sigue en curso', async () => {
    const id = await repo.empezarGrabacion('caminar', ahora)
    const e = repo.estadoDe((await repo.obtener(id))!)
    await expect(repo.terminarGrabacion(id, e, { tipo: 'caminar' }, ahora + 60_000)).rejects.toThrow(repo.ActividadInvalida)
    expect((await repo.enCurso())?.id).toBe(id)
    await repo.descartarGrabacion(id)
    expect(await repo.enCurso()).toBeUndefined()
  })
})
