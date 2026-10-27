import { useState } from 'react'
import Button from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import ComoFunciona from '../../shared/components/ComoFunciona'
import Icon from '../../shared/components/Icon'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import SegmentedControl from '../../shared/components/SegmentedControl'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { ConfigCaminos, RutaPropia } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { addDays, formatDiaMes, formatFriendly, parseISODate, startOfWeek, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { formatKm, kmTexto } from '../actividades/lib/actividad'
import CambiarRutaSheet from './components/CambiarRutaSheet'
import ComoSeAvanza from './components/ComoSeAvanza'
import EditorRuta from './components/EditorRuta'
import MapaRuta from './components/MapaRuta'
import ListaRutas from './components/ListaRutas'
import PasosCaminos from './components/PasosCaminos'
import TarjetaRuta from './components/TarjetaRuta'
import TrazadoCamino from './components/TrazadoCamino'
import * as caminosRepo from './data/caminosRepo'
import { useCaminos } from './hooks/useCaminos'
import {
  cambiarRuta, confirmarRuta, diasDeExpedicion, empezar, etapaActual, metrosEntre, nombreExpedicion, rutasParaCambiar, vecesTerminada,
} from './lib/caminos'
import { metrosRuta, NOMBRE_COLECCION, NOTA_COLECCION, RUTAS, type ColeccionRuta, type Ruta } from './lib/rutas'
import { esRutaPropia, idDeRutaPropia, posicionEnRutaPropia, PREFIJO, puntosDe } from './lib/rutasPropias'

const COLECCIONES: ColeccionRuta[] = ['santiago', 'mundo', 'literatura', 'fantasia']

const diasTexto = (n: number) => (n === 1 ? '1 día' : `${formatInt(n)} días`)

function desdeTexto(inicio: string, hoy: string): string {
  if (inicio === hoy) return 'Desde hoy'
  if (inicio === addDays(hoy, -1)) return 'Desde ayer'
  return `Desde el ${formatFriendly(inicio)}`
}

interface Props {
  onIrAAjustes: () => void
  onIrAActividades: () => void
  /** «‹ Inicio» en la cabecera. */
  onVolver?: () => void
  /** Como pestaña de Progreso (B12): sin márgenes de página ni título visible. */
  incrustada?: boolean
  /** Viene de la hoja de llegada: abre la lista para elegir la próxima ruta (si aún está por elegir). */
  elegirAlEntrar?: boolean
}

/**
 * Caminos (desde Inicio): la ruta actual con sus etapas, la credencial, la semana, los pasos, las siguientes y las terminadas.
 * Avanza con los km de las actividades (caminar, correr y senderismo) y de los pasos desde el día en que se elige la primera ruta.
 */
export default function CaminosTab({ onIrAAjustes, onIrAActividades, onVolver, incrustada = false, elegirAlEntrar = false }: Props) {
  const volver = onVolver && !incrustada ? { etiqueta: 'Inicio', onVolver } : undefined
  const marco = incrustada ? '' : 'px-page pt-5'
  const hoy = todayISO()
  const estado = useCaminos(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [cambiando, setCambiando] = useState<'cambiar' | 'llegada' | false>(elegirAlEntrar ? 'llegada' : false)
  const [lista, setLista] = useState<'pendientes' | 'hechos'>('pendientes')
  const [aperturas, setAperturas] = useState(0)
  const [editor, setEditor] = useState<{ ruta?: RutaPropia; n: number } | null>(null)

  if (!estado) return <div className={marco}><LoadingState /></div>
  if (!estado.visible) {
    return <div className={`space-y-section ${marco}`}>
      <PageHeader incrustada={incrustada} title="Caminos" volver={volver} />
      <EmptyState title="Caminos ocultos" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Los has ocultado en Ajustes junto con Cumbres, Ritmo y Vitrina.
      </EmptyState>
    </div>
  }

  const { caminos: c, config, propias, rutasPropias } = estado
  const propiaDe = (r: Ruta) => (esRutaPropia(r.id) ? propias.find((p) => p.id === Number(r.id.slice(PREFIJO.length))) : undefined)
  const abrirEditor = (ruta?: RutaPropia) => setEditor({ ruta, n: Date.now() })
  const editorRuta = editor && <EditorRuta key={editor.n} ruta={editor.ruta} enUso={!!editor.ruta && !!config?.ruta.includes(idDeRutaPropia(editor.ruta.id))}
    onClose={() => setEditor(null)} onHecho={(mensaje) => { setEditor(null); avisar({ mensaje }) }} />
  const tusRutas = (alElegir: (r: Ruta) => void, conEditar: boolean) => <section aria-label="Tus rutas" className="space-y-stack">
    <SectionHeader variant="section">Tus rutas</SectionHeader>
    <p className="break-words text-body-sm text-fg-muted">{rutasPropias.length ? NOTA_COLECCION.propia : 'Crea una ruta entre dos lugares de España, como Tarragona – Valencia, con paradas por el camino.'}</p>
    {rutasPropias.length > 0 && <ListGroup aria-label="Tus rutas"><ListaRutas rutas={rutasPropias} onElegir={alElegir} onEditar={conEditar ? (r) => abrirEditor(propiaDe(r)) : undefined} /></ListGroup>}
    <Button variant="secondary" size="sm" onClick={() => abrirEditor()}>Crear ruta</Button>
  </section>
  const deshacer = (antes: ConfigCaminos | undefined) => () => caminosRepo.guardar(antes)
  const pasos = <PasosCaminos hoy={hoy} inicio={config?.inicio} aportes={estado.aportes} zancada={estado.zancada} zancadaEstimada={estado.zancadaEstimada}
    avisar={avisar} avisarError={avisarError} />

  async function empezarCon(r: Ruta) {
    try {
      avisar({ mensaje: `Empiezas ${r.nombre}`, onDeshacer: deshacer(await caminosRepo.guardar(empezar(hoy, r.id))) })
    } catch {
      avisarError('No se ha podido elegir la ruta. Inténtalo de nuevo.')
    }
  }

  const comoFunciona = <ComoFunciona nombre="Caminos"><ComoSeAvanza /></ComoFunciona>

  if (!c || !config) {
    return <div className={`space-y-section ${marco}`}>
      <PageHeader incrustada={incrustada} title="Caminos" volver={volver} overline="Rutas reales y de ficción con tus km" action={comoFunciona} />
      <Card className="space-y-3">
        <TrazadoCamino expedicion={{ ruta: RUTAS[0], metros: 0 }} decorativo />
        <p className="break-words text-body text-fg">Recorre rutas reales y de libro con los km que caminas y corres, y con tus pasos. Elige la primera: empiezas hoy, sin plazo.</p>
        <Button variant="ghost" size="sm" onClick={onIrAActividades}>Ir a Actividades</Button>
      </Card>
      {tusRutas(empezarCon, true)}
      {COLECCIONES.map((col) => <section key={col} aria-label={NOMBRE_COLECCION[col]} className="space-y-stack">
        <SectionHeader variant="section">{NOMBRE_COLECCION[col]}</SectionHeader>
        <p className="break-words text-body-sm text-fg-muted">{NOTA_COLECCION[col]}</p>
        <ListGroup aria-label={NOMBRE_COLECCION[col]}><ListaRutas rutas={RUTAS.filter((r) => r.coleccion === col)} sugerida={RUTAS[0].id} onElegir={empezarCon} /></ListGroup>
      </section>)}
      {pasos}
      {editorRuta}
      {toast}
    </div>
  }

  const { actual } = c
  const propiaActual = propiaDe(actual.ruta)
  const enMapa = propiaActual ? posicionEnRutaPropia(propiaActual, actual.metros) : null
  const etapa = etapaActual(actual)
  const total = metrosRuta(actual.ruta)
  const lunes = startOfWeek(hoy)
  const metrosSemana = metrosEntre(c.tramos, lunes, addDays(lunes, 6))
  const opciones = rutasParaCambiar(c, rutasPropias)
  const veces = vecesTerminada(c)

  async function cambiarA(r: Ruta) {
    const nueva = config && c ? cambiarRuta(config, c, r.id, rutasPropias) : null
    if (!nueva) throw new Error('Ruta no válida')
    const antes = await caminosRepo.guardar(nueva)
    setCambiando(false)
    avisar({ mensaje: `Ahora recorres ${r.nombre}`, onDeshacer: deshacer(antes) })
  }

  const ultimaCompletada = c.completadas.at(-1)
  const sugerida = !c.actualElegida && ultimaCompletada ? actual.ruta : null

  async function seguirCon() {
    if (!config || !c) return
    try {
      avisar({ mensaje: `Sigues con ${actual.ruta.nombre}`, onDeshacer: deshacer(await caminosRepo.guardar(confirmarRuta(config, c))) })
    } catch {
      avisarError('No se ha podido guardar la ruta. Inténtalo de nuevo.')
    }
  }
  const abrirRutas = (modo: 'cambiar' | 'llegada') => { setAperturas((n) => n + 1); setCambiando(modo) }

  async function elegirDeLista(r: Ruta) {
    try {
      await cambiarA(r)
    } catch {
      avisarError(r.id === actual.ruta.id ? `Ya vas por ${r.nombre}.` : `${r.nombre} es más corta que lo que llevas en esta ruta: elígela cuando llegues.`)
    }
  }
  // Por hacer: las rutas que aún no has terminado nunca, por colección, sin la que llevas ahora.
  const porHacer = (col: ColeccionRuta) => RUTAS.filter((r) => r.coleccion === col && !veces.has(r.id) && r.id !== actual.ruta.id)
  const pendientes = COLECCIONES.reduce((n, col) => n + porHacer(col).length, 0)
  // Terminados: una fila por ruta (la última vez que se terminó), de la más reciente a la más antigua.
  const terminadas = [...c.completadas].reverse().filter((x, i, todas) => todas.findIndex((y) => y.ruta.id === x.ruta.id) === i)

  return <div className={`space-y-section ${marco}`}>
    {!incrustada && <PageHeader title="Caminos" volver={volver} />}

    {sugerida && ultimaCompletada && <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="flag" size={20} /></span>
        <div className="min-w-0">
          <h2 className="break-words text-title text-fg">Has llegado a {ultimaCompletada.ruta.etapas.at(-1)?.hasta}</h2>
          <p className="break-words text-body-sm text-fg-muted">
            {nombreExpedicion(ultimaCompletada)}{ultimaCompletada.llegada ? `, terminada el ${formatDiaMes(parseISODate(ultimaCompletada.llegada.fecha).getTime())}` : ''}. Elige tu próxima ruta: {actual.metros > 0 ? `los ${kmTexto(actual.metros)} que llevas desde entonces cuentan para ella.` : 'empiezas con lo que andes desde ahora.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => abrirRutas('llegada')}>Elegir ruta</Button>
        <Button variant="secondary" size="sm" onClick={() => { void seguirCon() }}>Seguir con {sugerida.nombre}</Button>
      </div>
    </Card>}

    <TarjetaRuta actual={actual} sugerida={!!sugerida} metrosSemana={metrosSemana} ayuda={comoFunciona}
      mapa={propiaActual && enMapa ? <MapaRuta puntos={puntosDe(propiaActual)} recorrido={enMapa.recorrido} posicion={enMapa.posicion} label={`${actual.ruta.nombre}: ${formatKm(actual.metros)} de ${kmTexto(total)}, por la etapa hacia ${etapa.hasta}`} /> : undefined}
      onCambiar={opciones.length > 0 && !sugerida ? () => abrirRutas('cambiar') : undefined} />

    {pasos}

    {/* Caminos (punto 6): título centrado, distinto de los de sección, y dos partes: por hacer (crear, tuyas y de la app) y terminados (repetir). */}
    <section aria-labelledby="caminos-lista" className="space-y-stack">
      <h2 id="caminos-lista" className="flex items-center gap-3 text-rotulo text-fg-muted"><span aria-hidden className="h-px flex-1 bg-line-strong" />Caminos<span aria-hidden className="h-px flex-1 bg-line-strong" /></h2>
      <SegmentedControl label="Qué caminos" valor={lista} onChange={setLista}
        opciones={[{ valor: 'pendientes', label: 'Por hacer' }, { valor: 'hechos', label: `Terminados${terminadas.length ? ` (${formatInt(terminadas.length)})` : ''}` }]} />
      {lista === 'pendientes' ? <div className="space-y-section">
        <Button variant="secondary" block onClick={() => abrirEditor()}><Icon name="route" size={18} />Crear una ruta</Button>
        <section aria-label="Tus caminos" className="space-y-2">
          <p className="text-rotulo text-fg-muted">Tus caminos</p>
          {rutasPropias.length > 0
            ? <ListGroup aria-label="Tus caminos"><ListaRutas rutas={rutasPropias} veces={veces} onElegir={(r) => { void elegirDeLista(r) }} onEditar={(r) => abrirEditor(propiaDe(r))} /></ListGroup>
            : <p className="text-body-sm text-fg-muted">Las rutas que crees, entre dos lugares de España y con paradas, salen aquí.</p>}
        </section>
        <section aria-label="Caminos de la app" className="space-y-stack">
          <p className="text-rotulo text-fg-muted">Caminos de la app · {formatInt(pendientes)}</p>
          {COLECCIONES.filter((col) => porHacer(col).length > 0).map((col) => <div key={col} className="space-y-1">
            <p className="px-1 text-caption font-semibold text-fg">{NOMBRE_COLECCION[col]}</p>
            <ListGroup aria-label={NOMBRE_COLECCION[col]}><ListaRutas rutas={porHacer(col)} sugerida={c.siguientes[0]?.id} onElegir={(r) => { void elegirDeLista(r) }} /></ListGroup>
          </div>)}
          {pendientes === 0 && <p className="text-body-sm text-fg-muted">Has hecho todas: puedes repetirlas desde «Terminados».</p>}
        </section>
      </div> : <div className="space-y-stack">
        <Card padded={false} className="grid grid-cols-2 overflow-hidden">
          <div className="min-w-0 border-r border-line px-card py-3"><Metric size="title" label="Rutas" valor={c.completadas.length} caption={`${formatInt(veces.size)} de ${formatInt(RUTAS.length)} distintas`} /></div>
          <div className="min-w-0 px-card py-3"><Metric size="title" label="Recorridos" valor={formatKm(c.metrosTotales)} unidad="km" caption={desdeTexto(c.inicio, hoy)} /></div>
        </Card>
        {terminadas.length === 0
          ? <EmptyState>Aún ninguno. Al llegar, la ruta queda aquí con su fecha, lo que tardaste y los sellos de su credencial.</EmptyState>
          : <ListGroup aria-label="Caminos terminados">
            {terminadas.map((x) => {
              const dias = diasDeExpedicion(x)
              const n = veces.get(x.ruta.id) ?? 1
              return <li key={x.ruta.id} className="flex min-h-touch items-center gap-3 py-2">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="flag" size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-body font-semibold text-fg">{x.ruta.nombre}</span>
                  <span className="tabular block break-words text-caption text-fg-muted">{kmTexto(metrosRuta(x.ruta))}{x.llegada ? ` · ${formatFriendly(x.llegada.fecha)}` : ''}{dias !== null ? ` · en ${diasTexto(dias)}` : ''}{n > 1 ? ` · ${formatInt(n)} veces` : ''}</span>
                </span>
                {x.ruta.id !== actual.ruta.id && <Button variant="secondary" size="sm" onClick={() => { void elegirDeLista(x.ruta) }}>Repetir</Button>}
              </li>
            })}
          </ListGroup>}
      </div>}
    </section>

    {editorRuta}
    <CambiarRutaSheet key={`cambiar-${aperturas}`} open={cambiando === 'cambiar' || (cambiando === 'llegada' && !!sugerida)} onClose={() => setCambiando(false)} actual={actual} opciones={opciones} veces={veces} onElegir={cambiarA}
      llegada={cambiando === 'llegada' ? { onCrear: () => { setCambiando(false); abrirEditor() } } : undefined} />
    {toast}
  </div>
}
