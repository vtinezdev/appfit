import type { Exercise } from '../../../shared/db/types'
import type { Equipo } from './catalogoEjercicios'
import { MUSCULOS, type Musculo } from './musculos'

/** Material en minúscula para leerse tras el músculo («Pecho · barra»); «Otros» no aporta nada. */
const MATERIAL: Record<Equipo, string | null> = {
  corporal: 'peso corporal', mancuernas: 'mancuernas', barra: 'barra', maquina: 'máquina', polea: 'polea',
  smith: 'Smith', kettlebell: 'kettlebell', bandas: 'bandas', trx: 'TRX', otros: null,
}

/** «y» pasa a «e» ante un sonido /i/ («Glúteos e isquiotibiales»), salvo «hie-». */
export function unir(a: string, b: string): string {
  return `${a} ${/^h?i(?!e)/i.test(b) ? 'e' : 'y'} ${b.toLowerCase()}`
}

/** Bajo el nombre del ejercicio: músculo principal (dos como mucho) · material principal. Sin clasificación, el grupo guardado. */
export function subtituloEjercicio(e: Pick<Exercise, 'grupo' | 'primaryMuscles' | 'equipment'>): string {
  const principales = (e.primaryMuscles ?? []).filter((m): m is Musculo => Object.hasOwn(MUSCULOS, m)).map(m => MUSCULOS[m])
  const musculo = principales.length >= 2 ? unir(principales[0], principales[1]) : principales[0] ?? e.grupo
  const equipo = e.equipment?.find((q): q is Equipo => Object.hasOwn(MATERIAL, q) && MATERIAL[q as Equipo] !== null)
  return [musculo, equipo && MATERIAL[equipo]].filter(Boolean).join(' · ')
}
