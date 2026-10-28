// Recetas caseras: los ingredientes se guardan como snapshot y la receta se convierte en un alimento propio con los
// valores por 100 g del peso COCINADO (suma de los ingredientes entre el peso final). Lógica pura.
import type { MealItem, NutrientesAdicionales, Receta } from '../../../shared/db/types'
import { formatNumber, round1 } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import { aItemGuardado, por100DesdeEntrada, type AlimentoElegible, type InfoReceta, type ItemRevision, type Por100 } from './alimentos'
import { macrosPorGramos, type Macros } from './nutrition'
import { NUTRIENTES_ADICIONALES } from './nutrientes'

export const PESO_COCINADO_MAX = 50_000
export const RACIONES_MAX = 50
export const PASOS_MAX = 40
export const PASO_MAX_CARACTERES = 1000
export const TIEMPO_MAX_MIN = 2880
export const NOTAS_MAX_CARACTERES = 2000

/** Preparación de la receta: todo opcional (las recetas antiguas no la tienen). */
export type Preparacion = Pick<Receta, 'raciones' | 'pasos' | 'tiempoMin' | 'notas'>

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
export function validarReceta(nombre: string, ingredientes: MealItem[], pesoCocinadoG: number, preparacion: Preparacion = {}): string | null {
  if (!nombre.trim()) return 'Escribe un nombre para la receta.'
  if (ingredientes.length === 0) return 'Añade al menos un ingrediente.'
  if (ingredientes.some((i) => !(i.gramos > 0))) return 'Todos los ingredientes necesitan una cantidad mayor que 0.'
  if (!Number.isFinite(pesoCocinadoG) || pesoCocinadoG <= 0 || pesoCocinadoG > PESO_COCINADO_MAX) return 'Indica el peso cocinado en gramos (mayor que 0).'
  const { raciones, pasos, tiempoMin, notas } = preparacion
  if (raciones !== undefined && !(Number.isInteger(raciones) && raciones >= 1 && raciones <= RACIONES_MAX)) return `Las raciones van de 1 a ${RACIONES_MAX}.`
  if (pasos && pasos.length > PASOS_MAX) return `Como mucho ${PASOS_MAX} pasos.`
  if (pasos?.some((p) => p.length > PASO_MAX_CARACTERES)) return `Cada paso admite como mucho ${PASO_MAX_CARACTERES} caracteres.`
  if (tiempoMin !== undefined && !(Number.isInteger(tiempoMin) && tiempoMin >= 1 && tiempoMin <= TIEMPO_MAX_MIN)) return 'Indica el tiempo en minutos (como mucho 48 horas).'
  if (notas && notas.length > NOTAS_MAX_CARACTERES) return `Las notas admiten como mucho ${NOTAS_MAX_CARACTERES} caracteres.`
  return null
}

/** Raciones de la receta: sin el campo (recetas antiguas) o con un valor imposible, 1. */
export function racionesDe(receta: Pick<Receta, 'raciones'>): number {
  const r = receta.raciones
  return r !== undefined && Number.isInteger(r) && r >= 1 ? r : 1
}

/** Gramos cocinados de una ración. */
export function gramosPorRacion(receta: Pick<Receta, 'pesoCocinadoG' | 'raciones'>): number {
  return round1(receta.pesoCocinadoG / racionesDe(receta))
}

/**
 * Lo que aporta una ración, a partir de los valores por 100 g del alimento de la receta: coincide con lo que se
 * registra al añadir esa ración (`entriesRepo.anadirDesdeAlimento` con `gramosPorRacion`).
 */
export function valoresPorRacion(receta: Pick<Receta, 'ingredientes' | 'pesoCocinadoG' | 'raciones'>): Macros {
  return macrosPorGramos(por100DeReceta(receta.ingredientes, receta.pesoCocinadoG), gramosPorRacion(receta))
}

/** Ingredientes para otro número de raciones (solo para mostrar; no se guarda). */
export function escalarIngredientes(ingredientes: MealItem[], racionesBase: number, racionesVista: number): MealItem[] {
  if (!(racionesBase > 0) || !(racionesVista > 0) || racionesBase === racionesVista) return ingredientes
  const f = racionesVista / racionesBase
  return ingredientes.map((i) => ({ ...i, gramos: round1(i.gramos * f), kcal: round1(i.kcal * f), prot: round1(i.prot * f), carb: round1(i.carb * f), grasa: round1(i.grasa * f) }))
}

/** Pasos tal como se guardan: sin espacios sobrantes y sin pasos vacíos. */
export function limpiarPasos(textos: readonly string[]): string[] {
  return textos.map((t) => t.trim()).filter((t) => t.length > 0)
}

/** «45 min», «1 h 15 min», «2 h». */
export function textoTiempo(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

/**
 * Nombre para una copia: el mismo si está libre; si no, «… (copia)», «… (copia 2)»… `ocupados` son nombres ya
 * normalizados (`normalizeName`) de tus alimentos.
 */
export function nombreLibre(nombre: string, ocupados: ReadonlySet<string>): string {
  const base = nombre.trim()
  if (!ocupados.has(normalizeName(base))) return base
  for (let n = 1; ; n++) {
    const candidato = `${base} (copia${n === 1 ? '' : ` ${n}`})`
    if (!ocupados.has(normalizeName(candidato))) return candidato
  }
}

/** «1 ración», «4 raciones», «1,5 raciones». */
export function textoRaciones(n: number): string {
  return `${formatNumber(n, 1)} ${n === 1 ? 'ración' : 'raciones'}`
}

/** Lo que se enseña de una receta propia en las listas. Sin raciones guardadas cuenta como 1 (la receta entera). */
export function infoReceta(receta: Pick<Receta, 'pesoCocinadoG' | 'raciones'>): InfoReceta {
  return { origen: 'tuya', raciones: racionesDe(receta), gramosRacion: gramosPorRacion(receta) }
}

/** Marca como receta los alimentos propios que son el alimento de una receta (`porAlimento`: foodId → receta). */
export function marcarRecetasPropias(elegibles: AlimentoElegible[], porAlimento: ReadonlyMap<number, Pick<Receta, 'pesoCocinadoG' | 'raciones'>>): AlimentoElegible[] {
  return elegibles.map((a) => {
    const r = a.ref.tipo === 'user' ? porAlimento.get(a.ref.id) : undefined
    return r ? { ...a, receta: infoReceta(r) } : a
  })
}

