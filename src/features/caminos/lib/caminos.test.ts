import { describe, expect, it } from 'vitest'
import type { Actividad } from '../../../shared/db/types'
import {
  caminoDeActividad, calcularCaminos, cambiarRuta, diasDeExpedicion, empezar, etapaActual, finalesDeEtapa, metrosEntre,
  nombreExpedicion, progresoTexto, rutaDe, rutasParaCambiar, vecesTerminada,
} from './caminos'
import { metrosRuta, RUTAS, rutaDe as rutaPorId } from './rutas'

let id = 1
const act = (fecha: string, km: number, over: Partial<Actividad> = {}) => ({ id: id++, fecha, inicio: Date.parse(`${fecha}T08:00:00`) + id, distanciaM: km * 1000, ...over })

const ingles = rutaPorId('ingles')!
const HOY = '2026-12-31'

describe('rutas', () => {
  it('los ids son únicos y todas las etapas tienen km positivos', () => {
    expect(new Set(RUTAS.map((r) => r.id)).size).toBe(RUTAS.length)
    for (const r of RUTAS) {
      expect(r.etapas.length, r.id).toBeGreaterThan(0)
      for (const x of r.etapas) expect(x.km, `${r.id} ${x.hasta}`).toBeGreaterThan(0)
    }
  })

  it('los Caminos de Santiago acaban en Santiago (salvo el que sale de allí)', () => {
    for (const r of RUTAS.filter((x) => x.coleccion === 'santiago' && x.id !== 'fisterra')) expect(r.etapas.at(-1)?.hasta, r.id).toBe('Santiago de Compostela')
  })

  it('totales de referencia', () => {
    expect(metrosRuta(ingles)).toBe(111_500)
    expect(metrosRuta(rutaPorId('west-highland')!)).toBe(154_000)
    expect(metrosRuta(rutaPorId('frances')!)).toBe(763_700)
    expect(finalesDeEtapa(ingles)).toEqual([27_700, 47_400, 71_400, 95_800, 111_500])
  })
})

describe('ruta de capítulos', () => {
  it('primero las elegidas y después la sugerida, la hecha menos veces', () => {
    expect(rutaDe(['frances', 'nada'], 3).map((r) => r.id)).toEqual(['frances', RUTAS[0].id, RUTAS[1].id])
    expect(rutaDe([], RUTAS.length + 1).at(-1)?.id).toBe(RUTAS[0].id) // con todas hechas vuelve a empezar
  })
})

describe('calcularCaminos', () => {
  it('sin empezar es null; antes del inicio, las en curso y las futuras no cuentan', () => {
    expect(calcularCaminos([], undefined, HOY)).toBeNull()
    const r = calcularCaminos([act('2026-10-01', 10), act('2026-10-05', 3, { enCurso: true }), act('2027-01-01', 5), act('2026-10-05', 4)], empezar('2026-10-05', 'ingles'), HOY)!
    expect(r.actual.metros).toBe(4000)
    expect(r.metrosTotales).toBe(4000)
  })

  it('marca cada etapa con la actividad que la termina, sella un día por fecha y llega', () => {
    const a1 = act('2026-10-05', 20)
    const a2 = act('2026-10-05', 10)
    const a3 = act('2026-10-08', 50)
    const a4 = act('2026-10-12', 40) // llega con 8,5 km de más, que se pierden
    const r = calcularCaminos([a4, a3, a2, a1], empezar('2026-10-05', 'ingles'), HOY)!
    const x = r.expediciones[0]
    expect(x.etapas.map((m) => m?.actividadId)).toEqual([a2.id, a3.id, a3.id, a4.id, a4.id])
    expect(x.sellos).toEqual(['2026-10-05', '2026-10-08', '2026-10-12'])
    expect(x.llegada).toEqual({ fecha: '2026-10-12', actividadId: a4.id })
    expect(diasDeExpedicion(x)).toBe(8)
    expect(r.completadas).toHaveLength(1)
    expect(r.actual.ruta.id).toBe(RUTAS[1].id)
    expect(r.actual.metros).toBe(0)
    expect(r.metrosTotales).toBe(111_500)
    expect(caminoDeActividad(r, a4.id)).toMatchObject({ metros: 31_500, llegadas: [x] })
    expect(caminoDeActividad(r, a3.id).etapas.map((e) => e.indice)).toEqual([1, 2])
    expect(metrosEntre(r.tramos, '2026-10-05', '2026-10-05')).toBe(30_000)
  })

  it('repetir una ruta cuenta las veces', () => {
    const r = calcularCaminos([act('2026-10-05', 120), act('2026-10-06', 120), act('2026-10-07', 1)], { inicio: '2026-10-05', ruta: ['ingles', 'ingles'] }, HOY)!
    expect(r.completadas.map(nombreExpedicion)).toEqual(['Camino Inglés', 'Camino Inglés · 2.ª vez'])
    expect(vecesTerminada(r).get('ingles')).toBe(2)
  })
})

