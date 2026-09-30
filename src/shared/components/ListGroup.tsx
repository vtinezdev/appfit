import type { ReactNode } from 'react'
import Card from './Card'

interface Props {
  /** `<li>` (normalmente con un `ListRow` dentro). */
  children: ReactNode
  className?: string
  'aria-label'?: string
}

/** Una card con hairlines para una lista de primer nivel (Alimentos, Plantillas, Rutinas, Historial): una card por lista, no por fila. */
export default function ListGroup({ children, className = '', ...rest }: Props) {
  return (
    <Card padded={false} className={`overflow-hidden ${className}`}>
      <ul className="divide-y divide-line" {...rest}>
        {children}
      </ul>
    </Card>
  )
}
