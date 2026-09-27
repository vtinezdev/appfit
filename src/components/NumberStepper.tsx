interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  suffix?: string
  compact?: boolean
}

export default function NumberStepper({ value, onChange, step = 1, min = 0, suffix, compact = false }: Props) {
  const clamp = (n: number) => Math.max(min, Math.round(n * 100) / 100)
  const btnSize = compact ? 'h-7 w-7 text-base' : 'h-9 w-9 text-lg'

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className={`flex shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:bg-slate-700 ${btnSize}`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        className={`w-full min-w-0 rounded-lg bg-slate-800 text-center text-slate-100 ${compact ? 'px-1 py-1 text-sm' : 'px-2 py-1.5'}`}
      />
      {suffix && <span className={`shrink-0 text-slate-400 ${compact ? 'w-9 text-xs' : 'w-8 text-sm'}`}>{suffix}</span>}
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className={`flex shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:bg-slate-700 ${btnSize}`}
      >
        +
      </button>
    </div>
  )
}
