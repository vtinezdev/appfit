import { describe, expect, it } from 'vitest'
import type { EventoXp } from '../../experiencia/lib/experiencia'
import {
  calcularCumbres, cambiarMontana, cuandoFue, cumbreDeSesion, diasDeExpedicion, empezar, hitosDe,
  metrosEntre, metrosPorTipo, montanasParaCambiar, nombreExpedicion, progresoTexto, rutaDe, SIGUIENTES, vecesCoronada,
} from './cumbres'
import { COLECCIONES, MONTANAS, montanaDe } from './montanas'
import { puntoEnLadera, trazadoSilueta, yDeFraccion } from './perfil'

const entreno = (fecha: string, xp: number, workoutId: number): EventoXp => ({ tipo: 'entreno', fecha, xp, workoutId, series: 6 })
const registro = (fecha: string, xp: number): EventoXp => ({ tipo: 'registro', fecha, xp, comidas: 2 })

describe('montañas', () => {
  it('cada etapa va de menor a mayor altitud (la segunda, detrás del Everest), con ids únicos', () => {
    const everest = MONTANAS.findIndex((m) => m.id === 'everest')
    for (const etapa of [MONTANAS.slice(0, everest + 1), MONTANAS.slice(everest + 1)]) {
      const alt = etapa.map((m) => m.altitud)
      expect([...alt].sort((a, b) => a - b)).toEqual(alt)
    }
    expect(MONTANAS.slice(0, 4).map((m) => m.id)).toEqual(['aneto', 'mulhacen', 'teide', 'mont-blanc']) // la ruta de siempre
    expect(MONTANAS).toHaveLength(22)
    expect(new Set(MONTANAS.map((m) => m.id)).size).toBe(MONTANAS.length)
  })

  it('colecciones: Techo de España, Siete Cumbres, Alpes, Volcanes y Los cinco más altos', () => {
    expect(COLECCIONES.espana.montanas).toEqual(['aneto', 'mulhacen', 'teide'])
    expect(COLECCIONES.siete.montanas).toHaveLength(7)
    expect(COLECCIONES.alpes.montanas).toEqual(['mont-blanc', 'jungfrau', 'cervino', 'monte-rosa'])
    expect(COLECCIONES.volcanes.montanas).toEqual(['teide', 'elbrus', 'kilimanjaro', 'fuji', 'cotopaxi', 'chimborazo', 'ojos-del-salado'])
    expect(COLECCIONES.gigantes.montanas).toEqual(['everest', 'makalu', 'lhotse', 'kangchenjunga', 'k2'])
  })
})

describe('rutaDe', () => {
  it('pone primero las elegidas (con repeticiones, sin ids desconocidos) y después las menos coronadas, en orden', () => {
    expect(rutaDe(['teide', 'nada', 'aneto'], 4).map((m) => m.id)).toEqual(['teide', 'aneto', 'mulhacen', 'mont-blanc'])
    expect(rutaDe(['aneto', 'aneto'], 3).map((m) => m.id)).toEqual(['aneto', 'aneto', 'mulhacen'])
  })

  it('no se acaba: con todas hechas empieza otra vuelta', () => {
    const ruta = rutaDe([], MONTANAS.length * 2 + 1)
    expect(ruta.slice(0, MONTANAS.length)).toEqual(MONTANAS)
    expect(ruta.slice(MONTANAS.length, MONTANAS.length * 2)).toEqual(MONTANAS)
    // Si una ya se repitió, la otra vuelta la deja para el final.
    expect(rutaDe(['aneto', 'aneto'], MONTANAS.length + 2).slice(2).map((m) => m.id)).toEqual([...MONTANAS.slice(1).map((m) => m.id), 'mulhacen'])
  })
})

