// Proteína por kg de peso: P = g/kg × peso; las kcal que quedan se reparten entre hidratos y grasa con el reparto actual.
// Funciones puras. El rango (1,6–2,2 g/kg) y su fuente están en Referencias › Proteína y agua.
import type { Objetivos, Perfil } from '../../../shared/db/types'
import { KCAL_POR_GRAMO } from '../../nutricion/lib/objetivos'

export const PROTEINA_KG_MIN = 1.6
export const PROTEINA_KG_MAX = 2.2
export const PROTEINA_KG_DEFECTO = 1.8
export const PROTEINA_KG_PASO = 0.1

/** g/kg válido (1,6–2,2) redondeado a 0,1; `null` si no lo es. */
export function validarProteinaPorKg(valor: number): number | null {
  if (!Number.isFinite(valor)) return null
  const r = Math.round(valor * 10) / 10
  return r >= PROTEINA_KG_MIN - 1e-9 && r <= PROTEINA_KG_MAX + 1e-9 ? r : null
}

export interface AjusteProteina {
  gPorKg: number
  pesoKg: number
}

/**
 * La configuración efectiva: activa por defecto (solo `proteinaPorKgActiva === false` la desactiva), con el valor
 * guardado si es válido o 1,8 g/kg. Sin peso no se puede aplicar: `null`.
 */
export function ajusteProteina(perfil: Perfil | undefined, pesoKg: number | undefined): AjusteProteina | null {
  if (perfil?.proteinaPorKgActiva === false) return null
  if (pesoKg === undefined || !Number.isFinite(pesoKg) || pesoKg <= 0) return null
  const gPorKg = perfil?.proteinaPorKg !== undefined ? (validarProteinaPorKg(perfil.proteinaPorKg) ?? PROTEINA_KG_DEFECTO) : PROTEINA_KG_DEFECTO
  return { gPorKg, pesoKg }
}

/** Gramos de proteína del día (enteros). */
export function gramosProteina(ajuste: AjusteProteina): number {
  return Math.round(ajuste.gPorKg * ajuste.pesoKg)
}

/**
 * Aplica la proteína por kg a unos objetivos: P fijo y el resto de las kcal repartido entre C y G según su reparto
 * actual (sin reparto previo, 50/50 de kcal). Si la proteína no cabe en las kcal, devuelve los objetivos tal cual
 * (`aplicada: false`) en lugar de inventar números negativos.
 */
export function aplicarProteinaPorKg(objetivos: Objetivos, ajuste: AjusteProteina | null): { objetivos: Objetivos; aplicada: boolean } {
  if (!ajuste) return { objetivos, aplicada: false }
  const prot = gramosProteina(ajuste)
  const resto = objetivos.kcal - prot * KCAL_POR_GRAMO.prot
  if (resto < 0) return { objetivos, aplicada: false }
  const kcalC = Math.max(0, objetivos.carb) * KCAL_POR_GRAMO.carb
  const kcalG = Math.max(0, objetivos.grasa) * KCAL_POR_GRAMO.grasa
  const total = kcalC + kcalG
  const fracC = total > 0 ? kcalC / total : 0.5
  const grasa = Math.max(0, Math.round((resto * (1 - fracC)) / KCAL_POR_GRAMO.grasa))
  const carb = Math.max(0, Math.round((resto - grasa * KCAL_POR_GRAMO.grasa) / KCAL_POR_GRAMO.carb))
  return { objetivos: { kcal: objetivos.kcal, prot, carb, grasa }, aplicada: true }
}

/**
 * Cambia un macro (hidratos o grasa) o las kcal con la proteína fija: el otro macro absorbe la diferencia.
 * Se usa en Ajustes mientras la proteína viene de g/kg.
 */
export function reajustarConProteinaFija(base: Objetivos, campo: 'kcal' | 'carb' | 'grasa', valor: number): Objetivos {
  const v = Math.max(0, Math.round(Number.isFinite(valor) ? valor : 0))
  if (campo === 'kcal') {
    const { objetivos } = aplicarProteinaPorKg({ ...base, kcal: v }, { gPorKg: 1, pesoKg: base.prot })
    return { ...objetivos, kcal: v }
  }
  const restoKcal = Math.max(0, base.kcal - base.prot * KCAL_POR_GRAMO.prot)
  if (campo === 'carb') {
    const carb = Math.min(v, Math.floor(restoKcal / KCAL_POR_GRAMO.carb))
    return { ...base, carb, grasa: Math.max(0, Math.round((restoKcal - carb * KCAL_POR_GRAMO.carb) / KCAL_POR_GRAMO.grasa)) }
  }
  const grasa = Math.min(v, Math.floor(restoKcal / KCAL_POR_GRAMO.grasa))
  return { ...base, grasa, carb: Math.max(0, Math.round((restoKcal - grasa * KCAL_POR_GRAMO.grasa) / KCAL_POR_GRAMO.carb)) }
}
