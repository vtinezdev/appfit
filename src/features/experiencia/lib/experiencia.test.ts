import { describe, expect, it } from 'vitest'
import type { Comida, Entry, SetEntry, Workout } from '../../../shared/db/types'
import { parseISODate } from '../../../shared/lib/dates'
import {
  calcularExperiencia, describirActividadSinXp, describirEvento, describirSinXp, entrenoHoy, textoEntrenoHoy, xpDeActividad,
  xpDeActividadId, xpDeEntreno, xpDeSesion, xpEntre, xpPorDia, type DatosExperiencia, type EventoXp,
} from './experiencia'

let siguienteId = 1

interface OpcionesEntreno { series?: number; hora?: number; ejercicio?: number; peso?: number; reps?: number; extra?: Partial<SetEntry>[] }

/** Un entreno terminado en `fecha` con `series` efectivas iguales (y series extra opcionales). */
function entreno(fecha: string, { series = 6, hora = 10, ejercicio = 1, peso = 60, reps = 8, extra = [] }: OpcionesEntreno = {}) {
  const inicio = parseISODate(fecha).getTime() + hora * 3_600_000
  const workout: Workout = { id: siguienteId++, inicio, fin: inicio + 3_600_000 }
  const base = (i: number): SetEntry => ({ id: siguienteId++, workoutId: workout.id, exerciseId: ejercicio, orden: i, reps, peso, createdAt: inicio + i })
  const sets = [...Array.from({ length: series }, (_, i) => base(i)), ...extra.map((e, i) => ({ ...base(series + i), ...e }))]
  return { workout, sets }
}

function comida(fecha: string, comida: Comida, prot = 20): Pick<Entry, 'fecha' | 'comida' | 'prot'> {
  return { fecha, comida, prot }
}

function datos(entrenos: ReturnType<typeof entreno>[], extra: Partial<DatosExperiencia> = {}): DatosExperiencia {
  return {
    hoy: '2026-10-31',
    workouts: entrenos.map((e) => e.workout),
    sets: entrenos.flatMap((e) => e.sets),
    entries: [],
    protObjetivo: new Map(),
    conNutricion: true,
    ...extra,
  }
}

const deTipo = <T extends EventoXp['tipo']>(r: { eventos: EventoXp[] }, tipo: T) => r.eventos.filter((e): e is Extract<EventoXp, { tipo: T }> => e.tipo === tipo)