describe('calcularCumbres', () => {
  it('sin montaña elegida no hay Cumbres', () => {
    expect(calcularCumbres([entreno('2026-10-01', 100, 1)], undefined)).toBeNull()
  })

  it('1 XP = 1 m desde el día de inicio (lo anterior no cuenta)', () => {
    const r = calcularCumbres([registro('2026-10-09', 30), entreno('2026-10-10', 100, 1), registro('2026-10-10', 30)], empezar('2026-10-10', 'aneto'))!
    expect(r.actual.montana.id).toBe('aneto')
    expect(r.actual.vez).toBe(1)
    expect(r.actual.metros).toBe(130)
    expect(r.metrosTotales).toBe(130)
    expect(r.coronadas).toEqual([])
    expect(r.siguientes.map((m) => m.id)).toEqual(['mulhacen', 'teide', 'mont-blanc', 'puncak-jaya', 'vinson'])
    expect(r.siguientes).toHaveLength(SIGUIENTES)
  })

  it('marca un hito cada 1.000 m con el día y el entreno que lo pasó', () => {
    const r = calcularCumbres([registro('2026-10-10', 990), entreno('2026-10-11', 100, 7), registro('2026-10-12', 1500)], empezar('2026-10-10', 'aneto'))!
    expect(r.actual.hitos).toEqual([
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
    expect(r.actual.montana.id).toBe('mulhacen')
    expect(r.actual.desde).toBe('2026-10-11')
    expect(r.actual.metros).toBe(30)
    expect(r.metrosTotales).toBe(3434)
    expect(r.tramos.map((t) => t.metros)).toEqual([3400, 4, 30])
  })

  it('la cima no es un hito de 1.000 m y una XP enorme hace una sola cumbre', () => {
    const r = calcularCumbres([registro('2026-10-10', 99999)], empezar('2026-10-10', 'aneto'))!
    expect(r.coronadas).toHaveLength(1)
    expect(r.coronadas[0].hitos.map((h) => h.metros)).toEqual([1000, 2000, 3000])
    expect(r.actual.metros).toBe(0)
  })

  it('sigue las montañas elegidas y después la ruta sugerida', () => {
    const r = calcularCumbres([registro('2026-10-10', 4000), registro('2026-10-11', 4000)], { inicio: '2026-10-10', ruta: ['teide'] })!
    expect(r.coronadas.map((x) => x.montana.id)).toEqual(['teide', 'aneto'])
    expect(r.actual.montana.id).toBe('mulhacen')
  })

  it('con todas coronadas, la ruta vuelve a empezar y cuenta las veces', () => {
    const eventos = MONTANAS.map((m, i) => registro(`2026-11-${String(i + 1).padStart(2, '0')}`, m.altitud + 50))
    const r = calcularCumbres([...eventos, registro('2026-12-01', 3404)], empezar('2026-11-01', 'aneto'))!
    expect(r.coronadas).toHaveLength(MONTANAS.length + 1)
    expect(r.coronadas.at(-1)).toMatchObject({ vez: 2, cumbre: { fecha: '2026-12-01' } })
    expect(nombreExpedicion(r.coronadas.at(-1)!)).toBe('Aneto · 2.ª vez')
    expect(r.actual).toMatchObject({ vez: 2, metros: 0 })
    expect(r.actual.montana.id).toBe('mulhacen')
    expect(vecesCoronada(r).get('aneto')).toBe(2)
    expect(vecesCoronada(r).get('mulhacen')).toBe(1)
  })

  it('repite una montaña coronada si se elige', () => {
    const r = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 3404)], { inicio: '2026-10-10', ruta: ['aneto', 'aneto'] })!
    expect(r.coronadas.map((x) => [x.montana.id, x.vez])).toEqual([['aneto', 1], ['aneto', 2]])
    expect(r.actual.montana.id).toBe('mulhacen')
  })

  it('ignora la XP nula o negativa', () => {
    const r = calcularCumbres([registro('2026-10-10', 0), registro('2026-10-10', -5), registro('2026-10-10', Number.NaN)], empezar('2026-10-10', 'aneto'))!
    expect(r.tramos).toEqual([])
  })
})

