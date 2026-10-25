import { useCallback, useEffect, useRef, useState } from 'react'
import { motionMs } from '../design/motion'

/** Mantiene la capa durante la salida y cancela tareas pendientes al reabrir/desmontar. */
export function useOverlayPresence(open: boolean, onClose: () => void) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const closing = useRef(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callback = useRef(onClose)
  callback.current = onClose

  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current)
    closing.current = false
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => {
        exitTimer.current = setTimeout(() => setVisible(true), 16)
      })
      return () => { cancelAnimationFrame(frame); if (exitTimer.current) clearTimeout(exitTimer.current) }
    }
    setVisible(false)
    exitTimer.current = setTimeout(() => setMounted(false), motionMs('--dur-exit'))
    return () => { if (exitTimer.current) clearTimeout(exitTimer.current) }
  }, [open])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    if (exitTimer.current) clearTimeout(exitTimer.current)
    setVisible(false)
    exitTimer.current = setTimeout(() => {
      setMounted(false)
      callback.current()
    }, motionMs('--dur-exit'))
  }, [])
  // El primer commit de open ya incluye la capa: no hay una ventana sin Escape/foco
  // entre el toque inicial y el efecto que prepara la entrada visual.
  return { mounted: mounted || (open && !closing.current), visible, close }
}
