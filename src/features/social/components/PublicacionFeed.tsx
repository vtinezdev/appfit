import { useEffect, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import FormDenuncia from './FormDenuncia'
import { haceCuanto } from '../../cuenta/lib/estado'
import Icon from '../../../shared/components/Icon'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { formatInt } from '../../../shared/lib/format'
import type { PublicacionFeed as Publicacion, VistaComentario } from '../lib/feed'
import { etiquetaPublicacion } from '../lib/presentacion'
import type { ResumenLogro } from '../lib/publicacion'
import { REACCION, textoComentarios, textoReacciones } from '../lib/reaccion'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import { borrarPublicacion } from '../data/publicacionesRepo'
import AnimosPublicacion from './AnimosPublicacion'
import AvatarPersona from './AvatarPersona'
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
  /** Avatar del autor, si se puede ver. */
  logro?: ResumenLogro
  /** Último comentario (vista previa), si el servidor la ofrece. */
  ultimoComentario?: VistaComentario
}

/** Una publicación del feed: quién, la tarjeta, el ánimo (al momento, se deshace si falla) y los comentarios. */
export default function PublicacionFeed({ publicacion: p, onAbrirPersona, onComentarios, onError, conAutor = true, onBorrada, onSilenciada, puedoModerar = false, logro, ultimoComentario }: Props) {
  const [reaccion, setReaccion] = useState({ mia: p.reaccione, total: p.reacciones })
  useEffect(() => setReaccion({ mia: p.reaccione, total: p.reacciones }), [p.reaccione, p.reacciones])
  const [ocupado, setOcupado] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const [denunciar, setDenunciar] = useState(false)
  const [denunciada, setDenunciada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  // Sube al dar ánimo (no al cargar): reinicia el pulso de la llama.
  const [pulso, setPulso] = useState(0)

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
    if (mia) setPulso(n => n + 1)
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

  const etiqueta = etiquetaPublicacion(p.resumen, p.fecha, p.creada)
  const hora = <time dateTime={p.creada} title={new Intl.DateTimeFormat('es', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(p.creada))}>{haceCuanto(Date.parse(p.creada), Date.now())}</time>
  const contexto = <span className="block break-words text-caption text-fg-muted first-letter:uppercase">{etiqueta && `${etiqueta} · `}{hora}</span>
  const nombre = p.mia ? 'Tú' : nombreVisible(p)
  const identidad = <span className="flex min-w-0 items-center gap-3">
    <AvatarPersona persona={p} logro={logro} />
    <span className="min-w-0"><span className="block break-words text-body font-semibold text-fg">{nombre}</span>{contexto}</span>
  </span>
  // Con el texto ampliado, «…» baja a su propia línea en lugar de estrechar el nombre.
  const cabecera = <div className="flex flex-wrap items-center justify-between gap-x-2">
    <div className="min-w-0 flex-1 basis-48">
      {!conAutor ? contexto
        : onAbrirPersona && !p.mia ? <button type="button" className="app-button -my-1 min-h-touch min-w-0 max-w-full rounded-md text-left" onClick={() => onAbrirPersona({ alias: p.alias, nombre: p.nombre })}>{identidad}</button>
          : identidad}
    </div>
    <IconButton icon="more" label="Más acciones" variant="ghost" className="ml-auto" onClick={() => { setError(null); setAcciones(true) }} />
  </div>

  const botones = <>
    {p.mia ? (
      <p className="flex min-h-touch items-center gap-2 px-2 text-body-sm font-semibold tabular-nums text-fg">
        <Icon name="llama" size={22} className="text-fg-muted" /><span aria-hidden>{formatInt(reaccion.total)}</span><span className="sr-only">{textoReacciones(reaccion.total)}</span>
      </p>
    ) : (
      <button type="button" aria-pressed={reaccion.mia} aria-label={`${reaccion.mia ? REACCION.quitar : REACCION.dar}. ${textoReacciones(reaccion.total)}`} onClick={() => void alternar()}
        className={`app-button inline-flex min-h-touch min-w-touch items-center gap-2 rounded-md px-2 text-body-sm font-semibold tabular-nums hover:bg-surface-muted ${reaccion.mia ? 'text-accent-strong' : 'text-fg'}`}>
        <Icon key={pulso} name="llama" size={22} className={reaccion.mia ? `fill-current ${pulso > 0 ? 'animo-pulso' : ''}` : ''} />{formatInt(reaccion.total)}
      </button>
    )}
    <button type="button" aria-label={`Comentarios. ${textoComentarios(p.comentarios)}`} onClick={() => onComentarios(p)}
      className="app-button inline-flex min-h-touch min-w-touch items-center gap-2 rounded-md px-2 text-body-sm font-semibold tabular-nums text-fg hover:bg-surface-muted">
      <Icon name="comentario" size={22} />{formatInt(p.comentarios)}
    </button>
  </>

  const pie = (p.mia && reaccion.total > 0) || (ultimoComentario && p.comentarios > 0) ? <div className="space-y-1">
    {p.mia && reaccion.total > 0 && <AnimosPublicacion id={p.id} total={reaccion.total} />}
    {ultimoComentario && p.comentarios > 0 && <button type="button" className="app-button block min-h-touch w-full rounded-md py-1 text-left" onClick={() => onComentarios(p)}>
      <span className="line-clamp-2 break-words text-body-sm text-fg"><span className="font-semibold">{nombreVisible(ultimoComentario)}</span> {ultimoComentario.texto}</span>
      <span className="block text-caption text-fg-muted">{p.comentarios === 1 ? 'Ver el comentario' : `Ver los ${formatInt(p.comentarios)} comentarios`}</span>
    </button>}
  </div> : undefined

  return <>
    <TarjetaPublicacion resumen={p.resumen} fecha={p.fecha} creada={p.creada} cabecera={cabecera} acciones={botones} pie={pie} />
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