describe('cambiar de montaña', () => {
  it('por cualquier otra (también coronada) más alta que lo subido', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 3500)], config)!
    // Coronado el Aneto, en el Mulhacén con 3.479 m (sin sobrar): ya está coronado también.
    expect(r.coronadas.map((x) => x.montana.id)).toEqual(['aneto', 'mulhacen'])
    const r2 = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 3600)], { inicio: '2026-10-10', ruta: ['aneto', 'teide'] })!
    expect(r2.actual.metros).toBe(3600)
    const opciones = montanasParaCambiar(r2).map((m) => m.id)
    expect(opciones).not.toContain('aneto') // más baja que lo subido
    expect(opciones).not.toContain('teide') // la actual
    expect(opciones).toContain('mont-blanc')
    expect(montanasParaCambiar(calcularCumbres([registro('2026-10-10', 3404)], empezar('2026-10-10', 'aneto'))!).map((m) => m.id)).toContain('aneto') // coronada: se puede repetir
  })

  it('conserva las coronadas y lo subido', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 500)], config)!
    const nueva = cambiarMontana(config, r, 'everest')!
    expect(nueva).toEqual({ inicio: '2026-10-10', ruta: ['aneto', 'everest'] })
    const r2 = calcularCumbres([registro('2026-10-10', 3404), registro('2026-10-11', 500)], nueva)!
    expect(r2.actual.montana.id).toBe('everest')
    expect(r2.actual.metros).toBe(500)
    expect(r2.siguientes[0].id).toBe('mulhacen')
  })

  it('rechaza la actual o una desconocida; acepta repetir una coronada', () => {
    const config = empezar('2026-10-10', 'aneto')
    const r = calcularCumbres([registro('2026-10-10', 3404)], config)!
    expect(cambiarMontana(config, r, 'mulhacen')).toBeNull()
    expect(cambiarMontana(config, r, 'nada')).toBeNull()
    expect(cambiarMontana(config, r, 'aneto')).toEqual({ inicio: '2026-10-10', ruta: ['aneto', 'aneto'] })
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

  it('de dónde salen: por tipo, con los metros que de verdad subieron', () => {
    expect(metrosPorTipo(r.tramos, '2026-10-06', '2026-10-12')).toEqual([
      { tipo: 'registro', veces: 1, metros: 1200 },
      { tipo: 'entreno', veces: 1, metros: 100 },
    ])
    // El entreno del día 14 solo sube 54 m hasta la cima: cuenta eso, no sus 100 de XP.
    const todo = metrosPorTipo(r.tramos, '2026-10-06', '2026-10-14')
    expect(todo).toEqual([{ tipo: 'registro', veces: 2, metros: 3250 }, { tipo: 'entreno', veces: 2, metros: 154 }])
    expect(todo.reduce((a, t) => a + t.metros, 0)).toBe(metrosEntre(r.tramos, '2026-10-06', '2026-10-14'))
    expect(metrosPorTipo(r.tramos, '2026-10-20', '2026-10-26')).toEqual([])
  })

  it('hitos de la montaña, con la cumbre al final', () => {
    const hitos = hitosDe(r.coronadas[0])
    expect(hitos.map((h) => h.metros)).toEqual([1000, 2000, 3000, 3404])
    expect(hitos[3]).toEqual({ metros: 3404, cumbre: true, alcanzado: { fecha: '2026-10-14', workoutId: 4 } })
  })

  it('duración de la expedición y lo que subió un entreno', () => {
    expect(diasDeExpedicion(r.coronadas[0])).toBe(9)
    expect(diasDeExpedicion(r.actual)).toBeNull()
    const s = cumbreDeSesion(r, 4)
    expect(s.metros).toBe(54)
    expect(s.cumbres.map((x) => x.montana.id)).toEqual(['aneto'])
    expect(cumbreDeSesion(r, 3)).toEqual({ metros: 100, cumbres: [], hitos: [] })
  })

  it('cuándo fue: hoy, ayer o hace días', () => {
    expect(cuandoFue('2026-10-14', '2026-10-14')).toBe('hoy')
    expect(cuandoFue('2026-10-14', '2026-10-15')).toBe('ayer')
    expect(cuandoFue('2026-10-14', '2026-10-16')).toBe('hace 2 días')
  })

  it('texto del progreso', () => {
    expect(progresoTexto({ montana: montanaDe('teide')!, vez: 1, desde: '2026-10-01', metros: 2340, hitos: [], cumbre: null })).toBe('2.340 de 3.715 m')
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
