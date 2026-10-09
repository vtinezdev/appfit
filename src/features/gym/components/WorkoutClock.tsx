import { useEffect, useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import ProgressBar from '../../../shared/components/ProgressBar'
import { clockText, remainingSeconds } from '../lib/session'

/** Reloj de pared, aislado de la lista de inputs y suspendido en segundo plano. */
function useClock(active = true) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    function tick() {
      clearTimeout(timer)
      setNow(Date.now())
      if (active && !document.hidden) timer = setTimeout(tick, 1000 - Date.now() % 1000)
    }
    tick()
    document.addEventListener('visibilitychange', tick)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', tick) }
  }, [active])
  return now
}
export function WorkoutClock({ start }: { start: number }) {
  const now = useClock()
  return <span className="tabular">{clockText((now - start) / 1000)}</span>
}

/** Descanso flotante sobre la barra inferior: tiempo restante, progreso, −15/+15 y Saltar. */
export function RestClock({ endsAt, duration, onEnd, onSkip, onAjustar }: { endsAt: number; duration: number; onEnd: () => void; onSkip: () => void; onAjustar: (deltaSeg: number) => void }) {
  const now = useClock()
  const remaining = remainingSeconds(endsAt, now)
  const ended = useRef(false)
  const callback = useRef(onEnd)
  callback.current = onEnd
  // Un ajuste mueve el deadline sin desmontar los botones (el foco se queda donde estaba).
  useEffect(() => { ended.current = false }, [endsAt])
  useEffect(() => {
    if (remaining === 0 && !ended.current) { ended.current = true; callback.current() }
  }, [remaining])
  return <section aria-label="Descanso en curso" className="training-surface pointer-events-auto space-y-2 px-3 py-2 shadow-overlay">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0"><p className="training-muted text-caption">Descanso</p><p className="font-numeric text-heading tabular" aria-label={`${remaining} segundos restantes`}>{clockText(remaining)}</p></div>
      <div className="flex shrink-0 gap-1.5">
        <Button variant="ghost" size="sm" className="training-secondary px-3" aria-label="Quitar 15 segundos" onClick={() => onAjustar(-15)}>−15</Button>
        <Button variant="ghost" size="sm" className="training-secondary px-3" aria-label="Añadir 15 segundos" onClick={() => onAjustar(15)}>+15</Button>
        <Button variant="ghost" size="sm" className="training-secondary px-3" onClick={onSkip}>Saltar</Button>
      </div>
    </div>
    <div className="training-progress"><ProgressBar value={remaining} goal={duration} label="Tiempo de descanso restante" valueText={`${remaining} segundos restantes`} /></div>
  </section>
}
