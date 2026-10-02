import { describe, expect, it } from 'vitest'
import type { Entry } from '../../../shared/db/types'
import { entradasDesdePlantilla, itemsDesdeEntradas, planCopia } from './plantillas'

const entrada: Entry = {
  id: 1, fecha: '2026-09-29', comida: 'comida', catalogId: 'usda:1', nombre: 'Pollo', gramos: 150,
  kcal: 180, prot: 33, carb: 0, grasa: 3, createdAt: 1,
}

describe('alimentos del catálogo en copias y plantillas', () => {
  it('copiar entradas conserva catalogId', () => {
    expect(planCopia([entrada], { fecha: '2026-09-30' }, 5, 'lote')[0]).toMatchObject({ catalogId: 'usda:1', foodId: undefined, kcal: 180 })
  })

  it('guardar como plantilla y aplicarla conserva catalogId y usa el snapshot (no hay alimento de usuario)', () => {
    const items = itemsDesdeEntradas([entrada])
    expect(items[0].catalogId).toBe('usda:1')
    const nuevas = entradasDesdePlantilla(
      { id: 1, nombre: 'P', items, usos: 0, usadoAt: 0, createdAt: 0 },
      new Map(),
      { fecha: '2026-10-01', comida: 'cena' },
      9,
      'lote',
    )
    expect(nuevas[0]).toMatchObject({ catalogId: 'usda:1', kcal: 180, prot: 33, gramos: 150, comida: 'cena' })
  })
})
