interface Props {
  label: string
  /** Una línea bajo el nombre, dentro de la fila (no como frase suelta debajo). */
  detalle?: string
  activo: boolean
  onChange: (activo: boolean) => void
}

/**
 * Sí/no de una fila de lista (`role="switch"`): toda la fila es el objetivo táctil, con el nombre a la izquierda y el
 * interruptor a la derecha. Para elegir entre valores con nombre, SegmentedControl.
 */
export default function Interruptor({ label, detalle, activo, onChange }: Props) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)}
      className="app-list-row flex min-h-touch w-full items-center justify-between gap-3 py-2 text-left">
      <span className="min-w-0">
        <span className="block break-words text-body-sm font-semibold text-fg">{label}</span>
        {detalle && <span className="block break-words text-caption text-fg-muted">{detalle}</span>}
      </span>
      <span aria-hidden className={`flex h-7 w-12 shrink-0 items-center rounded-pill px-0.5 transition-colors duration-short ${activo ? 'bg-accent' : 'bg-line-strong'}`}>
        <span className={`h-6 w-6 rounded-pill bg-surface shadow-card transition-transform duration-short ${activo ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
