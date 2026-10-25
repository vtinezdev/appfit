import { describe, expect, it } from 'vitest'
import type { Entry } from '../../../shared/db/types'
import { agruparPlatos, camposPlato, clavePlato, idsElegidos, renovarPlatos } from './platos'
import { sumMacros } from './nutrition'
import { entradasDesdePlantilla, itemsDesdeEntradas, planCopia, resolverItemsPlantilla } from './plantillas'

function entrada(id: number, extra: Partial<Entry> = {}): Entry {
  return { id, fecha: '2026-10-02', comida: 'cena', nombre: `Alimento ${id}`, gramos: 100, kcal: 100, prot: 10, carb: 5, grasa: 2, createdAt: 1, ...extra }
}

describe('platos', () => {
  it('idsElegidos devuelve los platos completos y las entradas sueltas no quitados, en orden', () => {
    const platos = agruparPlatos([entrada(1, { platoId: 'a' }), entrada(2), entrada(3, { platoId: 'a' }), entrada(4)])
    expect(idsElegidos(platos, new Set())).toEqual([1, 3, 2, 4])
    expect(idsElegidos(platos, new Set([platos[0].clave]))).toEqual([2, 4])
    expect(idsElegidos(platos, new Set(platos.map((p) => p.clave)))).toEqual([])
  })

  it('agrupa solo ids explícitos y conserva el orden de platos e ingredientes', () => {
    const entries = [entrada(1, { platoId: 'a' }), entrada(2), entrada(3, { platoId: 'b' }), entrada(4, { platoId: 'a' })]
    const platos = agruparPlatos(entries)
    expect(platos.map((p) => p.entries.map((e) => e.id))).toEqual([[1, 4], [2], [3]])
    expect(platos.map((p) => p.agrupado)).toEqual([true, false, true])
    expect(platos[0].nombre).toBe('Alimento 1 + Alimento 4')
    expect(platos[0].entries[0]).toBe(entries[0])
    expect(entries).toHaveLength(4)
    expect(sumMacros(platos.flatMap((p) => p.entries))).toEqual(sumMacros(entries))
  })

  it('no agrupa registros antiguos con la misma fecha, hora y descripción', () => {
    const entries = [entrada(1, { textoOriginal: 'huevos y longaniza' }), entrada(2, { textoOriginal: 'huevos y longaniza' })]
    expect(agruparPlatos(entries)).toHaveLength(2)
  })

  it('no mezcla platos con el mismo id en fechas o comidas distintas', () => {
    const entries = [entrada(1, { platoId: 'a' }), entrada(2, { platoId: 'a', comida: 'snack' }), entrada(3, { platoId: 'a', fecha: '2026-10-01' })]
    expect(agruparPlatos(entries)).toHaveLength(3)
    const copias = planCopia(entries, { fecha: '2026-10-02', comida: 'cena' }, 1, 'copia')
    expect(new Set(copias.map((e) => e.platoId)).size).toBe(3)
  })

  it('usa el nombre opcional, también cuando solo queda un ingrediente', () => {
    expect(agruparPlatos([entrada(1, { platoId: 'a', nombrePlato: '  Cena especial  ' })])[0]).toMatchObject({ nombre: 'Cena especial', agrupado: true })
    expect(agruparPlatos([entrada(1, { platoId: 'a', nombrePlato: '  ' })])[0].nombre).toBe('Alimento 1')
    expect(agruparPlatos([])).toEqual([])
    expect(camposPlato({ nombrePlato: 'Nombre sin grupo' })).toEqual({})
  })

  it('renueva ids por lote, sin mutar el origen ni acumular ids previos', () => {
    const originales = [entrada(1, { platoId: 'a', nombrePlato: 'Plato' }), entrada(2, { platoId: 'a' }), entrada(3)]
    const primera = renovarPlatos(originales, 'primera', clavePlato)
    const segunda = renovarPlatos(primera, 'segunda', clavePlato)
    expect(primera.map((e) => e.platoId)).toEqual(['primera:0', 'primera:0', undefined])
    expect(segunda.map((e) => e.platoId)).toEqual(['segunda:0', 'segunda:0', undefined])
    expect(originales[0].platoId).toBe('a')
    expect(segunda[0].nombrePlato).toBe('Plato')
  })

  it('copia snapshots, nombres y referencias sin unir platos distintos ni alterar los históricos', () => {
    const entries = [entrada(1, { platoId: 'a', nombrePlato: 'Pollo con arroz', catalogId: 'ciqual:1' }), entrada(2, { platoId: 'a' }), entrada(3, { platoId: 'b' }), entrada(4)]
    const primera = planCopia(entries, { fecha: '2026-10-03' }, 10, 'uno')
    const segunda = planCopia(entries, { fecha: '2026-10-03' }, 10, 'dos')
    expect(primera[0]).toMatchObject({ platoId: 'uno:0', nombrePlato: 'Pollo con arroz', catalogId: 'ciqual:1', kcal: 100 })
    expect(primera[1].platoId).toBe(primera[0].platoId)
    expect(primera[2].platoId).not.toBe(primera[0].platoId)
    expect(segunda[0].platoId).not.toBe(primera[0].platoId)
    expect(primera[3]).not.toHaveProperty('platoId')
  })

  it('las plantillas conservan la separación y la renuevan al aplicar, con alimentos actuales o borrados', () => {
    const entries = [entrada(1, { platoId: 'a', nombrePlato: 'Plato A', foodId: 1 }), entrada(2, { platoId: 'a', catalogId: 'ciqual:1' }), entrada(3, { platoId: 'b', nombrePlato: 'Plato B', rapida: true, gramos: 0 }), entrada(4)]
    const items = itemsDesdeEntradas(entries)
    const foods = new Map([[1, { id: 1, nombre: 'Nuevo', nombreNorm: 'nuevo', kcal100: 200, prot100: 20, carb100: 10, grasa100: 4, fuente: 'manual' as const, updatedAt: 2 }]])
    expect(resolverItemsPlantilla(items, foods)[0]).toMatchObject({ nombre: 'Nuevo', kcal: 200, platoId: 'a', nombrePlato: 'Plato A' })
    const meal = { id: 1, nombre: 'Mi cena', items, usos: 0, usadoAt: 1, createdAt: 1 }
    const nuevas = entradasDesdePlantilla(meal, foods, { fecha: '2026-10-03', comida: 'cena' }, 10, 'plantilla')
    expect(nuevas.map((e) => e.platoId)).toEqual(['plantilla:0', 'plantilla:0', 'plantilla:1', undefined])
    expect(nuevas[1]).toMatchObject({ catalogId: 'ciqual:1', kcal: 100 })
    expect(nuevas[2]).toMatchObject({ nombrePlato: 'Plato B', rapida: true, gramos: 0 })
    expect(items[0].platoId).toBe('a')
  })
})
