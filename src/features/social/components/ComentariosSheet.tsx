import { useEffect, useId, useState, type FormEvent } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { haceCuanto } from '../../cuenta/lib/estado'
import { useAvatares } from '../hooks/useAvatares'
import { COMENTARIO_MAX, validarComentario, type Comentario, type CursorSocial } from '../lib/feed'
import { hilosComentarios } from '../lib/presentacion'
import type { ResumenLogro } from '../lib/publicacion'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'
import FormDenuncia from './FormDenuncia'

export interface PublicacionComentada {
  id: string
  titulo: string
  /** Si es mía: no la puedo denunciar. */
  mia: boolean
}

interface Props {
  open: boolean
  publicacion: PublicacionComentada
  onClose: () => void
  /** Cuántos comentarios hay ahora (para el recuento del feed). */
  onRecuento: (n: number) => void
  onExited?: () => void
  /** Comunidad de la publicación: los avatares se piden en su contexto. */
  comunidad?: string
}

type Modo =
  | { modo: 'lista' }
  | { modo: 'denunciar'; tipo: 'publicacion' | 'comentario'; id: string }
  | { modo: 'denunciada' }
  | { modo: 'borrar'; comentario: Comentario }

/**
 * Los comentarios de una publicación: leer, escribir, borrar (los míos, al momento y con «Deshacer»; los de otras
 * personas en lo mío, con confirmación) y denunciar un comentario o la publicación.
 */
