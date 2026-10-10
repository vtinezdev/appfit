// La Liga durante el entreno activo, a partir de lo que la sesión ya lee (sin otra consulta a IndexedDB).
import { useMemo, useRef } from 'react'
import type { Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { sesionesSinRecord } from '../lib/estancamiento'
import { calcularLigas, type LigaEjercicio } from '../lib/liga'

export interface LigasSesion {
  ligas: Map<number, LigaEjercicio>
  /** Sesiones recientes sin récord de los ejercicios en Élite (para su aviso). */
  sinRecords: Map<number, number>
}

/**
 * Liga de cada ejercicio con los entrenos ya terminados: el activo cuenta al terminarlo. Las series del activo cambian a
 * cada toque, así que solo se recalcula cuando cambian los entrenos terminados, sus series o las pausas. `null` si la
 * gamificación está oculta o aún no hay ajustes.
 */
export function useLigasSesion(hoy: string, workouts: readonly Workout[], sets: readonly SetEntry[], ajustes: { gamificacionVisible?: boolean; pausas?: Pausa[] } | undefined): LigasSesion | null {
  const cache = useRef<{ clave: string; valor: LigasSesion } | null>(null)
  const terminados = useMemo(() => {
    const ws = workouts.filter((w) => w.fin !== undefined)
    const ids = new Set(ws.map((w) => w.id))
    return { ws, sets: sets.filter((s) => ids.has(s.workoutId)) }
  }, [workouts, sets])
  if (!ajustes || ajustes.gamificacionVisible === false) return null
  const maxId = (xs: readonly { id: number }[]) => xs.reduce((m, x) => Math.max(m, x.id), 0)
  const clave = [hoy, terminados.ws.length, maxId(terminados.ws), terminados.sets.length, maxId(terminados.sets), JSON.stringify(ajustes.pausas ?? [])].join('|')
  if (cache.current?.clave !== clave) {
    const ligas = calcularLigas({ hoy, workouts: terminados.ws, sets: terminados.sets, pausas: ajustes.pausas })
    const sinRecords = new Map(ligas.filter((l) => l.division.elite).map((l) => [l.exerciseId, sesionesSinRecord(l.exerciseId, terminados.ws, terminados.sets)]))
    cache.current = { clave, valor: { ligas: new Map(ligas.map((l) => [l.exerciseId, l])), sinRecords } }
  }
  return cache.current.valor
}
