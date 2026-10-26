import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { detalleSesion, epley1RM, formatDuracion, formatHora, mejorSet, pesoMaximo, previasPorSerie, resumenUltimoEntreno, seriesSinMarcar, siguienteOrden, valoresNuevaSerie, volumenSets } from './workout'

describe('epley1RM', () => {
  it('con 1 repetición el 1RM es el propio peso', () => {
    expect(epley1RM(100, 1)).toBe(100)
  })

  it('aplica la fórmula de Epley: peso * (1 + reps/30)', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.7, 1)
  })

  it('devuelve 0 con reps o peso no positivos', () => {
    expect(epley1RM(0, 5)).toBe(0)
    expect(epley1RM(100, 0)).toBe(0)
  })
})

describe('volumenSets', () => {
  it('suma peso * reps de cada serie', () => {
    expect(
      volumenSets([
        { peso: 100, reps: 5 },
        { peso: 80, reps: 8 },
      ]),
    ).toBe(1140)
  })

  it('devuelve 0 sin series', () => {
    expect(volumenSets([])).toBe(0)
  })
})

describe('pesoMaximo', () => {
  it('devuelve el peso más alto de la lista', () => {
    expect(pesoMaximo([{ peso: 60 }, { peso: 80 }, { peso: 70 }])).toBe(80)
  })

  it('devuelve 0 sin series', () => {
    expect(pesoMaximo([])).toBe(0)
  })
})

describe('detalleSesion', () => {
  it('rutina, duración, volumen y notas, separados por puntos', () => {
    const w = { inicio: 0, fin: 52 * 60_000, notas: 'Buen día' }
    expect(detalleSesion(w, 'Torso', [{ reps: 10, peso: 60 }, { reps: 10, peso: 60, tipo: 'calentamiento' }])).toBe('Torso · 52 min · 600 kg · con notas')
    expect(detalleSesion(w, 'Torso', [{ reps: 10, peso: 60 }], 'Gym Playa')).toBe('Gym Playa · Torso · 52 min · 600 kg · con notas')
  })
  it('omite lo que no existe y nunca queda vacío', () => {
    expect(detalleSesion({ inicio: 0, fin: 3_600_000 }, undefined, [])).toBe('1 h')
    expect(detalleSesion({ inicio: 0 }, undefined, [])).toBe('—')
  })
})

describe('valoresNuevaSerie', () => {
  it('repite reps y peso de la serie previa', () => {
    expect(valoresNuevaSerie({ reps: 5, peso: 60 })).toEqual({ reps: 5, peso: 60 })
  })

  it('sin serie previa usa 8 × 20 kg', () => {
    expect(valoresNuevaSerie(undefined)).toEqual({ reps: 8, peso: 20 })
  })
})

describe('previasPorSerie', () => {
  const serie = (orden: number, peso: number, extra: Partial<SetEntry> = {}) => ({ orden, createdAt: orden, peso, ...extra }) as SetEntry
  const pesos = (sets: (SetEntry | undefined)[]) => sets.map(s => s?.peso)

  it('empareja por número: calentamientos entre sí y efectivas entre sí', () => {
    const previas = [serie(2, 60), serie(0, 20, { tipo: 'calentamiento' }), serie(3, 62.5), serie(1, 40, { tipo: 'calentamiento' }), serie(4, 65)]
    const r = previasPorSerie(previas, 2, 3)
    expect(pesos(r.calentamientos)).toEqual([20, 40])
    expect(pesos(r.efectivas)).toEqual([60, 62.5, 65])
  })

  it('si la rutina pide más series, repite la última de su tipo; si pide menos, toma las primeras', () => {
    expect(pesos(previasPorSerie([serie(0, 60), serie(1, 62.5)], 0, 4).efectivas)).toEqual([60, 62.5, 62.5, 62.5])
    expect(pesos(previasPorSerie([serie(0, 60), serie(1, 62.5), serie(2, 65)], 0, 2).efectivas)).toEqual([60, 62.5])
  })

  it('las no realizadas no cuentan y sin ninguna de un tipo queda sin par', () => {
    const r = previasPorSerie([serie(0, 60), serie(1, 70, { realizada: false }), serie(2, 62.5, { realizada: true })], 1, 2)
    expect(pesos(r.efectivas)).toEqual([60, 62.5])
    expect(r.calentamientos).toEqual([undefined])
    expect(previasPorSerie([], 0, 2).efectivas).toEqual([undefined, undefined])
  })
})