describe('entrenos', () => {
  it('100 XP desde 6 series efectivas y la parte proporcional por debajo', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 12].map(xpDeEntreno)).toEqual([0, 17, 33, 50, 67, 83, 100, 100])
  })

  it('el calentamiento y las series no hechas no cuentan; con menos de 5 suma pero no cuenta para el plan', () => {
    const corto = entreno('2026-10-05', { series: 4, extra: [{ tipo: 'calentamiento' }, { realizada: false }] })
    const r = calcularExperiencia(datos([corto]))
    expect(deTipo(r, 'entreno')).toEqual([expect.objectContaining({ workoutId: corto.workout.id, series: 4, xp: 67 })])
    expect(r.entrenos).toEqual([])
    expect(r.diasEntreno.size).toBe(0)
    expect(describirEvento(r.eventos[0], {}).detalle).toBe('4 de 6 series efectivas · no cuenta para el plan')
  })

  it('con 5 series efectivas cuenta para el plan', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05', { series: 5 })]))
    expect(deTipo(r, 'entreno').map((e) => e.xp)).toEqual([83])
    expect(r.entrenos.map((e) => e.series)).toEqual([5])
    expect(describirEvento(r.eventos[0], {}).detalle).toBe('5 de 6 series efectivas')
  })

  it('sin series efectivas no suma', () => {
    const vacio = entreno('2026-10-05', { series: 0, extra: [{ tipo: 'calentamiento' }] })
    const r = calcularExperiencia(datos([vacio]))
    expect(r.total).toBe(0)
    expect(r.sinXp).toEqual([{ workoutId: vacio.workout.id, fecha: '2026-10-05', series: 0, motivo: 'sin-series' }])
    expect(describirSinXp(r.sinXp[0])).toBe('Sin series efectivas')
  })

  it('el descanso no multiplica: cada entreno vale por sus series', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05'), entreno('2026-10-06'), entreno('2026-10-09')]))
    expect(deTipo(r, 'entreno').map((e) => e.xp)).toEqual([100, 100, 100])
    expect(describirEvento(r.eventos[0], {}).detalle).toBe('6 series efectivas')
  })

  it('un entreno por día: suma el de más series, aunque sea el segundo', () => {
    const corto = entreno('2026-10-07', { hora: 8, series: 3 })
    const largo = entreno('2026-10-07', { hora: 19 })
    const r = calcularExperiencia(datos([corto, largo]))
    expect(deTipo(r, 'entreno')).toEqual([expect.objectContaining({ workoutId: largo.workout.id, xp: 100 })])
    expect(r.sinXp).toEqual([expect.objectContaining({ workoutId: corto.workout.id, motivo: 'otro-hoy' })])
    expect(describirSinXp(r.sinXp[0], '2026-10-07')).toBe('Hoy suma otro entreno, el de más series')
    const iguales = calcularExperiencia(datos([entreno('2026-10-08', { hora: 8 }), entreno('2026-10-08', { hora: 19 })]))
    expect(deTipo(iguales, 'entreno')).toHaveLength(1)
    expect(iguales.sinXp.map((s) => s.motivo)).toEqual(['otro-hoy'])
  })

  it('por semana suman los entrenos del plan', () => {
    const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((f) => entreno(f))
    const r = calcularExperiencia(datos(semana))
    expect(deTipo(r, 'entreno')).toHaveLength(3)
    expect(r.sinXp).toEqual([
      expect.objectContaining({ fecha: '2026-10-08', motivo: 'tope-semana', tope: 3 }),
      expect.objectContaining({ fecha: '2026-10-09', motivo: 'tope-semana', tope: 3 }),
    ])
    expect(describirSinXp(r.sinXp[0])).toBe('Esa semana ya sumaban los 3 entrenos de tu plan')
    expect(describirSinXp(r.sinXp[0], '2026-10-11')).toBe('Esta semana ya suman los 3 entrenos de tu plan')
    const conPlan = calcularExperiencia(datos(semana, { planes: [{ desde: '2026-01-05', entrenos: 4, diasRegistro: 5 }] }))
    expect(deTipo(conPlan, 'entreno')).toHaveLength(4)
  })

  it('los entrenos cortos suman mientras quede plan, sin ocupar hueco', () => {
    const r = calcularExperiencia(datos([
      entreno('2026-10-05', { series: 2 }), // corto: suma sin ocupar hueco
      entreno('2026-10-06'), entreno('2026-10-07'), entreno('2026-10-08'), // completan el plan de 3
      entreno('2026-10-09', { series: 2 }), // plan completo: no suma
    ]))
    expect(deTipo(r, 'entreno').map((e) => e.xp)).toEqual([33, 100, 100, 100])
    expect(r.sinXp).toEqual([expect.objectContaining({ fecha: '2026-10-09', motivo: 'tope-semana' })])
  })

  it('ignora entrenos sin terminar y los posteriores a hoy', () => {
    const enCurso = entreno('2026-10-05')
    delete enCurso.workout.fin
    const r = calcularExperiencia(datos([enCurso, entreno('2026-11-02')]))
    expect(r.eventos).toEqual([])
  })

  it('récords frente a entrenos anteriores, 25 XP y como mucho 3 por sesión', () => {
    const r = calcularExperiencia(datos([
      entreno('2026-10-05', { ejercicio: 1, extra: [{ exerciseId: 2, peso: 40 }] }),
      entreno('2026-10-07', { ejercicio: 1, peso: 65, extra: [{ exerciseId: 2, peso: 45 }] }),
    ]))
    const records = deTipo(r, 'record')
    expect(records).toHaveLength(3) // peso y 1RM en los dos ejercicios: 4, limitados a 3
    expect(records.every((e) => e.xp === 25 && e.fecha === '2026-10-07')).toBe(true)
    expect(describirEvento(records[0], { 1: 'Press banca' }).titulo).toBe('Récord · Press banca')
  })

  it('los récords se comparan también con entrenos que no sumaron XP', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05', { hora: 8, series: 3, peso: 70 }), entreno('2026-10-05', { hora: 19 }), entreno('2026-10-07', { peso: 65 })]))
    expect(deTipo(r, 'record')).toEqual([]) // 65 kg no supera los 70 del entreno corto
  })

  it('un entreno que no suma tampoco da XP por sus récords', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05'), entreno('2026-10-05', { hora: 19, series: 4, peso: 80 })]))
    expect(deTipo(r, 'record')).toEqual([])
  })
})

