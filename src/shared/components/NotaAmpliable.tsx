import { useId, useState, type ReactNode } from 'react'

interface Props {
  /** Lo que hace falta para decidir, en media línea. */
  resumen: string
  /** El resto de la explicación: aparece debajo al tocar «Más». */
  children: ReactNode
}

/**
 * Nota de un control (Ajustes y similares): el resumen siempre a la vista y el detalle bajo demanda. Toda la línea es el
 * botón, para que el objetivo táctil llegue a 44 px sin un enlace diminuto. No usar para avisos ni errores.
 */
export default function NotaAmpliable({ resumen, children }: Props) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  return (
    <div className="text-caption text-fg-muted">
      <button type="button" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta(!abierta)}
        className="flex min-h-touch w-full items-center text-left text-caption">
        <span className="min-w-0">{resumen}{' '}<span className="font-semibold text-accent-strong underline underline-offset-2">{abierta ? 'Menos' : 'Más'}</span></span>
      </button>
      <div id={id} hidden={!abierta} className="-mt-2 pb-1">{children}</div>
    </div>
  )
}
