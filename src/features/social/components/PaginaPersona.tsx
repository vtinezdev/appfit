import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import ModalPage from '../../../shared/components/ModalPage'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import { accionSeguir, nombreVisible, textoRelacion, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import { useAdmin } from '../hooks/useAdmin'
import FormDenuncia from './FormDenuncia'
import ListaFeed from './ListaFeed'
import PerfilDeportivo from './PerfilDeportivo'

interface Props {
  comunidad?: string
  volver?: string
  persona: Persona
  onClose: () => void
  /** Algo cambió con esta persona: las listas se vuelven a leer. Con `mensaje`, la página se cierra y se avisa. */
  onCambio: (mensaje?: string) => void
}

type Paso = 'menu' | 'bloquear' | 'denunciar' | 'denunciada' | 'suspender'

/**
 * Una persona, como página común desde Amigos, Social y comunidades: su perfil deportivo, la acción de la relación que
 * toca (pedir seguir, cancelar o responder su solicitud) y sus publicaciones. Dejar de seguir, quitar de seguidores,
 * denunciar y bloquear van en «Más acciones».
 */
export default function PaginaPersona({ persona: inicial, onClose, onCambio, comunidad, volver = 'Amigos' }: Props) {
  const [persona, setPersona] = useState(inicial)
  const [menu, setMenu] = useState<{ open: boolean; paso: Paso }>({ open: false, paso: 'menu' })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nombre = nombreVisible(persona)
  const accion = accionSeguir(persona)
  // Solo el administrador (0017) ve «Suspender perfil».
  const admin = useAdmin()

  async function ejecutar(fn: () => Promise<void>) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const cambiar = (cambios: Partial<Persona>) => {
    setPersona((p) => ({ ...p, ...cambios }))
    onCambio()
  }
  const cerrarMenu = () => setMenu(m => ({ ...m, open: false }))

  const seguir = () => ejecutar(async () => {
    const social = await cargarSocial()
    if (accion === 'seguir') cambiar({ sigo: await social.pedirSeguir(persona.alias) })
    else {
      await social.dejarDeSeguir(persona.alias)
      cambiar({ sigo: 'no' })
      cerrarMenu()
    }
  })
  const responder = (aceptar: boolean) => ejecutar(async () => {
    await (await cargarSocial()).responderSolicitud(persona.alias, aceptar)
    // Aceptar hace que os sigáis los dos (0018): también la sigo yo.
    cambiar(aceptar ? { meSigue: 'aceptado', sigo: 'aceptado' } : { meSigue: 'no' })
  })
  const quitar = () => ejecutar(async () => {
    await (await cargarSocial()).quitarSeguidor(persona.alias)
    cambiar({ meSigue: 'no' })
    cerrarMenu()
  })
  const bloquear = () => ejecutar(async () => {
    await (await cargarSocial()).bloquear(persona.alias)
    onCambio(`Has bloqueado a ${nombre}.`)
  })
  const suspender = () => ejecutar(async () => {
    await (await cargarSocial()).suspender(persona.alias, true)
    onCambio(`Has suspendido a ${nombre}.`)
  })

  const relacion = <div className="space-y-stack">
    {persona.meSigue === 'pendiente' && (
      <div className="space-y-2 rounded-md bg-surface-muted p-3 text-left">
        <p className="text-body-sm text-fg">Quiere seguirte. Si aceptas, os seguiréis los dos y cada uno verá lo que publique el otro.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => void responder(false)}>Rechazar</Button>
          <Button variant="primary" className="flex-1" disabled={ocupado} onClick={() => void responder(true)}>Aceptar</Button>
        </div>
      </div>
    )}
    {/* Con su solicitud pendiente, aceptarla ya os hace seguiros: no hace falta pedirlo aparte. */}
    {accion === 'seguir' && persona.meSigue !== 'pendiente' && <div className="space-y-1"><Button variant="primary" block disabled={ocupado} onClick={() => void seguir()}>Pedir seguir</Button><p className="text-caption text-fg-muted">Cuando te acepte, os seguiréis los dos.</p></div>}
    {accion === 'cancelar' && <Button variant="secondary" block disabled={ocupado} onClick={() => void seguir()}>Cancelar solicitud</Button>}
  </div>

  function contenidoMenu() {
    switch (menu.paso) {
      case 'bloquear':
        return <ConfirmacionDestructiva mensaje={`${nombre} y tú dejaréis de seguiros y no podréis encontraros. No se le avisa. Puedes desbloquear desde tu perfil.`}
          confirmar="Sí, bloquear" ocupado={ocupado} onCancelar={() => setMenu({ open: true, paso: 'menu' })} onConfirmar={() => void bloquear()} />
      case 'suspender':
        return <ConfirmacionDestructiva mensaje={`${nombre} dejará de ver Social y Amigos, y sus publicaciones, comentarios y comunidades dejarán de verse. Puedes readmitirle desde Moderación.`}
          confirmar="Suspender perfil" ocupado={ocupado} onCancelar={() => setMenu({ open: true, paso: 'menu' })} onConfirmar={() => void suspender()} />
      case 'denunciar':
        return <FormDenuncia onCancelar={() => setMenu({ open: true, paso: 'menu' })} onEnviar={async (motivo, detalle) => {
          await (await cargarSocial()).denunciarPerfil(persona.alias, motivo, detalle)
          setMenu({ open: true, paso: 'denunciada' })
        }} />
      case 'denunciada':
        return <div className="space-y-stack">
          <p role="status" className="text-body-sm text-fg">Gracias. Revisaremos la denuncia.</p>
          <p className="text-body-sm text-fg-muted">Si no quieres saber nada más de {nombre}, también puedes bloquearle.</p>
          <Button variant="destructive" block onClick={() => setMenu({ open: true, paso: 'bloquear' })}>Bloquear</Button>
          <Button variant="secondary" block onClick={cerrarMenu}>Cerrar</Button>
        </div>
      default:
        return <div className="space-y-stack">
          {accion === 'dejar' && <Button variant="secondary" block disabled={ocupado} onClick={() => void seguir()}>Dejar de seguir</Button>}
          {persona.meSigue === 'aceptado' && <Button variant="secondary" block disabled={ocupado} onClick={() => void quitar()}>Quitar de tus seguidores</Button>}
          <Button variant="secondary" block disabled={ocupado} onClick={() => { setError(null); setMenu({ open: true, paso: 'denunciar' }) }}>Denunciar</Button>
          <Button variant="destructive" block disabled={ocupado} onClick={() => { setError(null); setMenu({ open: true, paso: 'bloquear' }) }}>Bloquear</Button>
          {admin && <Button variant="destructive" block disabled={ocupado} onClick={() => { setError(null); setMenu({ open: true, paso: 'suspender' }) }}>Suspender perfil</Button>}
        </div>
    }
  }
  const tituloMenu = menu.paso === 'denunciar' ? `Denunciar a ${nombre}` : menu.paso === 'bloquear' ? `Bloquear a ${nombre}` : menu.paso === 'suspender' ? `Suspender a ${nombre}` : menu.paso === 'denunciada' ? 'Denuncia enviada' : nombre

  return <ModalPage title={nombre} onClose={onClose} closeLabel={volver}>
    <div className="space-y-section">
      <div>
        <div className="-mb-4 flex justify-end"><IconButton icon="more" label={`Más acciones con ${nombre}`} variant="ghost" aria-haspopup="dialog" onClick={() => { setError(null); setMenu({ open: true, paso: 'menu' }) }} /></div>
        <PerfilDeportivo key={`${persona.sigo}-${persona.meSigue}`} persona={persona} comunidad={comunidad} relacion={textoRelacion(persona)} acciones={relacion} />
      </div>
      {error && !menu.open && <ErrorState>{error}</ErrorState>}
      {(comunidad || persona.sigo === 'aceptado') && <section aria-label="Publicaciones" className="space-y-3">
        <h2 className="text-rotulo text-fg-muted">Publicaciones</h2>
        <ListaFeed version={`${persona.alias}-${persona.sigo}-${comunidad}`} conAutor={false} onError={setError} comunidad={comunidad}
          cargar={async antes => (await cargarSocial()).publicacionesDe(persona.alias, antes, comunidad)} vacio={<EmptyState>Aún no ha publicado nada para esta audiencia.</EmptyState>} />
      </section>}
    </div>
    <Sheet open={menu.open} onClose={cerrarMenu} title={tituloMenu}>
      <div className="space-y-stack">
        {contenidoMenu()}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  </ModalPage>
}
