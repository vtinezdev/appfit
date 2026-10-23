import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { CATALOGO_POR_TIEMPO, esPorTiempo, formatContador, formatSegundos, mejorTiempo, objetivoSegundos, recordsTiempo, segundosContador, segundosDe, segundosLargo, segundosValidos, textoAnteriorTiempo, tieneDatos } from './tiempo'
import { CATALOGO_POR_ID } from './catalogoEjercicios'

const serie = (over: Partial<SetEntry> & { segundos?: number }): SetEntry => ({ id: 1, workoutId: 1, exerciseId: 7, orden: 0, reps: 0, peso: 0, createdAt: 1, ...over })

describe('series por tiempo', () => {
  it('los del catálogo existen y la marca a mano manda', () => {
    for (const id of CATALOGO_POR_TIEMPO) expect(CATALOGO_POR_ID.has(id), id).toBe(true)
    expect(esPorTiempo({ catalogId: 'appfit:plancha' })).toBe(true)
    expect(esPorTiempo({ catalogId: 'appfit:plancha', porTiempo: false })).toBe(false)
    expect(esPorTiempo({ catalogId: 'appfit:press-banca' })).toBe(false)
    expect(esPorTiempo({ porTiempo: true })).toBe(true)
    expect(esPorTiempo({})).toBe(false)
  })

  it('segundos de una serie y límites', () => {
    expect(segundosDe(serie({ segundos: 45 }))).toBe(45)
    expect(segundosDe(serie({}))).toBe(0)
    expect(segundosDe(serie({ segundos: Number.NaN }))).toBe(0)
    expect(segundosValidos(44.6)).toBe(45)
    expect(segundosValidos(-3)).toBe(0)
    expect(segundosValidos(99_999)).toBe(3600)
    expect(tieneDatos(serie({ segundos: 30 }), false)).toBe(true)
    expect(tieneDatos(serie({}), false)).toBe(false)
  })

  it('textos', () => {
    expect(formatSegundos(45)).toBe('45 s')
    expect(formatSegundos(65)).toBe('1:05')
    expect(formatContador(38.9)).toBe('0:38')
    expect(segundosLargo(65)).toBe('1 minuto y 5 segundos')
    expect(segundosLargo(1)).toBe('1 segundo')
    expect(segundosLargo(120)).toBe('2 minutos')
    expect(textoAnteriorTiempo({}, 40, 0)).toEqual({ texto: '40 s', etiqueta: '40 segundos' })
    expect(textoAnteriorTiempo({ modoCarga: 'lastre' }, 40, 10)).toEqual({ texto: '40 s · +10', etiqueta: '40 segundos con 10 kg de lastre' })
    expect(textoAnteriorTiempo({}, 0, 0)).toBeUndefined()
  })

  it('objetivo del contador y lo que marca', () => {
    expect(objetivoSegundos({ repsMax: 45 }, 40)).toBe(45)
    expect(objetivoSegundos(undefined, 40)).toBe(40)
    expect(objetivoSegundos(undefined, 0)).toBeUndefined()
    expect(segundosContador(1000, 39_000)).toBe(38)
    expect(segundosContador(1000, 11_000, 30)).toBe(40)
  })

  it('mejor tiempo y récord de «más tiempo»', () => {
    const antes = [serie({ id: 1, segundos: 40 }), serie({ id: 2, segundos: 55, tipo: 'calentamiento' }), serie({ id: 3, segundos: 50, realizada: false })]
    expect(mejorTiempo(antes, 7)).toBe(40)
    expect(recordsTiempo([serie({ id: 9, segundos: 45 }), serie({ id: 10, segundos: 42 })], antes)).toEqual([{ exerciseId: 7, segundos: 45, anterior: 40, setId: 9 }])
    expect(recordsTiempo([serie({ id: 9, segundos: 40 })], antes)).toEqual([])
    expect(recordsTiempo([serie({ id: 9, segundos: 60 })], [])).toEqual([])
  })
})
