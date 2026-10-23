import { describe, expect, it } from 'vitest'
import type { Exercise, Routine } from '../../../shared/db/types'
import { leerResumen, resumenRutinaCompartida, type ResumenRutina } from '../../social/lib/publicacion'
import { datosRutinaCompartida, filasRutinaCompartida, objetivoCompartido, textoEjercicioCompartido } from './rutinaCompartida'

const ejercicios = new Map<number, Exercise>([
  [1, { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', catalogId: 'appfit:press-banca' }],
  [2, { id: 2, nombre: 'Máquina rara del gimnasio', nombreNorm: 'maquina rara del gimnasio', grupo: 'Espalda' }],
  [3, { id: 3, nombre: 'Remo con barra', nombreNorm: 'remo con barra', grupo: 'Espalda', catalogId: 'appfit:remo-barra' }],
])
const rutina: Routine = {
  id: 7, nombre: 'Torso A', exerciseIds: [1, 2, 3, 99],
  objetivos: { 1: { series: 4, repsMin: 6, repsMax: 8, descansoSeg: 120, calentamientos: 2 }, 2: { series: 3, repsMin: 10, repsMax: 12 } },
  agarres: { 3: { orientacion: 'prono' } },
}

describe('datosRutinaCompartida', () => {
  it('lleva los ejercicios en orden con su catálogo y su objetivo, sin agarres ni ejercicios que ya no existen', () => {
    const r = resumenRutinaCompartida(datosRutinaCompartida(rutina, ejercicios))
    expect(r).toEqual({ v: 1, tipo: 'rutina', titulo: 'Torso A', ejercicios: [
      { nombre: 'Press banca', catalogId: 'appfit:press-banca', series: 4, repsMin: 6, repsMax: 8, descansoSeg: 120, calentamientos: 2 },
      { nombre: 'Máquina rara del gimnasio', catalogId: null, series: 3, repsMin: 10, repsMax: 12 },
      { nombre: 'Remo con barra', catalogId: 'appfit:remo-barra' },
    ] } satisfies ResumenRutina)
    expect(JSON.stringify(r)).not.toMatch(/prono|kg|peso/)
    expect(leerResumen(JSON.parse(JSON.stringify(r)))).toEqual(r)
  })
})

describe('de la publicación a mis rutinas', () => {
  const publicada = resumenRutinaCompartida(datosRutinaCompartida(rutina, ejercicios))

  it('los del catálogo ya quedan elegidos; los propios y los desconocidos, por elegir', () => {
    const desconocido: ResumenRutina = { ...publicada, ejercicios: [...publicada.ejercicios, { nombre: 'De una versión nueva', catalogId: 'appfit:no-existe-aun' }] }
    expect(filasRutinaCompartida(desconocido).map((f) => f.seleccion)).toEqual([
      { tipo: 'catalogo', catalogId: 'appfit:press-banca' }, null, { tipo: 'catalogo', catalogId: 'appfit:remo-barra' }, null,
    ])
    expect(filasRutinaCompartida(publicada)[0].objetivo).toEqual({ series: 4, repsMin: 6, repsMax: 8, descansoSeg: 120, calentamientos: 2 })
    expect(filasRutinaCompartida(publicada)[2]).not.toHaveProperty('objetivo')
  })

  it('el objetivo vuelve a los límites de la app y se describe en una línea', () => {
    expect(objetivoCompartido({ nombre: 'X', catalogId: null, series: 15, repsMin: 5, repsMax: 5 })).toEqual({ series: 10, repsMin: 5, repsMax: 5 })
    expect(textoEjercicioCompartido(publicada.ejercicios[0])).toBe('4 × 6–8 reps · 2 min de descanso · 2 de calentamiento')
    expect(textoEjercicioCompartido(publicada.ejercicios[1])).toBe('3 × 10–12 reps')
    expect(textoEjercicioCompartido(publicada.ejercicios[2])).toBeNull()
  })
})
