import { useRef, useState } from 'react'
import type { Comida } from '../../../shared/db/types'
import Sheet from '../../../shared/components/Sheet'
import { nombreComida } from '../lib/comidas'
import type { ComidaTipica } from '../lib/comidasTipicas'
import ComidasTipicas from './ComidasTipicas'

interface Props {
  id: string
  comida: Comida
  fecha: string
  onClose: () => void
  onElegir: (tipica: ComidaTipica) => void
  onCrear: () => void
}

/** La vista previa se abre al terminar la salida del selector, sin superponer hojas. */
export default function ComidasTipicasSheet({ id, comida, fecha, onClose, onElegir, onCrear }: Props) {
  const [abierto, setAbierto] = useState(true)
  const pendiente = useRef<ComidaTipica | null>(null)
  const crearPendiente = useRef(false)
  return <Sheet id={id} open={abierto} title={`Comidas típicas de ${nombreComida(comida).toLowerCase()}`} onClose={onClose}
    onExited={() => {
      const tipica = pendiente.current
      pendiente.current = null
      if (tipica || crearPendiente.current) {
        onClose()
        if (tipica) onElegir(tipica)
        else onCrear()
      }
    }}>
    <ComidasTipicas enSelector comida={comida} fecha={fecha} onElegir={tipica => { pendiente.current = tipica; setAbierto(false) }} onCrear={() => { crearPendiente.current = true; setAbierto(false) }} />
  </Sheet>
}
