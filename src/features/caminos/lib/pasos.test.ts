import { describe, expect, it } from 'vitest'
import { aportesDePasos, leerPasos, metrosDePasos, pasosTexto, validarZancada, zancadaDe, zancadaEstimadaCm, ZANCADA_POR_DEFECTO_CM } from './pasos'

describe('zancada', () => {
  it('estimada por la altura y el sexo; sin sexo, la media; sin altura, ninguna', () => {
    expect(zancadaEstimadaCm({ alturaCm: 180, sexo: 'hombre' })).toBe(75)
    expect(zancadaEstimadaCm({ alturaCm: 165, sexo: 'mujer' })).toBe(68)
    expect(zancadaEstimadaCm({ alturaCm: 170 })).toBe(70)
    expect(zancadaEstimadaCm({ sexo: 'mujer' })).toBeNull()
    expect(zancadaEstimadaCm(undefined)).toBeNull()
  })

  it('la propia manda; si no, la estimada y, sin altura, la de por defecto', () => {
    expect(zancadaDe(80, { alturaCm: 180, sexo: 'hombre' })).toEqual({ cm: 80, origen: 'propia' })
    expect(zancadaDe(undefined, { alturaCm: 180, sexo: 'hombre' })).toEqual({ cm: 75, origen: 'altura' })
    expect(zancadaDe(undefined, undefined)).toEqual({ cm: ZANCADA_POR_DEFECTO_CM, origen: 'defecto' })
    expect(zancadaDe(5, undefined).origen).toBe('defecto') // una propia fuera de rango no se usa
    expect(validarZancada(74.5)).toBeNull()
    expect(validarZancada(150)).toBe(150)
  })
})

describe('pasos', () => {
  it('se leen con o sin separador de millares', () => {
    expect(leerPasos('8432')).toBe(8432)
    expect(leerPasos(' 8.432 ')).toBe(8432)
    expect(leerPasos('12 000')).toBe(12_000)
    expect(leerPasos('8,4')).toBeNull()
    expect(leerPasos('84.32')).toBeNull()
    expect(leerPasos('0')).toBeNull()
    expect(leerPasos('100.001')).toBeNull()
    expect(leerPasos('')).toBeNull()
  })

  it('a metros con la zancada', () => {
    expect(metrosDePasos(10_000, 75)).toBe(7_500)
    expect(metrosDePasos(3, 70)).toBe(2)
    expect(pasosTexto(1)).toBe('1 paso')
    expect(pasosTexto(8432)).toBe('8.432 pasos')
  })

  it('cada día avanza lo que sobra de los pasos sobre sus actividades (sin contar dos veces)', () => {
    const actividades = [
      { fecha: '2026-10-05', distanciaM: 3_000 }, { fecha: '2026-10-05', distanciaM: 1_000 },
      { fecha: '2026-10-06', distanciaM: 12_000 }, { fecha: '2026-10-07', distanciaM: 5_000, enCurso: true as const },
    ]
    const dias = [{ fecha: '2026-10-07', pasos: 2_000 }, { fecha: '2026-10-05', pasos: 10_000 }, { fecha: '2026-10-06', pasos: 10_000 }]
    expect(aportesDePasos(dias, actividades, 75)).toEqual([
      { fecha: '2026-10-05', pasos: 10_000, metrosPasos: 7_500, metrosActividades: 4_000, metros: 3_500 },
      { fecha: '2026-10-06', pasos: 10_000, metrosPasos: 7_500, metrosActividades: 12_000, metros: 0 },
      { fecha: '2026-10-07', pasos: 2_000, metrosPasos: 1_500, metrosActividades: 0, metros: 1_500 },
    ])
  })
})
