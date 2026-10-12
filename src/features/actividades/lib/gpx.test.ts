import { describe, expect, it } from 'vitest'
import { GpxError, parsearGpx, resumirGpx, sugerirTipo } from './gpx'

const STRAVA = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><name>No es este</name><time>2026-10-10T07:00:00Z</time></metadata>
 <trk>
  <name>Carrera matutina &amp; río</name>
  <type>running</type>
  <trkseg>
   <trkpt lat="42.8800000" lon="-8.5400000"><ele>100.0</ele><time>2026-10-10T07:00:00Z</time></trkpt>
   <trkpt lat="42.8810000" lon="-8.5400000"><ele>110.0</ele><time>2026-10-10T07:00:30Z</time></trkpt>
   <trkpt lat='42.882' lon='-8.54'><ele>120</ele><time>2026-10-10T07:01:00Z</time><extensions><gpxtpx:hr>150</gpxtpx:hr></extensions></trkpt>
  </trkseg>
  <trkseg>
   <trkpt lat="42.890" lon="-8.540"><time>2026-10-10T07:10:00Z</time></trkpt>
   <trkpt lat="42.891" lon="-8.540"><time>2026-10-10T07:10:40Z</time></trkpt>
  </trkseg>
 </trk>
</gpx>`

describe('parsearGpx', () => {
  it('lee el nombre del track (no el de los metadatos), el tipo, los tramos, la altitud y la hora', () => {
    const g = parsearGpx(STRAVA)
    expect(g.nombre).toBe('Carrera matutina & río')
    expect(g.tipo).toBe('running')
    expect(g.tramos).toHaveLength(2)
    expect(g.tramos[0][0]).toEqual({ lat: 42.88, lon: -8.54, ele: 100, t: Date.parse('2026-10-10T07:00:00Z') })
    expect(g.tramos[0][2].lat).toBe(42.882)
    expect(g.tramos[1][0].ele).toBeUndefined()
  })

  it('acepta rutas (rtept) y puntos sin cuerpo', () => {
    const g = parsearGpx('<gpx><rte><name>Ruta</name><rtept lat="1" lon="2"/><rtept lat="1.01" lon="2"/></rte></gpx>')
    expect(g.tramos).toEqual([[{ lat: 1, lon: 2 }, { lat: 1.01, lon: 2 }]])
    expect(g.nombre).toBe('Ruta')
  })

  it('acepta etiquetas con prefijo de espacio de nombres', () => {
    const g = parsearGpx('<gpx:gpx><gpx:trk><gpx:trkseg><gpx:trkpt lat="1" lon="2"></gpx:trkpt><gpx:trkpt lat="1.01" lon="2"></gpx:trkpt></gpx:trkseg></gpx:trk></gpx:gpx>')
    expect(g.tramos[0]).toHaveLength(2)
  })

  it('ignora puntos con coordenadas imposibles', () => {
    const g = parsearGpx('<gpx><trk><trkseg><trkpt lat="91" lon="2"/><trkpt lat="1" lon="x"/><trkpt lat="1" lon="2"/></trkseg></trk></gpx>')
    expect(g.tramos).toEqual([[{ lat: 1, lon: 2 }]])
  })

  it('rechaza lo que no es un GPX o no trae recorrido', () => {
    expect(() => parsearGpx('{"no": "gpx"}')).toThrow(GpxError)
    expect(() => parsearGpx('<gpx><wpt lat="1" lon="2"/></gpx>')).toThrow(GpxError)
  })
})

describe('resumirGpx', () => {
  it('suma distancia y desnivel por tramos y la duración de cada tramo sin el hueco entre ellos', () => {
    const r = resumirGpx(parsearGpx(STRAVA))
    expect(r.distanciaM).toBe(Math.round(111.2 * 3)) // 2 × 111 m en el primero y 111 m en el segundo
    expect(r.desnivelM).toBe(20)
    expect(r.duracionSeg).toBe(60 + 40)
    expect(r.inicio).toBe(Date.parse('2026-10-10T07:00:00Z'))
    expect(r.tipo).toBe('correr')
    expect(r.recorrido[0][1]).toEqual([42.881, -8.54, 110])
  })

  it('sin horas no hay duración ni inicio', () => {
    const r = resumirGpx(parsearGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.01" lon="2"/></trkseg></trk></gpx>'))
    expect(r.duracionSeg).toBeUndefined()
    expect(r.inicio).toBeUndefined()
  })
})

describe('sugerirTipo', () => {
  it('usa el tipo del archivo si lo reconoce', () => {
    expect(sugerirTipo('Hiking', 5000, 3600, 0)).toBe('senderismo')
    expect(sugerirTipo('walking', 5000, 1200, 0)).toBe('caminar')
    expect(sugerirTipo('TrailRun', 5000, 3600, 0)).toBe('correr')
  })

  it('si no, la velocidad y el desnivel', () => {
    expect(sugerirTipo(undefined, 10_000, 3000, 0)).toBe('correr') // 12 km/h
    expect(sugerirTipo(undefined, 10_000, 9000, 500)).toBe('senderismo') // 50 m/km
    expect(sugerirTipo(undefined, 5000, 3600, 20)).toBe('caminar')
  })
})
