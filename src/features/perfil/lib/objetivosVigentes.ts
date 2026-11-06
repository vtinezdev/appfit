import type { Objetivos } from '../../../shared/db/types'
import { reajustarObjetivos } from '../../nutricion/lib/objetivos'
import type { ResultadoEnergia } from './energia'
import { aplicarProteinaPorKg, type AjusteProteina } from './proteina'

/** `ninguno`: instalación nueva sin perfil completo ni objetivos guardados (`Settings.sinObjetivos`, ADR 066). */
export type OrigenObjetivos = 'perfil' | 'manual' | 'ninguno'

/** Objetivo cero: la app lo trata como «sin objetivo» (sin «Quedan», sin metas en las barras, sin XP de proteína). */
export const SIN_OBJETIVOS: Objetivos = { kcal: 0, prot: 0, carb: 0, grasa: 0 }
/** `proteinaPorKg`: presente si la proteína sale de g/kg × peso (entonces es de solo lectura en Ajustes). */
export type ObjetivosVigentes = Objetivos & { origen: OrigenObjetivos; proteinaPorKg?: AjusteProteina }

/**
 * Objetivos que usa toda la app. Con perfil completo y objetivo elegido, las kcal salen del perfil y los macros
 * se reescalan conservando el reparto en % de los manuales; si no, mandan los manuales. Después, si hay proteína
 * por kg aplicable, P sale de ahí. Con `sinObjetivos` y sin perfil completo, no hay objetivo (cero, origen `ninguno`).
 * Nada se guarda.
 */
export function objetivosVigentes(manuales: Objetivos, energia: ResultadoEnergia | null, proteina: AjusteProteina | null = null, sinObjetivos = false): ObjetivosVigentes {
  const delPerfil = energia?.estado === 'ok' && energia.objetivoKcal !== null
  if (!delPerfil && sinObjetivos) return { ...SIN_OBJETIVOS, origen: 'ninguno' }
  const base: ObjetivosVigentes = delPerfil
    ? { ...reajustarObjetivos(manuales, 'kcal', energia.objetivoKcal!), origen: 'perfil' }
    : { ...manuales, origen: 'manual' }
  // La proteína por kg (activa por defecto, con peso) fija P y reparte el resto de kcal entre C y G.
  const { objetivos, aplicada } = aplicarProteinaPorKg(base, proteina)
  return aplicada ? { ...objetivos, origen: base.origen, proteinaPorKg: proteina! } : base
}
