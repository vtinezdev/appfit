import { describe, expect, it } from 'vitest'
import { leerResumen, MAX_EJERCICIOS, MAX_LINEAS, MAX_TEXTO, resumenActividad, resumenEntreno, textoEjercicios, type DatosEntreno } from './publicacion'

const entreno = (cambios: Partial<DatosEntreno> = {}): DatosEntreno => ({
  titulo: 'Torso A',
  inicio: Date.UTC(2026, 9, 15, 18, 0),
  fin: Date.UTC(2026, 9, 15, 19, 5, 20),
  series: 18,
  volumenKg: 8432.6,
  ejercicios: ['Press banca', 'Remo con barra', 'Press banca'],
  records: [{ ejercicio: 'Press banca', texto: '100 kg × 5' }],
  ligas: [{ ejercicio: 'Remo con barra', texto: 'Sube a Plata' }],
  logros: ['Constancia II'],
  ...cambios,
})

describe('resumen de un entreno', () => {
  it('cifras redondeadas y ejercicios sin repetir', () => {
    expect(resumenEntreno(entreno())).toEqual({
      v: 1, tipo: 'entreno', titulo: 'Torso A', duracionSeg: 3920, series: 18, volumenKg: 8433,
      ejercicios: ['Press banca', 'Remo con barra'],
      records: [{ ejercicio: 'Press banca', texto: '100 kg × 5' }],
      ligas: [{ ejercicio: 'Remo con barra', texto: 'Sube a Plata' }],
      logros: ['Constancia II'],
    })
  })

  it('recorta textos y listas largas', () => {
    const r = resumenEntreno(entreno({
      titulo: 'x'.repeat(100),
      ejercicios: Array.from({ length: 30 }, (_, i) => `Ejercicio ${i}`),
      records: Array.from({ length: 12 }, (_, i) => ({ ejercicio: `E${i}`, texto: '1 kg' })),
    }))
    expect(r.titulo).toHaveLength(MAX_TEXTO)
    expect(r.titulo.endsWith('…')).toBe(true)
    expect(r.ejercicios).toHaveLength(MAX_EJERCICIOS)
    expect(r.records).toHaveLength(MAX_LINEAS)
    // Lo más largo posible (con tildes, que ocupan dos bytes) cabe holgado en los 8 KB del servidor.
    const maximo = resumenEntreno(entreno({
      titulo: 'é'.repeat(100),
      ejercicios: Array.from({ length: 30 }, (_, i) => `${i}${'é'.repeat(100)}`),
      records: Array.from({ length: 12 }, () => ({ ejercicio: 'é'.repeat(100), texto: 'é'.repeat(100) })),
      ligas: Array.from({ length: 12 }, () => ({ ejercicio: 'é'.repeat(100), texto: 'é'.repeat(100) })),
      logros: Array.from({ length: 12 }, () => 'é'.repeat(100)),
    }))
    expect(new TextEncoder().encode(JSON.stringify(maximo)).length).toBeLessThan(7_000)
  })

  it('sin título ni cifras válidas no se rompe', () => {
    const r = resumenEntreno(entreno({ titulo: '  ', fin: 0, volumenKg: Number.NaN }))
    expect(r.titulo).toBe('Entreno')
    expect(r.duracionSeg).toBe(0)
    expect(r.volumenKg).toBe(0)
  })
})

describe('resumen de una actividad', () => {
  it('sin recorrido y con el desnivel solo si lo hay', () => {
    expect(resumenActividad({ tipo: 'senderismo', titulo: 'Peñalara', duracionSeg: 10_800.4, distanciaM: 12_345.6, desnivelM: 812.3 }))
      .toEqual({ v: 1, tipo: 'actividad', actividad: 'senderismo', titulo: 'Peñalara', duracionSeg: 10_800, distanciaM: 12_346, desnivelM: 812 })
    expect(resumenActividad({ tipo: 'correr', titulo: 'Carrera', duracionSeg: 1800, distanciaM: 5000 }).desnivelM).toBeNull()
  })
})

describe('leer un resumen del servidor', () => {
  it('lee lo que la app publica', () => {
    const r = resumenEntreno(entreno())
    expect(leerResumen(JSON.parse(JSON.stringify(r)))).toEqual(r)
    const a = resumenActividad({ tipo: 'correr', titulo: 'Carrera', duracionSeg: 1800, distanciaM: 5000 })
    expect(leerResumen(a)).toEqual(a)
  })

  it('descarta lo que no entiende', () => {
    expect(leerResumen(null)).toBeNull()
    expect(leerResumen([])).toBeNull()
    expect(leerResumen({ v: 2, tipo: 'entreno' })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'foto', titulo: 'x', duracionSeg: 1 })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'entreno', titulo: 'x', duracionSeg: -1, series: 1, volumenKg: 1 })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'actividad', actividad: 'nadar', titulo: 'x', duracionSeg: 1, distanciaM: 1 })).toBeNull()
  })

  it('recorta y limpia lo que venga de más', () => {
    const r = leerResumen({
      v: 1, tipo: 'entreno', titulo: 'y'.repeat(500), duracionSeg: 60, series: 3, volumenKg: 100,
      ejercicios: ['Sentadilla', 42, '', { a: 1 }],
      records: [{ ejercicio: 'Sentadilla', texto: '120 kg × 3' }, { ejercicio: 'Sin texto' }, 'nada'],
      ligas: 'no es lista',
      logros: Array.from({ length: 50 }, () => 'Logro'),
      extra: '<script>',
    })
    expect(r).toMatchObject({ ejercicios: ['Sentadilla'], records: [{ ejercicio: 'Sentadilla', texto: '120 kg × 3' }], ligas: [] })
    expect(r?.tipo === 'entreno' && r.logros).toHaveLength(MAX_LINEAS)
    expect(r?.titulo).toHaveLength(MAX_TEXTO)
    expect(r).not.toHaveProperty('extra')
  })
})

describe('textoEjercicios', () => {
  it('los primeros y cuántos quedan', () => {
    expect(textoEjercicios([])).toBe('')
    expect(textoEjercicios(['A'])).toBe('A')
    expect(textoEjercicios(['A', 'B', 'C'])).toBe('A, B y C')
    expect(textoEjercicios(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C y 2 más')
  })
})
