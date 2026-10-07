import type { ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'

interface Props {
  etiqueta: string
  onAbrir: () => void
  children?: ReactNode
  /** Acción propia en la esquina (p. ej. registrar); sustituye al chevrón. Es hermana del botón, nunca está dentro. */
  accion?: ReactNode
}

/** Tarjeta pequeña de Inicio: etiqueta, dato breve y toda la superficie como acceso a su sección. */
export default function TarjetaAcceso({ etiqueta, onAbrir, children, accion }: Props) {
  return (
    <Card padded={false} className="relative">
      <button type="button" onClick={onAbrir} className="flex h-full w-full flex-col gap-1 rounded-lg p-4 text-left">
        <span className={`flex w-full items-center gap-2 ${accion ? 'pr-8' : ''}`}>
          <span className="min-w-0 flex-1 text-label text-fg-muted">{etiqueta}</span>
          {!accion && <Icon name="chevron-right" size={18} className="text-fg-subtle" />}
        </span>
        {children}
      </button>
      {accion && <div className="absolute right-1 top-1">{accion}</div>}
    </Card>
  )
}