export default function ComentariosSheet({ open, publicacion, onClose, onRecuento, onExited, comunidad }: Props) {
  const idCampo = useId()
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [cursor, setCursor] = useState<CursorSocial | null>(null)
  const [hayMas, setHayMas] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [modo, setModo] = useState<Modo>({ modo: 'lista' })
  const [respuesta, setRespuesta] = useState<Comentario | null>(null)
  const [texto, setTexto] = useState('')
  const [borrado, setBorrado] = useState<Comentario | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [errorCarga, setErrorCarga] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vuelta, setVuelta] = useState(0)
  const logros = useAvatares((lista ?? []).map(c => c.alias), comunidad)
  // Responder lleva al campo del pie, que ya dice a quién se responde.
  useEffect(() => { if (respuesta) document.getElementById(idCampo)?.focus() }, [respuesta, idCampo])

  useEffect(() => {
    let vivo = true
    setError(null)
    cargarSocial().then((s) => s.comentarios(publicacion.id)).then(
      (pagina) => { if (vivo) { setLista([...pagina.items].reverse()); setCursor(pagina.cursor); setHayMas(pagina.hayMas); onRecuento(pagina.total) } },
      (e: unknown) => { if (vivo) { setErrorCarga(true); setError(e instanceof Error ? e.message : 'No se han podido cargar los comentarios.') } },
    )
    return () => { vivo = false }
    // `onRecuento` cambia en cada render del padre; lo que decide cuándo leer es la publicación y `vuelta`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicacion.id, vuelta])

  async function anteriores() {
    if (leyendo || ocupado) return
    setLeyendo(true)
    setError(null)
    setErrorCarga(false)
    try {
      const pagina = await (await cargarSocial()).comentarios(publicacion.id, cursor)
      setLista(cs => [...pagina.items.reverse().filter(c => !cs?.some(v => v.id === c.id)), ...(cs ?? [])])
      setCursor(pagina.cursor)
      setHayMas(pagina.hayMas)
      onRecuento(pagina.total)
    } catch (e) {
      setErrorCarga(true)
      setError(e instanceof Error ? e.message : 'No se han podido cargar los comentarios.')
    } finally { setLeyendo(false) }
  }

  async function ejecutar(fn: () => Promise<void>) {
    if (ocupado || leyendo) return
    setOcupado(true)
    setError(null)
    setErrorCarga(false)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const releer = () => setVuelta((v) => v + 1)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const invalido = validarComentario(texto)
    if (invalido) {
      setError(invalido)
      return
    }
    void ejecutar(async () => {
      await (await cargarSocial()).comentar(publicacion.id, texto.trim(), respuesta?.id)
      setTexto('')
      setRespuesta(null)
      setBorrado(null)
      releer()
    })
  }

  const borrar = (c: Comentario) => ejecutar(async () => {
    await (await cargarSocial()).borrarComentario(c.id)
    setBorrado(c.mio ? c : null)
    setModo({ modo: 'lista' })
    releer()
  })

  // Deshacer vuelve a publicar el mismo texto (como comentario nuevo: con la hora de ahora).
  const deshacer = (c: Comentario) => ejecutar(async () => {
    await (await cargarSocial()).comentar(publicacion.id, c.texto)
    setBorrado(null)
    releer()
  })

  const pedirBorrar = (c: Comentario) => { if (c.mio) void borrar(c); else setModo({ modo: 'borrar', comentario: c }) }

  function contenido() {
    if (modo.modo === 'denunciar') {
      return (
        <FormDenuncia onCancelar={() => setModo({ modo: 'lista' })}
          onEnviar={async (motivo, detalle) => {
            const social = await cargarSocial()
            if (modo.tipo === 'publicacion') await social.denunciarPublicacion(modo.id, motivo, detalle)
            else await social.denunciarComentario(modo.id, motivo, detalle)
            setModo({ modo: 'denunciada' })
          }} />
      )
    }
    if (modo.modo === 'denunciada') {
      return (
        <div className="space-y-stack">
          <p role="status" className="text-body-sm text-fg">Gracias. Revisaremos la denuncia.</p>
          <p className="text-body-sm text-fg-muted">Si no quieres saber nada más de esa persona, puedes bloquearla desde su perfil en Amigos.</p>
          <Button variant="secondary" block onClick={() => setModo({ modo: 'lista' })}>Volver a los comentarios</Button>
        </div>
      )
    }
    if (modo.modo === 'borrar') {
      return (
        <ConfirmacionDestructiva
          mensaje={`Se borra el comentario de @${modo.comentario.alias} en tu publicación. No se puede deshacer.`}
          confirmar="Sí, borrar el comentario"
          ocupado={ocupado}
          onCancelar={() => setModo({ modo: 'lista' })}
          onConfirmar={() => void borrar(modo.comentario)}
        />
      )
    }
    return (
      <div className="space-y-stack">
        <p className="break-words text-body-sm text-fg-muted">{publicacion.titulo}</p>
        {hayMas && <Button variant="secondary" block loading={leyendo} onClick={() => void anteriores()}>Ver comentarios anteriores</Button>}
        {lista === null ? (error ? null : <LoadingState />) : lista.length === 0 ? (
          <EmptyState>Aún no hay comentarios. Escribe el primero.</EmptyState>
        ) : (
          <ul className="space-y-4" aria-label="Comentarios">
            {hilosComentarios(lista).map(({ raiz, respuestas, suelta }) => (
              <li key={raiz.id} className="space-y-3">
                <FilaComentario c={raiz} logro={logros[raiz.alias]} suelta={suelta} ocupado={ocupado} onResponder={setRespuesta}
                  onBorrar={pedirBorrar} onDenunciar={c => setModo({ modo: 'denunciar', tipo: 'comentario', id: c.id })} />
                {respuestas.length > 0 && <ul className="space-y-3 border-l-2 border-line pl-3" aria-label={`Respuestas a ${nombreVisible(raiz)}`}>
                  {respuestas.map(c => <li key={c.id}><FilaComentario c={c} logro={logros[c.alias]} ocupado={ocupado}
                    onBorrar={pedirBorrar} onDenunciar={v => setModo({ modo: 'denunciar', tipo: 'comentario', id: v.id })} /></li>)}
                </ul>}
              </li>
            ))}
          </ul>
        )}
        {borrado && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-fg-muted">
            Comentario borrado
            <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => void deshacer(borrado)}>Deshacer</Button>
          </div>
        )}
        <p className="text-caption text-fg-muted">Lo verán quienes puedan ver esta publicación.</p>
        {!publicacion.mia && (
          <Button variant="ghost" size="sm" className="-ml-3" disabled={ocupado} onClick={() => setModo({ modo: 'denunciar', tipo: 'publicacion', id: publicacion.id })}>Denunciar la publicación</Button>
        )}
      </div>
    )
  }

  // El campo vive en el pie de la hoja: siempre a mano aunque haya muchos comentarios.
  const formulario = modo.modo === 'lista' && <form className="space-y-2" onSubmit={enviar} noValidate aria-label="Escribir un comentario">
    {error && !errorCarga && <ErrorState>{error}</ErrorState>}
    {respuesta && <div className="flex flex-wrap items-center justify-between gap-x-2">
      <p role="status" className="min-w-0 break-words text-body-sm text-fg-muted">Respondiendo a @{respuesta.alias}</p>
      <Button variant="subtle" size="sm" className="-mr-3" onClick={() => setRespuesta(null)}>Cancelar respuesta</Button>
    </div>}
    <div className="flex items-end gap-2">
      <label htmlFor={idCampo} className="sr-only">Tu comentario (como mucho {COMENTARIO_MAX} caracteres)</label>
      <Textarea id={idCampo} rows={1} maxLength={COMENTARIO_MAX} placeholder={respuesta ? `Responde a @${respuesta.alias}` : 'Escribe un comentario'} className="comentario-campo min-w-0 flex-1" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <IconButton type="submit" icon={ocupado ? 'loader' : 'enviar'} label="Enviar comentario" variant="primary" disabled={ocupado || leyendo} aria-busy={ocupado || undefined} />
    </div>
  </form>

  const titulos: Record<Modo['modo'], string> = {
    lista: 'Comentarios', denunciar: 'Denunciar', denunciada: 'Denuncia enviada', borrar: 'Borrar comentario',
  }

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} title={titulos[modo.modo]} footer={formulario || undefined}>
      <div className="space-y-stack">
        {contenido()}
        {error && modo.modo !== 'denunciar' && (errorCarga || modo.modo !== 'lista') && <div className="space-y-stack"><ErrorState>{error}</ErrorState>
          {errorCarga && <Button variant="secondary" onClick={lista === null ? releer : () => void anteriores()}>Reintentar</Button>}
        </div>}
      </div>
    </Sheet>
  )
}

