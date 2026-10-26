import type { ReactNode } from 'react'

interface Props {
  /** `<li>` (normalmente con un `ListRow` dentro). */
  children: ReactNode
  /** `agrupada`: una sola superficie sobre la página. `plana`: dentro de una card o un Sheet, que ya son la superficie. */
  variante?: 'agrupada' | 'plana'
  /** Nota del grupo (una consecuencia, un aviso breve) dentro de su superficie, tras un divisor: nunca suelta debajo. */
  pie?: ReactNode
  className?: string
  'aria-label'?: string
}

const VARIANTES = {
  agrupada: 'app-list-group rounded-lg border border-transparent bg-surface px-3 shadow-card', // el borde solo se ve en oscuro (tokens.css)
  plana: 'app-list-flat border-y border-line', // un Disclosure que la siga no repite su línea (index.css)
}

/** Colección con divisores interiores, sin convertir cada registro en una card. */
export default function ListGroup({ children, variante = 'agrupada', pie, className = '', ...rest }: Props) {
  if (!pie) return <ul className={`divide-y divide-line ${VARIANTES[variante]} ${className}`} {...rest}>{children}</ul>
  return (
    <div className={`${VARIANTES[variante]} ${className}`}>
      <ul className="divide-y divide-line" {...rest}>{children}</ul>
      <p className="border-t border-line py-3 text-caption text-fg-muted">{pie}</p>
    </div>
  )
}
