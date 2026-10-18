import { useEffect, useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { haceCuanto } from '../../cuenta/lib/estado'
import { COMENTARIO_MAX, validarComentario, type Comentario, type CursorSocial } from '../lib/feed'
import { cargarSocial } from '../servicio'
import FormDenuncia from './FormDenuncia'
import NombrePersona from './NombrePersona'

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
export default function ComentariosSheet({ open, publicacion, onClose, onRecuento, onExited }: Props) {
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
      <div className="space-y-section">
        <p className="break-words text-body-sm text-fg-muted">{publicacion.titulo}</p>
        {hayMas && <Button variant="secondary" block loading={leyendo} onClick={() => void anteriores()}>Ver comentarios anteriores</Button>}
        {lista === null ? (error ? null : <LoadingState />) : lista.length === 0 ? (
          <EmptyState>Aún no hay comentarios. Escribe el primero.</EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {lista.map((c) => (
              <li key={c.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <NombrePersona persona={c} />
                  <span className="text-caption text-fg-muted">{haceCuanto(c.creado, Date.now())}</span>
                </div>
                {c.respuestaAlias && <p className="text-caption text-fg-muted">Respuesta a @{c.respuestaAlias}</p>}
                <p className="whitespace-pre-wrap break-words text-body-sm text-fg">{c.texto}</p>
                <div className="flex flex-wrap gap-1">
                  {!c.respuestaA && <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setRespuesta(c)}>Responder a @{c.alias}</Button>}
                  {c.puedoBorrar && (
                    <Button variant="subtle" size="sm" disabled={ocupado}
                      onClick={() => (c.mio ? void borrar(c) : setModo({ modo: 'borrar', comentario: c }))}>Borrar</Button>
                  )}
                  {!c.mio && <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setModo({ modo: 'denunciar', tipo: 'comentario', id: c.id })}>Denunciar</Button>}
                </div>
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
        <form className="space-y-stack" onSubmit={enviar} noValidate aria-label="Escribir un comentario">
          {respuesta && <div className="space-y-1"><p role="status" className="text-body-sm text-fg-muted">Respondiendo a @{respuesta.alias}</p><Button variant="subtle" size="sm" onClick={() => setRespuesta(null)}>Cancelar respuesta</Button></div>}
          <Campo etiqueta="Tu comentario" ayuda={`Como mucho ${COMENTARIO_MAX} caracteres. Lo verán quienes puedan ver esta publicación.`}>
            <Textarea rows={2} maxLength={COMENTARIO_MAX} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Campo>
          <Button type="submit" variant="primary" block loading={ocupado} disabled={leyendo}>Enviar</Button>
        </form>
        {!publicacion.mia && (
          <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => setModo({ modo: 'denunciar', tipo: 'publicacion', id: publicacion.id })}>Denunciar la publicación</Button>
        )}
      </div>
    )
  }

  const titulos: Record<Modo['modo'], string> = {
    lista: 'Comentarios', denunciar: 'Denunciar', denunciada: 'Denuncia enviada', borrar: 'Borrar comentario',
  }

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} title={titulos[modo.modo]}>
      <div className="space-y-stack">
        {contenido()}
        {error && modo.modo !== 'denunciar' && <div className="space-y-stack"><ErrorState>{error}</ErrorState>
          {errorCarga && <Button variant="secondary" onClick={lista === null ? releer : () => void anteriores()}>Reintentar</Button>}
        </div>}
      </div>
    </Sheet>
  )
}
