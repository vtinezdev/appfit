import { describe, expect, it } from 'vitest'
import { CATALOGO_EJERCICIOS, EQUIPAMIENTO, MUSCULOS } from './catalogoEjercicios'
import { FILTROS_MUSCULO, catalogoDeLocal, filtrarEjercicios, opcionesEjercicios, recientesEjercicios } from './selectorEjercicios'
import type { Exercise, SetEntry } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'

const opciones = opcionesEjercicios([])
const legacy: Exercise = { id: 21, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'General' }
const buscar = (q: string) => filtrarEjercicios(opciones, q, [], []).map(e => e.name)

describe('catálogo editorial de ejercicios', () => {
  it('100–250 ejercicios distintos con identidades y clasificaciones completas', () => {
    expect(CATALOGO_EJERCICIOS.length).toBeGreaterThanOrEqual(100)
    expect(CATALOGO_EJERCICIOS.length).toBeLessThanOrEqual(250)
    expect(new Set(CATALOGO_EJERCICIOS.map(e => e.id)).size).toBe(CATALOGO_EJERCICIOS.length)
    expect(new Set(CATALOGO_EJERCICIOS.map(e => normalizeName(e.name))).size).toBe(CATALOGO_EJERCICIOS.length)
    // Nombre y alias identifican un único ejercicio: catalogoDeLocal enlaza registros antiguos por coincidencia exacta.
    const nombres = CATALOGO_EJERCICIOS.flatMap(e => [e.name, ...(e.aliases ?? [])].map(normalizeName))
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const e of CATALOGO_EJERCICIOS) {
      expect(e.id).toMatch(/^appfit:[a-z0-9-]+$/)
      expect(e.primaryMuscles.length).toBeGreaterThan(0)
      expect(e.equipment.length).toBeGreaterThan(0)
      expect(e.secondaryMuscles.some(m => e.primaryMuscles.includes(m))).toBe(false)
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) expect(MUSCULOS).toHaveProperty(m)
      for (const eq of e.equipment) expect(EQUIPAMIENTO).toHaveProperty(eq)
    }
    expect(new Set(CATALOGO_EJERCICIOS.flatMap(e => [...e.primaryMuscles, ...(e.filterGroups ?? [])])).size).toBe(13)
    expect(CATALOGO_EJERCICIOS.some(e => e.primaryMuscles.includes('completo'))).toBe(false)
    expect(new Set(CATALOGO_EJERCICIOS.flatMap(e => e.equipment)).size).toBe(10)
  })
  it('no instala registros al abrir y no modifica datos antiguos', () => {
    const original = structuredClone(legacy)
    expect(opcionesEjercicios([legacy]).filter(e => e.name === 'Press banca')).toHaveLength(1)
    expect(opcionesEjercicios([legacy]).find(e => e.name === 'Press banca')?.localId).toBe(21)
    expect(legacy).toEqual(original)
  })
  it('un nombre aproximado nunca asocia identidades históricas', () => {
    expect(catalogoDeLocal({ ...legacy, nombre: 'Press banca mío', nombreNorm: 'press banca mio' })).toBeUndefined()
    expect(catalogoDeLocal({ ...legacy, primaryMuscles: ['core'], equipment: ['bandas'] })).toBeUndefined()
  })
  it('un personalizado con nombre reservado sigue siendo personalizado sin duplicar fila', () => {
    const list = opcionesEjercicios([{ ...legacy, primaryMuscles: ['core'], equipment: ['bandas'] }])
    expect(list.filter(e => e.name === 'Press banca')).toMatchObject([{ key: 'local:21', primaryMuscles: ['core'], catalogId: undefined }])
  })
  it('alias antiguo conserva nombre e identidad local', () => {
    expect(opcionesEjercicios([{ ...legacy, nombre: 'Bench press', nombreNorm: 'bench press' }]).find(e => e.key === 'appfit:press-banca')).toMatchObject({ name: 'Bench press', localId: 21 })
  })
})