describe('nutrición', () => {
  const objetivos = new Map([['2026-10-05', 150], ['2026-10-06', 150]])

  it('30 XP con dos o más comidas, 10 con una, y 20 por llegar al 90 % de la proteína', () => {
    const entries = [
      comida('2026-10-05', 'desayuno', 60), comida('2026-10-05', 'comida', 75), // 135 g = 90 %
      comida('2026-10-06', 'cena', 134), comida('2026-10-06', 'cena', 0), // una sola comida, 134 g < 90 %
    ]
    const r = calcularExperiencia(datos([], { entries, protObjetivo: objetivos }))
    expect(r.eventos.map((e) => [e.fecha, e.tipo, e.xp])).toEqual([
      ['2026-10-05', 'registro', 30], ['2026-10-05', 'proteina', 20], ['2026-10-06', 'registro', 10],
    ])
    expect(r.total).toBe(60)
    expect(describirEvento(r.eventos[2], {}).detalle).toBe('1 comida (con 2 o más, 30 m)')
  })

  it('un cheat day da la XP del registro pero no la de proteína', () => {
    const entries = [comida('2026-10-05', 'desayuno', 100), comida('2026-10-05', 'cena', 100), comida('2026-10-06', 'comida', 150)]
    const r = calcularExperiencia(datos([], { entries, protObjetivo: objetivos, cheatDays: new Set(['2026-10-05']) }))
    expect(r.eventos.map((e) => [e.fecha, e.tipo, e.xp])).toEqual([
      ['2026-10-05', 'registro', 30], ['2026-10-06', 'registro', 10], ['2026-10-06', 'proteina', 20],
    ])
    expect(r.diasRegistro.has('2026-10-05')).toBe(true)
  })

  it('excluida, no suma nada', () => {
    const r = calcularExperiencia(datos([], { entries: [comida('2026-10-05', 'desayuno', 200)], protObjetivo: objetivos, conNutricion: false }))
    expect(r.total).toBe(0)
  })
})

describe('semana cumplida', () => {
  const entrenos = ['2026-10-05', '2026-10-07', '2026-10-09'].map((f) => entreno(f))
  const entries = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-10'].map((f) => comida(f, 'comida'))

  it('150 XP el día en que se cumple el plan', () => {
    const r = calcularExperiencia(datos(entrenos, { entries }))
    expect(deTipo(r, 'semana')).toEqual([expect.objectContaining({ fecha: '2026-10-10', xp: 150, lunes: '2026-10-05' })])
    expect(r.total).toBe(r.eventos.reduce((a, e) => a + e.xp, 0))
    expect(describirEvento(deTipo(r, 'semana')[0], {}).detalle).toBe('3 de 3 entrenos · 5 de 5 días registrados')
  })

  it('sin nutrición, se cumple solo con los entrenos', () => {
    const r = calcularExperiencia(datos(entrenos, { conNutricion: false }))
    expect(deTipo(r, 'semana')).toEqual([expect.objectContaining({ fecha: '2026-10-09' })])
  })

  it('la semana en curso informa de lo que lleva', () => {
    const r = calcularExperiencia(datos(entrenos, { entries, hoy: '2026-10-08' }))
    expect(r.semanaActual).toMatchObject({ lunes: '2026-10-05', entrenos: 2, diasRegistrados: 4, cumplida: false, entrenosQueSuman: 2, tope: 3 })
    expect(xpEntre(r.eventos, '2026-10-05', '2026-10-11')).toBe(2 * 100 + 4 * 10)
  })
})

