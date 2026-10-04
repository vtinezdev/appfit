import { useEffect, useRef } from 'react'
import Sheet from '../../../shared/components/Sheet'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'

interface Props {
  id: string
  open: boolean
  nombre: string
  ocupado: boolean
  onClose: () => void
  onAnadir: () => void
  onMover: () => void
  onCopiar: () => void
  onBorrar: () => void
}

/** Cambiar de tarea o borrar espera la salida real: no se apilan capas ni se oculta Deshacer. */
export default function AccionesPlatoSheet({ id, open, nombre, ocupado, onClose, onAnadir, onMover, onCopiar, onBorrar }: Props) {
  const pendiente = useRef<(() => void) | null>(null)
  useEffect(() => { if (open) pendiente.current = null }, [open])
  const elegir = (accion: () => void) => { pendiente.current = accion; onClose() }
  return <Sheet id={id} open={open} title="Acciones del plato" onClose={() => { pendiente.current = null; onClose() }}
    onExited={() => { const accion = pendiente.current; pendiente.current = null; accion?.() }}>
    <p className="mb-3 break-words text-body font-semibold text-fg">{nombre}</p>
    <ListGroup aria-label="Acciones disponibles del plato">
      <li><ListRow disabled={ocupado} aria-label={`Añadir ingredientes a ${nombre}`} onClick={() => elegir(onAnadir)}><span>Añadir ingredientes</span><Icon name="plus" size={20} /></ListRow></li>
      <li><ListRow disabled={ocupado} aria-label={`Mover plato ${nombre}`} onClick={() => elegir(onMover)}><span>Mover</span><Icon name="move" size={20} /></ListRow></li>
      <li><ListRow disabled={ocupado} aria-label={`Copiar plato ${nombre}`} onClick={() => elegir(onCopiar)}><span>Copiar plato</span><Icon name="copy" size={20} /></ListRow></li>
      <li><ListRow disabled={ocupado} aria-label={`Borrar plato ${nombre}`} onClick={() => elegir(onBorrar)} className="text-destructive"><span>Borrar plato</span><Icon name="trash" size={20} /></ListRow></li>
    </ListGroup>
  </Sheet>
}
