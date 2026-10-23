import { useId, type ReactNode } from 'react'
import Icon from '../../../shared/components/Icon'

/**
 * Bloque plegable del fin de sesión (ENT-10): como `Disclosure` (mismas clases), con el resumen del bloque en una línea
 * bajo el título. Controlado por la página (solo uno abierto) y el contenido se monta solo al abrirlo: así los cálculos
 * de Cumbres o la Vitrina no se repiten mientras está cerrado.
 */
export default function BloqueSesion({ titulo, resumen, abierto, onCambiar, children }: {
  titulo: string; resumen: string; abierto: boolean; onCambiar: (abierto: boolean) => void; children: ReactNode
}) {
  const id = useId()
  return <div className="app-disclosure border-y border-line">
    <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => onCambiar(!abierto)}
      className="flex min-h-touch w-full items-center justify-between gap-3 py-3 pr-1 text-left">
      <span className="min-w-0 flex-1 break-words">
        <span className="block text-body font-semibold text-fg">{titulo}</span>
        <span className="block text-body-sm text-fg-muted">{resumen}</span>
      </span>
      <Icon name="chevron-right" size={18} className={`shrink-0 text-fg-muted transition-transform duration-short motion-reduce:transition-none ${abierto ? 'rotate-90' : ''}`} />
    </button>
    <div id={id} hidden={!abierto} className="space-y-stack pb-4">{abierto && children}</div>
  </div>
}
