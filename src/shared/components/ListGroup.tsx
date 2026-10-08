import type { ReactNode } from 'react'

interface Props {
  /** `<li>` (normalmente con un `ListRow` dentro). */
  children: ReactNode
  /** `agrupada`: una sola superficie sobre la página. `plana`: dentro de una card o un Sheet, que ya son la superficie. */
  variante?: 'agrupada' | 'plana'
  className?: string
  'aria-label'?: string
}

const VARIANTES = {
  agrupada: 'app-list-group rounded-lg border border-transparent bg-surface px-3 shadow-card', // el borde solo se ve en oscuro (tokens.css)
  plana: 'border-y border-line',
}

/** Colección con divisores interiores, sin convertir cada registro en una card. */
export default function ListGroup({ children, variante = 'agrupada', className = '', ...rest }: Props) {
  return (
    <ul className={`divide-y divide-line ${VARIANTES[variante]} ${className}`} {...rest}>{children}</ul>
  )
}
