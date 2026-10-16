import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { POR_PAGINA, type PublicacionFeed as Publicacion } from '../lib/feed'
import ComentariosSheet, { type PublicacionComentada } from './ComentariosSheet'
import PublicacionFeed from './PublicacionFeed'

interface Props {
  /** Una página: `antes` es la `creada` de la última publicación vista (null, la primera). */
  cargar: (antes: string | null) => Promise<Publicacion[]>
  /** Al cambiar, se vuelve a leer desde el principio. */
  version: unknown
  /** Lo que se ve si no hay ninguna. */
  vacio: ReactNode
  onAbrirPersona?: (persona: { alias: string; nombre: string | null }) => void
  onError: (mensaje: string) => void
  /** Abre los comentarios de una publicación desde fuera (un aviso). */
  comentariosDe?: PublicacionComentada | null
  /** Falso si todas son de la misma persona (ya se dice arriba). */
  conAutor?: boolean
}

interface Estado {
  items: Publicacion[]
  /** No hay más páginas. */
  fin: boolean
  cargando: boolean
  error: string | null
}

/** Publicaciones paginadas («Cargar más») con sus comentarios en una hoja. El feed y las de una persona. */
export default function ListaFeed({ cargar, version, vacio, onAbrirPersona, onError, comentariosDe, conAutor = true }: Props) {
  const [estado, setEstado] = useState<Estado>({ items: [], fin: false, cargando: true, error: null })
  // La hoja sigue montada al cerrarse para animar la salida; `n` la vuelve a montar limpia.
  const [hoja, setHoja] = useState<{ publicacion: PublicacionComentada; open: boolean; n: number } | null>(null)

  const pagina = useCallback(async (antes: string | null, reemplazar: boolean) => {
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    try {
      const nuevas = await cargar(antes)
      setEstado((e) => ({ items: reemplazar ? nuevas : [...e.items, ...nuevas], fin: nuevas.length < POR_PAGINA, cargando: false, error: null }))
    } catch (err) {
      setEstado((e) => ({ ...e, cargando: false, error: err instanceof Error ? err.message : 'No se ha podido cargar.' }))
    }
    // `cargar` cambia en cada render del padre; lo que decide cuándo leer es `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  useEffect(() => { void pagina(null, true) }, [pagina])

  const abrirComentarios = useCallback((publicacion: PublicacionComentada) => {
    setHoja((h) => ({ publicacion, open: true, n: (h?.n ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    if (comentariosDe) abrirComentarios(comentariosDe)
  }, [comentariosDe, abrirComentarios])

  const recuento = (id: string, n: number) => setEstado((e) => ({ ...e, items: e.items.map((p) => (p.id === id && p.comentarios !== n ? { ...p, comentarios: n } : p)) }))

  const { items, fin, cargando, error } = estado
  return (
    <div className="space-y-stack">
      {items.length === 0 && cargando ? <LoadingState /> : items.length === 0 && !error ? vacio : (
        <ul className="space-y-stack" aria-label="Publicaciones">
          {items.map((p) => (
            <li key={p.id}>
              <PublicacionFeed publicacion={p} onAbrirPersona={onAbrirPersona} onError={onError} conAutor={conAutor}
                onBorrada={() => setEstado(e => ({ ...e, items: e.items.filter(item => item.id !== p.id) }))}
                onComentarios={(pub) => abrirComentarios({ id: pub.id, titulo: pub.resumen.titulo, mia: pub.mia })} />
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div className="space-y-3">
          <ErrorState>{error}</ErrorState>
          <Button variant="secondary" size="sm" onClick={() => void pagina(items.at(-1)?.creada ?? null, items.length === 0)}>Reintentar</Button>
        </div>
      )}
      {items.length > 0 && !fin && !error && (
        <Button variant="secondary" block loading={cargando} onClick={() => void pagina(items.at(-1)!.creada, false)}>Cargar más</Button>
      )}
      {hoja && (
        <ComentariosSheet key={`comentarios-${hoja.n}`} open={hoja.open} publicacion={hoja.publicacion}
          onClose={() => setHoja((h) => (h ? { ...h, open: false } : h))}
          onRecuento={(n) => recuento(hoja.publicacion.id, n)} />
      )}
    </div>
  )
}