describe('hoy, sesión y días', () => {
  it('entrenoHoy: ya suma uno, plan completo o los que quedan', () => {
    expect(textoEntrenoHoy(entrenoHoy(calcularExperiencia(datos([])), '2026-10-31'))).toBe('Quedan 3 entrenos del plan esta semana')
    const r = calcularExperiencia(datos([entreno('2026-10-05'), entreno('2026-10-06')], { hoy: '2026-10-08' }))
    expect(entrenoHoy(r, '2026-10-08')).toEqual({ estado: 'listo', quedan: 1 })
    expect(textoEntrenoHoy(entrenoHoy(r, '2026-10-08'))).toBe('Queda 1 entreno del plan esta semana')
    expect(textoEntrenoHoy(entrenoHoy(calcularExperiencia(datos([entreno('2026-10-05')], { hoy: '2026-10-05' })), '2026-10-05'))).toBe('Hoy ya suma un entreno')
    expect(textoEntrenoHoy(entrenoHoy(calcularExperiencia(datos([entreno('2026-10-05', { series: 3 })], { hoy: '2026-10-05' })), '2026-10-05')))
      .toBe('Hoy suma un entreno de 3 series efectivas: otro con más series lo sustituye')
    const semana = ['2026-10-05', '2026-10-06', '2026-10-07'].map((f) => entreno(f))
    const llena = entrenoHoy(calcularExperiencia(datos(semana, { hoy: '2026-10-10' })), '2026-10-10')
    expect(llena).toEqual({ estado: 'tope', tope: 3 })
    expect(textoEntrenoHoy(llena)).toBe('Plan de la semana completo: ya suman sus 3 entrenos')
  })

  it('xpDeSesion: XP del entreno y sus récords', () => {
    const entries = Array.from({ length: 30 }, (_, i) => comida(`2026-09-${String(1 + i).padStart(2, '0')}`, 'comida')) // 300 XP
    const ultimo = entreno('2026-10-07', { peso: 65 })
    const r = calcularExperiencia(datos([entreno('2026-10-05'), ultimo], { entries }))
    const s = xpDeSesion(r, ultimo.workout.id)
    expect(s.eventos.map((e) => e.tipo)).toEqual(['entreno', 'record', 'record'])
    expect(s.total).toBe(100 + 50)
    const vacio = entreno('2026-10-05', { series: 0 })
    expect(xpDeSesion(calcularExperiencia(datos([vacio])), vacio.workout.id)).toMatchObject({ total: 0, sinXp: { motivo: 'sin-series' } })
  })

  it('xpPorDia agrupa del más reciente al más antiguo, con los entrenos que no sumaron', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05'), entreno('2026-10-06', { series: 0 })], { entries: [comida('2026-10-05', 'cena')] }))
    expect(xpPorDia(r).map((d) => [d.fecha, d.total, d.eventos.length, d.sinXp.length])).toEqual([['2026-10-06', 0, 0, 1], ['2026-10-05', 110, 2, 0]])
  })
})

describe('actividades', () => {
  const act = (id: number, fecha: string, km: number) => ({ id, fecha, distanciaM: km * 1000 })

  it('10 XP por km del día, con tope de 100', () => {
    expect([0, 0.94, 1, 5.24, 10, 25].map((km) => xpDeActividad(km * 1000))).toEqual([0, 9, 10, 52, 100, 100])
  })

  it('suma los km de todas las actividades del día en un solo evento', () => {
    const r = calcularExperiencia(datos([], { actividades: [act(1, '2026-10-05', 3), act(2, '2026-10-05', 2.5)] }))
    expect(deTipo(r, 'actividad')).toEqual([expect.objectContaining({ fecha: '2026-10-05', xp: 55, distanciaM: 5500, actividadIds: [1, 2] })])
    expect(describirEvento(deTipo(r, 'actividad')[0], {})).toEqual({ titulo: '2 actividades', detalle: '5,5 km · 10 m por km' })
  })

  it('un día cuenta desde 1 km y, por semana, los 3 primeros días; aparte del plan de entrenos', () => {
    const actividades = [
      act(1, '2026-10-05', 0.8), act(2, '2026-10-06', 4), act(3, '2026-10-07', 12), act(4, '2026-10-08', 2), act(5, '2026-10-09', 6),
      act(6, '2026-10-12', 3),
    ]
    const r = calcularExperiencia(datos([entreno('2026-10-06'), entreno('2026-10-07'), entreno('2026-10-08')], { actividades, hoy: '2026-10-12' }))
    expect(deTipo(r, 'actividad').map((e) => [e.fecha, e.xp])).toEqual([['2026-10-06', 40], ['2026-10-07', 100], ['2026-10-08', 20], ['2026-10-12', 30]])
    expect(r.actividadesSinXp.map((s) => [s.fecha, s.motivo])).toEqual([['2026-10-05', 'corta'], ['2026-10-09', 'tope-semana']])
    expect(deTipo(r, 'entreno')).toHaveLength(3)
    expect(r.semanaActual.diasActividad).toBe(1)
    expect(describirActividadSinXp(r.actividadesSinXp[0])).toBe('0,8 km: cuenta desde 1 km al día')
    expect(describirActividadSinXp(r.actividadesSinXp[1], '2026-10-12')).toBe('Esa semana ya sumaban sus 3 días con actividad')
    expect(xpDeActividadId(r, 3).evento?.xp).toBe(100)
    expect(xpDeActividadId(r, 5).sinXp?.motivo).toBe('tope-semana')
    expect(xpPorDia(r).find((d) => d.fecha === '2026-10-09')?.actividadesSinXp).toHaveLength(1)
  })

  it('no cuentan para Ritmo ni para la semana cumplida, y van después de los entrenos del día', () => {
    const r = calcularExperiencia(datos([entreno('2026-10-05')], { actividades: [act(1, '2026-10-05', 5)], conNutricion: false }))
    expect(r.diasEntreno.size).toBe(1)
    expect(r.eventos.map((e) => e.tipo)).toEqual(['entreno', 'actividad'])
  })
})
