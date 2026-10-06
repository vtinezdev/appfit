interface Props<T extends string> {
  label: string
  opciones: Record<T, string>
  seleccion: T[]
  onChange: (value: T[]) => void
  disabled?: boolean
}

/** Una fila desplazable por filtro; selección múltiple con estado accesible y targets completos. */
export default function FilterChips<T extends string>({ label, opciones, seleccion, onChange, disabled }: Props<T>) {
  return <fieldset className="min-w-0 space-y-2">
    <legend className="text-label text-fg-muted">{label}</legend>
    <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
      {(Object.entries(opciones) as [T, string][]).map(([id, name]) => <button key={id} type="button" disabled={disabled}
        aria-pressed={seleccion.includes(id)} onClick={() => onChange(seleccion.includes(id) ? seleccion.filter(x => x !== id) : [...seleccion, id])}
        className={`min-h-touch shrink-0 rounded-pill border px-3 py-2 text-body-sm font-medium transition-colors duration-short disabled:opacity-40 ${seleccion.includes(id) ? 'border-accent-strong bg-accent-subtle text-accent-strong' : 'border-line bg-surface text-fg hover:bg-surface-muted'}`}>
        {name}
      </button>)}
    </div>
  </fieldset>
}
