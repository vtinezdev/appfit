import { cloneElement, useId, type ReactElement } from 'react'

/** Etiqueta visible con su campo; la ayuda queda fuera de la etiqueta y se enlaza como descripción. */
export default function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactElement<{ 'aria-describedby'?: string }>; ayuda?: string }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="block text-body-sm font-medium text-fg">{etiqueta}</span>
        {ayuda ? cloneElement(children, { 'aria-describedby': id }) : children}
      </label>
      {ayuda && <p id={id} className="text-caption text-fg-muted">{ayuda}</p>}
    </div>
  )
}
