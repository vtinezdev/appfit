import { describe, expect, it } from 'vitest'
import { lugaresDeGeonames, PROVINCIAS } from './lugaresLib'

// Columnas de GeoNames: id, nombre, ascii, alternativos, lat, lon, clase, tipo, país, cc2, admin1, admin2, admin3, admin4, población…
const fila = (nombre: string, tipo: string, admin2: string, poblacion: number, clase = 'P', lat = 41.1, lon = 1.2) =>
  ['1', nombre, nombre, '', String(lat), String(lon), clase, tipo, 'ES', '', '56', admin2, '', '', String(poblacion), '', '', 'Europe/Madrid', '2024-01-01'].join('\t')

describe('lugaresDeGeonames', () => {
  it('se queda con los núcleos con población, ordenados de más a menos habitantes', () => {
    const texto = [
      fila('Cambrils', 'PPLA3', 'T', 35_000),
      fila('Tarragona', 'PPLA2', 'T', 141_542, 'P', 41.119054, 1.245442),
      fila('Tarragona', 'ADM3', 'T', 141_542, 'A'),
      fila('Un barrio', 'PPLX', 'T', 5000),
      fila('Sin gente', 'PPL', 'T', 0),
      fila('Fuera', 'PPL', 'XX', 100),
      fila('Cambrils', 'PPL', 'T', 200),
    ].join('\n')
    const p = lugaresDeGeonames(texto, '2026-10-12')
    expect(p.lugares.map((l) => l[0])).toEqual(['Tarragona', 'Cambrils'])
    expect(p.lugares[0]).toEqual(['Tarragona', p.provincias.indexOf('Tarragona'), 41.1191, 1.2454, 141_542])
    expect(p.lugares[1][4]).toBe(35_000)
    expect(p.provincias).toHaveLength(Object.keys(PROVINCIAS).length)
    expect(p).toMatchObject({ formato: 1, licencia: 'CC BY 4.0', version: '2026-10-12' })
  })
})
