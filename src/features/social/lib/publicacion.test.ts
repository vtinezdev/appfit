import { describe, expect, it } from 'vitest'
import { leerResumen, leerMapa, sinImagenes, MAX_EJERCICIOS, MAX_LINEAS, MAX_TEXTO, MAX_PUBLICACION, resumenActividad, resumenEntreno, resumenLogro, resumenTexto, validarPublicacion, textoEjercicios, type DatosEntreno } from './publicacion'
import type { Logro } from '../../vitrina/lib/logros'

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
      ejercicios: ['Press banca', 'Remo con barra'], catalogIds: [null, null],
      records: [{ ejercicio: 'Press banca', texto: '100 kg × 5' }], recordsTotal: 1, recordsEjercicios: 1,
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
      catalogIds: Array.from({ length: 30 }, () => `appfit:${'a'.repeat(40)}`),
      insignias: Array.from({ length: 12 }, () => ({ id: 'cinco-mas-altos', grupo: 'constancia', nivel: 5 })),
    }))
    expect(maximo.catalogIds).toHaveLength(MAX_EJERCICIOS)
    expect(maximo.insignias).toHaveLength(MAX_LINEAS)
    // Las imágenes del catálogo y las insignias suman ~1 KB a este caso extremo; sigue por debajo de 8 KB.
    expect(new TextEncoder().encode(JSON.stringify(maximo)).length).toBeLessThan(8_000)
  })

  it('imagen del catálogo por ejercicio, alineada tras quitar repetidos; nunca la de un ejercicio propio', () => {
    const r = resumenEntreno(entreno({ catalogIds: ['appfit:press-banca', undefined, 'appfit:otro'] }))
    expect(r.catalogIds).toEqual(['appfit:press-banca', null])
    // Solo ejercicios propios: la lista va igual, toda `null`, para que la tarjeta sea de mosaico y no de texto.
    expect(resumenEntreno(entreno({ catalogIds: [undefined, 'off:123', 'https://x.y/a.webp'] })).catalogIds).toEqual([null, null])
    expect(resumenEntreno(entreno({ ejercicios: [] }))).not.toHaveProperty('catalogIds')
  })

  it('insignia de cada logro nuevo, solo si todas son válidas', () => {
    expect(resumenEntreno(entreno({ insignias: [{ id: 'semanas', grupo: 'constancia', nivel: 2 }] })).insignias).toEqual([{ id: 'semanas', grupo: 'constancia', nivel: 2 }])
    expect(resumenEntreno(entreno({ insignias: [{ id: 'nada' as never, grupo: 'constancia', nivel: 2 }] }))).not.toHaveProperty('insignias')
    expect(resumenEntreno(entreno({ insignias: [] }))).not.toHaveProperty('insignias')
  })

  it('sin la capacidad del servidor se envía sin imágenes ni insignias', () => {
    const r = resumenEntreno(entreno({ catalogIds: ['appfit:press-banca'], insignias: [{ id: 'semanas', grupo: 'constancia', nivel: 2 }] }))
    const sin = sinImagenes(r)
    expect(sin).not.toHaveProperty('catalogIds')
    expect(sin).not.toHaveProperty('insignias')
    const { catalogIds, ...base } = resumenEntreno(entreno())
    void catalogIds
    expect(sin).toEqual(base)
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

  it('lee imágenes e insignias solo si siguen alineadas con su lista', () => {
    const base = { v: 1, tipo: 'entreno', titulo: 'Torso', series: 3, ejercicios: ['Press', 'Remo'], records: [], ligas: [], logros: ['Semanas'] }
    expect(leerResumen({ ...base, catalogIds: ['appfit:press-banca', null], insignias: [{ id: 'semanas', grupo: 'constancia', nivel: null }] }))
      .toMatchObject({ catalogIds: ['appfit:press-banca', null], insignias: [{ id: 'semanas', grupo: 'constancia', nivel: null }] })
    // Una entrada descartada desalinea la lista: se ignoran las imágenes antes que pintar la de otro ejercicio.
    const desalineado = leerResumen({ ...base, ejercicios: ['Press', 42, 'Remo'], catalogIds: ['appfit:press-banca', null, 'appfit:remo-barra'] })
    expect(desalineado).toMatchObject({ ejercicios: ['Press', 'Remo'] })
    expect(desalineado).not.toHaveProperty('catalogIds')
    expect(leerResumen({ ...base, catalogIds: ['javascript:alert(1)', 'appfit:remo-barra'] })).toMatchObject({ catalogIds: [null, 'appfit:remo-barra'] })
    expect(leerResumen({ ...base, insignias: [{ id: 'semanas', grupo: 'constancia', nivel: 9 }] })).not.toHaveProperty('insignias')
    expect(leerResumen({ ...base, insignias: [] })).not.toHaveProperty('insignias')
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

describe('publicaciones libres', () => {
  it('exige texto, respeta el límite y mantiene los párrafos', () => {
    expect(resumenTexto(' \n ')).toBeNull()
    expect(resumenTexto('x'.repeat(MAX_PUBLICACION + 1))).toBeNull()
    expect(resumenTexto('x'.repeat(MAX_PUBLICACION))?.texto).toHaveLength(MAX_PUBLICACION)
    expect(validarPublicacion('x'.repeat(MAX_PUBLICACION + 1))).toContain('2.000')
    const r = resumenTexto('  Primera línea\n\nSegunda línea  ')
    expect(r?.texto).toBe('Primera línea\n\nSegunda línea')
    expect(leerResumen(r)).toEqual(r)
  })
  it('descarta texto remoto mal formado y elimina campos adicionales', () => {
    expect(leerResumen({ v: 1, tipo: 'texto', titulo: 'Publicación', texto: 42 })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'texto', titulo: 'Publicación', texto: '  ' })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'texto', titulo: 'Publicación', texto: 'Hola', email: 'privado' })).toEqual({ v: 1, tipo: 'texto', titulo: 'Publicación', texto: 'Hola' })
  })
})

