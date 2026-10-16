import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { formatInt } from '../../../shared/lib/format'
import type { PublicacionFeed as Publicacion } from '../lib/feed'
import { REACCION, textoComentarios, textoReacciones } from '../lib/reaccion'
import { cargarSocial } from '../servicio'
import { borrarPublicacion } from '../data/publicacionesRepo'
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
}

/** Una publicación del feed: quién, la tarjeta, la reacción (al momento, se deshace si falla) y los comentarios. */
export default function PublicacionFeed({ publicacion: p, onAbrirPersona, onComentarios, onError, conAutor = true, onBorrada }: Props) {
  const [reaccion, setReaccion] = useState({ mia: p.reaccione, total: p.reacciones })
  const [ocupado, setOcupado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  async function borrar() {
    if (ocupado || !p.mia) return
    setOcupado(true)
    try { await borrarPublicacion(await cargarSocial(), p.id); onBorrada?.() }
    catch (e) { onError(e instanceof Error ? e.message : 'No se ha podido borrar.'); setOcupado(false) }
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

  const autor = !conAutor ? undefined : p.mia
    ? <p className="text-body-sm font-semibold text-fg">Tú</p>
    : onAbrirPersona
      ? <button type="button" className="app-button -my-2 min-h-touch text-left" onClick={() => onAbrirPersona({ alias: p.alias, nombre: p.nombre })}><NombrePersona persona={p} /></button>
      : <NombrePersona persona={p} />

  const pie = (
    <div className="space-y-2 border-t border-line pt-3"><div className="flex flex-wrap items-center gap-2">
      {p.mia ? (
        <p className="flex min-h-touch items-center gap-1 text-body-sm text-fg-muted"><Icon name="llama" size={18} />{textoReacciones(reaccion.total)}</p>
      ) : (
        <Button variant={reaccion.mia ? 'secondary' : 'subtle'} size="sm" aria-pressed={reaccion.mia}
          aria-label={`${reaccion.mia ? REACCION.quitar : REACCION.dar}. ${textoReacciones(reaccion.total)}`} onClick={() => void alternar()}>
          <Icon name="llama" size={18} className={reaccion.mia ? 'text-accent-strong' : ''} />{formatInt(reaccion.total)}
        </Button>
      )}
      <Button variant="subtle" size="sm" aria-label={`Comentarios. ${textoComentarios(p.comentarios)}`} onClick={() => onComentarios(p)}>
        <Icon name="comentario" size={18} />{formatInt(p.comentarios)}
      </Button>
      {p.mia && !confirmar && <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setConfirmar(true)}>Borrar publicación</Button>}
    </div>
    {confirmar && <div className="publicacion-confirmacion"><ConfirmacionDestructiva mensaje="Se borrarán esta publicación, sus reacciones y comentarios. No se puede deshacer." confirmar="Borrar publicación" ocupado={ocupado} onCancelar={() => setConfirmar(false)} onConfirmar={() => void borrar()} /></div>}
    </div>
  )

  return <TarjetaPublicacion resumen={p.resumen} fecha={p.fecha} autor={autor} pie={pie} />
}