describe('búsqueda y filtros', () => {
  const abductores = ['appfit:abduccion-bandas', 'appfit:abduccion-maquina', 'appfit:abduccion-polea', 'appfit:almejas']

  it('Abductores aparece después de Aductores y conserva los músculos anatómicos', () => {
    const ids = Object.keys(FILTROS_MUSCULO)
    expect(ids[ids.indexOf('aductores') + 1]).toBe('abductores')
    expect(MUSCULOS).not.toHaveProperty('abductores')
    const result = filtrarEjercicios(opciones, '', ['abductores'], [])
    expect(result.map(e => e.catalogId).sort()).toEqual(abductores)
    expect(result.every(e => e.primaryMuscles.includes('gluteos'))).toBe(true)
  })
  it.each(['abductor', 'abductores'])('buscar %s encuentra las cuatro abducciones como coincidencias directas', query => {
    expect(filtrarEjercicios(opciones, query, [], []).slice(0, 4).map(e => e.catalogId).sort()).toEqual(abductores)
  })
  it('Abductores con otro músculo conserva OR y no duplica ejercicios', () => {
    const result = filtrarEjercicios(opciones, '', ['abductores', 'aductores'], [])
    const esperados = [...abductores, ...filtrarEjercicios(opciones, '', ['aductores'], []).map(e => e.catalogId)].sort()
    expect(result.map(e => e.catalogId).sort()).toEqual(esperados)
    expect(filtrarEjercicios(opciones, '', ['abductores', 'gluteos'], [])).toEqual(filtrarEjercicios(opciones, '', ['gluteos'], []))
  })
  it('Abductores combina equipamiento y consulta con AND', () => {
    expect(filtrarEjercicios(opciones, '', ['abductores'], ['bandas']).map(e => e.catalogId).sort()).toEqual(['appfit:abduccion-bandas', 'appfit:almejas'])
    expect(filtrarEjercicios(opciones, 'cadera', ['abductores'], ['bandas']).map(e => e.catalogId)).toEqual(['appfit:abduccion-bandas'])
    expect(filtrarEjercicios(opciones, '', ['abductores'], ['maquina', 'polea']).map(e => e.catalogId).sort()).toEqual(['appfit:abduccion-maquina', 'appfit:abduccion-polea'])
    expect(filtrarEjercicios(opciones, '', ['abductores'], ['barra'])).toEqual([])
  })
  it('no supone abducción por nombre o por pertenecer a glúteos; conserva identidad antigua', () => {
    const personalizado: Exercise = { id: 50, nombre: 'Mi abductor', nombreNorm: 'mi abductor', grupo: 'Glúteos', primaryMuscles: ['gluteos'], equipment: ['bandas'] }
    const antigua: Exercise = { id: 51, nombre: 'Clamshell', nombreNorm: 'clamshell', grupo: 'General' }
    const result = filtrarEjercicios(opcionesEjercicios([personalizado, antigua]), '', ['abductores'], [])
    expect(result.map(e => e.catalogId).sort()).toEqual(abductores)
    expect(result.find(e => e.catalogId === 'appfit:almejas')?.localId).toBe(51)
    expect(catalogoDeLocal({ ...antigua, nombre: 'Abductores', nombreNorm: 'abductores' })).toBeUndefined()
  })
  it('limpiar consulta y filtros recupera todas las opciones sin mutarlas', () => {
    const original = structuredClone(opciones)
    filtrarEjercicios(opciones, 'cadera', ['abductores'], ['bandas'])
    expect(filtrarEjercicios(opciones, '', [], [])).toHaveLength(opciones.length)
    expect(opciones).toEqual(original)
  })
  it.each(['JALÓN', 'jalon', 'jalón', 'jalonn'])('tolera %s', q => {
    expect(buscar(q)).toContain('Jalón al pecho')
  })
  it('encuentra palabras desordenadas, plurales y alias', () => {
    expect(buscar('mancuerna press')).toContain('Press con mancuernas')
    expect(buscar('bench press')).toContain('Press banca')
    expect(buscar('zzzz')).toEqual([])
    expect(buscar('p')).not.toContain('Curl con barra')
  })
  it('prioriza palabras directas sobre errores de una letra', () => {
    const list = opcionesEjercicios([
      { ...legacy, id: 1, nombre: 'Zeta jalon', nombreNorm: 'zeta jalon', equipment: [] },
      { ...legacy, id: 2, nombre: 'Aaa jalom', nombreNorm: 'aaa jalom', equipment: [] },
    ])
    const results = filtrarEjercicios(list, 'jalon', [], [])
    expect(results.findIndex(e => e.localId === 1)).toBeLessThan(results.findIndex(e => e.localId === 2))
  })
  it('Pecho + Mancuernas contiene los cuatro ejemplos solicitados', () => {
    expect(filtrarEjercicios(opciones, '', ['pecho'], ['mancuernas']).map(e => e.name)).toEqual(expect.arrayContaining([
      'Press con mancuernas', 'Press inclinado con mancuernas', 'Aperturas con mancuernas', 'Pullover con mancuerna',
    ]))
  })
  it('OR dentro de cada familia, AND entre familias y búsqueda; músculo secundario no filtra como principal', () => {
    const result = filtrarEjercicios(opciones, 'press', ['pecho', 'hombros'], ['barra', 'mancuernas'])
    expect(result.some(e => e.name === 'Press militar')).toBe(true)
    expect(result.every(e => e.primaryMuscles.some(m => ['pecho', 'hombros'].includes(m)) && e.equipment.some(q => ['barra', 'mancuernas'].includes(q)))).toBe(true)
    expect(filtrarEjercicios(opciones, 'press banca', ['triceps'], []).some(e => e.key === 'appfit:press-banca')).toBe(false)
  })
})

describe('recientes desde series', () => {
  it('deduplica por identidad, ordena uso real e ignora huérfanos; no muta las series', () => {
    const list = opcionesEjercicios([legacy, { ...legacy, id: 22, nombre: 'Mi ejercicio', nombreNorm: 'mi ejercicio' }])
    const base = { workoutId: 1, orden: 0, reps: 8, peso: 20 }
    const series: SetEntry[] = [{ ...base, id: 1, exerciseId: 21, createdAt: 1 }, { ...base, id: 2, exerciseId: 22, createdAt: 2 }, { ...base, id: 3, exerciseId: 21, createdAt: 3 }, { ...base, id: 4, exerciseId: 999, createdAt: 4 }]
    const original = structuredClone(series)
    expect(recientesEjercicios(list, series).map(e => e.localId)).toEqual([21, 22])
    expect(recientesEjercicios(list, series, 1).map(e => e.localId)).toEqual([21])
    expect(series).toEqual(original)
  })
})
