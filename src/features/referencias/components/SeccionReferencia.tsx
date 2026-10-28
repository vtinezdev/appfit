import { useId, useState, type ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'

/** El aviso con el que empieza una página de Referencias, en un recuadro con su icono en lugar de un párrafo suelto. */
export function AvisoReferencia({ children }: { children: ReactNode }) {
  return <Card tone="muted" className="flex items-start gap-3">
    <Icon name="info" size={20} className="mt-0.5 shrink-0 text-fg-muted" />
    <div className="min-w-0 space-y-2 text-body-sm text-fg">{children}</div>
  </Card>
}

/**
 * Una sección de Referencias (punto 33): una tarjeta con el título y un resumen de una línea, cerrada al empezar; al
 * tocarla, el texto completo. Así la página dice de qué trata cada parte sin obligar a leerlo todo.
 */
export default function SeccionReferencia({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  return <Card padded={false} className="overflow-hidden">
    <button type="button" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta(!abierta)}
      className="app-button flex min-h-touch w-full items-start gap-3 p-card text-left">
      <span className="min-w-0 flex-1">
        <span className="block break-words text-title text-fg">{titulo}</span>
        <span className="block break-words text-body-sm text-fg-muted">{resumen}</span>
      </span>
      <Icon name="chevron-down" size={20} className={`mt-1 shrink-0 text-fg-subtle transition-transform duration-short motion-reduce:transition-none ${abierta ? 'rotate-180' : ''}`} />
    </button>
    <div id={id} hidden={!abierta} className="space-y-2 border-t border-line px-card pb-card pt-3 text-body-sm text-fg-muted">{children}</div>
  </Card>
}
