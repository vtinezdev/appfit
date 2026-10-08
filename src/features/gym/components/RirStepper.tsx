import Icon from '../../../shared/components/Icon'
import { useEffect, useRef, useState } from 'react'

/** «—» y 0 son distintos. Desde 0, reducir vuelve a dejar el esfuerzo sin dato. */
export default function RirStepper({ value, label, disabled, onChange }: {
  value?: number; label: string; disabled?: boolean; onChange: (value: number | undefined) => void | Promise<void>
}) {
  const [draft, setDraft] = useState<{ value?: number } | null>(null)
  const actual = useRef<{ value?: number } | null>(null), pending = useRef(0), revision = useRef(0)
  useEffect(() => {
    if (!pending.current && draft && draft.value === value) { actual.current = null; setDraft(null) }
  }, [value, draft])
  const shown = draft ? draft.value : value
  function cambiar(delta: -1 | 1) {
    const anterior = actual.current ? actual.current.value : value
    const next = delta === 1 ? anterior === undefined ? 0 : Math.min(5, anterior + 1) : anterior === undefined || anterior === 0 ? undefined : anterior - 1
    actual.current = { value: next }; setDraft(actual.current); pending.current++
    const id = ++revision.current
    // Cada escritura se registra inmediatamente en el padre, también al tocar rápido.
    void Promise.resolve(onChange(next)).catch(() => {
      if (id === revision.current) { actual.current = null; setDraft(null) }
    }).finally(() => { pending.current--; setDraft(d => d ? { ...d } : null) })
  }
  const button = 'flex h-touch w-touch shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-line hover:text-fg disabled:opacity-30'
  return <div className="rir-stepper items-center" role="group" aria-label={label}>
    <button type="button" className={button} disabled={disabled || shown === undefined} aria-label={`Reducir ${label}`}
      title={shown === 0 ? 'Dejar RIR sin dato' : 'Reducir RIR'} onClick={() => cambiar(-1)}><Icon name="minus" size={12} /></button>
    <output aria-live="polite" aria-label={label} className="tabular min-w-0 text-center text-body-sm font-medium text-fg-muted">{shown ?? '—'}</output>
    <button type="button" className={button} disabled={disabled || shown === 5} aria-label={`Aumentar ${label}`}
      onClick={() => cambiar(1)}><Icon name="plus" size={12} /></button>
  </div>
}
