import { describe, expect, it } from 'vitest'
import { esFit, resumirFit } from './fit'
import { GpxError } from './gpx'
import { leerArchivoActividad } from './importar'

// --- Un escritor FIT mínimo para los tests: cabecera de 14 bytes, definiciones y datos (sin CRC válido: no se comprueba). ---
type Tipo = 'u8' | 'u16' | 's32' | 'u32'
const BASE: Record<Tipo, [number, number]> = { u8: [0x02, 1], u16: [0x84, 2], s32: [0x85, 4], u32: [0x86, 4] }
interface Mensaje { local: number; global: number; campos: [number, Tipo][] }
class EscritorFit {
  private bytes: number[] = []
  definir(m: Mensaje, le = true) {
    this.bytes.push(0x40 | m.local, 0, le ? 0 : 1, ...(le ? [m.global & 0xff, m.global >> 8] : [m.global >> 8, m.global & 0xff]), m.campos.length)
    for (const [num, t] of m.campos) this.bytes.push(num, BASE[t][1], BASE[t][0])
    return this
  }
  datos(m: Mensaje, valores: (number | null)[], le = true, cabecera = m.local) {
    this.bytes.push(cabecera)
    m.campos.forEach(([, t], i) => {
      const tam = BASE[t][1]
      const v = valores[i] ?? (t === 's32' ? 0x7fffffff : 2 ** (tam * 8) - 1)
      const dv = new DataView(new ArrayBuffer(tam))
      if (t === 'u8') dv.setUint8(0, v); else if (t === 'u16') dv.setUint16(0, v, le); else if (t === 's32') dv.setInt32(0, v, le); else dv.setUint32(0, v, le)
      this.bytes.push(...new Uint8Array(dv.buffer))
    })
    return this
  }
  archivo(): Uint8Array {
    const cab = new Uint8Array(14)
    const dv = new DataView(cab.buffer)
    cab[0] = 14; cab[1] = 0x10; dv.setUint16(2, 2132, true); dv.setUint32(4, this.bytes.length, true)
    cab.set([0x2e, 0x46, 0x49, 0x54], 8)
    return new Uint8Array([...cab, ...this.bytes, 0, 0])
  }
}

const FIT_T0 = Date.parse('2026-10-18T08:30:00Z') / 1000 - 631065600
const SEMI = 2 ** 31 / 180
const RECORD: Mensaje = { local: 0, global: 20, campos: [[253, 'u32'], [0, 's32'], [1, 's32'], [2, 'u16'], [5, 'u32']] }
const LAP: Mensaje = { local: 1, global: 19, campos: [[8, 'u32'], [9, 'u32']] }
const SESSION: Mensaje = { local: 2, global: 18, campos: [[2, 'u32'], [5, 'u8'], [8, 'u32'], [9, 'u32'], [22, 'u16']] }
const punto = (i: number, lat = 40.4 + i * 0.001): (number | null)[] => [FIT_T0 + i * 10, Math.round(lat * SEMI), Math.round(-3.7 * SEMI), (650 + i) * 5 + 2500, i * 11100]

function reloj(): Uint8Array {
  const w = new EscritorFit().definir(RECORD)
  for (let i = 0; i < 6; i++) w.datos(RECORD, punto(i))
  // Pausa de 10 minutos: el recorrido se parte.
  for (let i = 66; i < 69; i++) w.datos(RECORD, punto(i, 40.4 + (i - 60) * 0.001))
  return w.definir(LAP).datos(LAP, [600_000, 50_000]).datos(LAP, [590_500, 50_000])
    .definir(SESSION).datos(SESSION, [FIT_T0, 1, 1_190_500, 100_000, 35]).archivo()
}