interface FilaProps {
  c: Comentario
  logro?: ResumenLogro
  /** Respuesta cuyo original no está a la vista. */
  suelta?: boolean
  ocupado: boolean
  /** Solo los comentarios raíz admiten respuesta (un nivel). */
  onResponder?: (c: Comentario) => void
  onBorrar: (c: Comentario) => void
  onDenunciar: (c: Comentario) => void
}

const ACCION = 'app-button min-h-touch rounded-md px-2 text-caption font-semibold text-fg-muted hover:text-fg disabled:opacity-40'

/** Un comentario: cara, nombre y hora en una línea, el texto y sus acciones en texto (cada una de 44 px de alto). */
function FilaComentario({ c, logro, suelta = false, ocupado, onResponder, onBorrar, onDenunciar }: FilaProps) {
  return <div className="flex items-start gap-3">
    <AvatarPersona persona={c} logro={logro} tamano="sm" />
    <div className="min-w-0 flex-1">
      <p className="break-words text-body-sm"><span className="font-semibold text-fg">{nombreVisible(c)}</span> <span className="text-caption text-fg-muted">· {haceCuanto(c.creado, Date.now())}</span></p>
      {suelta && c.respuestaAlias && <p className="text-caption text-fg-muted">Respuesta a @{c.respuestaAlias}</p>}
      <p className="whitespace-pre-wrap break-words text-body-sm text-fg">{c.texto}</p>
      <div className="-ml-2 flex flex-wrap">
        {onResponder && !c.respuestaA && <button type="button" className={ACCION} aria-label={`Responder a @${c.alias}`} disabled={ocupado} onClick={() => onResponder(c)}>Responder</button>}
        {c.puedoBorrar && <button type="button" className={ACCION} aria-label={`Borrar el comentario de @${c.alias}`} disabled={ocupado} onClick={() => onBorrar(c)}>Borrar</button>}
        {!c.mio && <button type="button" className={ACCION} aria-label={`Denunciar el comentario de @${c.alias}`} disabled={ocupado} onClick={() => onDenunciar(c)}>Denunciar</button>}
      </div>
    </div>
  </div>
}
