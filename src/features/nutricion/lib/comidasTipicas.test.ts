import { describe, expect, it } from 'vitest'
import type { Entry, Meal } from '../../../shared/db/types'
import { claveCombinacion, comidasTipicas } from './comidasTipicas'

const fecha = '2026-10-21'
function entrada(dia: string, patch: Partial<Entry> = {}): Entry {
  return { id: Number(dia.slice(-2)), fecha: dia, comida: 'desayuno', foodId: 1, nombre: 'Avena', gramos: 40, kcal: 150, prot: 5, carb: 25, grasa: 3, createdAt: 1, ...patch }
}
function desayuno(dia: string, gramos = 40): Entry[] {
  return [entrada(dia, { gramos }), entrada(dia, { id: 100 + Number(dia.slice(-2)), foodId: 2, nombre: 'Leche', gramos: 200, kcal: 100 })]
}
function plantilla(patch: Partial<Meal> = {}): Meal {
  return { id: 1, nombre: 'Mi desayuno', comida: 'desayuno', items: desayuno(fecha), usos: 0, usadoAt: 1, createdAt: 1, ...patch }
}
const detectar = (entries: Entry[], plantillas: Meal[] = []) => comidasTipicas({ entries, plantillas, fecha })

describe('comidas típicas', () => {
  it('requiere tres días y cuenta juntos los alimentos añadidos por separado; usa las últimas cantidades', () => {
    const entries = [...desayuno('2026-10-15'), ...desayuno('2026-10-17').reverse()]
    expect(detectar(entries)).toEqual([])
    entries.push(...desayuno('2026-10-20', 60))
    const [tipica] = detectar(entries)
    expect(tipica).toMatchObject({ origen: 'historial', dias: 3, ultimaFecha: '2026-10-20' })
    expect(tipica.items.map(it => it.gramos)).toEqual([60, 200])
    expect(tipica.id).toBeUndefined()
    expect(tipica.nombre).toBe('Avena + Leche')
  })

  it('limita a los últimos treinta días incluidos y nunca mira fechas futuras', () => {
    const entries = [...desayuno('2026-09-21'), ...desayuno('2026-09-22'), ...desayuno('2026-10-20'), ...desayuno('2026-10-22')]
    expect(detectar(entries)).toEqual([])
    entries.push(...desayuno(fecha))
    expect(detectar(entries)[0]).toMatchObject({ dias: 3, ultimaFecha: fecha })
  })

  it('varias filas del mismo alimento no cuentan como varios días ni cambian la identidad', () => {
    const entries = [...desayuno(fecha), ...desayuno(fecha)]
    expect(detectar(entries)).toEqual([])
    expect(claveCombinacion(entries)).toBe(claveCombinacion(desayuno(fecha)))
    expect(claveCombinacion(desayuno(fecha))).not.toBe(claveCombinacion([entrada(fecha)]))
    expect(claveCombinacion([entrada(fecha, { nombre: 'Avena renombrada' })])).toBe(claveCombinacion([entrada(fecha)]))
    expect(claveCombinacion([entrada(fecha, { foodId: undefined, catalogId: 'ciqual:1' })])).not.toBe(claveCombinacion([entrada(fecha)]))
  })

  it('las marcadas aparecen desde el primer día, antes de las automáticas, sin duplicar combinaciones', () => {
    const entries = [...desayuno('2026-10-15'), ...desayuno('2026-10-17'), ...desayuno(fecha)]
    const guardada = plantilla({ nombre: 'Mi desayuno favorito' })
    expect(detectar(entries, [guardada])).toMatchObject([{ id: 1, nombre: guardada.nombre, origen: 'marcada', dias: 3 }])
    expect(detectar([], [guardada])).toHaveLength(1)
    expect(detectar([], [plantilla({ comida: 'cena' }), plantilla({ items: [] })])).toMatchObject([{ id: 1, origen: 'marcada' }])
    expect(detectar([], [plantilla({ comida: undefined })])).toHaveLength(1)
    const variantes = detectar(entries, [guardada, plantilla({ id: 2, nombre: 'Más reciente', usadoAt: 20 })])
    expect(variantes.map(it => it.id)).toEqual([2, 1])
    expect(new Set(variantes.map(it => it.clave)).size).toBe(2)
  })

  it('reconoce la misma combinación entre comidas, sin sumar dos veces una fecha ni mezclar sus ingredientes', () => {
    const entries = [
      ...desayuno('2026-10-18'),
      ...desayuno('2026-10-18').map(e => ({ ...e, comida: 'cena' as const, createdAt: 2 })),
      ...desayuno('2026-10-19').map(e => ({ ...e, comida: 'comida' as const })),
      entrada('2026-10-19', { comida: 'cena', foodId: 3, nombre: 'Yogur' }),
    ]
    expect(detectar(entries)).toEqual([])
    entries.push(...desayuno(fecha, 60).map(e => ({ ...e, comida: 'snack' as const })))
    const [tipica] = detectar(entries)
    expect(tipica).toMatchObject({ dias: 3, ultimaFecha: fecha, nombre: 'Avena + Leche' })
    expect(tipica.items.map(it => it.gramos)).toEqual([60, 200])
  })

  it('si se repite en varias comidas del último día conserva las cantidades de la más reciente', () => {
    const entries = [15, 17, 21].flatMap(dia => desayuno(`2026-10-${dia}`))
    entries.push(...desayuno(fecha, 80).map(e => ({ ...e, comida: 'cena' as const, createdAt: 3 })))
    expect(detectar(entries)).toMatchObject([{ dias: 3, items: [{ gramos: 80 }, { gramos: 200 }] }])
  })

  it('ordena las automáticas por días y luego recencia, conserva platos y no muta el historial', () => {
    const entries: Entry[] = [15, 16, 17].flatMap(dia => desayuno(`2026-10-${dia}`).map(e => ({ ...e, platoId: `plato-${dia}`, nombrePlato: 'Bol de avena' })))
    entries.push(...[18, 19, 20, 21].map(dia => entrada(`2026-10-${dia}`, { foodId: 3, nombre: 'Tostadas' })))
    const antes = structuredClone(entries)
    const tipicas = detectar(entries)
    expect(tipicas.map(it => it.nombre)).toEqual(['Tostadas', 'Bol de avena'])
    expect(tipicas[1].items.map(it => it.platoId)).toEqual(['plato-17', 'plato-17'])
    expect(entries).toEqual(antes)
  })

  it('no inventa identidades por calorías para alimentos sin referencia o registros rápidos', () => {
    const a = entrada(fecha, { foodId: undefined, nombre: 'Café fuera', rapida: true, gramos: 0 })
    const b = { ...a, nombre: 'Pizza fuera' }
    expect(claveCombinacion([a])).not.toBe(claveCombinacion([b]))
    expect(claveCombinacion([a])).toBe(claveCombinacion([{ ...a, nombre: ' CAFÉ FUERA ' }]))
  })
})
