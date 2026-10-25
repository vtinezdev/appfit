import type { ConfiguracionCarga, Exercise, SetEntry } from '../../../shared/db/types'
import { catalogoDeLocal } from './selectorEjercicios'
import { formatNumber } from '../../../shared/lib/format'

export type SerieCarga = Pick<SetEntry, 'peso'> & Partial<Pick<SetEntry, 'modoCarga' | 'pesoCorporal'>>
export const MODOS_CARGA = { externa: 'Carga externa', corporal: 'Peso corporal', lastre: 'Corporal + lastre', asistencia: 'Corporal asistido' } as const
export const modoCarga = (s: Partial<SerieCarga>) => s.modoCarga ?? 'externa'
/** Catálogo editorial; personalizados pueden indicar su modalidad sin adivinarla por nombre. */
export function admiteCargaCorporal(e: Exercise): boolean {
  const catalogo = catalogoDeLocal(e)
  return !catalogo || catalogo.equipment.includes('corporal')
}
/** El cuerpo y la asistencia no son carga externa movida. Sin estimar porcentajes corporales. */
export const cargaExterna = (s: SerieCarga) => ['corporal', 'asistencia'].includes(modoCarga(s)) || !Number.isFinite(s.peso) || s.peso < 0 ? 0 : s.peso

export function formatearCarga(s: SerieCarga): string {
  const modo = modoCarga(s)
  if (modo === 'externa') return `${formatNumber(s.peso, 2)} kg`
  const corporal = s.pesoCorporal === undefined ? 'peso corporal sin dato' : `corporal ${formatNumber(s.pesoCorporal, 2)} kg`
  if (modo === 'corporal') return s.pesoCorporal === undefined ? 'Corporal · sin pesaje' : `Corporal · ${formatNumber(s.pesoCorporal, 2)} kg`
  return `${modo === 'lastre' ? 'Lastre +' : 'Asistencia '}${formatNumber(s.peso, 2)} kg · ${corporal}`
}

export function validarConfiguracionCarga(c: ConfiguracionCarga): void {
  if (!Object.hasOwn(MODOS_CARGA, c.modo) || (c.pesoCorporal !== undefined && (!Number.isFinite(c.pesoCorporal) || c.pesoCorporal <= 0 || c.pesoCorporal > 1000))) {
    throw new Error('Configuración de carga no válida.')
  }
}

/** Cambiar significado de kg exige empezar en cero; corregir masa conserva el lastre/asistencia. */
export function aplicarConfiguracionCarga(s: SerieCarga, c: ConfiguracionCarga): Pick<SetEntry, 'peso' | 'modoCarga' | 'pesoCorporal'> {
  validarConfiguracionCarga(c)
  return { modoCarga: c.modo === 'externa' ? undefined : c.modo,
    pesoCorporal: c.modo === 'externa' ? undefined : c.pesoCorporal,
    peso: c.modo === 'corporal' || modoCarga(s) !== c.modo ? 0 : s.peso }
}
