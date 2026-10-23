import { describe, expect, it } from 'vitest'
import type { Actividad } from '../../../shared/db/types'
import { marcasBatidas, marcasDe, mejoresMarcas, mensajeConMarcas } from './marcas'

const act = (over: Partial<Actividad>): Actividad => ({
  id: 1, tipo: 'caminar', fecha: '2026-10-12', inicio: new Date(2026, 9, 12, 8).getTime(), duracionSeg: 3600, distanciaM: 5000, origen: 'manual', createdAt: 1, ...over,
})
const DIA = 86_400_000
const base = new Date(2026, 9, 1, 8).getTime()

const rodaje = act({ id: 1, tipo: 'correr', inicio: base, distanciaM: 8400, duracionSeg: 2700, desnivelM: 45 })
const penalara = act({ id: 2, tipo: 'senderismo', inicio: base + DIA, distanciaM: 18_200, duracionSeg: 16_200, desnivelM: 1240 })
const media = act({ id: 3, tipo: 'correr', inicio: base + 2 * DIA, distanciaM: 21_100, duracionSeg: 6600, desnivelM: 120 })
const sprint = act({ id: 4, tipo: 'correr', inicio: base + 3 * DIA, distanciaM: 3000, duracionSeg: 720 })
const parkrun = act({ id: 5, tipo: 'correr', inicio: base + 4 * DIA, distanciaM: 5000, duracionSeg: 1530 })
const todas = [rodaje, penalara, media, sprint, parkrun]

describe('mejores marcas', () => {
  it('la más larga, la de más desnivel y el mejor ritmo, todas las actividades juntas', () => {
    const m = mejoresMarcas(todas)
    expect(m.distancia?.actividad.id).toBe(3)
    expect(m.desnivel).toEqual({ actividad: penalara, valor: 1240 })
    expect(m.ritmo?.actividad.id).toBe(5)
    expect(m.ritmo?.valor).toBeCloseTo(306)
  })

  it('el mejor ritmo solo cuenta salidas de 5 km o más: un sprint de 3 km más rápido no lo gana', () => {
    expect(mejoresMarcas([sprint]).ritmo).toBeUndefined()
    expect(mejoresMarcas([sprint, rodaje]).ritmo?.actividad.id).toBe(1)
  })

  it('sin desnivel no hay marca de desnivel; sin actividades, ninguna', () => {
    expect(mejoresMarcas([sprint, parkrun]).desnivel).toBeUndefined()
    expect(mejoresMarcas([])).toEqual({})
  })

  it('ignora la grabación en curso y, en empate, la marca es de la más antigua', () => {
    expect(mejoresMarcas([rodaje, act({ id: 9, inicio: base + 9 * DIA, distanciaM: 50_000, enCurso: true })]).distancia?.actividad.id).toBe(1)
    const igual = act({ id: 6, inicio: base + 9 * DIA, distanciaM: 21_100, duracionSeg: 9000 })
    expect(mejoresMarcas([igual, media]).distancia?.actividad.id).toBe(3)
  })
})

describe('marcas de una actividad (detalle)', () => {
  it('las que tiene cuando hay otras que optaban', () => {
    expect(marcasDe(todas, 3)).toEqual(['distancia'])
    expect(marcasDe(todas, 2)).toEqual(['desnivel'])
    expect(marcasDe(todas, 5)).toEqual(['ritmo'])
    expect(marcasDe(todas, 4)).toEqual([])
  })

  it('con una sola salida que opta, no presume de nada', () => {
    expect(marcasDe([media], 3)).toEqual([])
    // Única de 5 km o más: tiene la más larga (hay otra), pero el ritmo no tiene con quién compararse.
    expect(marcasDe([media, sprint], 3)).toEqual(['distancia'])
  })
})

describe('marcas batidas al guardar', () => {
  it('lo que mejora a la anterior mejor', () => {
    expect(marcasBatidas(todas, { distanciaM: 25_000, duracionSeg: 7000, desnivelM: 50 })).toEqual(['distancia', 'ritmo'])
    expect(marcasBatidas(todas, { distanciaM: 6000, duracionSeg: 3600, desnivelM: 1500 })).toEqual(['desnivel'])
    expect(marcasBatidas(todas, { distanciaM: 4000, duracionSeg: 600 })).toEqual([])
  })

  it('un empate no bate y sin marca anterior no hay nada que batir', () => {
    expect(marcasBatidas(todas, { distanciaM: 21_100, duracionSeg: 9000 })).toEqual([])
    expect(marcasBatidas([], { distanciaM: 10_000, duracionSeg: 3000, desnivelM: 300 })).toEqual([])
    expect(marcasBatidas([sprint], { distanciaM: 10_000, duracionSeg: 3000 })).toEqual(['distancia'])
  })

  it('el mensaje del aviso', () => {
    expect(mensajeConMarcas('Actividad guardada', [])).toBe('Actividad guardada')
    expect(mensajeConMarcas('Actividad importada', ['distancia'])).toBe('Actividad importada · Tu salida más larga')
    expect(mensajeConMarcas('Actividad guardada', ['distancia', 'ritmo'])).toBe('Actividad guardada · Tu salida más larga y tu mejor ritmo en 5 km o más')
  })
})
