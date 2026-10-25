// Pausas declaradas de Ritmo (vacaciones, enfermedad, lesión, viaje): congelan el hilo. Funciones puras.
import type { MotivoPausa, Pausa, TipoPausa } from '../../../shared/db/types'
import { addDays, diasEntre, formatFriendly } from '../../../shared/lib/dates'

export const MOTIVOS_PAUSA: Record<MotivoPausa, string> = {
  vacaciones: 'Vacaciones',
  enfermedad: 'Enfermedad',
  lesion: 'Lesión',
  viaje: 'Viaje',
  otro: 'Otro motivo',
}

export const TIPOS_PAUSA: Record<TipoPausa, { nombre: string; descripcion: string }> = {
  total: { nombre: 'Todo', descripcion: 'Ni entreno ni registro: la semana no cuenta y el hilo se congela' },
  entreno: { nombre: 'Solo entreno', descripcion: 'La semana se juzga solo con el registro de comidas' },
}

/** Una semana está en pausa si una pausa cubre al menos 4 de sus 7 días (la mayoría). */
export const DIAS_PARA_PAUSAR_SEMANA = 4

/** Días de la semana que empieza en `lunes` cubiertos por la pausa (sin `hasta`, sigue indefinidamente). */
function diasCubiertos(p: Pausa, lunes: string): number {
  const domingo = addDays(lunes, 6)
  const desde = p.desde > lunes ? p.desde : lunes
  const hasta = p.hasta === undefined || p.hasta > domingo ? domingo : p.hasta
  return hasta < desde ? 0 : diasEntre(desde, hasta) + 1
}

/** La pausa que rige la semana: la que cubre más días (al menos 4); a igualdad, la total. */
export function pausaDeSemana(pausas: readonly Pausa[] | undefined, lunes: string): Pausa | null {
  let elegida: Pausa | null = null
  let mejor = 0
  for (const p of pausas ?? []) {
    const dias = diasCubiertos(p, lunes)
    if (dias < DIAS_PARA_PAUSAR_SEMANA) continue
    if (dias > mejor || (dias === mejor && p.tipo === 'total' && elegida?.tipo !== 'total')) { elegida = p; mejor = dias }
  }
  return elegida
}

/** La pausa que cubre `hoy`, si hay una. */
export function pausaActiva(pausas: readonly Pausa[] | undefined, hoy: string): Pausa | null {
  return (pausas ?? []).find((p) => p.desde <= hoy && (p.hasta === undefined || p.hasta >= hoy)) ?? null
}

export interface NuevaPausa {
  desde: string
  hasta?: string
  tipo: TipoPausa
  motivo: MotivoPausa
}

/** Error de validación de una pausa nueva, o `null` si vale. */
export function validarPausa(p: NuevaPausa): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.desde)) return 'Indica desde cuándo.'
  if (p.hasta !== undefined && p.hasta < p.desde) return 'La fecha de fin no puede ser anterior a la de inicio.'
  return null
}

const ordenar = (pausas: Pausa[]) => pausas.sort((a, b) => a.desde.localeCompare(b.desde))

/**
 * Añade una pausa. Las que se solapan con ella se recortan hasta el día anterior a su inicio (y desaparecen si no les
 * queda ningún día): dos pausas no cubren el mismo día.
 */
export function anadirPausa(pausas: readonly Pausa[] | undefined, nueva: NuevaPausa, id: string): Pausa[] {
  const finNueva = nueva.hasta
  const resto = (pausas ?? []).flatMap((p): Pausa[] => {
    const solapa = (finNueva === undefined || p.desde <= finNueva) && (p.hasta === undefined || p.hasta >= nueva.desde)
    if (!solapa) return [p]
    const recortada = addDays(nueva.desde, -1)
    return recortada >= p.desde ? [{ ...p, hasta: recortada }] : []
  })
  return ordenar([...resto, { id, desde: nueva.desde, ...(nueva.hasta ? { hasta: nueva.hasta } : {}), tipo: nueva.tipo, motivo: nueva.motivo }])
}

/** Reanudar hoy: la pausa acaba ayer. Si empezó hoy (o después), desaparece. */
export function terminarPausa(pausas: readonly Pausa[] | undefined, id: string, hoy: string): Pausa[] {
  const ayer = addDays(hoy, -1)
  return (pausas ?? []).flatMap((p) => p.id !== id ? [p] : p.desde > ayer ? [] : [{ ...p, hasta: p.hasta !== undefined && p.hasta < ayer ? p.hasta : ayer }])
}

export function quitarPausa(pausas: readonly Pausa[] | undefined, id: string): Pausa[] {
  return (pausas ?? []).filter((p) => p.id !== id)
}

/** «Vacaciones · desde el 3 de octubre», «Lesión · del 1 al 14 de septiembre» (fechas amigables). */
export function describirPausa(p: Pausa): string {
  const tipo = p.tipo === 'entreno' ? ' (solo entreno)' : ''
  const fechas = p.hasta === undefined ? `desde ${formatFriendly(p.desde).toLocaleLowerCase('es')}` : p.hasta === p.desde ? formatFriendly(p.desde) : `${formatFriendly(p.desde)} – ${formatFriendly(p.hasta)}`
  return `${MOTIVOS_PAUSA[p.motivo]}${tipo} · ${fechas}`
}
