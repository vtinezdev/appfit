import Button from './Button'
import Icon from './Icon'

/** Leyenda operativa sin preferencia guardada; el estado no depende solo del color. */
export default function ChartVisibility<T extends string>({ opciones, seleccion, onChange, label = 'Métricas visibles' }: {
  opciones: Record<T, string>; seleccion: T[]; onChange: (seleccion: T[]) => void; label?: string
}) {
  return <fieldset className="min-w-0 space-y-2"><legend className="text-label text-fg-muted">{label}</legend>
    <div className="flex flex-wrap gap-2">{(Object.entries(opciones) as [T, string][]).map(([id, nombre]) => <Button key={id} size="sm"
      variant={seleccion.includes(id) ? 'secondary' : 'ghost'} aria-pressed={seleccion.includes(id)}
      onClick={() => onChange(seleccion.includes(id) ? seleccion.filter(x => x !== id) : [...seleccion, id])}>
      <Icon name={seleccion.includes(id) ? 'check' : 'minus'} size={16} />{nombre}
    </Button>)}</div>
  </fieldset>
}
