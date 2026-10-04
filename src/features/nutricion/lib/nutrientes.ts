import type { NutrientesAdicionales } from '../../../shared/db/types'
import { NOMBRES_NUTRIENTES } from '../../../shared/lib/referenciasNutricionales'

export const NUTRIENTES_ADICIONALES = [
  { clave: 'fibra', label: NOMBRES_NUTRIENTES.fibra },
  { clave: 'azucares', label: NOMBRES_NUTRIENTES.azucares },
  { clave: 'sal', label: NOMBRES_NUTRIENTES.sal },
  { clave: 'agSat', label: NOMBRES_NUTRIENTES.agSat },
] as const

/** Copia solo los cuatro nutrientes conocidos; nunca convierte un dato ausente en cero. */
export function escalarNutrientes(nutrientes: NutrientesAdicionales | undefined, factor?: number): NutrientesAdicionales | undefined {
  const resultado: NutrientesAdicionales = {}
  for (const { clave } of NUTRIENTES_ADICIONALES) {
    const valor = nutrientes?.[clave]
    if (valor !== undefined && Number.isFinite(valor) && valor >= 0) {
      resultado[clave] = factor === undefined ? valor : Math.round(valor * factor * 1000) / 1000
    }
  }
  return Object.keys(resultado).length ? resultado : undefined
}

/** Campos para snapshots nuevos y copias sin compartir objetos mutables. */
export function camposNutrientes(nutrientes: NutrientesAdicionales | undefined, factor?: number): { nutrientes?: NutrientesAdicionales } {
  const conocidos = escalarNutrientes(nutrientes, factor)
  return conocidos ? { nutrientes: conocidos } : {}
}

export function mismosNutrientes(a: NutrientesAdicionales | undefined, b: NutrientesAdicionales | undefined): boolean {
  return NUTRIENTES_ADICIONALES.every(({ clave }) => {
    const x = a?.[clave], y = b?.[clave]
    return x === undefined || y === undefined ? x === y : Math.abs(x - y) < 0.0005
  })
}

/** Total conocido y cobertura por nutriente: una suma parcial nunca se presenta como completa. */
export function resumenNutrientes(entries: { nutrientes?: NutrientesAdicionales }[]) {
  return NUTRIENTES_ADICIONALES.map(({ clave, label }) => {
    const valores = entries.flatMap((e) => {
      const valor = e.nutrientes?.[clave]
      return valor !== undefined && Number.isFinite(valor) && valor >= 0 ? [valor] : []
    })
    return {
      clave, label,
      valor: entries.length === 0 ? 0 : valores.length ? valores.reduce((sum, v) => sum + v, 0) : undefined,
      conocidos: valores.length,
      total: entries.length,
    }
  })
}
