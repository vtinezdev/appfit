import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { generarCsv, TABLAS_CSV } from './exportarCsv'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('generarCsv', () => {
  it('genera los cinco CSV desde la base sin modificarla', async () => {
    await db.pesos.add({ fecha: '2026-10-01', kg: 72, createdAt: 1 })
    await db.agua.add({ fecha: '2026-10-01', ml: 500 })
    await db.medidas.add({ fecha: '2026-10-01', cintura: 80 })
    await db.entries.add({ fecha: '2026-10-01', comida: 'comida', nombre: 'Arroz', gramos: 100, kcal: 130, prot: 2.7, carb: 28, grasa: 0.3, createdAt: 1 })
    const w = await db.workouts.add({ inicio: new Date(2026, 9, 1, 10, 0).getTime(), fin: new Date(2026, 9, 1, 11, 0).getTime() })
    const e = await db.exercises.add({ nombre: 'Remo', nombreNorm: 'remo', grupo: 'Espalda' })
    await db.sets.add({ workoutId: w, exerciseId: e, orden: 0, reps: 10, peso: 40, createdAt: 1 })
    const antes = await Promise.all(db.tables.map((t) => t.count()))
    for (const { tabla } of TABLAS_CSV) {
      const csv = await generarCsv(tabla)
      expect(csv.startsWith('﻿')).toBe(true)
      expect(csv.split('\r\n').length).toBeGreaterThanOrEqual(3)
    }
    expect(await generarCsv('series')).toContain('2026-10-01;Remo;1;efectiva;10;40;')
    expect(await Promise.all(db.tables.map((t) => t.count()))).toEqual(antes)
  })

  it('sin datos devuelve solo la cabecera', async () => {
    expect((await generarCsv('pesos')).slice(1)).toBe('fecha;peso_kg\r\n')
  })
})
