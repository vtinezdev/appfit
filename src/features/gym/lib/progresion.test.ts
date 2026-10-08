import { describe, expect, it } from 'vitest'
import type { PlanProgresion, SetEntry, Workout } from '../../../shared/db/types'
import { recomendarProgresion } from './progresion'
const plan: PlanProgresion = { series: 2, repsMin: 8, repsMax: 12, incrementoKg: 2.5, rirMin: 1 }
const ws: Workout[] = [1, 2, 3].map(id => ({ id, inicio: id, fin: id + 0.5 }))
const ss: SetEntry[] = ws.flatMap(w => [0, 1].map(orden => ({ id: w.id * 10 + orden, workoutId: w.id, exerciseId: 1, orden, createdAt: w.inicio, reps: 12, peso: 20, rir: 1, realizada: true })))
const evaluar = (sets = ss, objetivo: PlanProgresion | undefined = plan, actual: SetEntry = ss[0], workouts = ws) => recomendarProgresion(1, actual, objetivo, workouts, sets, 5)
describe('doble progresión conservadora', () => {
  it('propone incremento exacto del equipo tras 3 sesiones confirmadas y 2 al máximo', () => {
    const r = evaluar().propuesta!
    expect(r.tipo).toBe('peso'); expect(r.series).toEqual([{ reps: 8, peso: 22.5 }, { reps: 8, peso: 22.5 }])
    expect(r.sesiones.map(w => w.id)).toEqual([3, 2, 1])
  })
  it('propone una sola repetición en una serie sostenida, no en todas', () => {
    const r = evaluar(ss.map(s => ({ ...s, reps: 10 }))).propuesta!
    expect(r.tipo).toBe('reps'); expect(r.series.map(s => s.reps)).toEqual([11, 10])
  })
  it('no convierte el historial desconocido ni sesiones incompletas en realizadas', () => {
    expect(evaluar(ss.map(s => ({ ...s, realizada: undefined }))).propuesta).toBeUndefined()
    expect(evaluar(ss.slice(1)).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => s.id === 30 ? { ...s, realizada: false } : s)).propuesta).toBeUndefined()
  })
  it('no mezcla agarres, técnicas, ejecución, cargas ni sesiones activas', () => {
    for (const cambios of [{ agarre: { orientacion: 'neutro' as const } }, { ejecucion: 'unilateral' as const }, { modoCarga: 'lastre' as const }, { excentricaSeg: 3 }]) expect(evaluar(ss.map(s => s.workoutId === 2 ? { ...s, ...cambios } : s)).propuesta).toBeUndefined()
    expect(evaluar(ss, plan, ss[0], ws.map(w => w.id === 3 ? { ...w, fin: undefined } : w)).propuesta).toBeUndefined()
    for (const extra of [{ soloNegativas: true }, { bajadas: [{ id: 'x', reps: 8, peso: 10 }] }]) expect(evaluar(ss.map(s => ({ ...s, ...extra }))).propuesta).toBeUndefined()
  })
  it('RIR vacío no equivale a 0 y se respeta el objetivo', () => {
    expect(evaluar(ss.map(s => ({ ...s, rir: undefined }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, rir: 0 }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, rir: 0 })), { ...plan, rirMin: 0 }).propuesta).toBeDefined()
  })
  it('no inventa incremento al alcanzar tope y permite omitir requisito RIR', () => {
    expect(evaluar(ss, { ...plan, incrementoKg: undefined }).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, rir: undefined })), { ...plan, rirMin: undefined }).propuesta).toBeDefined()
    expect(recomendarProgresion(1, ss[0], undefined, ws, ss, 5).propuesta).toBeUndefined()
  })
  it('asistencia reduce ayuda, nunca negativa y exige masa estable', () => {
    const sets = ss.map(s => ({ ...s, modoCarga: 'asistencia' as const, pesoCorporal: 75 }))
    expect(evaluar(sets, plan, sets[0]).propuesta!.series[0].peso).toBe(17.5)
    expect(evaluar(sets.map(s => ({ ...s, pesoCorporal: undefined })), plan, sets[0]).propuesta).toBeUndefined()
    expect(evaluar(sets, { ...plan, incrementoKg: 25 }, sets[0]).propuesta).toBeUndefined()
    expect(evaluar(sets, plan, { ...sets[0], pesoCorporal: 90 }).propuesta).toBeUndefined()
  })
  it('corporal progresa reps sin convertir masa en carga ni pasar el rango', () => {
    const sets = ss.map(s => ({ ...s, modoCarga: 'corporal' as const, peso: 0, reps: 10 }))
    expect(evaluar(sets, plan, sets[0]).propuesta!.series[0]).toEqual({ reps: 11, peso: 0 })
    expect(evaluar(sets.map(s => ({ ...s, reps: 12 })), plan, sets[0]).propuesta).toBeUndefined()
  })
  it('no progresa ambos lados si falta uno; respeta datos completos simétricos', () => {
    const sets = ss.map(s => ({ ...s, reps: 0, peso: 0, ejecucion: 'lados' as const, lados: { izquierda: { reps: 12, peso: 20, rir: 1 }, derecha: { reps: 12, peso: 20, rir: 1 } } }))
    expect(evaluar(sets, plan, sets[0]).propuesta!.series[0].lados!.izquierda!.peso).toBe(22.5)
    expect(evaluar(sets.map(s => ({ ...s, lados: { izquierda: s.lados!.izquierda } })), plan, sets[0]).propuesta).toBeUndefined()
  })
  it('no reacciona a regresión reciente ni usa volumen para progresar', () => {
    expect(evaluar(ss.map(s => ({ ...s, reps: s.workoutId === 3 ? 11 : 10 }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, reps: s.workoutId === 3 ? 10 : 11 }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, peso: s.workoutId === 3 ? 25 : 20 }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, peso: Infinity }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, peso: -10 }))).propuesta).toBeUndefined()
    expect(evaluar(ss.map(s => ({ ...s, peso: 100000 }))).propuesta).toBeUndefined()
  })
})
