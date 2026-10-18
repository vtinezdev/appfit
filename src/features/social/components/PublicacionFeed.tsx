import { useEffect, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import FormDenuncia from './FormDenuncia'
import { haceCuanto } from '../../cuenta/lib/estado'
import Icon from '../../../shared/components/Icon'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { formatInt } from '../../../shared/lib/format'
import type { PublicacionFeed as Publicacion } from '../lib/feed'
import { REACCION, textoComentarios, textoReacciones } from '../lib/reaccion'
import { cargarSocial } from '../servicio'
import { borrarPublicacion } from '../data/publicacionesRepo'
import AnimosPublicacion from './AnimosPublicacion'
import NombrePersona from './NombrePersona'
import TarjetaPublicacion from './TarjetaPublicacion'

interface Props {
  publicacion: Publicacion
  /** Sin él (en las publicaciones de una persona), el autor no se puede tocar. */
  onAbrirPersona?: (persona: { alias: string; nombre: string | null }) => void
  onComentarios: (publicacion: Publicacion) => void
  onError: (mensaje: string) => void
  /** Falso en las publicaciones de una persona: su nombre ya es el título de la página. */
  conAutor?: boolean
  onBorrada?: () => void
  puedoModerar?: boolean
  onSilenciada?: (alias: string) => void
}

/** Una publicación del feed: quién, la tarjeta, la reacción (al momento, se deshace si falla) y los comentarios. */
export default function PublicacionFeed({ publicacion: p, onAbrirPersona, onComentarios, onError, conAutor = true, onBorrada, onSilenciada, puedoModerar = false }: Props) {
  const [reaccion, setReaccion] = useState({ mia: p.reaccione, total: p.reacciones })
  useEffect(() => setReaccion({ mia: p.reaccione, total: p.reacciones }), [p.reaccione, p.reacciones])
  const [ocupado, setOcupado] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const [denunciar, setDenunciar] = useState(false)
  const [denunciada, setDenunciada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  async function borrar() {
    if (ocupado || (!p.mia && !puedoModerar)) return
    setOcupado(true)
    try { await borrarPublicacion(await cargarSocial(), p.id); onBorrada?.() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido borrar.'); setOcupado(false) }
  }

  async function alternar() {
    if (ocupado) return
    const antes = reaccion
    const mia = !antes.mia
    setReaccion({ mia, total: antes.total + (mia ? 1 : -1) })
    setOcupado(true)
    try {
      const social = await cargarSocial()
      if (mia) await social.reaccionar(p.id)
      else await social.quitarReaccion(p.id)
    } catch (e) {
      setReaccion(antes)
      onError(e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const nombreAutor = !conAutor ? undefined : p.mia
    ? <p className="text-body-sm font-semibold text-fg">Tú</p>
    : onAbrirPersona
      ? <button type="button" className="app-button -my-2 min-h-touch text-left" onClick={() => onAbrirPersona({ alias: p.alias, nombre: p.nombre })}><NombrePersona persona={p} /></button>
      : <NombrePersona persona={p} />

  const autor = <div className="flex items-center justify-between gap-2">
    <div className="min-w-0">{nombreAutor}<time dateTime={p.creada} title={new Intl.DateTimeFormat('es', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(p.creada))} className="block text-caption text-fg-muted">{haceCuanto(Date.parse(p.creada), Date.now())}</time></div>
    <IconButton icon="more" label="Más acciones" variant="ghost" onClick={() => { setError(null); setAcciones(true) }} />
  </div>
  const pie = (
    <div className="space-y-2 border-t border-line pt-3">{p.mia && reaccion.total > 0 && <AnimosPublicacion id={p.id} total={reaccion.total} />}<div className="flex flex-wrap items-center gap-2">
      {p.mia ? (
        <p className="flex min-h-touch items-center gap-1 text-body-sm text-fg-muted"><Icon name="llama" size={18} />{textoReacciones(reaccion.total)}</p>
      ) : (
        <Button variant={reaccion.mia ? 'secondary' : 'subtle'} size="sm" aria-pressed={reaccion.mia}
          aria-label={`${reaccion.mia ? REACCION.quitar : REACCION.dar}. ${textoReacciones(reaccion.total)}`} onClick={() => void alternar()}>
          <Icon name="llama" size={18} className={reaccion.mia ? 'text-accent-strong' : ''} />{`${reaccion.mia ? REACCION.activo : REACCION.visible} · ${formatInt(reaccion.total)}`}
        </Button>
      )}
      <Button variant="subtle" size="sm" aria-label={`Comentarios. ${textoComentarios(p.comentarios)}`} onClick={() => onComentarios(p)}>
        <Icon name="comentario" size={18} />{formatInt(p.comentarios)}
      </Button>

    </div>

    </div>
  )

  return <>
    <TarjetaPublicacion resumen={p.resumen} fecha={p.fecha} creada={p.creada} autor={autor} pie={pie} />
    <Sheet open={acciones} onClose={() => setAcciones(false)} title={confirmar ? 'Borrar publicación' : denunciar ? 'Denunciar publicación' : 'Más acciones'}>
      <div className="space-y-stack">
        {confirmar ? <ConfirmacionDestructiva mensaje="Se borrarán esta publicación, sus reacciones y comentarios. No se puede deshacer." confirmar="Borrar publicación" ocupado={ocupado} onCancelar={() => setConfirmar(false)} onConfirmar={() => void borrar()} />
          : denunciar ? <FormDenuncia onCancelar={() => setDenunciar(false)} onEnviar={async (motivo, detalle) => {
            await (await cargarSocial()).denunciarPublicacion(p.id, motivo, detalle)
            setDenunciar(false); setDenunciada(true)
          }} /> : denunciada ? <p role="status" className="text-body-sm text-fg">Gracias. Revisaremos la denuncia.</p>
          : p.mia ? <Button variant="destructive" block onClick={() => setConfirmar(true)}>Borrar publicación</Button>
          : <>{puedoModerar && <Button variant="destructive" block onClick={() => setConfirmar(true)}>Retirar de la comunidad</Button>}<Button variant="secondary" block onClick={() => setDenunciar(true)}>Denunciar publicación</Button>
            <Button variant="secondary" block loading={ocupado} onClick={async () => {
              setOcupado(true)
              try { await (await cargarSocial()).silenciar(p.alias, true); setAcciones(false); onSilenciada?.(p.alias) }
              catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido silenciar.') }
              finally { setOcupado(false) }
            }}>Silenciar a @{p.alias}</Button><p className="text-caption text-fg-muted">Sus publicaciones dejarán de aparecer en Siguiendo. Puedes deshacerlo desde Tu perfil.</p></>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  </>
}
