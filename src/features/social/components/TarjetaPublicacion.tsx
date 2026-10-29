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
import { textoEjercicios, type LineaLogro, type Resumen, type ResumenEntreno, type ResumenLogro, type ResumenRutina, type ResumenSemana } from '../lib/publicacion'
import EjerciciosPublicacion from './EjerciciosPublicacion'
import VitrinaPublicacion from './VitrinaPublicacion'
import MiniaturaEjercicio from '../../gym/components/MiniaturaEjercicio'
import { textoEjercicioCompartido } from '../../gym/lib/rutinaCompartida'

// Diferido como en Inicio: la geometría de los muñecos no entra con el feed.
const MiniMapa = lazy(() => import('../../gym/components/MapaMuscular').then(m => ({ default: m.MiniMapa })))
// Solo al pulsar «Guardar en mis rutinas»: el buscador de ejercicios no entra con el feed.
const GuardarRutinaCompartida = lazy(() => import('../../gym/components/GuardarRutinaCompartida'))

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
  if (r.tipo === 'semana') {
    if (r.estado !== 'semana') return []
    return [{ label: 'Entrenos', valor: `${formatInt(r.entrenos ?? 0)} de ${formatInt(r.objetivo ?? 0)}` }, { label: 'Hilo', valor: formatInt(r.hilo ?? 0), unidad: r.hilo === 1 ? 'semana' : 'semanas' }]
  }
  if (r.tipo === 'rutina') {
    const series = r.ejercicios.every(e => e.series !== undefined) ? r.ejercicios.reduce((n, e) => n + (e.series ?? 0), 0) : null
    return [{ label: 'Ejercicios', valor: formatInt(r.ejercicios.length) }, ...(series !== null ? [{ label: 'Series', valor: formatInt(series) }] : [])]
  }
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

/**
 * El vistazo del entreno: el mapa muscular en miniatura a la izquierda y, a la derecha, lo nuevo de la Vitrina (o, si
 * no hay, lo más trabajado). El mapa ya enseña los músculos: el texto solo cuando no hay logros que ocupen su sitio.
 */
