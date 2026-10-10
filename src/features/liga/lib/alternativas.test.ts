import { describe, expect, it } from 'vitest'
import type { Exercise } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { CATALOGO_EJERCICIOS, CATALOGO_POR_ID } from '../../gym/lib/catalogoEjercicios'
import { alternativas, MAX_ALTERNATIVAS } from './alternativas'
import { divisionDe, type LigaEjercicio } from './liga'

const ej = (id: number, e: Partial<Exercise> & { nombre: string }): Exercise => ({ id, nombreNorm: normalizeName(e.nombre), grupo: '', ...e })
const liga = (exerciseId: number, paso: number): LigaEjercicio => ({
  exerciseId, division: divisionDe(paso), semanas: [], semanasSeguidas: paso, semanasSin: 0, hechaEstaSemana: false, ultimaFecha: '2026-10-05', pico: null, ciclos: [],
})

describe('alternativas', () => {
  const banca = ej(1, { nombre: 'Banca', catalogId: 'appfit:press-banca' })
  const pecho = CATALOGO_POR_ID.get('appfit:press-banca')!.primaryMuscles[0]

  it('mismo músculo principal, sin el propio ni los que están en Élite, como mucho cinco', () => {
    const r = alternativas(banca, [banca], new Map([[1, liga(1, 16)]]))
    expect(r).toHaveLength(MAX_ALTERNATIVAS)
    expect(r.every((a) => CATALOGO_POR_ID.get(a.catalogId!)?.primaryMuscles.includes(pecho))).toBe(true)
    expect(r.some((a) => a.catalogId === 'appfit:press-banca')).toBe(false)
    expect(r.every((a) => a.estado === 'Nunca lo has hecho')).toBe(true)
  })

  it('primero las de división más baja y, a igualdad, las ya hechas; fuera las que están en Élite', () => {
    const otros = CATALOGO_EJERCICIOS.filter((c) => c.primaryMuscles.includes(pecho) && c.id !== 'appfit:press-banca').slice(0, 3)
    const locales = [banca, ...otros.map((c, i) => ej(10 + i, { nombre: c.name, catalogId: c.id }))]
    const ligas = new Map([[1, liga(1, 16)], [10, liga(10, 16)], [11, liga(11, 0)], [12, liga(12, 5)]])
    const r = alternativas(banca, locales, ligas)
    expect(r.some((a) => a.catalogId === otros[0].id)).toBe(false)
    expect(r[0]).toMatchObject({ catalogId: otros[1].id, estado: 'Sin liga ahora' })
    // Hay de sobra ejercicios de pecho más frescos que el que va en Plata II.
    expect(r.some((a) => a.catalogId === otros[2].id)).toBe(false)
  })

  it('un ejercicio propio usa sus músculos; sin músculo conocido no hay alternativas', () => {
    const propio = ej(2, { nombre: 'Zzz empuje', primaryMuscles: [pecho] })
    expect(alternativas(propio, [propio], new Map()).length).toBe(MAX_ALTERNATIVAS)
    const sinMusculo = ej(3, { nombre: 'Zzz algo', primaryMuscles: [] })
    expect(alternativas(sinMusculo, [sinMusculo], new Map())).toEqual([])
  })
})
