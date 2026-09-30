interface Props<T extends string> {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  className?: string
  /** `sm` para barras con muchas pestañas. */
  size?: 'md' | 'sm'
}

/** Fila de botones-pestaña donde solo uno está activo (Hoy/Resumen/Alimentos, Semana/Mes, Desayuno/Comida…). El activo se marca con `bg-selected` (negro). */
export default function SegmentedControl<T extends string>({ opciones, valor, onChange, className = '', size = 'md' }: Props<T>) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-pill bg-surface-muted p-1 ${className}`}>
      {opciones.map((o) => {
        const activo = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(o.valor)}
            className={`min-h-touch flex-1 rounded-pill font-semibold transition-[background-color,color,transform] duration-short active:scale-95 ${size === 'sm' ? 'text-caption' : 'text-body-sm'} ${
              activo ? 'bg-selected text-selected-on' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
