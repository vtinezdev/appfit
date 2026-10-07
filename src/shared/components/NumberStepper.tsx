import { useCampoDecimal } from '../hooks/useCampoDecimal'
import Icon from './Icon'

interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  suffix?: string
  label: string
}

/** Cantidad como una sola unidad: dos targets reales de 44 px y un campo a 16 px. */
export default function NumberStepper({ value, onChange, step = 1, min = 0, suffix, label }: Props) {
  const clamp = (n: number) => Math.max(min, Math.round(n * 100) / 100)
  const campo = useCampoDecimal(value, (n) => { if (n !== undefined) onChange(clamp(n)) })
  const button = 'flex h-touch w-touch shrink-0 items-center justify-center text-fg transition-colors duration-short hover:bg-line active:bg-line disabled:opacity-30'
  return (
    <div className="inline-flex shrink-0 items-center overflow-hidden rounded-md border border-line-strong bg-surface-muted">
      <button type="button" aria-label={`Reducir ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} className={button}>
        <Icon name="minus" size={16} />
      </button>
      <div className="relative w-24 shrink-0">
        <input {...campo} enterKeyHint="done" aria-label={label}
          className={`tabular no-spin min-h-touch w-full bg-transparent px-2 text-center text-body font-semibold text-fg ${suffix ? 'pr-7' : ''}`} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-caption text-fg-muted">{suffix}</span>}
      </div>
      <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(clamp(value + step))} className={button}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
