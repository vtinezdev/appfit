import type { ReactNode } from 'react'

interface Props {
  /** `<li>` (normalmente con un `ListRow` dentro). */
  children: ReactNode
  className?: string
  'aria-label'?: string
}

/** Colección plana con divisores, sin convertir cada registro en una card. */
export default function ListGroup({ children, className = '', ...rest }: Props) {
  return (
    <ul className={`divide-y divide-line border-y border-line ${className}`} {...rest}>{children}</ul>
  )
}
