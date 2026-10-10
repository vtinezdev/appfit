import { describe, expect, it } from 'vitest'
import type { Comida, Entry, SetEntry, Workout } from '../../../shared/db/types'
import { parseISODate } from '../../../shared/lib/dates'
import {
  calcularAtributos, costeNivel, describirEvento, describirSinXp, descansoActual, nivelDeXp, textoDescanso, tituloDe, xpDeSesion,
  xpEntre, xpPorDia, type DatosAtributos, type EventoXp,
} from './atributos'

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

function datos(entrenos: ReturnType<typeof entreno>[], extra: Partial<DatosAtributos> = {}): DatosAtributos {
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

describe('curva de niveles y títulos', () => {
  it('cada nivel cuesta un 6 % más que el anterior, empezando en 500', () => {
    expect([1, 10, 14, 30].map(costeNivel)).toEqual([500, 845, 1066, 2709])
  })

  it('nivel 1 con 0 XP; la XP sobrante pasa al nivel siguiente', () => {
    expect(nivelDeXp(0)).toEqual({ nivel: 1, xpEnNivel: 0, xpSiguiente: 500 })
    expect(nivelDeXp(499).nivel).toBe(1)
    expect(nivelDeXp(500)).toEqual({ nivel: 2, xpEnNivel: 0, xpSiguiente: 530 })
    expect(nivelDeXp(1029)).toEqual({ nivel: 2, xpEnNivel: 529, xpSiguiente: 530 })
    expect(nivelDeXp(-20).nivel).toBe(1)
  })

  it('un título cada 5 niveles', () => {
    expect([1, 4, 5, 9, 10, 30, 52].map(tituloDe)).toEqual(['Recién llegado', 'Recién llegado', 'Novato', 'Novato', 'Habitual', 'Veterano', 'Leyenda'])
  })
})

describe('entrenos', () => {
  it('cuenta con 6 series efectivas: el calentamiento y las series no hechas no cuentan', () => {
    const corto = entreno('2026-10-05', { series: 5, extra: [{ tipo: 'calentamiento' }, { realizada: false }] })
    const r = calcularAtributos(datos([corto]))
    expect(r.total).toBe(0)
    expect(r.sinXp).toEqual([{ workoutId: corto.workout.id, fecha: '2026-10-05', series: 5, motivo: 'pocas-series' }])
    expect(describirSinXp(r.sinXp[0])).toBe('5 series efectivas: suma a partir de 6')
  })

  it('el descanso acumulado multiplica: ×1 seguido, ×1,5 con un día y ×2 con dos o más', () => {
    const r = calcularAtributos(datos([
      entreno('2026-10-05'), // lunes: primero
      entreno('2026-10-06'), // martes: sin descanso
      entreno('2026-10-08'), // jueves: 1 día
      entreno('2026-10-12'), // lunes: 3 días
    ]))
    expect(deTipo(r, 'entreno').map((e) => e.xp)).toEqual([100, 100, 150, 200])
    expect(r.porAtributo.fuerza).toBe(550)
    expect(describirEvento(r.eventos.find((e) => e.fecha === '2026-10-08')!, {}).detalle).toBe('6 series efectivas · 1 día de descanso: ×1,5')
  })

  it('un entreno por día: el segundo no suma ni consume descanso', () => {
    const r = calcularAtributos(datos([entreno('2026-10-05'), entreno('2026-10-07', { hora: 8 }), entreno('2026-10-07', { hora: 19 })]))
    expect(deTipo(r, 'entreno').map((e) => e.xp)).toEqual([100, 150])
    expect(r.sinXp.map((s) => s.motivo)).toEqual(['otro-hoy'])
    expect(describirSinXp(r.sinXp[0], '2026-10-07')).toBe('Hoy ya suma otro entreno')
  })

  it('como mucho el plan + 1 por semana', () => {
    const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((f) => entreno(f))
    const r = calcularAtributos(datos(semana))
    expect(deTipo(r, 'entreno')).toHaveLength(4)
    expect(r.sinXp).toEqual([expect.objectContaining({ fecha: '2026-10-09', motivo: 'tope-semana', tope: 4 })])
    expect(describirSinXp(r.sinXp[0])).toBe('Esa semana ya sumaban 4 entrenos (tu plan y uno más)')
    expect(describirSinXp(r.sinXp[0], '2026-10-11')).toBe('Esta semana ya suman 4 entrenos (tu plan y uno más)')
    const conPlan = calcularAtributos(datos(semana, { planes: [{ desde: '2026-01-05', entrenos: 2, diasRegistro: 5 }] }))
    expect(deTipo(conPlan, 'entreno')).toHaveLength(3)
  })

  it('ignora entrenos sin terminar y los posteriores a hoy', () => {
    const enCurso = entreno('2026-10-05')
    delete enCurso.workout.fin
    const r = calcularAtributos(datos([enCurso, entreno('2026-11-02')]))
    expect(r.eventos).toEqual([])
  })

  it('récords frente a entrenos anteriores, 25 XP y como mucho 3 por sesión', () => {
    const r = calcularAtributos(datos([
      entreno('2026-10-05', { ejercicio: 1, extra: [{ exerciseId: 2, peso: 40 }] }),
      entreno('2026-10-07', { ejercicio: 1, peso: 65, extra: [{ exerciseId: 2, peso: 45 }] }),
    ]))
    const records = deTipo(r, 'record')
    expect(records).toHaveLength(3) // peso y 1RM en los dos ejercicios: 4, limitados a 3
    expect(records.every((e) => e.xp === 25 && e.fecha === '2026-10-07')).toBe(true)
    expect(describirEvento(records[0], { 1: 'Press banca' }).titulo).toBe('Récord · Press banca')
  })

  it('los récords se comparan también con entrenos que no sumaron XP', () => {
    const r = calcularAtributos(datos([entreno('2026-10-05', { series: 3, peso: 70 }), entreno('2026-10-07', { peso: 65 })]))
    expect(deTipo(r, 'record')).toEqual([]) // 65 kg no supera los 70 del entreno corto
  })

  it('un entreno que no suma tampoco da XP por sus récords', () => {
    const r = calcularAtributos(datos([entreno('2026-10-05'), entreno('2026-10-05', { hora: 19, peso: 80 })]))
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
    const r = calcularAtributos(datos([], { entries, protObjetivo: objetivos }))
    expect(r.eventos.map((e) => [e.fecha, e.tipo, e.xp])).toEqual([
      ['2026-10-05', 'registro', 30], ['2026-10-05', 'proteina', 20], ['2026-10-06', 'registro', 10],
    ])
    expect(r.porAtributo.nutricion).toBe(60)
    expect(describirEvento(r.eventos[2], {}).detalle).toBe('1 comida (con 2 o más, 30 XP)')
  })

  it('excluida, no suma nada', () => {
    const r = calcularAtributos(datos([], { entries: [comida('2026-10-05', 'desayuno', 200)], protObjetivo: objetivos, conNutricion: false }))
    expect(r.total).toBe(0)
  })
})

describe('semana cumplida', () => {
  const entrenos = ['2026-10-05', '2026-10-07', '2026-10-09'].map((f) => entreno(f))
  const entries = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-10'].map((f) => comida(f, 'comida'))

  it('150 XP de Constancia el día en que se cumple el plan', () => {
    const r = calcularAtributos(datos(entrenos, { entries }))
    expect(deTipo(r, 'semana')).toEqual([expect.objectContaining({ fecha: '2026-10-10', xp: 150, atributo: 'constancia', lunes: '2026-10-05' })])
    expect(r.porAtributo.constancia).toBe(150)
    expect(describirEvento(deTipo(r, 'semana')[0], {}).detalle).toBe('3 de 3 entrenos · 5 de 5 días registrados')
  })

  it('sin nutrición, se cumple solo con los entrenos', () => {
    const r = calcularAtributos(datos(entrenos, { conNutricion: false }))
    expect(deTipo(r, 'semana')).toEqual([expect.objectContaining({ fecha: '2026-10-09' })])
  })

  it('la semana en curso informa de lo que lleva', () => {
    const r = calcularAtributos(datos(entrenos, { entries, hoy: '2026-10-08' }))
    expect(r.semanaActual).toMatchObject({ lunes: '2026-10-05', entrenos: 2, diasRegistrados: 4, cumplida: false, entrenosQueSuman: 2, tope: 4 })
    expect(xpEntre(r.eventos, '2026-10-05', '2026-10-11')).toBe(100 + 150 + 4 * 10)
  })
})

describe('descanso, sesión y días', () => {
  it('descansoActual: hoy, tope o multiplicador según los días sin entrenar', () => {
    expect(textoDescanso(descansoActual(calcularAtributos(datos([])), '2026-10-31'))).toBe('Tu primer entreno sumará XP')
    const r = calcularAtributos(datos([entreno('2026-10-05')], { hoy: '2026-10-08' }))
    expect(descansoActual(r, '2026-10-08')).toEqual({ estado: 'listo', diasDescanso: 2, multiplicador: 2 })
    expect(textoDescanso(descansoActual(r, '2026-10-08'))).toBe('2 días de descanso: el próximo entreno vale ×2')
    expect(descansoActual(calcularAtributos(datos([entreno('2026-10-05')], { hoy: '2026-10-05' })), '2026-10-05')).toEqual({ estado: 'hoy' })
    const semana = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map((f) => entreno(f))
    expect(descansoActual(calcularAtributos(datos(semana, { hoy: '2026-10-10' })), '2026-10-10')).toEqual({ estado: 'tope', tope: 4 })
  })

  it('xpDeSesion: XP del entreno y sus récords, y la subida de nivel', () => {
    const entries = Array.from({ length: 30 }, (_, i) => comida(`2026-09-${String(1 + i).padStart(2, '0')}`, 'comida')) // 300 XP
    const ultimo = entreno('2026-10-07', { peso: 65 })
    const r = calcularAtributos(datos([entreno('2026-10-05'), ultimo], { entries }))
    const s = xpDeSesion(r, ultimo.workout.id)
    expect(s.eventos.map((e) => e.tipo)).toEqual(['entreno', 'record', 'record'])
    expect(s.total).toBe(150 + 50)
    expect(s.antes).toEqual({ nivel: 1, xpEnNivel: 400, xpSiguiente: 500 })
    expect(s.despues).toEqual({ nivel: 2, xpEnNivel: 100, xpSiguiente: 530 })
    const corto = entreno('2026-10-05', { series: 2 })
    expect(xpDeSesion(calcularAtributos(datos([corto])), corto.workout.id)).toMatchObject({ total: 0, sinXp: { motivo: 'pocas-series' } })
  })

  it('xpPorDia agrupa del más reciente al más antiguo, con los entrenos que no sumaron', () => {
    const r = calcularAtributos(datos([entreno('2026-10-05'), entreno('2026-10-06', { series: 3 })], { entries: [comida('2026-10-05', 'cena')] }))
    expect(xpPorDia(r).map((d) => [d.fecha, d.total, d.eventos.length, d.sinXp.length])).toEqual([['2026-10-06', 0, 0, 1], ['2026-10-05', 110, 2, 0]])
  })
})
