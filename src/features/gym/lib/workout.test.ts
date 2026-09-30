import { describe, expect, it } from 'vitest'
import { epley1RM, formatDuracion, formatHora, formatUltimaVez, pesoMaximo, resumenUltimoEntreno, siguienteOrden, valoresNuevaSerie, volumenSets } from './workout'

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

describe('formatUltimaVez', () => {
  it('indica que no hay datos previos si no hay series', () => {
    expect(formatUltimaVez([])).toBe('Sin datos previos')
  })

  it('agrupa series repetidas iguales', () => {
    const texto = formatUltimaVez([
      { reps: 8, peso: 60 },
      { reps: 8, peso: 60 },
      { reps: 8, peso: 60 },
    ])
    expect(texto).toBe('3×8 @ 60 kg')
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