function Vistazo({ r, dia, verTodas }: { r: ResumenEntreno; dia: string; verTodas?: () => void }) {
  const texto = textoMasTrabajado(r.mapa)
  const mapa = r.mapa && texto ? r.mapa : undefined
  if (!mapa && !r.logros.length) return null
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md bg-surface-muted px-3 py-3">
    {mapa && <span role="img" aria-label={`Mapa muscular. Más trabajado: ${texto}`} className="flex"><Suspense fallback={<span className="muscle-mini" />}><MiniMapa levels={mapa} /></Suspense></span>}
    {r.logros.length
      ? <div className="min-w-0 flex-1 basis-32"><VitrinaPublicacion resumen={r} dia={dia} verTodas={verTodas} vistazo /></div>
      : <p className="min-w-0 flex-1 basis-32"><span className="block text-body-sm font-semibold text-fg">Más trabajado</span><span className="block break-words text-caption text-fg-muted">{texto}</span></p>}
  </div>
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Los siete días de una semana compartida: rellenos los que tuvieron un entreno que cuenta (ADR 056). */
function DiasSemana({ r }: { r: ResumenSemana }) {
  if (r.estado !== 'semana' || !r.dias) return r.estado === 'retomando' && r.entrenos ? <p className="tabular text-body-sm text-fg-muted">{`${formatInt(r.entrenos)} ${r.entrenos === 1 ? 'entreno' : 'entrenos'} esta semana`}</p> : null
  return <ol aria-label="Días de la semana" className="grid grid-cols-7 gap-1">
    {r.dias.map((hecho, i) => <li key={i} className="grid min-w-0 justify-items-center gap-1">
      <span aria-hidden className={`block aspect-square w-full max-w-6 rounded-pill ${hecho ? 'bg-accent' : 'border border-line-strong'}`} />
      <span aria-hidden className="text-caption text-fg-muted">{DIAS_SEMANA[i][0] === 'M' && i === 2 ? 'X' : DIAS_SEMANA[i][0]}</span>
      <span className="sr-only">{`${DIAS_SEMANA[i]}: ${hecho ? 'entreno' : 'sin entreno'}`}</span>
    </li>)}
  </ol>
}

/** Los ejercicios de una rutina compartida en orden, con su imagen del catálogo y su objetivo. */
function EjerciciosRutina({ r }: { r: ResumenRutina }) {
  return <section aria-label="Ejercicios" className="space-y-2">
    <h3 className="text-label text-fg-muted">Ejercicios</h3>
    <ol className="space-y-2">
      {r.ejercicios.map((e, i) => {
        const objetivo = textoEjercicioCompartido(e)
        return <li key={`${e.nombre}-${i}`} className="flex items-center gap-3">
          <MiniaturaEjercicio catalogId={e.catalogId ?? undefined} />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-body-sm font-semibold text-fg"><span className="sr-only">{i + 1}. </span>{e.nombre}</span>
            {objetivo && <span className="tabular block break-words text-caption text-fg-muted">{objetivo}</span>}
          </span>
        </li>
      })}
    </ol>
  </section>
}

/** «Guardar en mis rutinas» bajo una rutina compartida: abre la revisión y, ya guardada, lo dice en la tarjeta. */
function GuardarRutina({ r }: { r: ResumenRutina }) {
  const [abierta, setAbierta] = useState(false)
  const [guardada, setGuardada] = useState<string | null>(null)
  return <div className="space-y-2">
    <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAbierta(true)}><Icon name="plus" size={18} />Guardar en mis rutinas</Button>
    {guardada && <p role="status" className="flex items-center gap-2 break-words text-body-sm font-semibold text-fg"><Icon name="check" size={18} className="text-accent-strong" />Guardada en tus rutinas como «{guardada}»</p>}
    {abierta && <Suspense fallback={null}><GuardarRutinaCompartida resumen={r} onClose={() => setAbierta(false)} onGuardada={(nombre) => { setAbierta(false); setGuardada(nombre) }} /></Suspense>}
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
  // Lo que solo está al desplegar: los ejercicios (con su liga y sus series) y los nombres de lo nuevo en la Vitrina.
  const hayDetalle = (r.tipo === 'entreno' && (r.ejercicios.length > 0 || r.ligas.length > 0 || r.logros.length > 0)) || r.tipo === 'rutina'
  const verDetalle = !previa && hayDetalle
  const detalles = () => r.tipo === 'rutina' ? <EjerciciosRutina r={r} /> : r.tipo === 'entreno' && <div className="space-y-stack">
    <EjerciciosPublicacion resumen={r} />
    {/* Con mosaico, la liga se ve al tocar cada ejercicio; las publicaciones de texto siguen con su lista. */}
    {!r.catalogIds && <Lineas titulo="Ligas" lineas={r.ligas} />}
    <VitrinaPublicacion resumen={r} dia={dia} />
  </div>
  return (
    <Card className="publicacion-tarjeta space-y-3">
      {cabecera ?? (etiqueta && <p className="text-caption text-fg-muted first-letter:uppercase">{r.tipo === 'logro' ? etiqueta : `${etiqueta} · ${formatFechaHoraConDia(fecha)}`}</p>)}
      {(r.tipo === 'entreno' || r.tipo === 'actividad' || r.tipo === 'rutina' || r.tipo === 'semana') && <p className="break-words text-heading text-fg">{r.titulo}</p>}
      {r.tipo === 'semana' && <DiasSemana r={r} />}
      {r.tipo === 'texto' && <TextoExpandible texto={r.texto} previa={previa} />}
      {r.tipo !== 'texto' && r.nota && <TextoExpandible texto={r.nota} previa={previa} nota />}
      {r.tipo === 'logro' && <Medalla r={r} dia={dia} />}
      <Cifras cifras={cifrasDe(r)} />
      {r.tipo === 'actividad' && r.desnivelM !== null && <p className="tabular text-caption text-fg-muted">Desnivel positivo: {formatInt(r.desnivelM)} m</p>}
      {r.tipo === 'entreno' && <Vistazo r={r} dia={dia} verTodas={verDetalle ? () => setDetalle(true) : undefined} />}
      {r.tipo === 'rutina' && !previa && !detalle && <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios.map(e => e.nombre))}</p>}
      {previa && hayDetalle && detalles()}
      {verDetalle && detalle && <div id={idDetalle}>{detalles()}</div>}
      {r.tipo === 'rutina' && !previa && <GuardarRutina r={r} />}
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