describe('siguienteOrden', () => {
  it('empieza en 0', () => {
    expect(siguienteOrden([])).toBe(0)
  })

  it('es uno más que el mayor, aunque falten series intermedias', () => {
    expect(siguienteOrden([{ orden: 0 }, { orden: 2 }])).toBe(3)
  })
})

describe('formatDuracion', () => {
  it.each([
    [0, 'menos de 1 min'],
    [20_000, 'menos de 1 min'],
    [52 * 60_000, '52 min'],
    [60 * 60_000, '1 h'],
    [65 * 60_000, '1 h 05 min'],
    [135 * 60_000, '2 h 15 min'],
  ])('%i ms → %s', (ms, esperado) => {
    expect(formatDuracion(ms)).toBe(esperado)
  })

  it('no falla con duraciones negativas', () => {
    expect(formatDuracion(-5000)).toBe('menos de 1 min')
  })
})

describe('formatHora', () => {
  it('escribe la hora local con dos cifras', () => {
    expect(formatHora(new Date(2026, 8, 30, 8, 5).getTime())).toBe('08:05')
    expect(formatHora(new Date(2026, 8, 30, 18, 45).getTime())).toBe('18:45')
  })
})

describe('resumenUltimoEntreno', () => {
  const ahora = new Date(2026, 8, 30, 12, 0)
  const sets = [
    { exerciseId: 1, peso: 100, reps: 5 },
    { exerciseId: 1, peso: 100, reps: 5 },
    { exerciseId: 2, peso: 50, reps: 10 },
  ]
  const hace = (dias: number, h = 18) => new Date(2026, 8, 30 - dias, h, 0).getTime()

  it('resume duración, ejercicios distintos y volumen', () => {
    const inicio = hace(1)
    const r = resumenUltimoEntreno({ inicio, fin: inicio + 52 * 60_000 }, sets, ahora)
    expect(r).toEqual({ cuando: 'Ayer', duracion: '52 min', ejercicios: 2, volumen: 1500 })
  })

  it('dice hoy, ayer, hace N días y, pasada una semana, la fecha', () => {
    const cuando = (dias: number) => resumenUltimoEntreno({ inicio: hace(dias), fin: hace(dias) + 60_000 }, [], ahora).cuando
    expect(cuando(0)).toBe('Hoy')
    expect(cuando(1)).toBe('Ayer')
    expect(cuando(3)).toBe('Hace 3 días')
    expect(cuando(10)).toMatch(/^20 /)
  })

  it('cuenta por día natural, no por 24 h: anoche a las 23:00 ya es «Ayer»', () => {
    const anoche = new Date(2026, 8, 29, 23, 0).getTime()
    expect(resumenUltimoEntreno({ inicio: anoche, fin: anoche + 60_000 }, [], new Date(2026, 8, 30, 0, 30)).cuando).toBe('Ayer')
  })

  it('sin fin no hay duración; sin series, cero ejercicios y volumen 0', () => {
    expect(resumenUltimoEntreno({ inicio: hace(0) }, [], ahora)).toEqual({ cuando: 'Hoy', duracion: null, ejercicios: 0, volumen: 0 })
  })
})

import { efectivas, moverElemento, ordenEjerciciosSesion } from './workout'

describe('series de calentamiento', () => {
  it('no cuentan en volumen, mejor serie ni peso máximo', () => {
    const sets = [{ peso: 20, reps: 10, tipo: 'calentamiento' as const }, { peso: 60, reps: 5 }]
    expect(efectivas(sets)).toHaveLength(1)
    expect(volumenSets(sets)).toBe(300)
    expect(mejorSet(sets)).toEqual({ peso: 60, reps: 5 })
    expect(pesoMaximo([{ peso: 100, tipo: 'calentamiento' as const }, { peso: 60 }])).toBe(60)
    expect(mejorSet([{ peso: 20, reps: 10, tipo: 'calentamiento' as const }])).toBeNull()
  })
})

