import { useId, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon, { type IconName } from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import ModalPage from '../../../shared/components/ModalPage'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { getSettings } from '../../../shared/db/settings'
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { moduloActivo } from '../../../shared/lib/modulos'
import { NOMBRE_TIPO, desnivelTexto, duracionTexto, formatKm, kmTexto, tituloActividad } from '../../actividades/lib/actividad'
import TrazadoRecorrido from '../../actividades/components/TrazadoRecorrido'
import TrazadoCamino from '../../caminos/components/TrazadoCamino'
import { progresoTexto as progresoCamino } from '../../caminos/lib/caminos'
import { idDeRutaPropia, puntosDe } from '../../caminos/lib/rutasPropias'
import { metrosRuta } from '../../caminos/lib/rutas'
import { progresoTexto as progresoCumbre } from '../../cumbres/lib/cumbres'
import { compartirImagen, cssFuentesIncrustadas, descargarImagen, puedeCompartirArchivos, svgAPng } from '../../gym/lib/exportarImagen'
import MacroBar from '../../nutricion/components/MacroBar'
import { useDatosPeriodo } from '../hooks/useTuPeriodo'
import { useVitrina } from '../hooks/useVitrina'
import { ALTO_POSTER, ANCHO_POSTER, nombreArchivoTuPeriodo, svgTuPeriodo, type ColoresTuPeriodo } from '../lib/imagenTuPeriodo'
import { GRUPOS_LOGRO, NUMERALES } from '../lib/logros'
import { cifrasPeriodo, lineaTarjeta, resumirPeriodo, type Periodo } from '../lib/tuPeriodo'
import {
  actividadesDelPeriodo, calendarioPeriodo, caminosDelPeriodo, cumbresDelPeriodo, entrenoDelPeriodo, frasePeriodo, lineaMomentos,
  logrosDelPeriodo, nutricionDelPeriodo, type CalendarioPeriodo, type RecordDelPeriodo,
} from '../lib/tuPeriodoSecciones'
import IconoLogro from './IconoLogro'
import { MiniaturaCamino, MiniaturaMontana } from './MiniaturasPeriodo'

const diaMes = (iso: string) => formatDiaMes(parseISODate(iso).getTime())

/** Todo lo del periodo, con los módulos de B9 (sin Gimnasio, Actividades o Nutrición, sus partes no salen). `undefined` mientras carga. */
function useSecciones(p: Periodo, hoy: string) {
  const datos = useDatosPeriodo(p, hoy)
  const vitrina = useVitrina(hoy)
  const settings = useLiveQuery(() => getSettings(), [])
  if (!datos || vitrina === undefined || !settings) return undefined
  const usa = { gym: moduloActivo(settings, 'gym'), actividades: moduloActivo(settings, 'actividades'), nutricion: moduloActivo(settings, 'nutricion') }
  const juego = vitrina.visible ? vitrina : null
  const caminosEstado = juego?.caminos.visible ? juego.caminos : null
  const cumbres = juego ? cumbresDelPeriodo(p, juego.cumbres) : null
  const caminos = caminosEstado ? caminosDelPeriodo(p, caminosEstado.caminos) : null
  const logros = juego ? logrosDelPeriodo(p, juego.vitrina.logros) : []
  const entreno = usa.gym ? entrenoDelPeriodo(p, datos) : null
  const nutricion = usa.nutricion ? nutricionDelPeriodo(p, datos, hoy) : null
  const actividades = usa.actividades ? actividadesDelPeriodo(p, datos.actividades) : null
  const calendario = calendarioPeriodo(p, {
    workouts: usa.gym ? datos.workouts : [], actividades: usa.actividades ? datos.actividades : [], entries: usa.nutricion ? datos.entries : [],
  })
  // La imagen para compartir sigue con las cifras de siempre.
  const tramos = juego?.cumbres ? juego.cumbres.tramos : null
  const r = resumirPeriodo(p, { ...datos, tramos })
  return {
    usa, calendario, cumbres, caminos, logros, entreno, nutricion, actividades,
    propias: caminosEstado?.propias ?? [],
    frase: frasePeriodo({
      entrenos: entreno?.entrenos ?? null, cumbres: cumbres?.coronadas.length ?? null, caminos: caminos?.completados.length ?? null,
      km: actividades ? Math.round(actividades.metros / 1000) : null, diasRegistrados: nutricion?.diasRegistrados ?? null,
    }),
    momentos: lineaMomentos({ cumbres: cumbres?.coronadas.length ?? 0, caminos: caminos?.completados.length ?? 0, records: entreno?.records.length ?? 0, logros: logros.length }),
    imagen: { cifras: cifrasPeriodo(r, usa), grupo: usa.gym ? r.grupo : null },
  }
}

/** Los colores del grafito en el tema que se ve ahora, leídos de los tokens (el canvas no entiende variables CSS). */
function coloresDelTema(): ColoresTuPeriodo {
  const estilo = getComputedStyle(document.documentElement)
  const token = (nombre: string) => estilo.getPropertyValue(`--c-${nombre}`).trim()
  return { fondo: token('training'), texto: token('on-training'), tenue: token('training-muted'), filete: token('training-track') }
}

/** Los días del mes en una tira (la tarjeta de Inicio): entreno relleno, actividad con borde, el resto en el carril. */
function TiraDias({ calendario }: { calendario: CalendarioPeriodo }) {
  return <span aria-hidden="true" className="flex w-full gap-px">
    {calendario.dias.map((d) => <span key={d.fecha} className={`h-4 min-w-0 flex-1 rounded-sm ${d.entreno ? 'bg-fg' : d.actividad ? 'border border-fg' : 'bg-surface-muted'}`} />)}
  </span>
}

/**
 * Tarjeta de Inicio los días 1–7 (B15): «Tu octubre» (en enero, «Tu 2026») en grafito con lo conseguido (cumbres,
 * caminos, récords y logros; sin nada de eso, sus cifras), la tira de días del mes, «Ver el resumen» y la X, que la cierra
 * hasta el mes siguiente (con «Deshacer» en Inicio).
 */
export function TarjetaTuPeriodo({ periodo, hoy, onVer, onCerrar }: { periodo: Periodo; hoy: string; onVer: () => void; onCerrar: () => void }) {
  const s = useSecciones(periodo, hoy)
  if (!s) return null
  const linea = s.momentos ?? (s.imagen.cifras.length ? lineaTarjeta(s.imagen.cifras) : null)
  if (!linea && !s.frase) return null
  return (
    <section aria-label={periodo.titulo} className="training-surface relative p-4 pr-12">
      <button type="button" onClick={onVer} className="app-button block w-full space-y-3 text-left">
        <span className="block space-y-0.5">
          <span className="block font-numeric text-heading">{periodo.titulo}</span>
          <span className="training-muted tabular block break-words text-body-sm">{linea ?? s.frase}</span>
        </span>
        {s.calendario && <TiraDias calendario={s.calendario} />}
        <span className="flex min-h-touch items-center gap-1 text-body-sm font-semibold">Ver el resumen<Icon name="chevron-right" size={16} className="text-accent-strong" /></span>
      </button>
      <div className="absolute right-1 top-1"><IconButton icon="close" label={`Cerrar ${periodo.titulo}`} variant="ghost" className="training-muted" onClick={onCerrar} /></div>
    </section>
  )
}

const LETRAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function CalendarioMes({ calendario, etiqueta }: { calendario: CalendarioPeriodo; etiqueta: string }) {
  const entrenos = calendario.dias.filter((d) => d.entreno).length
  const actividades = calendario.dias.filter((d) => d.actividad).length
  const comidas = calendario.dias.filter((d) => d.comidas).length
  return <div className="space-y-1.5">
    <div role="img" aria-label={`${etiqueta}: ${formatInt(entrenos)} días con entreno, ${formatInt(actividades)} con actividad y ${formatInt(comidas)} con comidas registradas`}>
      <div aria-hidden="true" className="grid grid-cols-7 gap-1.5">
        {LETRAS_SEMANA.map((l) => <span key={l} className="training-muted text-center text-caption font-semibold">{l}</span>)}
        {Array.from({ length: calendario.hueco }, (_, i) => <span key={`h${i}`} />)}
        {calendario.dias.map((d) => (
          <span key={d.fecha} className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm ${d.entreno ? 'bg-fg text-surface-muted' : d.actividad ? 'border border-fg' : 'bg-surface-muted training-muted'}`}>
            <span className="tabular text-caption font-semibold leading-none">{d.dia}</span>
            <span className={`h-1 w-1 rounded-pill ${d.comidas ? (d.entreno ? 'bg-surface-muted' : 'bg-accent-strong') : ''}`} />
          </span>
        ))}
      </div>
    </div>
    <div aria-hidden="true" className="training-muted flex flex-wrap gap-x-4 gap-y-1 pt-1 text-caption">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-fg" />Entreno</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-fg" />Actividad</span>
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-pill bg-accent-strong" />Comidas registradas</span>
    </div>
  </div>
}

/** Un bloque plegable de «Lo mejor del mes» o de los récords: icono, título con su cuenta, resumen y su lista al abrirlo. */
function Desplegable({ icono, titulo, cuenta, resumen, abierto, onCambiar, children, conCuadro = true }: {
  icono: IconName; titulo: string; cuenta: number; resumen: string; abierto: boolean; onCambiar: (abierto: boolean) => void; children: ReactNode; conCuadro?: boolean
}) {
  const id = useId()
  return <div>
    <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => onCambiar(!abierto)} className="flex min-h-touch w-full items-center gap-3 px-card py-3 text-left">
      {conCuadro
        ? <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name={icono} size={20} /></span>
        : <Icon name={icono} size={20} className="shrink-0 text-accent-strong" />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-title font-semibold">{titulo}</span>
          <span className="tabular font-numeric text-title text-accent-strong">{formatInt(cuenta)}</span>
        </span>
        <span className="block break-words text-caption text-fg-muted">{resumen}</span>
      </span>
      <Icon name="chevron-down" size={18} className={`shrink-0 text-fg-muted transition-transform duration-short motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`} />
    </button>
    <div id={id} hidden={!abierto}>{abierto && <ul className="divide-y divide-line px-card pb-2">{children}</ul>}</div>
  </div>
}

function FilaMomento({ miniatura, titulo, detalle, fecha, children }: { miniatura?: ReactNode; titulo: string; detalle: string; fecha: string; children?: ReactNode }) {
  return <li className="flex min-h-touch items-center gap-3 py-2">
    {miniatura}
    <span className="min-w-0 flex-1 space-y-0.5">
      <span className="block break-words text-body font-semibold">{titulo}</span>
      <span className="block break-words text-caption text-fg-muted">{detalle}</span>
      {children}
    </span>
    <span className="tabular shrink-0 self-start pt-0.5 text-caption text-fg-muted">{fecha}</span>
  </li>
}

type Bloque = 'cumbres' | 'caminos' | 'logros'

function LoMejor({ s }: { s: NonNullable<ReturnType<typeof useSecciones>> }) {
  const [abiertos, setAbiertos] = useState<Record<Bloque, boolean>>({ cumbres: true, caminos: false, logros: false })
  const cambiar = (b: Bloque) => (abierto: boolean) => setAbiertos((a) => ({ ...a, [b]: abierto }))
  const { cumbres, caminos, logros } = s
  if (!cumbres && !caminos && logros.length === 0) return null
  const propiaDe = (rutaId: string) => s.propias.find((r) => idDeRutaPropia(r.id) === rutaId)
  return <section aria-label="Lo mejor del mes" className="space-y-stack">
    <SectionHeader variant="section">Lo mejor del mes</SectionHeader>
    <Card padded={false} className="divide-y divide-line">
      {cumbres && <Desplegable icono="mountain" titulo="Cumbres" cuenta={cumbres.coronadas.length} resumen={`+${formatInt(cumbres.metros)} m subidos`} abierto={abiertos.cumbres} onCambiar={cambiar('cumbres')}>
        {cumbres.coronadas.map((x) => <FilaMomento key={`${x.montana.id}-${x.vez}`} miniatura={<MiniaturaMontana />} titulo={x.montana.nombre}
          detalle={`${formatInt(x.montana.altitud)} m · ${x.montana.zona}${x.vez > 1 ? ` · ${formatInt(x.vez)}.ª vez` : ''}`} fecha={diaMes(x.cumbre!.fecha)} />)}
        {cumbres.enCurso && <FilaMomento miniatura={<MiniaturaMontana enCurso />} titulo={`Subiendo: ${cumbres.enCurso.montana.nombre}`} detalle={progresoCumbre(cumbres.enCurso)} fecha="Ahora" />}
      </Desplegable>}
      {caminos && <Desplegable icono="route" titulo="Caminos" cuenta={caminos.completados.length} resumen={`${kmTexto(caminos.metros)} recorridos`} abierto={abiertos.caminos} onCambiar={cambiar('caminos')}>
        {[...caminos.completados, ...(caminos.enCurso ? [caminos.enCurso] : [])].map((x) => {
          const propia = x.ruta.coleccion === 'propia' ? propiaDe(x.ruta.id) : undefined
          const terminado = x.llegada !== null
          return <FilaMomento key={`${x.ruta.id}-${x.vez}`} miniatura={<MiniaturaCamino coleccion={x.ruta.coleccion} puntos={propia ? puntosDe(propia) : undefined} />}
            titulo={terminado ? x.ruta.nombre : `En camino: ${x.ruta.nombre}`}
            detalle={terminado ? `${kmTexto(metrosRuta(x.ruta))} · ${formatInt(x.ruta.etapas.length)} etapas` : progresoCamino(x)} fecha={terminado ? diaMes(x.llegada!.fecha) : 'Ahora'}>
            <span className="block pt-1"><TrazadoCamino expedicion={x} decorativo /></span>
          </FilaMomento>
        })}
      </Desplegable>}
      {logros.length > 0 && <Desplegable icono="sparkles" titulo="Logros" cuenta={logros.length} resumen="Nuevas piezas de la Vitrina" abierto={abiertos.logros} onCambiar={cambiar('logros')}>
        {logros.map((l) => {
          const umbral = l.nivel !== null ? l.logro.umbrales?.[l.nivel - 1] : undefined
          const repetido = l.nivel === null && l.veces > 1 ? ` · ${formatInt(l.veces)} veces` : ''
          return <FilaMomento key={l.logro.id} miniatura={<span aria-hidden="true" className="flex w-thumb shrink-0 justify-center"><IconoLogro logro={l.logro} tamano="sm" alcanzado /></span>}
            titulo={l.nivel !== null && (l.logro.umbrales?.length ?? 0) > 1 ? `${l.logro.nombre} ${NUMERALES[l.nivel - 1]}` : l.logro.nombre}
            detalle={(umbral !== undefined && l.logro.textoNivel ? l.logro.textoNivel(umbral) : l.logro.descripcion || GRUPOS_LOGRO[l.logro.grupo]) + repetido} fecha={diaMes(l.fecha)} />
        })}
      </Desplegable>}
    </Card>
  </section>
}

/** Un récord con una sola cifra: «140 kg», «+15 kg» de lastre, «32 reps» sin peso. */
function partesRecord(r: RecordDelPeriodo): { tipo: string; valor: string; unidad: string; mejora: string } {
  const kg = (n: number) => formatNumber(n, 1)
  switch (r.tipo) {
    case 'peso': return { tipo: 'Peso máximo', valor: kg(r.valor), unidad: 'kg', mejora: `+${kg(r.mejora)} kg` }
    case 'lastre': return { tipo: 'Lastre máximo', valor: `+${kg(r.valor)}`, unidad: 'kg', mejora: `+${kg(r.mejora)} kg` }
    case 'asistencia': return { tipo: 'Menos asistencia', valor: kg(r.valor), unidad: 'kg', mejora: `−${kg(r.mejora)} kg` }
    case 'reps': return { tipo: 'Sin peso', valor: formatInt(r.valor), unidad: 'reps', mejora: `+${formatInt(r.mejora)} reps` }
  }
}

function Entreno({ e }: { e: NonNullable<ReturnType<typeof entrenoDelPeriodo>> }) {
  const [recordsAbiertos, setRecordsAbiertos] = useState(true)
  const max = Math.max(...e.tramos.map((t) => t.toneladas), 0)
  const maxSeries = e.grupos[0]?.series ?? 0
  const mejor = e.mejorTramo !== null ? e.tramos[e.mejorTramo] : null
  const porTramo = e.tramos.length === 12 ? 'mes' : 'semana'
  return <section aria-label="Entreno" className="space-y-stack">
    <SectionHeader variant="section">Entreno</SectionHeader>
    <Card padded={false} className="divide-y divide-line">
      <div className="space-y-5 p-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Metric size="hero" valor={formatInt(e.entrenos)} label="Entrenos" />
          <div role="img" aria-label={`Toneladas por ${porTramo}: ${e.tramos.map((t) => `${t.nombre}, ${formatNumber(t.toneladas, 1)}`).join('; ')}`} className="flex h-24 items-end gap-1.5">
            {e.tramos.map((t, i) => <span key={t.etiqueta + i} aria-hidden="true" className="flex h-full w-8 min-w-0 flex-col items-center justify-end gap-1">
              <span className={`tabular whitespace-nowrap text-caption leading-none ${i === e.mejorTramo ? 'font-semibold text-fg' : 'text-fg-muted'}`}>{e.tramos.length <= 6 ? formatNumber(t.toneladas, 1) : ''}</span>
              <span className={`w-full rounded-sm ${i === e.mejorTramo ? 'bg-accent-strong' : 'bg-line-strong'}`} style={{ height: `${max > 0 ? Math.max(4, Math.round((t.toneladas / max) * 56)) : 4}px` }} />
              <span className="text-caption leading-none text-fg-subtle">{t.etiqueta}</span>
            </span>)}
          </div>
        </div>
        {mejor && <p className="text-caption text-fg-muted">Toneladas por {porTramo} · la mejor, {mejor.nombre}</p>}
        <dl className="grid grid-cols-3 gap-3">
          {[
            { rotulo: 'Volumen', valor: formatNumber(e.toneladas, 1), unidad: 't' },
            { rotulo: 'Series', valor: formatInt(e.series) },
            { rotulo: 'Duración media', valor: formatInt(e.duracionMediaMin), unidad: 'min' },
          ].map((c) => <div key={c.rotulo} className="min-w-0 border-t border-line pt-2">
            <dt className="break-words text-caption text-fg-muted">{c.rotulo}</dt>
            <dd className="tabular flex flex-wrap items-baseline gap-x-1"><span className="font-numeric text-heading">{c.valor}</span>{c.unidad && <span className="text-caption text-fg-muted">{c.unidad}</span>}</dd>
          </div>)}
        </dl>
        {e.grupos.length > 0 && <div className="space-y-2">
          <p className="text-rotulo text-fg-muted">Lo más trabajado</p>
          {e.grupos.map((g, i) => <div key={g.nombre} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] items-center gap-3">
            <span className="break-words text-body-sm font-semibold">{g.nombre}</span>
            <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-pill bg-surface-muted">
              <span className="tu-periodo-barra block h-full rounded-pill" data-level={5 - Math.min(i, 3)} style={{ width: `${maxSeries > 0 ? Math.round((g.series / maxSeries) * 100) : 0}%` }} />
            </span>
            <span className="tabular text-caption text-fg-muted">{formatInt(g.series)} series</span>
          </div>)}
        </div>}
      </div>
      {e.records.length > 0 && <Desplegable icono="trophy" conCuadro={false} titulo="Récords" cuenta={e.records.length} resumen="El mejor de cada ejercicio" abierto={recordsAbiertos} onCambiar={setRecordsAbiertos}>
        {e.records.map((r) => {
          const partes = partesRecord(r)
          return <li key={`${r.exerciseId}-${r.variante ?? ''}`} className="flex min-h-touch items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-body font-semibold">{r.nombre}</span>
              <span className="block break-words text-caption text-fg-muted">{partes.tipo}{r.variante ? ` · ${r.variante}` : ''} · {diaMes(r.fecha)}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="tabular flex items-baseline gap-1"><span className="font-numeric text-heading">{partes.valor}</span><span className="text-caption text-fg-muted">{partes.unidad}</span></span>
              <span className="tabular text-caption font-semibold text-accent-strong">{partes.mejora}</span>
            </span>
          </li>
        })}
      </Desplegable>}
    </Card>
  </section>
}

/** Una barra en tramos con su leyenda en filas (Nutrición y Actividades): el color nunca va solo, cada tramo lleva texto. */
function BarraTramos({ etiqueta, tramos }: { etiqueta: string; tramos: { clave: string; nombre: string; detalle?: string; cifra: string; peso: number; color: string }[] }) {
  const total = tramos.reduce((a, t) => a + t.peso, 0)
  return <div className="space-y-2">
    <div role="img" aria-label={`${etiqueta}: ${tramos.map((t) => `${t.nombre} ${t.cifra}`).join(', ')}`} className="flex h-3.5 gap-0.5">
      {tramos.filter((t) => t.peso > 0).map((t) => <span key={t.clave} className={`h-full min-w-0 rounded-sm ${t.color}`} style={{ width: `${total > 0 ? (t.peso / total) * 100 : 0}%` }} />)}
    </div>
    <ul aria-hidden="true" className="space-y-1">
      {tramos.map((t) => <li key={t.clave} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-3">
        <span className={`h-3 w-3 rounded-sm ${t.color}`} />
        <span className="break-words text-body-sm"><span className="font-semibold">{t.nombre}</span>{t.detalle && <span className="text-fg-muted"> · {t.detalle}</span>}</span>
        <span className="tabular text-body-sm font-semibold">{t.cifra}</span>
      </li>)}
    </ul>
  </div>
}

const dias = (n: number) => `${formatInt(n)} ${n === 1 ? 'día' : 'días'}`

function Nutricion({ n }: { n: NonNullable<ReturnType<typeof nutricionDelPeriodo>> }) {
  const f = n.franja
  return <section aria-label="Nutrición" className="space-y-stack">
    <SectionHeader variant="section">Nutrición</SectionHeader>
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-rotulo text-fg-muted">Energía media al día</p>
        <p className="tabular flex flex-wrap items-baseline gap-x-2"><span className="font-numeric text-hero">{formatInt(n.media.kcal)}</span><span className="text-body-sm text-fg-muted">kcal{n.objetivo.kcal > 0 ? ` · objetivo ${formatInt(n.objetivo.kcal)}` : ''}</span></p>
        {n.objetivo.kcal > 0 && <>
          <ProgressBar size="lg" value={n.media.kcal} goal={n.objetivo.kcal} colorClass="bg-kcal" label="Energía media al día" valueText={`${formatInt(n.media.kcal)} de ${formatInt(n.objetivo.kcal)} kcal de media`} />
          <p className="text-caption text-fg-muted">{formatInt(Math.round((n.media.kcal / n.objetivo.kcal) * 100))} % de tu objetivo</p>
        </>}
      </div>
      {n.porDebajo + n.enObjetivo + n.porEncima > 0 && <div className="space-y-2">
        <p className="text-rotulo text-fg-muted">Tus días frente al objetivo</p>
        <BarraTramos etiqueta="Días registrados frente al objetivo" tramos={[
          { clave: 'debajo', nombre: 'Por debajo', detalle: f ? `menos de ${formatInt(f.min)} kcal` : undefined, cifra: dias(n.porDebajo), peso: n.porDebajo, color: 'bg-line-strong' },
          { clave: 'en', nombre: 'En tu objetivo', detalle: f ? `${formatInt(f.min)}–${formatInt(f.max)} kcal` : undefined, cifra: dias(n.enObjetivo), peso: n.enObjetivo, color: 'bg-kcal' },
          { clave: 'encima', nombre: 'Por encima', detalle: f ? `más de ${formatInt(f.max)} kcal` : undefined, cifra: dias(n.porEncima), peso: n.porEncima, color: 'bg-fg' },
        ]} />
      </div>}
      <div className="space-y-3">
        <p className="text-rotulo text-fg-muted">Macros al día</p>
        <div className="grid grid-cols-3 gap-3">
          <MacroBar macro="prot" valor={n.media.prot} objetivo={n.objetivo.prot} />
          <MacroBar macro="carbs" valor={n.media.carb} objetivo={n.objetivo.carb} />
          <MacroBar macro="fat" valor={n.media.grasa} objetivo={n.objetivo.grasa} />
        </div>
        {n.reparto.prot + n.reparto.carb + n.reparto.grasa > 0 && <p className="text-caption text-fg-muted">De tus kcal: {n.reparto.prot} % proteína · {n.reparto.carb} % hidratos · {n.reparto.grasa} % grasas</p>}
      </div>
      <dl className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <dt className="text-body-sm text-fg-muted">Días registrados</dt>
        <dd className="tabular flex items-baseline gap-1"><span className="font-numeric text-heading">{formatInt(n.diasRegistrados)}</span><span className="text-caption text-fg-muted">de {formatInt(n.diasDelPeriodo)}</span></dd>
      </dl>
    </Card>
  </section>
}

const COLORES_TIPO = ['bg-fg', 'bg-line-strong', 'bg-surface-muted']

function Actividades({ a }: { a: NonNullable<ReturnType<typeof actividadesDelPeriodo>> }) {
  const larga = a.masLarga
  return <section aria-label="Actividades" className="space-y-stack">
    <SectionHeader variant="section">Actividades</SectionHeader>
    <Card padded={false} className="divide-y divide-line">
      <div className="space-y-5 p-card">
        <Metric size="hero" valor={formatKm(a.metros)} unidad="km" label="Distancia" />
        <BarraTramos etiqueta="Distancia por tipo" tramos={a.porTipo.map((t, i) => ({
          clave: t.tipo, nombre: NOMBRE_TIPO[t.tipo], detalle: `${formatInt(t.salidas)} ${t.salidas === 1 ? 'salida' : 'salidas'}`, cifra: kmTexto(t.metros), peso: t.metros, color: COLORES_TIPO[i] ?? 'bg-surface-muted',
        }))} />
        <dl className="grid grid-cols-3 gap-3">
          {[
            { rotulo: 'Salidas', valor: formatInt(a.salidas) },
            { rotulo: 'Tiempo', valor: duracionTexto(a.segundos) },
            ...(a.desnivel !== null ? [{ rotulo: 'Desnivel', valor: desnivelTexto(a.desnivel) }] : []),
          ].map((c) => <div key={c.rotulo} className="min-w-0 border-t border-line pt-2">
            <dt className="break-words text-caption text-fg-muted">{c.rotulo}</dt>
            <dd className="tabular break-words font-numeric text-title">{c.valor}</dd>
          </div>)}
        </dl>
      </div>
      <div className="flex min-h-touch items-center gap-3 px-card py-3">
        {larga.recorrido && larga.recorrido.length > 0
          ? <span className="flex h-thumb w-thumb shrink-0 items-center justify-center rounded-md bg-surface-muted"><TrazadoRecorrido recorrido={larga.recorrido} variante="fila" /></span>
          : <span aria-hidden="true" className="flex h-thumb w-thumb shrink-0 items-center justify-center rounded-md bg-surface-muted"><Icon name="footprints" size={22} /></span>}
        <span className="min-w-0 flex-1">
          <span className="block text-caption text-fg-muted">La salida más larga</span>
          <span className="block break-words text-body font-semibold">{tituloActividad(larga)}</span>
          <span className="tabular block break-words text-caption text-fg-muted">{[kmTexto(larga.distanciaM), duracionTexto(larga.duracionSeg), ...(larga.desnivelM ? [`+${desnivelTexto(larga.desnivelM)}`] : []), diaMes(larga.fecha)].join(' · ')}</span>
        </span>
      </div>
    </Card>
  </section>
}

/** El resumen del periodo: portada en grafito con su calendario, lo mejor del mes, Entreno, Nutrición, Actividades y la imagen. */
export function ResumenTuPeriodo({ periodo, hoy, onClose }: { periodo: Periodo; hoy: string; onClose: () => void }) {
  const s = useSecciones(periodo, hoy)
  const [ocupado, setOcupado] = useState<'guardar' | 'compartir' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compartible] = useState(puedeCompartirArchivos)

  async function ejecutar(accion: 'guardar' | 'compartir') {
    if (ocupado || !s) return
    setOcupado(accion); setError(null)
    try {
      const svg = svgTuPeriodo({ titulo: periodo.titulo, subtitulo: periodo.subtitulo, ...s.imagen }, coloresDelTema(), await cssFuentesIncrustadas())
      const png = await svgAPng(svg, ANCHO_POSTER, ALTO_POSTER)
      const nombre = nombreArchivoTuPeriodo(periodo.clave, periodo.titulo)
      if (accion === 'compartir') await compartirImagen(png, nombre)
      else descargarImagen(png, nombre)
    } catch {
      setError(accion === 'compartir' ? 'No se ha podido compartir la imagen. Prueba a guardarla.' : 'No se ha podido crear la imagen. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <ModalPage title={periodo.titulo} closeLabel="Inicio" onClose={onClose}>
      {!s ? <LoadingState /> : <div className="space-y-section">
        <section aria-label={`Resumen de ${periodo.subtitulo}`} className="training-surface space-y-5 p-5">
          <div className="space-y-1">
            <p className="training-muted text-rotulo">AppFit · {periodo.subtitulo}</p>
            <h2 className="poster-title">{periodo.titulo}</h2>
            {s.frase && <p className="break-words pt-1 text-body">{s.frase}</p>}
          </div>
          {s.calendario && <CalendarioMes calendario={s.calendario} etiqueta={periodo.subtitulo} />}
        </section>
        <LoMejor s={s} />
        {s.entreno && <Entreno e={s.entreno} />}
        {s.nutricion && <Nutricion n={s.nutricion} />}
        {s.actividades && <Actividades a={s.actividades} />}
        <section aria-label="Imagen del resumen" className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'guardar'} disabled={ocupado !== null} onClick={() => void ejecutar('guardar')}><Icon name="download" size={18} />Guardar imagen</Button>
            {compartible && <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'compartir'} disabled={ocupado !== null} onClick={() => void ejecutar('compartir')}><Icon name="compartir" size={18} />Compartir…</Button>}
          </div>
          <p className="text-caption text-fg-muted">Todo se calcula en el móvil; la imagen solo sale si tú la compartes.</p>
          {error && <ErrorState>{error}</ErrorState>}
        </section>
      </div>}
    </ModalPage>
  )
}
