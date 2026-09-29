interface Props<T extends string> {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  className?: string
  /** `sm` para barras con muchas pestañas. */
  size?: 'md' | 'sm'
}

/** Fila de botones-pestaña donde solo uno está activo (Hoy/Resumen/Alimentos, Semana/Mes, Desayuno/Comida…). */
export default function SegmentedControl<T extends string>({ opciones, valor, onChange, className = '', size = 'md' }: Props<T>) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-md bg-surface-muted p-1 ${className}`}>
      {opciones.map((o) => {
        const activo = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(o.valor)}
            className={`min-h-touch flex-1 rounded-sm font-medium transition-colors duration-short ${size === 'sm' ? 'text-caption' : 'text-body-sm'} ${
              activo ? 'bg-surface text-fg shadow-raised' : 'text-fg-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