describe('orden de ejercicios de la sesión', () => {
  it('sin orden manual: rutina y luego series', () => {
    expect(ordenEjerciciosSesion([1, 2], [3, 1])).toEqual([1, 2, 3])
  })
  it('la omisión manda sobre rutina, series y orden manual sin mutarlos', () => {
    const rutina = [1, 2], series = [3, 1], manual = [3, 1, 2], omitidos = [1, 3]
    expect(ordenEjerciciosSesion(rutina, series, manual, omitidos)).toEqual([2])
    expect(ordenEjerciciosSesion(rutina, series, undefined, [1])).toEqual([2, 3])
    expect(ordenEjerciciosSesion(rutina, series, manual, [1, 2, 3])).toEqual([])
    expect(ordenEjerciciosSesion(rutina, series, manual, [])).toEqual([3, 1, 2])
    expect([rutina, series, manual, omitidos]).toEqual([[1, 2], [3, 1], [3, 1, 2], [1, 3]])
  })
  it('el orden manual manda, ignora ids que ya no existen y añade los nuevos al final', () => {
    expect(ordenEjerciciosSesion([1, 2], [3], [3, 9, 1])).toEqual([3, 1, 2])
    expect(ordenEjerciciosSesion([1], [2, 3], [])).toEqual([1, 2, 3])
  })
  it('moverElemento sube y baja sin salirse', () => {
    expect(moverElemento([1, 2, 3], 1, -1)).toEqual([2, 1, 3])
    expect(moverElemento([1, 2, 3], 1, 1)).toEqual([1, 3, 2])
    expect(moverElemento([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(moverElemento([1, 2, 3], 2, 1)).toEqual([1, 2, 3])
  })
})

import { combinarFechaHora, minutosEntre } from './workout'

describe('fecha y duración de un entreno editado', () => {
  it('combina fecha y hora locales y rechaza valores imposibles', () => {
    const ms = combinarFechaHora('2026-10-07', '18:05')!
    const d = new Date(ms)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 7, 18, 5])
    expect(combinarFechaHora('2026-02-30', '10:00')).toBeNull()
    expect(combinarFechaHora('2026-10-07', '25:00')).toBeNull()
    expect(combinarFechaHora('', '10:00')).toBeNull()
  })
  it('minutosEntre redondea y nunca baja de 1', () => {
    expect(minutosEntre(0, 3_600_000)).toBe(60)
    expect(minutosEntre(0, 10)).toBe(1)
  })
})

import { validarEntrenoPasado } from './workout'

describe('validarEntrenoPasado', () => {
  it('acepta pasado con duración razonable y rechaza el resto', () => {
    expect(validarEntrenoPasado(1000, 60, 5000)).toBeNull()
    expect(validarEntrenoPasado(null, 60, 5000)).toMatch(/válidas/)
    expect(validarEntrenoPasado(9000, 60, 5000)).toMatch(/empezado/)
    expect(validarEntrenoPasado(1000, 0, 5000)).toMatch(/duración/)
    expect(validarEntrenoPasado(1000, 2000, 5000)).toMatch(/duración/)
  })
})

import { rangoSesion } from './workout'
describe('rangoSesion', () => {
  it('día, inicio y fin; sin fin solo el inicio', () => {
    const inicio = new Date(2026, 9, 9, 18, 5).getTime()
    expect(rangoSesion(inicio, new Date(2026, 9, 9, 18, 57).getTime())).toBe('vie 9 oct · 18:05 – 18:57')
    expect(rangoSesion(inicio)).toBe('vie 9 oct · 18:05')
  })
})

describe('seriesSinMarcar', () => {
  it('separa las no marcadas que se pueden dar por hechas de las que no tienen repeticiones', () => {
    const sets = [
      { id: 1, peso: 60, reps: 8 },
      { id: 2, peso: 60, reps: 8 },
      { id: 3, peso: 60, reps: 0 },
      { id: 4, peso: 0, reps: 0, ejecucion: 'lados' as const, lados: { izquierda: { reps: 10, peso: 12 } } },
    ]
    expect(seriesSinMarcar(sets, [1])).toEqual({ confirmables: [2, 4], sinReps: 1 })
  })

  it('con todas marcadas no queda nada que marcar', () => {
    expect(seriesSinMarcar([{ id: 1, peso: 60, reps: 8 }], [1])).toEqual({ confirmables: [], sinReps: 0 })
  })
})
