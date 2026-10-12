/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { calcularCaminos, rutaDe, rutasParaCambiar } from './caminos'
import { buscarLugares, FACTOR_CAMINO, indiceParaInsertar, kmTramo, leerPaqueteLugares, PaqueteLugaresInvalido, proponerParadas } from './lugares'
import { anadirVuelta, aPunto, aRuta, posicionEnRutaPropia, puntosDe, etapasPropuestas, insertarParada, kmTotales, nombrePorDefecto, quitarParada, validarRutaPropia } from './rutasPropias'

const lugares = leerPaqueteLugares(JSON.parse(readFileSync('public/lugares/espana.json', 'utf8')))
const de = (nombre: string) => lugares.find((l) => l.nombre === nombre)!

describe('paquete de lugares', () => {
  it('trae los municipios de España con su provincia', () => {
    expect(lugares.length).toBeGreaterThan(7000)
    expect(de('Tarragona')).toMatchObject({ provincia: 'Tarragona', norma: 'tarragona' })
  })

  it('rechaza un formato desconocido', () => {
    expect(() => leerPaqueteLugares({ formato: 2 })).toThrow(PaqueteLugaresInvalido)
  })
})

describe('buscar', () => {
  it('sin acentos ni mayúsculas, primero los que empiezan así y los más poblados', () => {
    const r = buscarLugares(lugares, 'valen')
    expect(r[0].nombre).toBe('Valencia')
    expect(buscarLugares(lugares, 'CASTELLO')[0].nombre).toBe('Castelló de la Plana')
    expect(buscarLugares(lugares, 'plana').some((l) => l.nombre === 'Castelló de la Plana')).toBe(true) // otra palabra
    expect(buscarLugares(lugares, '  ')).toEqual([])
  })
})

describe('Tarragona → Valencia', () => {
  const tgn = de('Tarragona')
  const vlc = de('Valencia')

  it('km en línea recta con el margen del camino', () => {
    const km = kmTramo(tgn, vlc)
    expect(km).toBeGreaterThan(250)
    expect(km).toBeLessThan(275)
    expect(km / FACTOR_CAMINO).toBeCloseTo(229, -1)
  })

  it('propone paradas en orden, sin repetir ni los extremos, más o menos cada 25 km', () => {
    const paradas = proponerParadas(tgn, vlc, lugares, 25)
    expect(paradas.length).toBeGreaterThanOrEqual(8)
    expect(paradas.length).toBeLessThanOrEqual(10)
    expect(new Set(paradas).size).toBe(paradas.length)
    expect(paradas).not.toContain(tgn)
    expect(paradas).not.toContain(vlc)
    const tramos = [tgn, ...paradas, vlc].slice(1).map((p, i, todos) => kmTramo(i === 0 ? tgn : todos[i - 1], p))
    for (const km of tramos) expect(km).toBeLessThan(60)
    expect(proponerParadas(tgn, vlc, lugares, 40).map((p) => p.nombre)).toEqual(expect.arrayContaining(['Castelló de la Plana', 'Sagunto']))
  })

  it('tierra adentro sigue a los pueblos grandes: Madrid → Toledo cada 40 km pasa por Illescas', () => {
    expect(proponerParadas(de('Madrid'), de('Toledo'), lugares, 40).map((p) => p.nombre)).toEqual(['Illescas'])
  })

  it('una parada nueva se inserta en su sitio de la recta', () => {
    const paradas = proponerParadas(tgn, vlc, lugares, 40)
    const sagunto = lugares.find((l) => l.norma.startsWith('sagunt'))!
    const i = indiceParaInsertar(tgn, vlc, paradas, sagunto)
    expect(i).toBeGreaterThan(paradas.length - 3)
  })
})

describe('rutas propias en Caminos', () => {
  const propia = aRuta({ id: 7, nombre: 'Tarragona – Valencia', salida: { nombre: 'Tarragona' }, etapas: [{ nombre: 'Castelló de la Plana', km: 100 }, { nombre: 'Valencia', km: 70 }], createdAt: 1, updatedAt: 1 })

  it('solo entran si se eligen y se pueden cambiar por ellas', () => {
    expect(rutaDe(['propia:7'], 2, [propia]).map((r) => r.id)).toEqual(['propia:7', 'ingles'])
    expect(rutaDe(['propia:7'], 1).map((r) => r.id)).toEqual(['ingles']) // borrada: se ignora
    const r = calcularCaminos([{ id: 1, fecha: '2026-10-12', inicio: 1, distanciaM: 120_000 }], { inicio: '2026-10-12', ruta: ['propia:7'] }, '2026-12-31', [propia])!
    expect(r.actual).toMatchObject({ metros: 120_000, ruta: { nombre: 'Tarragona – Valencia', coleccion: 'propia' } })
    expect(r.actual.etapas[0]).toEqual({ fecha: '2026-10-12', actividadId: 1 })
    const otra = calcularCaminos([], { inicio: '2026-10-12', ruta: ['ingles'] }, '2026-12-31', [propia])!
    expect(rutasParaCambiar(otra, [propia]).map((x) => x.id)).toContain('propia:7')
  })

  it('validación y nombre por defecto', () => {
    expect(validarRutaPropia({ nombre: 'x', salida: null, etapas: [] })).toBe('Elige el lugar de salida.')
    expect(validarRutaPropia({ nombre: '', salida: { nombre: 'A' }, etapas: [{ nombre: 'B', km: 3 }] })).toBe('Ponle un nombre a la ruta.')
    expect(validarRutaPropia({ nombre: 'A – B', salida: { nombre: 'A' }, etapas: [{ nombre: 'B', km: 3 }] })).toBeNull()
    expect(nombrePorDefecto({ nombre: 'Tarragona' }, [{ nombre: 'Valencia' }])).toBe('Tarragona – Valencia')
  })
})

