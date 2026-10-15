import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { accionSeguir, nombreVisible, TEXTO_ACCION, textoRelacion, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import FormDenuncia from './FormDenuncia'

interface Props {
  open: boolean
  persona: Persona
  onClose: () => void
  /** Algo cambió con esta persona: las listas se vuelven a leer. Con `mensaje`, la hoja se cierra y se avisa. */
  onCambio: (mensaje?: string) => void
  /** Abre sus publicaciones (solo si la sigo): la hoja se cierra antes. */
  onVerPublicaciones: (persona: Persona) => void
  /** La hoja terminó de cerrarse. */
  onExited?: () => void
}

type Paso = 'acciones' | 'bloquear' | 'denunciar' | 'denunciada'

/** Una persona: seguir o dejar de seguir, responder su solicitud, quitarla de seguidores, bloquear y denunciar. */
export default function PersonaSheet({ open, persona: inicial, onClose, onCambio, onVerPublicaciones, onExited }: Props) {
  const [persona, setPersona] = useState(inicial)
  const [paso, setPaso] = useState<Paso>('acciones')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nombre = nombreVisible(persona)

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

  const seguir = () => ejecutar(async () => {
    const social = await cargarSocial()
    const accion = accionSeguir(persona)
    if (accion === 'seguir') cambiar({ sigo: await social.pedirSeguir(persona.alias) })
    else {
      await social.dejarDeSeguir(persona.alias)
      cambiar({ sigo: 'no' })
    }
  })
  const responder = (aceptar: boolean) => ejecutar(async () => {
    await (await cargarSocial()).responderSolicitud(persona.alias, aceptar)
    cambiar({ meSigue: aceptar ? 'aceptado' : 'no' })
  })
  const quitar = () => ejecutar(async () => {
    await (await cargarSocial()).quitarSeguidor(persona.alias)
    cambiar({ meSigue: 'no' })
  })
  const bloquear = () => ejecutar(async () => {
    await (await cargarSocial()).bloquear(persona.alias)
    onCambio(`Has bloqueado a ${nombre}.`)
  })

  function contenido() {
    switch (paso) {
      case 'bloquear':
        return (
          <ConfirmacionDestructiva
            mensaje={`${nombre} y tú dejaréis de seguiros y no podréis encontraros. No se le avisa. Puedes desbloquear desde tu perfil.`}
            confirmar="Sí, bloquear"
            ocupado={ocupado}
            onCancelar={() => setPaso('acciones')}
            onConfirmar={() => void bloquear()}
          />
        )
      case 'denunciar':
        return (
          <FormDenuncia onCancelar={() => setPaso('acciones')}
            onEnviar={async (motivo, detalle) => {
              await (await cargarSocial()).denunciarPerfil(persona.alias, motivo, detalle)
              setPaso('denunciada')
            }} />
        )
      case 'denunciada':
        return (
          <div className="space-y-stack">
            <p role="status" className="text-body-sm text-fg">Gracias. Revisaremos la denuncia.</p>
            <p className="text-body-sm text-fg-muted">Si no quieres saber nada más de {nombre}, también puedes bloquearle.</p>
            <Button variant="destructive" block onClick={() => setPaso('bloquear')}>Bloquear</Button>
            <Button variant="secondary" block onClick={onClose}>Cerrar</Button>
          </div>
        )
      default: {
        const accion = accionSeguir(persona)
        return (
          <div className="space-y-stack">
            {/* El nombre (o, sin nombre, el alias) ya es el título de la hoja. */}
            <p className="break-words text-body-sm text-fg-muted">{[persona.nombre && `@${persona.alias}`, textoRelacion(persona)].filter(Boolean).join(' · ')}</p>
            {persona.meSigue === 'pendiente' && (
              <div className="space-y-2">
                <p className="text-body-sm text-fg-muted">Quiere seguirte: verá lo que publiques.</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => void responder(false)}>Rechazar</Button>
                  <Button variant="primary" className="flex-1" disabled={ocupado} onClick={() => void responder(true)}>Aceptar</Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Button variant={accion === 'seguir' ? 'primary' : 'secondary'} block disabled={ocupado} onClick={() => void seguir()}>{TEXTO_ACCION[accion]}</Button>
              {accion === 'seguir' && <p className="text-caption text-fg-muted">Verás lo que publica cuando te acepte.</p>}
              {persona.sigo === 'aceptado' && <Button variant="secondary" block disabled={ocupado} onClick={() => onVerPublicaciones(persona)}>Ver sus publicaciones</Button>}
              {persona.meSigue === 'aceptado' && <Button variant="secondary" block disabled={ocupado} onClick={() => void quitar()}>Quitar de tus seguidores</Button>}
            </div>
            <div className="flex flex-col items-start gap-1">
              <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => { setError(null); setPaso('denunciar') }}>Denunciar</Button>
              <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => { setError(null); setPaso('bloquear') }}>Bloquear</Button>
            </div>
          </div>
        )
      }
    }
  }

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} title={paso === 'denunciar' ? `Denunciar a ${nombre}` : paso === 'bloquear' ? `Bloquear a ${nombre}` : nombre}>
      <div className="space-y-stack">
        {contenido()}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
