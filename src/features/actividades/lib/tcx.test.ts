import { describe, expect, it } from 'vitest'
import { GpxError } from './gpx'
import { esTcx, resumirArchivoActividad, resumirTcx } from './tcx'

const punto = (hora: string, lat: number, ele: number, distancia: number) => `
     <Trackpoint>
      <Time>2026-10-12T08:${hora}Z</Time>
      <Position><LatitudeDegrees>${lat}</LatitudeDegrees><LongitudeDegrees>-3.70</LongitudeDegrees></Position>
      <AltitudeMeters>${ele}</AltitudeMeters>
      <DistanceMeters>${distancia}</DistanceMeters>
      <HeartRateBpm><Value>150</Value></HeartRateBpm>
      <Extensions><ns3:TPX><ns3:Speed>3.1</ns3:Speed></ns3:TPX></Extensions>
     </Trackpoint>`

// Como lo exporta Garmin Connect: dos vueltas con sus totales y una pista por vuelta.
const GARMIN = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
 <Activities>
  <Activity Sport="Running">
   <Id>2026-10-12T08:00:00.000Z</Id>
   <Lap StartTime="2026-10-12T08:00:00.000Z">
    <TotalTimeSeconds>300.0</TotalTimeSeconds>
    <DistanceMeters>1000.0</DistanceMeters>
    <Calories>70</Calories>
    <Track>${punto('00:00', 40.4, 650, 0)}${punto('02:30', 40.4045, 660, 500)}${punto('05:00', 40.409, 670, 1000)}
    </Track>
   </Lap>
   <Lap StartTime="2026-10-12T08:05:00.000Z">
    <TotalTimeSeconds>290.5</TotalTimeSeconds>
    <DistanceMeters>1000.0</DistanceMeters>
    <Track>${punto('05:00', 40.409, 670, 1000)}${punto('09:50', 40.418, 650, 2000)}
    </Track>
    <Notes>Vuelta 2</Notes>
   </Lap>
   <Notes>Series en el Retiro &amp; vuelta</Notes>
   <Creator xsi:type="Device_t"><Name>Forerunner</Name></Creator>
  </Activity>
 </Activities>
</TrainingCenterDatabase>`

// Cinta: sin posiciones, con la distancia del reloj.
const CINTA = `<TrainingCenterDatabase>
 <Activities>
  <Activity Sport="Running">
   <Id>2026-10-13T19:00:00Z</Id>
   <Lap StartTime="2026-10-13T19:00:00Z">
    <TotalTimeSeconds>1800</TotalTimeSeconds>
    <DistanceMeters>5200</DistanceMeters>
    <Track>
     <Trackpoint><Time>2026-10-13T19:00:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
     <Trackpoint><Time>2026-10-13T19:30:00Z</Time><DistanceMeters>5200</DistanceMeters></Trackpoint>
    </Track>
   </Lap>
  </Activity>
 </Activities>
</TrainingCenterDatabase>`

describe('resumirTcx', () => {
  it('usa la distancia y el tiempo de las vueltas, y el recorrido y el desnivel de las posiciones', () => {
    const r = resumirTcx(GARMIN)
    expect(r.distanciaM).toBe(2000)
    expect(r.duracionSeg).toBe(591) // 300 + 290,5, redondeado
    expect(r.inicio).toBe(Date.parse('2026-10-12T08:00:00Z'))
    expect(r.tipo).toBe('correr')
    expect(r.nombre).toBe('Series en el Retiro & vuelta')
    expect(r.recorrido).toHaveLength(2)
    expect(r.recorrido[0][0]).toEqual([40.4, -3.7, 650])
    expect(r.desnivelM).toBe(20)
  })

  it('sin posiciones (cinta) importa tiempo y distancia sin recorrido', () => {
    const r = resumirTcx(CINTA)
    expect(r).toEqual({ tipo: 'correr', inicio: Date.parse('2026-10-13T19:00:00Z'), duracionSeg: 1800, distanciaM: 5200, recorrido: [] })
  })

  it('sin totales de vuelta, toma la distancia y el tiempo de los puntos', () => {
    const sinTotales = CINTA.replace('<TotalTimeSeconds>1800</TotalTimeSeconds>', '').replace('<DistanceMeters>5200</DistanceMeters>\n    <Track>', '<Track>')
    expect(sinTotales).not.toContain('TotalTimeSeconds')
    const r = resumirTcx(sinTotales)
    expect(r.distanciaM).toBe(5200)
    expect(r.duracionSeg).toBe(1800)
  })

  it('propone el tipo por la velocidad cuando el deporte no lo dice', () => {
    expect(resumirTcx(CINTA.replace('Sport="Running"', 'Sport="Other"').replace('5200', '2500')).tipo).toBe('caminar')
  })

  it('rechaza lo que no es un TCX, el que no trae actividad y el que no trae ni tiempo ni distancia', () => {
    expect(() => resumirTcx('<gpx></gpx>')).toThrow(GpxError)
    expect(() => resumirTcx('<TrainingCenterDatabase><Activities/></TrainingCenterDatabase>')).toThrow('ninguna actividad')
    expect(() => resumirTcx('<TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>x</Id></Activity></Activities></TrainingCenterDatabase>')).toThrow('ni tiempo ni distancia')
  })
})

describe('resumirArchivoActividad', () => {
  it('distingue TCX y GPX por el contenido', () => {
    expect(esTcx(GARMIN)).toBe(true)
    expect(resumirArchivoActividad(GARMIN).distanciaM).toBe(2000)
    expect(resumirArchivoActividad('<gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.01" lon="2"/></trkseg></trk></gpx>').distanciaM).toBe(1112)
    expect(() => resumirArchivoActividad('{"no": "xml"}')).toThrow('ni un FIT')
  })
})
