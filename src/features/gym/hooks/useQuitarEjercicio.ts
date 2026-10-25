import { useEffect, useRef, useState } from 'react'
import type { Aviso } from '../../../shared/hooks/useAviso'
import { haptic } from '../../../shared/design/motion'
import * as workoutsRepo from '../data/workoutsRepo'

interface Opciones {
  workoutId: number
  visibleIds: number[]
  bloqueado?: boolean
  avisar: (aviso: Aviso) => void
  avisarError: (mensaje: string) => void
  antesDeQuitar?: () => Promise<void>
  /** Actualiza estado de presentación y devuelve su restauración para Deshacer. */
  alQuitar?: (captura: workoutsRepo.EjercicioQuitado) => () => void
}

/** Misma interacción reversible en la sesión y el editor del historial. */
export function useQuitarEjercicio({ workoutId, visibleIds, bloqueado, avisar, avisarError, antesDeQuitar, alQuitar }: Opciones) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const enCurso = useRef(false)
  const [quitando, setQuitando] = useState(false)
  const [foco, setFoco] = useState<number | null | undefined>(undefined)
  const claveVisible = visibleIds.join(',')

  useEffect(() => {
    if (foco === undefined) return
    const destino = contenedorRef.current?.querySelector<HTMLElement>(foco === null
      ? '[data-add-exercise]' : `[data-exercise-id="${foco}"] h2`)
    if (destino) { destino.focus({ preventScroll: true }); setFoco(undefined) }
  }, [foco, claveVisible])

  async function quitarEjercicio(exerciseId: number, nombre: string) {
    if (enCurso.current || bloqueado) return
    enCurso.current = true
    setQuitando(true)
    try {
      await antesDeQuitar?.()
      const captura = await workoutsRepo.quitarEjercicio(workoutId, exerciseId)
      if (!captura) return
      const restaurarUI = alQuitar?.(captura)
      const indice = visibleIds.indexOf(exerciseId)
      setFoco(visibleIds[indice + 1] ?? visibleIds[indice - 1] ?? null)
      haptic()
      avisar({ mensaje: `${nombre} quitado del entreno`, onDeshacer: async () => {
        if (enCurso.current) throw new Error('Hay otra operación en curso.')
        enCurso.current = true
        setQuitando(true)
        try {
          await workoutsRepo.restaurarEjercicio(captura)
          restaurarUI?.()
          setFoco(exerciseId)
          haptic()
        } finally { enCurso.current = false; setQuitando(false) }
      } })
    } catch {
      avisarError('No se ha podido quitar el ejercicio. Inténtalo de nuevo.')
    } finally { enCurso.current = false; setQuitando(false) }
  }

  return { quitarEjercicio, quitando, contenedorRef }
}
