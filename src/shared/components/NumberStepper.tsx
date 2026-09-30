import Icon from './Icon'

interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  suffix?: string
  /** Variante densa (series de Gym, plantillas): tamaño y comportamiento propios, no cambian con la variante normal. */
  compact?: boolean
  /** Fuerza el input a 16 px aunque `compact` use un tamaño menor: evita el zoom automático de iOS al enfocarlo. */
  inputTextoGrande?: boolean
  /** Nombre accesible del campo (p. ej. «Gramos»). */
  label?: string
}

/**
 * Cantidad con − / +. La variante normal usa zonas táctiles de 44 px y un campo de ancho fijo (no se estira),
 * para que el nombre y el resultado de la fila sigan siendo lo principal; `compact` es la de siempre.
 */
export default function NumberStepper({ value, onChange, step = 1, min = 0, suffix, compact = false, inputTextoGrande = false, label }: Props) {
  const clamp = (n: number) => Math.max(min, Math.round(n * 100) / 100)
  const btn =
    'flex shrink-0 items-center justify-center rounded-pill bg-surface-muted text-fg hover:bg-line ' +
    (compact ? 'h-8 w-8 transition-opacity duration-short active:opacity-70' : 'h-touch w-touch transition-[opacity,transform] duration-short active:scale-95 active:opacity-70')

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={label ? `Reducir ${label}` : 'Reducir'} onClick={() => onChange(clamp(value - step))} className={btn}>
        <Icon name="minus" size={16} />
      </button>
      {compact ? (
        <>
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            className={`tabular min-w-0 w-full rounded-md bg-surface-muted px-1 py-1 text-center text-fg ${inputTextoGrande ? 'text-body' : 'text-body-sm'}`}
          />
          {suffix && <span className="w-9 shrink-0 text-caption text-fg-subtle">{suffix}</span>}
        </>
      ) : (
        // La unidad va dentro del campo: «100 g» se lee como una sola cantidad.
        <div className="relative w-24 shrink-0">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
            className="tabular no-spin min-h-touch w-full rounded-md bg-surface-muted px-5 text-center text-fg"
          />
          {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body-sm text-fg-subtle">{suffix}</span>}
        </div>
      )}
      <button type="button" aria-label={label ? `Aumentar ${label}` : 'Aumentar'} onClick={() => onChange(clamp(value + step))} className={btn}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
