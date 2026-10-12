import { describe, expect, it } from 'vitest'
import { anadirLectura, empezarGrabacion, enPausa, pausar, reanudar, segundosEnMarcha, type EstadoGrabacion, type Lectura } from './grabacion'

const lectura = (i: number, over: Partial<Lectura> = {}): Lectura => ({ lat: 42.88 + i * 0.0001, lon: -8.54, precision: 5, t: 1000 + i * 10_000, ...over })

function con(lecturas: Lectura[], e: EstadoGrabacion = empezarGrabacion(0)) {
  const motivos: (string | undefined)[] = []
  for (const l of lecturas) {
    const r = anadirLectura(e, l)
    e = r.estado
    motivos.push(r.descarte)
  }
  return { e, motivos }
}

describe('grabación', () => {
  it('acumula la distancia de las lecturas buenas', () => {
    const { e, motivos } = con([lectura(0), lectura(1), lectura(2)])
    expect(motivos).toEqual([undefined, undefined, undefined])
    expect(e.tramos[0]).toHaveLength(3)
    expect(e.distanciaM).toBeCloseTo(22.2, 0)
  })

  it('descarta lecturas imprecisas, el temblor estando quieto y los saltos imposibles', () => {
    const { e, motivos } = con([
      lectura(0),
      lectura(1, { precision: 80 }),
      lectura(0.1),
      lectura(50, { t: 11_000 }), // 550 m en 1 s
      lectura(1),
    ])
    expect(motivos).toEqual([undefined, 'precision', 'quieto', 'salto', undefined])
    expect(e.tramos[0]).toHaveLength(2)
  })

  it('guarda la altitud si la hay', () => {
    const { e } = con([lectura(0, { ele: 120 }), lectura(1)])
    expect(e.tramos[0][0]).toEqual([42.88, -8.54, 120])
    expect(e.tramos[0][1]).toHaveLength(2)
  })

  it('en pausa no cuenta tiempo ni puntos y al reanudar abre un tramo nuevo', () => {
    let { e } = con([lectura(0), lectura(1)], empezarGrabacion(0))
    e = pausar(e, 60_000)
    expect(enPausa(e)).toBe(true)
    expect(segundosEnMarcha(e, 600_000)).toBe(60)
    expect(anadirLectura(e, lectura(2)).descarte).toBe('pausa')
    e = reanudar(e, 600_000)
    expect(segundosEnMarcha(e, 630_000)).toBe(90)
    const antes = e.distanciaM
    e = con([lectura(40), lectura(41)], e).e
    expect(e.tramos).toHaveLength(2)
    expect(e.distanciaM - antes).toBeCloseTo(11.1, 0) // lo de la pausa no se une
  })
})
