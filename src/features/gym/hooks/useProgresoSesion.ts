import { useMemo } from 'react'
import { todayISO } from '../../../shared/lib/dates'
import { musculosDelEntreno, progresoMuscular, subidasDeNivel, type ProgresoMuscular } from '../lib/progresoMuscular'
import type { ZonaMuscular } from '../lib/musculos'
import { useAportesMusculares } from './useAportesMusculares'

export interface ProgresoDeSesion { antes: ProgresoMuscular; despues: ProgresoMuscular; subidas: ZonaMuscular[]; trabajados: ZonaMuscular[] }

/**
 * El mapa de progreso antes y después de un entreno terminado (ADR 051): qué grupos suben de nivel y cuáles trabaja.
 * `undefined` mientras carga y `null` si el entreno no tiene series clasificadas. Solo lee.
 */
export function useProgresoSesion(workoutId: number | undefined): ProgresoDeSesion | null | undefined {
  const datos = useAportesMusculares()
  return useMemo(() => {
    if (datos === undefined) return undefined
    if (workoutId === undefined || !datos.aportes.some(a => a.workoutId === workoutId)) return null
    const hoy = todayISO()
    const antes = progresoMuscular(datos.aportes.filter(a => a.workoutId !== workoutId), hoy, [], datos.pausas)
    const despues = progresoMuscular(datos.aportes, hoy, [], datos.pausas)
    return { antes, despues, subidas: subidasDeNivel(antes, despues), trabajados: musculosDelEntreno(datos.aportes, workoutId) }
  }, [datos, workoutId])
}
