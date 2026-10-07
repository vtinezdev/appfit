// Recetas caseras: los ingredientes se guardan como snapshot y la receta se convierte en un alimento propio con los
// valores por 100 g del peso COCINADO (suma de los ingredientes entre el peso final). Lógica pura.
import type { MealItem, NutrientesAdicionales } from '../../../shared/db/types'
import { round1 } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import { aItemGuardado, por100DesdeEntrada, type ItemRevision, type Por100 } from './alimentos'
import { macrosPorGramos } from './nutrition'
import { NUTRIENTES_ADICIONALES } from './nutrientes'

export const PESO_COCINADO_MAX = 50_000

/** Suma de gramos de los ingredientes (peso en crudo). */
export function pesoCrudoTotal(ingredientes: Pick<MealItem, 'gramos'>[]): number {
  return Math.round(ingredientes.reduce((a, i) => a + i.gramos, 0) * 10) / 10
}

/**
 * Valores por 100 g del peso cocinado. Un nutriente adicional solo se conoce si lo conocen TODOS los ingredientes
 * (una suma parcial no se presenta como completa). Peso no positivo → todo a 0.
 */
export function por100DeReceta(ingredientes: MealItem[], pesoCocinadoG: number): Por100 {
  if (!(pesoCocinadoG > 0)) return { kcal100: 0, prot100: 0, carb100: 0, grasa100: 0 }
  const f = 100 / pesoCocinadoG
  const suma = (k: 'kcal' | 'prot' | 'carb' | 'grasa') => round1(ingredientes.reduce((a, i) => a + i[k], 0) * f)
  const nutrientes: NutrientesAdicionales = {}
  if (ingredientes.length > 0) {
    for (const { clave } of NUTRIENTES_ADICIONALES) {
      const valores = ingredientes.map((i) => i.nutrientes?.[clave])
      if (valores.every((v) => v !== undefined)) nutrientes[clave] = Math.round((valores as number[]).reduce((a, v) => a + v, 0) * f * 1000) / 1000
    }
  }
  return { kcal100: suma('kcal'), prot100: suma('prot'), carb100: suma('carb'), grasa100: suma('grasa'), ...(Object.keys(nutrientes).length ? { nutrientes } : {}) }
}

/** Snapshot de un ingrediente revisado (aporte de su cantidad); conserva la referencia del catálogo si la tiene. */
export function ingredienteDeItem(item: ItemRevision): MealItem {
  const g = aItemGuardado(item)
  const aporte = macrosPorGramos(g, g.gramos)
  return {
    ...(g.catalogId ? { catalogId: g.catalogId } : {}),
    nombre: g.nombre,
    gramos: g.gramos,
    kcal: aporte.kcal,
    prot: aporte.prot,
    carb: aporte.carb,
    grasa: aporte.grasa,
    ...(aporte.nutrientes ? { nutrientes: aporte.nutrientes } : {}),
  }
}

/** Ingrediente guardado → ítem editable (parte del snapshot, no del alimento actual, como al editar una entrada). */
export function itemDeIngrediente(m: MealItem): ItemRevision {
  const valores = por100DesdeEntrada(m)
  return { nombre: m.nombre, gramos: m.gramos, ...valores, origen: { fuente: 'manual', valores, nombreNorm: normalizeName(m.nombre), guardado: false, ...(m.catalogId ? { catalogId: m.catalogId } : {}) } }
}

/** Mensaje de error si la receta no se puede guardar; `null` si es válida. */
export function validarReceta(nombre: string, ingredientes: MealItem[], pesoCocinadoG: number): string | null {
  if (!nombre.trim()) return 'Escribe un nombre para la receta.'
  if (ingredientes.length === 0) return 'Añade al menos un ingrediente.'
  if (ingredientes.some((i) => !(i.gramos > 0))) return 'Todos los ingredientes necesitan una cantidad mayor que 0.'
  if (!Number.isFinite(pesoCocinadoG) || pesoCocinadoG <= 0 || pesoCocinadoG > PESO_COCINADO_MAX) return 'Indica el peso cocinado en gramos (mayor que 0).'
  return null
}
