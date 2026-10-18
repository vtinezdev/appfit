import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ModalPage from '../../../shared/components/ModalPage'
import { EmptyState } from '../../../shared/components/StateMessage'
import type { MiPerfil } from '../data/social'
import { cargarSocial } from '../servicio'
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
 * los ajustes de siempre: alias, perfil deportivo, código, bloqueos, silencios y borrar el perfil.
 */
export default function MiPerfilPagina({ perfil, onClose, onPerfilCambiado, onError }: Props) {
  const [ajustes, setAjustes] = useState({ open: false, n: 0 })
  const [version, setVersion] = useState(0)
  return <ModalPage title="Tu perfil" closeLabel="Social" onClose={onClose}>
    <div className="space-y-section">
      <PerfilDeportivo key={`${perfil.alias}-${version}`} persona={perfil}
        acciones={<Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAjustes(a => ({ open: true, n: a.n + 1 }))}><Icon name="pencil" size={18} />Editar perfil</Button>} />
      <section aria-label="Tus publicaciones" className="space-y-3">
        <h2 className="text-rotulo text-fg-muted">Tus publicaciones</h2>
        <ListaFeed version={`mias-${perfil.alias}-${version}`} conAutor={false} onError={onError}
          cargar={async (antes) => (await cargarSocial()).publicacionesDe(perfil.alias, antes)}
          vacio={<EmptyState>Aún no has publicado nada. Comparte un entreno, una actividad o un logro desde su detalle, o escribe algo en Social.</EmptyState>} />
      </section>
    </div>
    {ajustes.n > 0 && <PerfilSheet key={`perfil-${ajustes.n}`} titulo="Editar perfil" open={ajustes.open} perfil={perfil}
      onClose={() => { setAjustes(a => ({ ...a, open: false })); setVersion(v => v + 1) }}
      onCambio={onPerfilCambiado}
      onBorrado={() => { setAjustes(a => ({ ...a, open: false })); onPerfilCambiado(); onClose() }} />}
  </ModalPage>
}
