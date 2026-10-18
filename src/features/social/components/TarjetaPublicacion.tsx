import { lazy, Suspense, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { formatFechaHoraConDia, formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { duracionTexto, formatKm, formatRitmo, ritmoSegPorKm } from '../../actividades/lib/actividad'
import IconoLogro from '../../vitrina/components/IconoLogro'
import { GRUPOS_LOGRO, NUMERALES } from '../../vitrina/lib/logros'
import { etiquetaPublicacion, textoMasTrabajado } from '../lib/presentacion'
import { textoEjercicios, type LineaLogro, type Resumen, type ResumenEntreno, type ResumenLogro } from '../lib/publicacion'
import MapaPublicacion from './MapaPublicacion'
import RecordsPublicacion from './RecordsPublicacion'

// Diferido como en Inicio: la geometría de los muñecos no entra con el feed.
const MiniMapa = lazy(() => import('../../gym/components/MapaMuscular').then(m => ({ default: m.MiniMapa })))

interface Props {
  resumen: Resumen
  /** ms del inicio del entreno o de la actividad. */
  fecha: number
  /** Cabecera del feed (avatar, nombre, qué es y cuándo, «…»); sin ella se pinta qué es y la fecha. */
  cabecera?: ReactNode
  /** Cuándo se publicó; sin él, es la vista previa de lo propio (todo desplegado y sin pie). */
  creada?: string
  /** Ánimo y comentarios, a la izquierda del pie; «Detalle» se añade a la derecha si hay algo más que ver. */
  acciones?: ReactNode
  /** Debajo del pie: quién te animó, el último comentario. */
  pie?: ReactNode
}

function Lineas({ titulo, lineas }: { titulo: string; lineas: LineaLogro[] }) {
  if (!lineas.length) return null
  return (
    <div className="space-y-1">
      <p className="text-label text-fg-muted">{titulo}</p>
      <ul className="space-y-1">
        {lineas.map((l, i) => <li key={`${l.ejercicio}-${i}`} className="break-words text-body-sm text-fg"><span className="font-semibold">{l.ejercicio}</span> · {l.texto}</li>)}
      </ul>
    </div>
  )
}

function TextoExpandible({ texto, previa, nota = false }: { texto: string; previa: boolean; nota?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const parrafo = useRef<HTMLParagraphElement>(null)
  const [largo, setLargo] = useState(false)
  useLayoutEffect(() => {
    const el = parrafo.current
    if (!el || previa || abierto) return
    const medir = () => setLargo(el.scrollHeight > el.clientHeight + 1)
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    return () => observer.disconnect()
  }, [texto, previa, abierto])
  return <div><p ref={parrafo} className={`whitespace-pre-wrap break-words text-body text-fg ${!previa && !abierto ? nota ? 'line-clamp-4' : 'line-clamp-6' : ''}`}>{texto}</p>
    {!previa && largo && <Button variant="subtle" size="sm" className="-ml-4" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>{abierto ? 'Menos' : 'Más'}</Button>}
  </div>
}

/** Cifras en una fila con filetes, como el póster de la sesión. */
function Cifras({ cifras }: { cifras: { label: string; valor: string; unidad?: string }[] }) {
  if (!cifras.length) return null
  return <dl className={`publicacion-metricas cifras-filetes grid gap-y-3 ${cifras.length === 3 ? 'grid-cols-3' : cifras.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {cifras.map(c => <div key={c.label} className="min-w-0">
      <dt className="text-rotulo text-fg-muted">{c.label}</dt>
      <dd className="tabular text-fg"><span className="break-words font-numeric text-heading">{c.valor}</span>{c.unidad && <span className="text-caption text-fg-muted"> {c.unidad}</span>}</dd>
    </div>)}
  </dl>
}

function cifrasDe(r: Resumen): { label: string; valor: string; unidad?: string }[] {
  if (r.tipo === 'entreno') return [
    ...(r.duracionSeg !== undefined ? [{ label: 'Tiempo', valor: duracionTexto(r.duracionSeg) }] : []),
    { label: 'Series', valor: formatInt(r.series) },
    ...(r.volumenKg !== undefined ? [{ label: 'Volumen', valor: formatInt(r.volumenKg), unidad: 'kg' }] : []),
  ]
  if (r.tipo === 'actividad') {
    const ritmo = r.duracionSeg !== undefined ? ritmoSegPorKm(r.duracionSeg, r.distanciaM) : null
    return [
      { label: 'Distancia', valor: formatKm(r.distanciaM), unidad: 'km' },
      ...(r.duracionSeg !== undefined ? [{ label: 'Tiempo', valor: duracionTexto(r.duracionSeg) }] : []),
      ...(ritmo !== null ? [{ label: 'Ritmo', valor: formatRitmo(ritmo).replace(' /km', ''), unidad: '/km' }] : []),
    ]
  }
  return []
}

/** El logro como medalla: insignia grande sobre curvas de nivel, con su grupo, nivel y requisito. Sin confeti. */
function Medalla({ r, dia }: { r: ResumenLogro; dia: string }) {
  return <div className="logro-medalla relative overflow-hidden rounded-md bg-surface-muted px-4 py-5 text-center">
    <div className="relative flex flex-col items-center gap-2">
      <IconoLogro tamano="lg" alcanzado logro={{ id: r.logroId, grupo: r.grupo, nombre: r.titulo, descripcion: r.descripcion, niveles: [{ fecha: dia }] }} />
      <p className="text-rotulo text-fg-muted">{GRUPOS_LOGRO[r.grupo]}{r.nivel ? ` · Nivel ${NUMERALES[r.nivel - 1]}` : ''}</p>
      <p className="break-words text-heading text-fg">{r.titulo}</p>
      <p className="max-w-prose break-words text-body-sm text-fg-muted">{r.descripcion}</p>
      <p className="text-caption text-fg-muted first-letter:uppercase">Conseguido: {formatFriendly(dia)}</p>
    </div>
  </div>
}

/** Mapa muscular en miniatura, a la vista (el «mapa» del gimnasio), con lo más trabajado en texto. */
function MasTrabajado({ r }: { r: ResumenEntreno }) {
  const texto = textoMasTrabajado(r.mapa)
  if (!r.mapa || !texto) return null
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-surface-muted px-3 py-2">
    <Suspense fallback={<span className="muscle-mini" />}><MiniMapa levels={r.mapa} /></Suspense>
    <p className="min-w-0 flex-1 basis-32"><span className="block text-body-sm font-semibold text-fg">Más trabajado</span><span className="block break-words text-caption text-fg-muted">{texto}</span></p>
  </div>
}

/** Una publicación: lo que ven seguidores o miembros (y la vista previa antes de publicar). */
export default function TarjetaPublicacion({ resumen: r, fecha, cabecera, creada, acciones, pie }: Props) {
  const [detalle, setDetalle] = useState(false)
  const idDetalle = useId()
  const previa = !creada
  // Los logros solo guardan el día: no inventar una hora de obtención ni desplazarlo al cambiar de zona horaria.
  const dia = new Date(fecha).toISOString().slice(0, 10)
  const etiqueta = etiquetaPublicacion(r, fecha, creada)
  const hayDetalle = r.tipo === 'entreno' && (r.ejercicios.length > 0 || !!r.mapa || r.records.length > 0 || r.ligas.length > 0 || r.logros.length > 0)
  const detalles = () => r.tipo === 'entreno' && <div className="space-y-stack">
    {r.ejercicios.length > 0 && <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios, r.ejercicios.length)}</p>}
    {r.mapa && <MapaPublicacion mapa={r.mapa} />}
    <RecordsPublicacion resumen={r} detalle />
    <Lineas titulo="Ligas" lineas={r.ligas} />
    {r.logros.length > 0 && <div className="space-y-1"><p className="text-label text-fg-muted">Nuevo en la Vitrina</p><p className="break-words text-body-sm text-fg">{r.logros.join(' · ')}</p></div>}
  </div>
  const verDetalle = !previa && hayDetalle
  return (
    <Card className="publicacion-tarjeta space-y-3">
      {cabecera ?? (etiqueta && <p className="text-caption text-fg-muted first-letter:uppercase">{r.tipo === 'logro' ? etiqueta : `${etiqueta} · ${formatFechaHoraConDia(fecha)}`}</p>)}
      {(r.tipo === 'entreno' || r.tipo === 'actividad') && <p className="break-words text-heading text-fg">{r.titulo}</p>}
      {r.tipo === 'texto' && <TextoExpandible texto={r.texto} previa={previa} />}
      {r.tipo !== 'texto' && r.nota && <TextoExpandible texto={r.nota} previa={previa} nota />}
      {r.tipo === 'logro' && <Medalla r={r} dia={dia} />}
      <Cifras cifras={cifrasDe(r)} />
      {r.tipo === 'actividad' && r.desnivelM !== null && <p className="tabular text-caption text-fg-muted">Desnivel positivo: {formatInt(r.desnivelM)} m</p>}
      {r.tipo === 'entreno' && <><MasTrabajado r={r} /><RecordsPublicacion resumen={r} /></>}
      {previa && hayDetalle && detalles()}
      {verDetalle && detalle && <div id={idDetalle}>{detalles()}</div>}
      {(acciones || verDetalle) && <div className="-mx-2 flex flex-wrap items-center gap-1 border-t border-line pt-1">
        {acciones}
        {verDetalle && <Button variant="subtle" size="sm" className="ml-auto px-3" aria-expanded={detalle} aria-controls={detalle ? idDetalle : undefined} onClick={() => setDetalle(!detalle)}>
          {detalle ? 'Menos' : 'Detalle'}<Icon name={detalle ? 'chevron-up' : 'chevron-down'} size={18} />
        </Button>}
      </div>}
      {pie}
    </Card>
  )
}
