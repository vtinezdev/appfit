import { describe, expect, it } from 'vitest'
import type { EventoXp } from '../../atributos/lib/atributos'
import {
  calcularCumbres, cambiarMontana, cuandoFue, cumbreDeSesion, cumbreReciente, diasDeExpedicion, empezar, hitosDe,
  metrosEntre, montanasParaCambiar, progresoTexto, rutaDe,
} from './cumbres'
import { COLECCIONES, MONTANAS, montanaDe } from './montanas'
import { puntoEnLadera, trazadoSilueta, yDeFraccion } from './perfil'

const entreno = (fecha: string, xp: number, workoutId: number): EventoXp => ({ tipo: 'entreno', atributo: 'fuerza', fecha, xp, workoutId, series: 6 })
const registro = (fecha: string, xp: number): EventoXp => ({ tipo: 'registro', atributo: 'nutricion', fecha, xp, comidas: 2 })

describe('montañas', () => {
  it('van de menor a mayor altitud, con ids únicos', () => {
    const alt = MONTANAS.map((m) => m.altitud)
    expect([...alt].sort((a, b) => a - b)).toEqual(alt)
    expect(new Set(MONTANAS.map((m) => m.id)).size).toBe(MONTANAS.length)
  })

  it('el Techo de España tiene 3 y las Siete Cumbres, 7', () => {
    expect(COLECCIONES.espana.montanas).toEqual(['aneto', 'mulhacen', 'teide'])
    expect(COLECCIONES.siete.montanas).toHaveLength(7)
  })
})

describe('rutaDe', () => {
  it('pone primero las elegidas y después el resto en orden, sin repetir ni ids desconocidos', () => {
    const ruta = rutaDe(['teide', 'nada', 'teide', 'aneto']).map((m) => m.id)
    expect(ruta.slice(0, 3)).toEqual(['teide', 'aneto', 'mulhacen'])
    expect(ruta).toHaveLength(MONTANAS.length)
  })
})

describe('calcularCumbres', () => {
  it('sin montaña elegida no hay Cumbres', () => {
    expect(calcularCumbres([entreno('2026-10-01', 100, 1)], undefined)).toBeNull()
  })

  it('1 XP = 1 m desde el día de inicio (lo anterior no cuenta)', () => {
    const r = calcularCumbres([registro('2026-10-09', 30), entreno('2026-10-10', 100, 1), registro('2026-10-10', 30)], empezar('2026-10-10', 'aneto'))!
    expect(r.actual?.montana.id).toBe('aneto')
    expect(r.actual?.metros).toBe(130)
    expect(r.metrosTotales).toBe(130)
    expect(r.coronadas).toEqual([])
    expect(r.siguientes[0].id).toBe('mulhacen')
  })

  it('marca un hito cada 1.000 m con el día y el entreno que lo pasó', () => {
    const r = calcularCumbres([registro('2026-10-10', 990), entreno('2026-10-11', 100, 7), registro('2026-10-12', 1500)], empezar('2026-10-10', 'aneto'))!
    expect(r.actual?.hitos).toEqual([
      { fecha: '2026-10-11', workoutId: 7, metros: 1000 },
      { fecha: '2026-10-12', metros: 2000 },
    ])
  })

  it('al hacer cumbre, lo que sobra se pierde y la siguiente empieza con la XP posterior', () => {
    const r = calcularCumbres([
      registro('2026-10-10', 3400),
      entreno('2026-10-11', 100, 1),
      registro('2026-10-11', 30),
    ], empezar('2026-10-10', 'aneto'))!
    expect(r.coronadas).toHaveLength(1)
    expect(r.coronadas[0].metros).toBe(3404)
    expect(r.coronadas[0].cumbre).toEqual({ fecha: '2026-10-11', workoutId: 1 })
    expect(r.actual?.montana.id).toBe('mulhacen')
    expect(r.actual?.desde).toBe('2026-10-11')
    expect(r.actual?.metros).toBe(30)
    expect(r.metrosTotales).toBe(3434)
    expect(r.tramos.map((t) => t.metros)).toEqual([3400, 4, 30])
  })

  it('la cima no es un hito de 1.000 m y una XP enorme hace una sola cumbre', () => {
    const r = calcularCumbres([registro('2026-10-10', 99999)], empezar('2026-10-10', 'aneto'))!
    expect(r.coronadas).toHaveLength(1)
    expect(r.coronadas[0].hitos.map((h) => h.metros)).toEqual([1000, 2000, 3000])
    expect(r.actual?.metros).toBe(0)
  })

  it('sigue las montañas elegidas y después la ruta sugerida', () => {
    const r = calcularCumbres([registro('2026-10-10', 4000), registro('2026-10-11', 4000)], { inicio: '2026-10-10', ruta: ['teide'] })!
    expect(r.coronadas.map((x) => x.montana.id)).toEqual(['teide', 'aneto'])
    expect(r.actual?.montana.id).toBe('mulhacen')
  })

  it('con todas coronadas no queda montaña actual', () => {
    const eventos = MONTANAS.map((m, i) => registro(`2026-11-${String(i + 1).padStart(2, '0')}`, m.altitud + 50))
    const r = calcularCumbres(eventos, empezar('2026-11-01', 'aneto'))!
    expect(r.coronadas).toHaveLength(MONTANAS.length)
    expect(r.actual).toBeNull()
    expect(r.siguientes).toEqual([])
    expect(montanasParaCambiar(r)).toEqual([])
  })

  it('ignora la XP nula o negativa', () => {
    const r = calcularCumbres([registro('2026-10-10', 0), registro('2026-10-10', -5), registro('2026-10-10', Number.NaN)], empezar('2026-10-10', 'aneto'))!
    expect(r.tramos).toEqual([])
  })
})

