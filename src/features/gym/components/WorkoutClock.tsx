import { useEffect, useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
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

export function RestClock({ endsAt, duration, onEnd, onSkip }: { endsAt: number; duration: number; onEnd: () => void; onSkip: () => void }) {
  const now = useClock()
  const remaining = remainingSeconds(endsAt, now)
  const ended = useRef(false)
  const callback = useRef(onEnd)
  callback.current = onEnd
  useEffect(() => {
    if (remaining === 0 && !ended.current) { ended.current = true; callback.current() }
  }, [remaining])
  return <section aria-label="Descanso en curso" className="rest-panel space-y-3 rounded-md bg-surface-muted p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Icon name="timer" size={20} /><div><p className="text-caption text-fg-muted">Descanso</p><p className="tabular text-heading" aria-label={`${remaining} segundos restantes`}>{clockText(remaining)}</p></div></div>
      <Button variant="secondary" size="sm" onClick={onSkip}>Finalizar descanso</Button>
    </div>
    <ProgressBar value={remaining} goal={duration} label="Tiempo de descanso restante" valueText={`${remaining} segundos restantes`} />
  </section>
}