describe('resumirFit', () => {
  it('lee la sesión (tiempo, distancia, desnivel, deporte e inicio) y el recorrido partido en las pausas', () => {
    const r = resumirFit(reloj())
    expect(r).toMatchObject({ tipo: 'correr', inicio: Date.parse('2026-10-18T08:30:00Z'), duracionSeg: 1191, distanciaM: 1000, desnivelM: 35 })
    expect(r.recorrido).toHaveLength(2)
    expect(r.tiempos?.map((x) => x.length)).toEqual(r.recorrido.map((x) => x.length))
    expect(r.tiempos?.[0][0]).toBe(0)
    expect(r.recorrido[0][0][0]).toBeCloseTo(40.4, 5)
    expect(r.recorrido[0][0][2]).toBeCloseTo(650, 5)
  })

  it('sin sesión, suma las vueltas; sin vueltas, toma los puntos', () => {
    const conVueltas = new EscritorFit().definir(RECORD).datos(RECORD, punto(0)).datos(RECORD, punto(1)).definir(LAP).datos(LAP, [600_000, 50_000]).datos(LAP, [600_000, 70_000]).archivo()
    expect(resumirFit(conVueltas)).toMatchObject({ duracionSeg: 1200, distanciaM: 1200 })
    const soloPuntos = new EscritorFit().definir(RECORD).datos(RECORD, punto(0)).datos(RECORD, punto(30)).archivo()
    expect(resumirFit(soloPuntos)).toMatchObject({ duracionSeg: 300, distanciaM: 3330 })
  })

  it('cinta: sin posiciones, con tiempo y distancia y sin recorrido; el tipo por la velocidad si el deporte no lo dice', () => {
    const cinta = new EscritorFit().definir(RECORD).datos(RECORD, [FIT_T0, null, null, null, 0]).datos(RECORD, [FIT_T0 + 1800, null, null, null, 260_000])
      .definir(SESSION).datos(SESSION, [FIT_T0, null, 1_800_000, 260_000, null]).archivo()
    expect(resumirFit(cinta)).toEqual({ tipo: 'caminar', inicio: Date.parse('2026-10-18T08:30:00Z'), duracionSeg: 1800, distanciaM: 2600, recorrido: [] })
  })

  it('big endian y cabeceras de hora comprimida', () => {
    // Los puntos con cabecera comprimida no llevan el campo de hora: la dan los 5 bits bajos de su cabecera.
    const SIN_HORA: Mensaje = { local: 1, global: 20, campos: [[0, 's32'], [1, 's32'], [2, 'u16'], [5, 'u32']] }
    const w = new EscritorFit().definir(RECORD, false).datos(RECORD, punto(0), false).definir(SIN_HORA, false)
    const t1 = FIT_T0 + 5
    w.datos(SIN_HORA, [Math.round(40.401 * SEMI), Math.round(-3.7 * SEMI), 3255, 11100], false, 0x80 | (1 << 5) | (t1 & 0x1f))
    const r = resumirFit(w.archivo())
    expect(r.duracionSeg).toBe(5)
    expect(r.distanciaM).toBe(111)
    expect(r.recorrido[0]).toHaveLength(2)
  })

  it('rechaza lo que no es FIT, un FIT cortado o sin tiempo ni distancia', () => {
    expect(esFit(new TextEncoder().encode('<gpx></gpx>'))).toBe(false)
    expect(() => resumirFit(new TextEncoder().encode('<gpx></gpx>'))).toThrow(GpxError)
    const cortado = reloj().slice(0, 40)
    new DataView(cortado.buffer).setUint32(4, 1000, true)
    expect(() => resumirFit(cortado)).toThrow(GpxError)
    expect(() => resumirFit(new EscritorFit().definir(LAP).archivo())).toThrow('ni tiempo ni distancia')
  })
})

describe('leerArchivoActividad', () => {
  it('elige FIT por la cabecera y GPX o TCX por el contenido', () => {
    expect(leerArchivoActividad(reloj()).formato).toBe('FIT')
    expect(leerArchivoActividad(new TextEncoder().encode('<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap><TotalTimeSeconds>60</TotalTimeSeconds></Lap></Activity></Activities></TrainingCenterDatabase>')).formato).toBe('TCX')
    expect(leerArchivoActividad(new TextEncoder().encode('<gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.01" lon="2"/></trkseg></trk></gpx>'))).toMatchObject({ formato: 'GPX', resumen: { distanciaM: 1112 } })
  })
})
