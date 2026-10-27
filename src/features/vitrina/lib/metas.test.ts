import { describe, expect, it } from 'vitest'
import type { Meta, SetEntry, Workout } from '../../../shared/db/types'
import { type DatosMetas, type EstadoMeta, estadoMetas, finDeMes, mejorCarga, metaDeEjercicio, metasCumplidas, metasEnCurso, proporcionMeta, textoPlazo, validarMeta } from './metas'

const ts = (iso: string) => new Date(`${iso}T10:00:00`).getTime()
const w = (id: number, iso: string): Workout => ({ id, inicio: ts(iso), fin: ts(iso) + 3600000 })
const s = (id: number, workoutId: number, peso: number, over: Partial<SetEntry> = {}): SetEntry => ({ id, workoutId, exerciseId: 3, orden: 0, reps: 5, peso, createdAt: id, ...over })
const meta = (over: Partial<Meta>): Meta => ({ id: 'm', tipo: 'record', exerciseId: 3, valor: 100, creada: '2026-10-01', ...over })

const datos: DatosMetas = {
  workouts: [w(1, '2026-09-20'), w(2, '2026-10-05'), w(3, '2026-10-12'), { id: 4, inicio: ts('2026-10-20') }],
  sets: [s(1, 1, 90), s(2, 2, 95), s(3, 3, 100), s(4, 3, 120, { tipo: 'calentamiento' }), s(5, 4, 140)],
  actividades: [{ fecha: '2026-11-02', distanciaM: 40_000 }, { fecha: '2026-11-10', distanciaM: 45_000 }, { fecha: '2026-10-30', distanciaM: 99_000 }],
  semanas: [
    { lunes: '2026-09-21', cumplidaEl: '2026-09-25' }, { lunes: '2026-09-28', cumplidaEl: '2026-10-02' },
    { lunes: '2026-10-05', cumplidaEl: null }, { lunes: '2026-10-12', cumplidaEl: '2026-10-16' },
  ],
  nombres: new Map([[3, 'Sentadilla']]),
}

describe('metas personales (B13)', () => {
  it('récord: lo mejor de las series efectivas de entrenos terminados; se cumple el primer día que llega desde que se creó', () => {
    const [e] = estadoMetas([meta({})], datos, '2026-10-20')
    expect(e).toMatchObject({ titulo: 'Sentadilla 100 kg', progreso: 100, cumplida: '2026-10-12', detalle: '100 de 100 kg', sinCumplir: false })
    expect(textoPlazo(e)).toBe('Cumplida el 12 oct')
    // Ni el calentamiento de 120 ni el entreno sin terminar de 140 cuentan.
    const [alta] = estadoMetas([meta({ valor: 110 })], datos, '2026-10-20')
    expect(alta).toMatchObject({ progreso: 100, cumplida: null })
    expect(proporcionMeta(alta)).toBeCloseTo(100 / 110)
  })

  it('km de un mes: los de las actividades de ese mes; el plazo es su último día', () => {
    const [e] = estadoMetas([meta({ tipo: 'km-mes', exerciseId: undefined, valor: 80, mes: '2026-11' })], datos, '2026-11-15')
    expect(e).toMatchObject({ titulo: '80 km en noviembre', progreso: 85, cumplida: '2026-11-10' })
    const [corta] = estadoMetas([meta({ tipo: 'km-mes', valor: 100, mes: '2026-11' })], datos, '2026-12-01')
    expect(corta).toMatchObject({ cumplida: null, sinCumplir: true })
    expect(textoPlazo(corta)).toBe('Sin cumplir')
    expect(finDeMes('2026-02')).toBe('2026-02-28')
  })

  it('semanas cumplidas desde la semana en que se creó', () => {
    const [e] = estadoMetas([meta({ tipo: 'semanas', valor: 2, creada: '2026-09-30' })], datos, '2026-10-20')
    expect(e).toMatchObject({ titulo: '2 semanas cumplidas', progreso: 2, cumplida: '2026-10-16' })
    const [tres] = estadoMetas([meta({ tipo: 'semanas', valor: 3, creada: '2026-09-30', fecha: '2026-12-31' })], datos, '2026-10-20')
    expect(tres).toMatchObject({ progreso: 2, cumplida: null, sinCumplir: false })
    expect(textoPlazo(tres)).toBe('Antes del 31 dic')
  })

  it('las cumplidas dan pieza (logro repetible) y la meta vigente de un ejercicio va a su gráfica', () => {
    const estados = estadoMetas([meta({ id: 'a' }), meta({ id: 'b', valor: 130, fecha: '2026-12-31' }), meta({ id: 'c', tipo: 'semanas', valor: 2, creada: '2026-09-30' })], datos, '2026-10-20')
    expect(metasCumplidas(estados)).toEqual([{ fecha: '2026-10-12' }, { fecha: '2026-10-16' }])
    expect(metaDeEjercicio(estados, 3)).toEqual({ valor: 130, fecha: '2026-12-31' })
    expect(metaDeEjercicio(estados, 9)).toBeUndefined()
  })

  it('validación', () => {
    expect(validarMeta({ tipo: 'record', valor: 100, exerciseId: 3 }, '2026-10-20', mejorCarga(datos.sets, 3))).toMatch(/Ya has levantado 140 kg/)
    expect(validarMeta({ tipo: 'record', valor: 150, exerciseId: 3 }, '2026-10-20', 140)).toBeNull()
    expect(validarMeta({ tipo: 'record', valor: 150 }, '2026-10-20')).toBe('Elige el ejercicio.')
    expect(validarMeta({ tipo: 'km-mes', valor: 80, mes: '2026-09' }, '2026-10-20')).toBe('Elige este mes o uno que venga.')
    expect(validarMeta({ tipo: 'semanas', valor: 0 }, '2026-10-20')).toMatch(/de 1 a 104/)
    expect(validarMeta({ tipo: 'semanas', valor: 4, fecha: '2026-10-01' }, '2026-10-20')).toBe('El plazo no puede estar en el pasado.')
  })
})

describe('metasEnCurso (tarjeta de Inicio)', () => {
  const estado = (id: string, progreso: number, objetivo: number, extra: Partial<EstadoMeta> = {}): EstadoMeta =>
    ({ meta: { id, tipo: 'semanas', valor: objetivo, creada: '2026-10-01' }, titulo: id, progreso, objetivo, detalle: '', cumplida: null, sinCumplir: false, ...extra })

  it('sin cumplidas ni pasadas de plazo, de la más cerca de cumplirse a la más lejos', () => {
    const r = metasEnCurso([estado('a', 2, 10), estado('b', 8, 10), estado('c', 10, 10, { cumplida: '2026-10-20' }), estado('d', 9, 10, { sinCumplir: true }), estado('e', 1, 5)])
    expect(r.map((e) => e.titulo)).toEqual(['b', 'a', 'e'])
  })

  it('sin metas en curso, vacía', () => {
    expect(metasEnCurso([estado('c', 10, 10, { cumplida: '2026-10-20' })])).toEqual([])
  })
})