describe('compartir un logro conseguido', () => {
  const logro = (cambios: Partial<Logro> = {}): Logro => ({ id: 'entrenos', grupo: 'entreno', nombre: 'Entrenos', descripcion: 'El siguiente pide 100', umbrales: [10, 50, 100], niveles: [{ fecha: '2026-10-01' }, { fecha: '2026-10-15' }, null], textoNivel: n => `${n} entrenos`, ...cambios })
  it('comparte el nivel obtenido y su requisito, no el del siguiente', () => {
    expect(resumenLogro(logro())).toMatchObject({ nivel: 2, descripcion: '50 entrenos' })
    expect(resumenLogro(logro(), 1)).toMatchObject({ nivel: 1, descripcion: '10 entrenos' })
    expect(leerResumen(resumenLogro(logro()))).toEqual(resumenLogro(logro()))
  })
  it('no permite pendientes, ocultos sin descubrir ni niveles no alcanzados', () => {
    expect(resumenLogro(logro(), 3)).toBeNull()
    expect(resumenLogro(logro(), 0)).toBeNull()
    expect(resumenLogro(logro(), 1.2)).toBeNull()
    expect(resumenLogro(logro({ oculto: true, niveles: [null, null, null] }))).toBeNull()
    expect(resumenLogro(logro({ umbrales: undefined, niveles: [], veces: [] }))).toBeNull()
  })
  it('comparte un repetible cuando se ha conseguido', () => {
    const l = logro({ id: 'descanso', grupo: 'oculto', umbrales: undefined, niveles: [], veces: [{ fecha: '2026-10-15' }] })
    expect(resumenLogro(l)).toMatchObject({ logroId: 'descanso', nivel: null })
  })
  it('una pieza sin niveles no inventa un numeral', () => {
    expect(resumenLogro(logro({ umbrales: [1], niveles: [{ fecha: '2026-10-15' }] }))?.nivel).toBeNull()
  })
  it('descarta identidades, grupos y niveles remotos desconocidos', () => {
    const r = resumenLogro(logro())!
    for (const dato of [{ logroId: 'desconocido' }, { grupo: '__proto__' }, { nivel: 6 }, { nivel: -1 }, { nivel: '1' }, { descripcion: '' }]) expect(leerResumen({ ...r, ...dato })).toBeNull()
  })
})

describe('mapa publicable', () => {
  it('comparte solo niveles conocidos, sin datos de Perfil o pesos', () => {
    const mapa = leerMapa({ pecho: 5, triceps: 3, peso: 80, sexo: 'mujer', lat: 41 })!
    expect(mapa).toMatchObject({ pecho: 5, triceps: 3, espalda: 0 })
    expect(Object.keys(mapa)).toHaveLength(12)
    expect(mapa).not.toHaveProperty('peso')
    const r = resumenEntreno(entreno({ mapa }))
    expect(leerResumen(r)).toEqual(r)
    expect(r.mapa).not.toBe(mapa)
  })
  it.each([null, [], { pecho: 6 }, { pecho: -1 }, { pecho: 1.5 }, { pecho: '5' }, { peso: 80 }])('ignora un mapa inválido: %j', mapa => {
    expect(leerMapa(mapa)).toBeUndefined()
    expect(leerResumen({ ...resumenEntreno(entreno()), mapa })).toEqual(resumenEntreno(entreno()))
  })
})
