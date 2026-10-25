import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ModalPage from '../../../shared/components/ModalPage'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState } from '../../../shared/components/StateMessage'
import type { MiPerfil } from '../data/social'
import { cargarSocial } from '../servicio'
import EditarPerfilDeportivo from './EditarPerfilDeportivo'
import ListaFeed from './ListaFeed'
import PerfilDeportivo from './PerfilDeportivo'
import PerfilSheet from './PerfilSheet'

interface Props {
  perfil: MiPerfil
  onClose: () => void
  /** Alias, nombre, código o perfil deportivo cambiaron (o se borró el perfil): Social vuelve a leerlo. */
  onPerfilCambiado: () => void
  onError: (mensaje: string) => void
}

/**
 * Tu perfil como lo ven tus seguidores, con tus publicaciones (antes, la pestaña «Tú» de Social). «Editar perfil» abre
 * lo que ven los demás (avatar, biografía, disciplinas y logros destacados); el «…», los ajustes: alias, código,
 * bloqueos, silencios, comunidades creadas y borrar el perfil.
 */
export default function MiPerfilPagina({ perfil, onClose, onPerfilCambiado, onError }: Props) {
  // Las hojas siguen montadas al cerrarse (animan la salida); `n` las vuelve a montar limpias en cada apertura.
  const [editar, setEditar] = useState({ open: false, n: 0 })
  const [ajustes, setAjustes] = useState({ open: false, n: 0 })
  const [version, setVersion] = useState(0)
  const cerrarEditar = () => { setEditar(a => ({ ...a, open: false })); setVersion(v => v + 1) }
  return <ModalPage title="Tu perfil" closeLabel="Social" onClose={onClose}>
    <div className="space-y-section">
      <div className="-mb-4 flex justify-end"><IconButton icon="more" label="Ajustes del perfil" variant="ghost" aria-haspopup="dialog" onClick={() => setAjustes(a => ({ open: true, n: a.n + 1 }))} /></div>
      <PerfilDeportivo key={`${perfil.alias}-${version}`} persona={perfil}
        acciones={<Button block aria-haspopup="dialog" onClick={() => setEditar(a => ({ open: true, n: a.n + 1 }))}><Icon name="pencil" size={18} />Editar perfil</Button>} />
      <section aria-label="Tus publicaciones" className="space-y-3">
        <h2 className="text-rotulo text-fg-muted">Tus publicaciones</h2>
        <ListaFeed version={`mias-${perfil.alias}-${version}`} conAutor={false} onError={onError}
          cargar={async (antes) => (await cargarSocial()).publicacionesDe(perfil.alias, antes)}
          vacio={<EmptyState>Aún no has publicado nada. Comparte un entreno, una actividad o un logro desde su detalle, o escribe algo en Social.</EmptyState>} />
      </section>
    </div>
    {editar.n > 0 && <Sheet key={`editar-${editar.n}`} open={editar.open} onClose={cerrarEditar} title="Editar perfil">
      <EditarPerfilDeportivo alias={perfil.alias} onGuardado={cerrarEditar} />
    </Sheet>}
    {ajustes.n > 0 && <PerfilSheet key={`ajustes-${ajustes.n}`} open={ajustes.open} perfil={perfil}
      onClose={() => { setAjustes(a => ({ ...a, open: false })); setVersion(v => v + 1) }}
      onCambio={onPerfilCambiado}
      onBorrado={() => { setAjustes(a => ({ ...a, open: false })); onPerfilCambiado(); onClose() }} />}
  </ModalPage>
}
