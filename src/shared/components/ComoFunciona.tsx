import { useState, type ReactNode } from 'react'
import { IconButton } from './Button'
import ModalPage from './ModalPage'

interface Props {
  /** Sistema que explica («Cumbres», «la liga»…): «Cómo funciona {nombre}». */
  nombre: string
  /** Pantalla a la que vuelve la salida; por defecto, el propio sistema. */
  volver?: string
  children: ReactNode
}

/**
 * Las reglas de un sistema (Cumbres, Caminos, Ritmo, Liga, Vitrina) fuera de su pantalla: una «i» en su cabecera abre
 * una página «Cómo funciona». Así la pantalla enseña solo el progreso y las reglas largas se leen enteras, con calma.
 */
export default function ComoFunciona({ nombre, volver = nombre, children }: Props) {
  const [abierta, setAbierta] = useState(false)
  return <>
    <IconButton icon="info" label={`Cómo funciona ${nombre}`} variant="ghost" aria-haspopup="dialog" onClick={() => setAbierta(true)} />
    {abierta && <ModalPage title={`Cómo funciona ${nombre}`} closeLabel={volver} onClose={() => setAbierta(false)}>
      <div className="space-y-section">{children}</div>
    </ModalPage>}
  </>
}

/** Un bloque de la página: título y contenido. */
export function BloqueComoFunciona({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section aria-label={titulo} className="space-y-stack">
    <h2 className="text-heading text-fg">{titulo}</h2>
    {children}
  </section>
}

/** Una regla con su valor (lo que sube, lo que cuesta…), como fila de un ListGroup. */
export function ValorComoFunciona({ regla, detalle, valor }: { regla: string; detalle?: string; valor: string }) {
  return <li className="flex min-h-touch items-center justify-between gap-3 py-2">
    <span className="min-w-0">
      <span className="block break-words text-body-sm text-fg">{regla}</span>
      {detalle && <span className="block break-words text-caption text-fg-muted">{detalle}</span>}
    </span>
    <span className="tabular shrink-0 text-body font-semibold text-fg">{valor}</span>
  </li>
}

/** Reglas sueltas, en frases cortas. */
export function ListaComoFunciona({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">{children}</ul>
}