describe('cambiar de montaña', () => {
  it('solo por otra sin coronar y más alta que lo subido', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 3500)], config)!
    // Coronado el Aneto, en el Mulhacén con 3.479 m (sin sobrar): ya está coronado también.
    expect(r.coronadas.map((x) => x.montana.id)).toEqual(['aneto', 'mulhacen'])
    const r2 = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 3600)], { inicio: '2026-10-10', ruta: ['aneto', 'teide'] })!
    expect(r2.actual?.metros).toBe(3600)
    const opciones = montanasParaCambiar(r2).map((m) => m.id)
    expect(opciones).not.toContain('aneto')
    expect(opciones).not.toContain('mulhacen')
    expect(opciones).toContain('mont-blanc')
  })

  it('conserva las coronadas y lo subido', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 500)], config)!
    const nueva = cambiarMontana(config, r, 'everest')!
    expect(nueva).toEqual({ inicio: '2026-10-10', ruta: ['aneto', 'everest'] })
    const r2 = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 500)], nueva)!
    expect(r2.actual?.montana.id).toBe('everest')
    expect(r2.actual?.metros).toBe(500)
    expect(r2.siguientes[0].id).toBe('mulhacen')
  })

  it('rechaza una montaña coronada o desconocida', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404)], config)!
    expect(cambiarMontana(config, r, 'aneto')).toBeNull()
    expect(cambiarMontana(config, r, 'nada')).toBeNull()
  })
})

describe('lecturas', () => {
  const config = empezar('2026-10-06', 'aneto')
  const r = calcularCumbres([
    registro('2026-10-06', 1200),
    entreno('2026-10-08', 100, 3),
    registro('2026-10-13', 2050),
    entreno('2026-10-14', 100, 4),
  ], config)!

  it('metros de un periodo', () => {
    expect(metrosEntre(r.tramos, '2026-10-06', '2026-10-12')).toBe(1300)
  })

  it('hitos de la montaña, con la cumbre al final', () => {
    const hitos = hitosDe(r.coronadas[0])
    expect(hitos.map((h) => h.metros)).toEqual([1000, 2000, 3000, 3404])
    expect(hitos[3]).toEqual({ metros: 3404, cumbre: true, alcanzado: { fecha: '2026-10-14', workoutId: 4 } })
  })

  it('duración de la expedición y lo que subió un entreno', () => {
    expect(diasDeExpedicion(r.coronadas[0])).toBe(9)
    expect(diasDeExpedicion(r.actual!)).toBeNull()
    const s = cumbreDeSesion(r, 4)
    expect(s.metros).toBe(54)
    expect(s.cumbres.map((x) => x.montana.id)).toEqual(['aneto'])
    expect(cumbreDeSesion(r, 3)).toEqual({ metros: 100, cumbres: [], hitos: [] })
  })

  it('cumbre reciente: hasta anteayer', () => {
    expect(cumbreReciente(r, '2026-10-16')?.montana.id).toBe('aneto')
    expect(cumbreReciente(r, '2026-10-17')).toBeNull()
    expect(cuandoFue('2026-10-14', '2026-10-14')).toBe('hoy')
    expect(cuandoFue('2026-10-14', '2026-10-15')).toBe('ayer')
    expect(cuandoFue('2026-10-14', '2026-10-16')).toBe('hace 2 días')
  })

  it('texto del progreso', () => {
    expect(progresoTexto({ montana: montanaDe('teide')!, desde: '2026-10-01', metros: 2340, hitos: [], cumbre: null })).toBe('2.340 de 3.715 m')
  })
})

describe('perfil', () => {
  const lienzo = { ancho: 320, alto: 100, margen: 10 }

  it('la silueta empieza y acaba en la base', () => {
    const d = trazadoSilueta(lienzo)
    expect(d.startsWith('M0 100')).toBe(true)
    expect(d.endsWith('L320 100Z')).toBe(true)
  })

  it('la marca sube por la ladera: base, cima y alturas intermedias', () => {
    expect(puntoEnLadera(lienzo, 0)).toEqual({ x: 0, y: 100 })
    expect(puntoEnLadera(lienzo, 1)).toEqual({ x: 0.56 * 320, y: 10 })
    expect(puntoEnLadera(lienzo, 2)).toEqual(puntoEnLadera(lienzo, 1))
    const medio = puntoEnLadera(lienzo, 0.5)
    expect(medio.y).toBeCloseTo(55)
    expect(medio.x).toBeGreaterThan(0.25 * 320)
    expect(medio.x).toBeLessThan(0.37 * 320)
    expect(yDeFraccion(lienzo, 0.5)).toBeCloseTo(55)
  })
})