describe('etapa actual', () => {
  it('dice de dónde a dónde y cuánto se lleva', () => {
    const r = calcularCaminos([act('2026-10-05', 30)], empezar('2026-10-05', 'ingles'), HOY)!
    expect(etapaActual(r.actual)).toEqual({ indice: 1, desde: 'Pontedeume', hasta: 'Betanzos', recorridos: 2300, total: 19_700 })
    expect(progresoTexto(r.actual)).toBe('30 de 111,5 km')
  })

  it('al empezar, desde la salida', () => {
    const r = calcularCaminos([], empezar('2026-10-05', 'ingles'), HOY)!
    expect(etapaActual(r.actual)).toMatchObject({ indice: 0, desde: 'Ferrol', hasta: 'Pontedeume', recorridos: 0 })
  })
})

describe('cambiar de ruta', () => {
  it('solo por rutas más largas que lo recorrido; conserva lo hecho', () => {
    const config = empezar('2026-10-05', 'ingles')
    const r = calcularCaminos([act('2026-10-05', 50)], config, HOY)!
    const opciones = rutasParaCambiar(r).map((x) => x.id)
    expect(opciones).not.toContain('ingles')
    expect(opciones).not.toContain('inca') // 45 km
    expect(opciones).toContain('frances')
    expect(cambiarRuta(config, r, 'inca')).toBeNull()
    const nueva = cambiarRuta(config, r, 'frances')!
    expect(nueva).toEqual({ inicio: '2026-10-05', ruta: ['frances'] })
    expect(calcularCaminos([act('2026-10-05', 50)], nueva, HOY)!.actual).toMatchObject({ metros: 50_000 })
  })
})

describe('pasos en el motor', () => {
  it('van detrás de las actividades de su día, dan sellos, etapas y llegadas, y solo cuentan desde el inicio', () => {
    const a1 = act('2026-10-06', 20)
    const a2 = act('2026-10-07', 5)
    const pasos = [
      { fecha: '2026-10-04', metros: 9_000 }, // antes de empezar
      { fecha: '2026-10-05', metros: 4_000 },
      { fecha: '2026-10-06', metros: 7_700 }, // tras a1: pasa el final de la primera etapa (27,7 km)
      { fecha: '2026-10-08', metros: 0 },
      { fecha: '2027-01-02', metros: 5_000 }, // futuro
    ]
    const r = calcularCaminos([a2, a1], empezar('2026-10-05', 'ingles'), HOY, [], pasos)!
    expect(r.tramos.map((t) => [t.fecha, t.actividadId, t.metros])).toEqual([
      ['2026-10-05', null, 4_000], ['2026-10-06', a1.id, 20_000], ['2026-10-06', null, 7_700], ['2026-10-07', a2.id, 5_000],
    ])
    expect(r.actual.etapas[0]).toEqual({ fecha: '2026-10-06', actividadId: null })
    expect(r.actual.sellos).toEqual(['2026-10-05', '2026-10-06', '2026-10-07'])
    expect(r.metrosTotales).toBe(36_700)
    expect(caminoDeActividad(r, a1.id).metros).toBe(20_000)
  })

  it('unos pasos pueden terminar la ruta; lo que sobra se pierde', () => {
    const r = calcularCaminos([act('2026-10-05', 110)], { inicio: '2026-10-05', ruta: ['ingles', 'fisterra'] }, HOY, [], [{ fecha: '2026-10-05', metros: 4_000 }])!
    expect(r.completadas[0].llegada).toEqual({ fecha: '2026-10-05', actividadId: null })
    expect(r.tramos.at(-1)?.metros).toBe(1_500)
    expect(r.actual).toMatchObject({ metros: 0, desde: '2026-10-05' })
  })
})
