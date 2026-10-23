import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { normalizeName } from '../../../shared/lib/text'
import * as routinesRepo from './routinesRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('routinesRepo.guardarCompartida', () => {
  it('guarda la estructura con los ejercicios elegidos, reutiliza los que ya tienes y da un nombre libre', async () => {
    const banca = await db.exercises.add({ nombre: 'Press banca', nombreNorm: normalizeName('Press banca'), grupo: 'Pecho', catalogId: 'appfit:press-banca' })
    await routinesRepo.guardar({ nombre: 'Torso A', exerciseIds: [] })
    const id = await routinesRepo.guardarCompartida(' Torso A ', [
      { seleccion: { tipo: 'catalogo', catalogId: 'appfit:press-banca' }, objetivo: { series: 4, repsMin: 6, repsMax: 8, descansoSeg: 120 } },
      { seleccion: { tipo: 'catalogo', catalogId: 'appfit:remo-barra' } },
      { seleccion: { tipo: 'personalizado', nombre: 'Jalón unilateral', musculo: 'espalda', equipo: 'polea' }, objetivo: { series: 3, repsMin: 10, repsMax: 12 } },
    ])
    const r = (await routinesRepo.obtener(id))!
    expect(r.nombre).toBe('Torso A (2)')
    const nombres = new Map((await db.exercises.toArray()).map((e) => [e.id, e.nombre]))
    expect(r.exerciseIds[0]).toBe(banca)
    expect(r.exerciseIds.map((e) => nombres.get(e))).toEqual(['Press banca', 'Remo con barra', 'Jalón unilateral'])
    expect(r.objetivos).toEqual({ [banca]: { series: 4, repsMin: 6, repsMax: 8, descansoSeg: 120 }, [r.exerciseIds[2]]: { series: 3, repsMin: 10, repsMax: 12 } })
    expect(await db.sets.count()).toBe(0)
  })

  it('un ejercicio elegido dos veces entra una vez; sin ejercicios no guarda nada', async () => {
    const id = await routinesRepo.guardarCompartida('Pierna', [
      { seleccion: { tipo: 'catalogo', catalogId: 'appfit:press-banca' }, objetivo: { series: 3, repsMin: 8, repsMax: 10 } },
      { seleccion: { tipo: 'catalogo', catalogId: 'appfit:press-banca' }, objetivo: { series: 5, repsMin: 5, repsMax: 5 } },
    ])
    const r = (await routinesRepo.obtener(id))!
    expect(r.exerciseIds).toHaveLength(1)
    expect(Object.values(r.objetivos!)).toEqual([{ series: 3, repsMin: 8, repsMax: 10 }])
    await expect(routinesRepo.guardarCompartida('Vacía', [])).rejects.toThrow('al menos un ejercicio')
    expect(await db.routines.count()).toBe(1)
  })

  it('si un ejercicio falla, no guarda nada a medias', async () => {
    await db.exercises.add({ nombre: 'Jalón unilateral', nombreNorm: normalizeName('Jalón unilateral'), grupo: 'Espalda' })
    await expect(routinesRepo.guardarCompartida('Espalda', [
      { seleccion: { tipo: 'catalogo', catalogId: 'appfit:remo-barra' } },
      { seleccion: { tipo: 'personalizado', nombre: 'Jalón unilateral', musculo: 'espalda', equipo: 'polea' } },
    ])).rejects.toThrow('Ya tienes un ejercicio con ese nombre')
    expect(await db.routines.count()).toBe(0)
    expect(await db.exercises.count()).toBe(1)
  })
})