describe('editar las etapas', () => {
  const tgn = de('Tarragona')
  const vlc = de('Valencia')
  const salida = aPunto(tgn)

  it('propone etapas que suman lo mismo que ir parada a parada y acaban en la llegada', () => {
    const etapas = etapasPropuestas(tgn, vlc, lugares, 40)
    expect(etapas.at(-1)?.nombre).toBe('Valencia')
    expect(kmTotales(etapas)).toBeGreaterThan(kmTramo(tgn, vlc))
  })

  it('quitar una parada une sus dos tramos y no quita la llegada', () => {
    const etapas = etapasPropuestas(tgn, vlc, lugares, 40)
    const sin = quitarParada(salida, etapas, 0)
    expect(sin).toHaveLength(etapas.length - 1)
    expect(sin[0]).toMatchObject({ nombre: etapas[1].nombre, km: kmTramo(tgn, etapas[1] as never) })
    expect(quitarParada(salida, etapas, etapas.length - 1)).toEqual(etapas)
    const aMano = quitarParada({ nombre: 'Casa' }, [{ nombre: 'Fuente', km: 3 }, { nombre: 'Ermita', km: 4.5 }], 0)
    expect(aMano).toEqual([{ nombre: 'Ermita', km: 7.5 }])
  })

  it('añadir una parada la pone en su sitio y recalcula sus tramos', () => {
    const etapas = etapasPropuestas(tgn, vlc, lugares, 1000) // solo la llegada
    const conCastello = insertarParada(salida, etapas, de('Castelló de la Plana'))
    expect(conCastello.map((e) => e.nombre)).toEqual(['Castelló de la Plana', 'Valencia'])
    expect(conCastello[0].km).toBe(kmTramo(tgn, de('Castelló de la Plana')))
    expect(conCastello[1].km).toBe(kmTramo(de('Castelló de la Plana'), vlc))
    const conDos = insertarParada(salida, conCastello, de('Vinaròs'))
    expect(conDos.map((e) => e.nombre)).toEqual(['Vinaròs', 'Castelló de la Plana', 'Valencia'])
  })
})

describe('posición en una ruta propia', () => {
  const r = { salida: { nombre: 'A', lat: 40, lon: 0 }, etapas: [{ nombre: 'B', lat: 41, lon: 0, km: 100 }, { nombre: 'C', lat: 41, lon: 1, km: 50 }] }

  it('interpola dentro de la etapa en curso según sus km', () => {
    expect(puntosDe(r)).toEqual([[40, 0], [41, 0], [41, 1]])
    expect(posicionEnRutaPropia(r, 50_000)).toEqual({ posicion: [40.5, 0], recorrido: [[40, 0], [40.5, 0]] })
    expect(posicionEnRutaPropia(r, 125_000)).toEqual({ posicion: [41, 0.5], recorrido: [[40, 0], [41, 0], [41, 0.5]] })
    expect(posicionEnRutaPropia(r, 999_000)?.posicion).toEqual([41, 1])
  })

  it('sin coordenadas en alguna parada no hay posición', () => {
    expect(posicionEnRutaPropia({ salida: { nombre: 'A' }, etapas: [{ nombre: 'B', km: 3 }] }, 0)).toBeNull()
  })
})

describe('ida y vuelta', () => {
  const tgn = de('Tarragona')
  const salida = aPunto(tgn)

  it('Tarragona – Reus – Tarragona: llegada en la salida y las paradas en el orden en que se añaden', () => {
    let etapas = etapasPropuestas(tgn, tgn, lugares, 25)
    expect(etapas).toHaveLength(1) // sin recta no hay paradas propuestas
    etapas = insertarParada(salida, etapas, de('Reus'))
    etapas = insertarParada(salida, etapas, de('Valls'))
    expect(etapas.map((e) => e.nombre)).toEqual(['Reus', 'Valls', 'Tarragona'])
    expect(etapas[0].km).toBe(kmTramo(tgn, de('Reus')))
    expect(etapas[1].km).toBe(kmTramo(de('Reus'), de('Valls')))
    expect(etapas[2].km).toBe(kmTramo(de('Valls'), tgn))
    expect(nombrePorDefecto(salida, etapas)).toBe('Tarragona – Reus – Valls – Tarragona')
    expect(nombrePorDefecto(salida, [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }, salida])).toBe('Tarragona – A – B – … – Tarragona')
  })

  it('«Volver a la salida» convierte la llegada en parada', () => {
    const ida = etapasPropuestas(tgn, de('Reus'), lugares, 25)
    const vuelta = anadirVuelta(salida, ida)
    expect(vuelta.map((e) => e.nombre)).toEqual(['Reus', 'Tarragona'])
    expect(vuelta[1].km).toBe(kmTramo(de('Reus'), tgn))
    expect(nombrePorDefecto(salida, vuelta)).toBe('Tarragona – Reus – Tarragona')
  })
})
