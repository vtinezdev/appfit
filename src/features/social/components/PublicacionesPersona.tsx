import { useState } from 'react'
import ModalPage from '../../../shared/components/ModalPage'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import { nombreVisible, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import ListaFeed from './ListaFeed'

interface Props {
  persona: Pick<Persona, 'alias' | 'nombre'>
  onClose: () => void
}

/** Lo que ha publicado una persona que sigo, en una página encima de Amigos (el Toast quedaría debajo: errores aquí). */
export default function PublicacionesPersona({ persona, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  return (
    <ModalPage title={nombreVisible(persona)} onClose={onClose} closeLabel="Amigos">
      <div className="space-y-stack">
        {persona.nombre && <p className="break-words text-body-sm text-fg-muted">@{persona.alias}</p>}
        {error && <ErrorState>{error}</ErrorState>}
        <ListaFeed version={persona.alias} onError={setError} conAutor={false}
          cargar={async (antes) => (await cargarSocial()).publicacionesDe(persona.alias, antes)}
          vacio={<EmptyState>Aún no ha publicado nada.</EmptyState>} />
      </div>
    </ModalPage>
  )
}
