import { describe, expect, it } from 'vitest'
import type { Objetivos, SetEntry, Workout } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { frasesCruzadas, semanasCruzadas, type SemanaCruzada } from './lecturasCruzadas'

const LUNES = '2026-10-12'
const HOY = '2026-10-19'
const ts = (iso: string) => new Date(`${iso}T10:00:00`).getTime()
const obj = (prot: number): Objetivos => ({ kcal: 2200, prot, carb: 250, grasa: 70 })
const semana = (over: Partial<SemanaCruzada>): SemanaCruzada => ({ lunes: '2026-10-05', peso: null, kcal: null, proteinaEnObjetivo: null, entrenos: 0, records: 0, ...over })

describe('semanas cruzadas', () => {
  it('ocho semanas de la más antigua a la más reciente, con peso, kcal, proteína, entrenos y récords', () => {
    const lunesDe = (i: number) => addDays(LUNES, -7 * (7 - i))
    const entries = Array.from({ length: 8 }, (_, i) => ({ fecha: addDays(lunesDe(i), 1), kcal: 2000 + i * 10, prot: i % 2 ? 150 : 100, carb: 0, grasa: 0 }))
    const workouts: Workout[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, inicio: ts(addDays(lunesDe(i), 2)), fin: ts(addDays(lunesDe(i), 2)) + 3600000 }))
    // Press banca subiendo cada semana: récord de peso desde la segunda.
    const sets: SetEntry[] = workouts.map((w, i) => ({ id: i + 1, workoutId: w.id, exerciseId: 1, orden: 0, reps: 8, peso: 60 + i * 2.5, createdAt: i }))
    const objetivos = new Map(entries.map((e) => [e.fecha, obj(150)]))
    const pesos = Array.from({ length: 8 }, (_, i) => ({ fecha: addDays(lunesDe(i), 3), kg: 80 - i * 0.2 }))
    const r = semanasCruzadas(LUNES, { entries, cheatDays: new Set(), objetivos, pesos, workouts, sets }, HOY)
    expect(r.map((s) => s.lunes)).toEqual(Array.from({ length: 8 }, (_, i) => lunesDe(i)))
    expect(r[0]).toMatchObject({ peso: 80, kcal: 2000, proteinaEnObjetivo: false, entrenos: 1, records: 0 })
    // Récord de peso y de 1RM estimado.
    expect(r[1]).toMatchObject({ proteinaEnObjetivo: true, records: 2 })
  })
})

describe('frases', () => {
  const ocho = Array.from({ length: 8 }, (_, i) => semana({
    lunes: `w${i}`, peso: 79.4 - i * 0.1, kcal: i < 4 ? 2240 : 2010, proteinaEnObjetivo: i % 3 !== 0, entrenos: i < 4 ? 3 : 2, records: i % 3 !== 0 ? 2 : 0,
  }))

  it('describen proteína y récords, entrenos y kcal, y el peso', () => {
    expect(frasesCruzadas(ocho)).toEqual([
      'Semanas con la proteína en objetivo: 5 de 8 · récords en esas semanas: 10; en las otras: 0.',
      'Semanas con 3 entrenos o más: 4 de 8 · kcal al día en esas semanas: 2.240; en las otras: 2.010.',
      'Peso medio: de 79,4 kg a 78,7 kg en 8 semanas (−0,7 kg).',
    ])
  })

  it('solo con al menos 4 semanas con las dos cosas', () => {
    const pocas = ocho.map((s, i) => (i < 5 ? { ...s, peso: null, kcal: null, proteinaEnObjetivo: null } : s))
    expect(frasesCruzadas(pocas)).toEqual([])
  })

  it('sin semanas de los dos lados no compara entrenos y kcal', () => {
    expect(frasesCruzadas(ocho.map((s) => ({ ...s, entrenos: 4 })))).toHaveLength(2)
  })

  it('sin nutrición o sin gimnasio (módulos de B9) no cruza; sin peso, no habla del peso', () => {
    expect(frasesCruzadas(ocho, { nutricion: false })).toEqual(['Peso medio: de 79,4 kg a 78,7 kg en 8 semanas (−0,7 kg).'])
    expect(frasesCruzadas(ocho, { gym: false })).toHaveLength(1)
    expect(frasesCruzadas(ocho, { peso: false })).toHaveLength(2)
  })

  it('nunca dicen causas', () => {
    const variantes = [ocho, ocho.map((s) => ({ ...s, proteinaEnObjetivo: true })), ocho.map((s, i) => ({ ...s, peso: 70 + i }))]
    for (const v of variantes) for (const f of frasesCruzadas(v)) expect(f).not.toMatch(/porque|gracias a|debido a|por eso|hace que|provoca|consigue/i)
  })
})
