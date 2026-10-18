import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { useAvatares } from '../hooks/useAvatares'
import { type CursorSocial, type PaginaSocial, type PublicacionFeed as Publicacion, type VistaComentario } from '../lib/feed'
import { cargarSocial } from '../servicio'
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
  /** Comunidad de la lista: los avatares se piden en su contexto (lo publicado para seguidores no se ve ahí). */
  comunidad?: string
  /** Al cambiar, comprueba si hay novedades (volver a tocar la pestaña activa). */
  comprobarSenal?: number
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
export default function ListaFeed({ cargar, version, vacio, onAbrirPersona, onError, comentariosDe, conAutor = true, ocultarSilenciadas = false, puedoModerar = false, comunidad, comprobarSenal }: Props) {
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
      // Sin publicaciones nuevas no hay nada que anunciar: solo se refrescan recuentos de lo que ya se ve.
      setNuevas(pagina.items.some(p => !itemsActuales.current.some(v => v.id === p.id)) ? pagina : null)
      setEstado(e => ({ ...e, error: null, descartadas: Math.max(e.descartadas, pagina.descartadas), items: e.items.map(p => pagina.items.find(v => v.id === p.id) ?? p) }))
    } catch (e) {
      if (actual === generacion.current) {
        setErrorAlActualizar(true)
        setEstado(v => ({ ...v, error: e instanceof Error ? e.message : 'No se ha podido actualizar.' }))
      }
    } finally { comprobacion.current = false; setComprobando(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
  const primeraSenal = useRef(comprobarSenal)
  useEffect(() => {
    if (comprobarSenal === primeraSenal.current) return
    void comprobar()
    // Solo la señal: `comprobar` cambia con la versión y ya lee de cero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprobarSenal])
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
  const logros = useAvatares(conAutor ? items.map(p => p.alias) : [], comunidad)
  const vistas = useVistasComentarios(items)
  const nNuevas = nuevas ? nuevas.items.filter(p => !items.some(v => v.id === p.id)).length : 0
  return (
    <div ref={contenedor} className="space-y-stack" aria-busy={comprobando || undefined}>
      {nuevas && nNuevas > 0 && <div className="feed-novedades sticky z-10 flex justify-center">
        <button type="button" className="app-button inline-flex min-h-touch items-center gap-2 rounded-pill bg-fg px-4 text-body-sm font-semibold text-bg shadow-float" onClick={incorporar}>
          <Icon name="chevron-up" size={18} />{nNuevas === 1 ? '1 publicación nueva' : `${formatInt(nNuevas)} publicaciones nuevas`}
        </button>
      </div>}
      {items.length === 0 && cargando ? <EsqueletoFeed /> : items.length === 0 && !error ? vacio : (
        <ul className="space-y-stack" aria-label="Publicaciones">
          {items.map((p) => (
            <li key={p.id}>
              <PublicacionFeed puedoModerar={puedoModerar} publicacion={p} onAbrirPersona={onAbrirPersona} onError={onError} conAutor={conAutor}
                logro={logros[p.alias]} ultimoComentario={vistas[p.id]}
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
        <ComentariosSheet key={`comentarios-${hoja.n}`} open={hoja.open} publicacion={hoja.publicacion} comunidad={comunidad}
          onClose={() => setHoja((h) => (h ? { ...h, open: false } : h))}
          onRecuento={(n) => recuento(hoja.publicacion.id, n)} />
      )}
    </div>
  )
}

/** Carga con la forma de la tarjeta (sin pulso con Reduce Motion: `.loading-skeleton`). */
function EsqueletoFeed() {
  return <div role="status" className="space-y-stack">
    <span className="sr-only">Cargando publicaciones…</span>
    {[0, 1].map(i => <Card key={i} aria-hidden className="loading-skeleton space-y-3">
      <div className="flex items-center gap-3"><span className="app-avatar rounded-pill bg-surface-muted" /><span className="flex-1 space-y-2"><span className="block h-3 w-1/2 rounded-sm bg-surface-muted" /><span className="block h-3 w-1/3 rounded-sm bg-surface-muted" /></span></div>
      <div className="h-5 w-2/3 rounded-sm bg-surface-muted" />
      <div className="grid grid-cols-3 gap-3"><div className="h-8 rounded-sm bg-surface-muted" /><div className="h-8 rounded-sm bg-surface-muted" /><div className="h-8 rounded-sm bg-surface-muted" /></div>
    </Card>)}
  </div>
}

/** El último comentario de lo que se ve con comentarios, pedido una vez por página. Sin 0014 o si falla, nada. */
function useVistasComentarios(items: Publicacion[]): Record<string, VistaComentario> {
  const [vistas, setVistas] = useState<Record<string, VistaComentario>>({})
  const pedidas = useRef(new Map<string, number>())
  const montada = useRef(true)
  useEffect(() => { montada.current = true; return () => { montada.current = false } }, [])
  const faltan = items.filter(p => p.comentarios > 0 && pedidas.current.get(p.id) !== p.comentarios)
  const firma = faltan.map(p => `${p.id}:${p.comentarios}`).join('|')
  useEffect(() => {
    if (!faltan.length) return
    const lote = faltan.slice(0, 30)
    for (const p of lote) pedidas.current.set(p.id, p.comentarios)
    // Una respuesta que llega tarde sigue valiendo: cada lote es independiente.
    cargarSocial().then(s => s.ultimosComentarios(lote.map(p => p.id))).then(
      nuevas => { if (montada.current) setVistas(v => ({ ...v, ...nuevas })) },
      () => undefined,
    )
    // `faltan` se recalcula en cada render; lo que decide cuándo pedir es su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])
  return vistas
}
