import type { SexoPerfil } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'

export const OPCIONES_AGUA_ML = [250, 330, 500] as const
export const AGUA_POR_DEFECTO_ML = 250
export const AGUA_MAX_TOMA_ML = 5000
export const AGUA_OBJETIVO_MIN_ML = 500
export const AGUA_OBJETIVO_MAX_ML = 8000

/**
 * Objetivo de bebida por defecto (ml) según el sexo de Perfil: la ingesta adecuada de agua total de EFSA (2010) para
 * adultos es 2,5 L (hombres) y 2,0 L (mujeres) e incluye la humedad de los alimentos; AppFit descuenta un 20 % para
 * quedarse solo con lo que se bebe (2,0 L y 1,6 L). Ese 20 % es un criterio de AppFit, no una cifra de EFSA.
 * Sin sexo en Perfil no hay objetivo.
 */
export function objetivoAguaPorDefecto(sexo: SexoPerfil | undefined): number | null {
  if (sexo === 'hombre') return 2000
  if (sexo === 'mujer') return 1600
  return null
}

export interface ObjetivoAgua {
  ml: number
  /** `ajustes`: lo editado por la persona; `efsa`: el recomendado por defecto. */
  origen: 'ajustes' | 'efsa'
}

/** Lo editado en Ajustes manda; si no, el recomendado por sexo; sin ninguno, `null` (solo se muestra lo bebido). */
export function resolverObjetivoAgua(ajusteMl: number | undefined, sexo: SexoPerfil | undefined): ObjetivoAgua | null {
  if (ajusteMl !== undefined && validarObjetivoAgua(ajusteMl) !== null) return { ml: ajusteMl, origen: 'ajustes' }
  const porDefecto = objetivoAguaPorDefecto(sexo)
  return porDefecto === null ? null : { ml: porDefecto, origen: 'efsa' }
}

/** Toma válida (1–5.000 ml, entera); `null` si no. */
export function validarTomaAgua(ml: number): number | null {
  if (!Number.isFinite(ml)) return null
  const r = Math.round(ml)
  return r >= 1 && r <= AGUA_MAX_TOMA_ML ? r : null
}

/** Objetivo válido (500–8.000 ml, redondeado a 50); `null` si no. */
export function validarObjetivoAgua(ml: number): number | null {
  if (!Number.isFinite(ml)) return null
  const r = Math.round(ml / 50) * 50
  return r >= AGUA_OBJETIVO_MIN_ML && r <= AGUA_OBJETIVO_MAX_ML ? r : null
}

/** «250 ml», «1,5 L», «2 L». */
export function formatAgua(ml: number): string {
  return ml >= 1000 ? `${formatNumber(ml / 1000, 2)} L` : `${formatNumber(ml)} ml`
}
