import { useState, type ReactNode } from 'react'
import { IconButton } from './Button'
import Sheet from './Sheet'

interface Props {
  /** Qué explica: «Lo que usas», «Días en rango»… Es el título de la hoja y da nombre al botón. */
  titulo: string
  children: ReactNode
}

/**
 * Explicación bajo demanda: una «i» junto a un título abre una hoja con el texto. Para lo que explica cómo funciona algo;
 * lo que avisa de una consecuencia va a la vista (pie del grupo), y las reglas largas de un sistema, a `ComoFunciona`.
 */
export default function Ayuda({ titulo, children }: Props) {
  const [abierta, setAbierta] = useState(false)
  return <>
    <IconButton icon="info" label={`Qué es ${titulo}`} variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => setAbierta(true)} />
    <Sheet open={abierta} onClose={() => setAbierta(false)} title={titulo}>
      <div className="space-y-stack text-body-sm text-fg-muted">{children}</div>
    </Sheet>
  </>
}
