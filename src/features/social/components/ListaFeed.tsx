import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { type CursorSocial, type PaginaSocial, type PublicacionFeed as Publicacion } from '../lib/feed'
import ComentariosSheet, { type PublicacionComentada } from './ComentariosSheet'
import PublicacionFeed from './PublicacionFeed'

interface Props {
  /** Cursor compuesto sobre las filas del servidor, incluidas las que el lector descarta. */
  cargar: (antes: CursorSocial | null) => Promise<PaginaSocial<Publicacion>>
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
  ocultarSilenciadas?: boolean
  puedoModerar?: boolean
}

interface Estado {
  items: Publicacion[]
  /** No hay más páginas. */
  cursor: CursorSocial | null
  descartadas: number
  fin: boolean
  cargando: boolean
  error: string | null
}

/** Publicaciones paginadas («Cargar más») con sus comentarios en una hoja. El feed y las de una persona. */
export default function ListaFeed({ cargar, version, vacio, onAbrirPersona, onError, comentariosDe, conAutor = true, ocultarSilenciadas = false, puedoModerar = false }: Props) {
  const [estado, setEstado] = useState<Estado>({ items: [], cursor: null, descartadas: 0, fin: false, cargando: true, error: null })
  // La hoja sigue montada al cerrarse para animar la salida; `n` la vuelve a montar limpia.
  const [hoja, setHoja] = useState<{ publicacion: PublicacionComentada; open: boolean; n: number } | null>(null)

  const generacion = useRef(0)
  const contenedor = useRef<HTMLDivElement>(null)
  const itemsActuales = useRef(estado.items)
  itemsActuales.current = estado.items
  const [nuevas, setNuevas] = useState<PaginaSocial<Publicacion> | null>(null)
  const [errorAlActualizar, setErrorAlActualizar] = useState(false)
  const [comprobando, setComprobando] = useState(false)
  const ultimaComprobacion = useRef(Date.now())
  const comprobacion = useRef(false)
  const comprobar = useCallback(async () => {
    if (comprobacion.current) return
    const actual = generacion.current
    comprobacion.current = true
    setComprobando(true)
    ultimaComprobacion.current = Date.now()
    try {
      let pagina = await cargar(null)
      let descartadas = pagina.descartadas
      while(pagina.items.length === 0 && pagina.hayMas && pagina.cursor) {
        if(actual !== generacion.current) return
        const anterior=pagina.cursor
        pagina=await cargar(anterior)
        if(pagina.hayMas && pagina.cursor?.fecha===anterior.fecha && pagina.cursor?.id===anterior.id) throw new Error('No se ha podido continuar la lista. Inténtalo de nuevo.')
        descartadas+=pagina.descartadas
      }
      pagina={...pagina,descartadas}
      if (actual !== generacion.current) return
      setNuevas(pagina)
      setEstado(e => ({ ...e, error: null, descartadas: Math.max(e.descartadas, pagina.descartadas), items: e.items.map(p => pagina.items.find(v => v.id === p.id) ?? p) }))
    } catch (e) {
      if (actual === generacion.current) {
        setErrorAlActualizar(true)
        setEstado(v => ({ ...v, error: e instanceof Error ? e.message : 'No se ha podido actualizar.' }))
      }
    } finally { comprobacion.current = false; setComprobando(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
  useEffect(() => {
    const volver = () => { if (document.visibilityState === 'visible' && Date.now() - ultimaComprobacion.current >= 60_000) void comprobar() }
    document.addEventListener('visibilitychange', volver)
    return () => document.removeEventListener('visibilitychange', volver)
  }, [comprobar])
  function incorporar() {
    if (!nuevas) return
    const ancla = contenedor.current?.querySelector('li')
    const antes = ancla?.getBoundingClientRect().top
    const nuevosIds = new Set(nuevas.items.map(p => p.id))
    const solapada = nuevas.items.some(p => itemsActuales.current.some(v => v.id === p.id))
    setEstado(e => ({ ...e, items: [...nuevas.items, ...(solapada ? e.items.filter(p => !nuevosIds.has(p.id)) : [])],
      ...(solapada ? {} : { cursor: nuevas.cursor, fin: !nuevas.hayMas }), error: null }))
    setNuevas(null)
    requestAnimationFrame(() => { if (ancla?.isConnected && antes !== undefined) contenedor.current?.closest('main')?.scrollBy(0, ancla.getBoundingClientRect().top - antes) })
  }
  const pagina = useCallback(async (antes: CursorSocial | null, reemplazar: boolean) => {
    const actual = generacion.current
    setErrorAlActualizar(false)
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    try {
      let nuevas = await cargar(antes)
      let descartadas = nuevas.descartadas
      // Una página ilegible no equivale a un feed vacío. Avanza sin perder el cursor crudo.
      while (nuevas.items.length === 0 && nuevas.hayMas && nuevas.cursor) {
        if (actual !== generacion.current) return
        const cursorAnterior = nuevas.cursor
        nuevas = await cargar(cursorAnterior)
        if (nuevas.hayMas && nuevas.cursor?.fecha === cursorAnterior.fecha && nuevas.cursor.id === cursorAnterior.id) {
          throw new Error('No se ha podido continuar la lista. Inténtalo de nuevo.')
        }
        descartadas += nuevas.descartadas
      }
      if (actual !== generacion.current) return
      setEstado((e) => ({
        items: reemplazar ? nuevas.items : [...e.items, ...nuevas.items.filter(p => !e.items.some(v => v.id === p.id))],
        cursor: nuevas.cursor, descartadas: (reemplazar ? 0 : e.descartadas) + descartadas,
        fin: !nuevas.hayMas, cargando: false, error: null,
      }))
    } catch (err) {
      if (actual !== generacion.current) return
      setEstado((e) => ({ ...e, cargando: false, error: err instanceof Error ? err.message : 'No se ha podido cargar.' }))
    }
    // `cargar` cambia en cada render del padre; lo que decide cuándo leer es `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  useEffect(() => {
    generacion.current += 1
    setNuevas(null)
    setEstado({ items: [], cursor: null, descartadas: 0, fin: false, cargando: true, error: null })
    void pagina(null, true)
    return () => { generacion.current += 1 }
  }, [pagina])

  const abrirComentarios = useCallback((publicacion: PublicacionComentada) => {
    setHoja((h) => ({ publicacion, open: true, n: (h?.n ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    if (comentariosDe) abrirComentarios(comentariosDe)
  }, [comentariosDe, abrirComentarios])

  const recuento = (id: string, n: number) => setEstado((e) => ({ ...e, items: e.items.map((p) => (p.id === id && p.comentarios !== n ? { ...p, comentarios: n } : p)) }))

  const { items, cursor, descartadas, fin, cargando, error } = estado
  return (
    <div ref={contenedor} className="space-y-stack">
      <Button variant="subtle" size="sm" loading={comprobando} disabled={cargando} onClick={() => void comprobar()}>Actualizar</Button>
      {nuevas && <Button variant="secondary" block onClick={incorporar}>{nuevas.items.filter(p => !items.some(v => v.id === p.id)).length > 0 ? `${nuevas.items.filter(p => !items.some(v => v.id === p.id)).length} publicaciones nuevas` : 'Lista actualizada'}</Button>}
      {items.length === 0 && cargando ? <LoadingState /> : items.length === 0 && !error ? vacio : (
        <ul className="space-y-stack" aria-label="Publicaciones">
          {items.map((p) => (
            <li key={p.id}>
              <PublicacionFeed puedoModerar={puedoModerar} publicacion={p} onAbrirPersona={onAbrirPersona} onError={onError} conAutor={conAutor}
                onSilenciada={ocultarSilenciadas ? alias => setEstado(e => ({ ...e, items: e.items.filter(p => p.alias !== alias) })) : undefined}
                onBorrada={() => setEstado(e => ({ ...e, items: e.items.filter(item => item.id !== p.id) }))}
                onComentarios={(pub) => abrirComentarios({ id: pub.id, titulo: pub.resumen.titulo, mia: pub.mia })} />
            </li>
          ))}
        </ul>
      )}
      {descartadas > 0 && <p role="status" className="text-body-sm text-fg-muted">Algunas publicaciones necesitan una versión más reciente de AppFit.</p>}
      {error && (
        <div className="space-y-3">
          <ErrorState>{error}</ErrorState>
          <Button variant="secondary" size="sm" onClick={() => void (errorAlActualizar ? comprobar() : pagina(cursor, cursor === null))}>Reintentar</Button>
        </div>
      )}
      {items.length > 0 && !fin && !error && (
        <Button variant="secondary" block loading={cargando} onClick={() => void pagina(cursor, false)}>Cargar más</Button>
      )}
      {hoja && (
        <ComentariosSheet key={`comentarios-${hoja.n}`} open={hoja.open} publicacion={hoja.publicacion}
          onClose={() => setHoja((h) => (h ? { ...h, open: false } : h))}
          onRecuento={(n) => recuento(hoja.publicacion.id, n)} />
      )}
    </div>
  )
}
