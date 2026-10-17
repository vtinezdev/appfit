import { useState } from 'react'
import Button from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import ComoFunciona from '../../shared/components/ComoFunciona'
import Disclosure from '../../shared/components/Disclosure'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { ConfigCaminos, RutaPropia } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { addDays, formatFriendly, startOfWeek, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { formatKm, kmTexto } from '../actividades/lib/actividad'
import CambiarRutaSheet from './components/CambiarRutaSheet'
import ComoSeAvanza from './components/ComoSeAvanza'
import EditorRuta from './components/EditorRuta'
import MapaRuta from './components/MapaRuta'
import ListaRutas from './components/ListaRutas'
import TrazadoCamino from './components/TrazadoCamino'
import * as caminosRepo from './data/caminosRepo'
import { useCaminos } from './hooks/useCaminos'
import {
  cambiarRuta, diasDeExpedicion, empezar, etapaActual, finalesDeEtapa, metrosEntre, nombreExpedicion, rutasParaCambiar, vecesTerminada, vecesTexto,
} from './lib/caminos'
import { metrosRuta, NOMBRE_COLECCION, NOTA_COLECCION, RUTAS, type ColeccionRuta, type Ruta } from './lib/rutas'
import { esRutaPropia, idDeRutaPropia, posicionEnRutaPropia, PREFIJO, puntosDe } from './lib/rutasPropias'

/** Etapas por delante que se enseñan fuera del desplegable. */
const PROXIMAS = 3
const COLECCIONES: ColeccionRuta[] = ['santiago', 'mundo', 'literatura', 'fantasia']

const diasTexto = (n: number) => (n === 1 ? '1 día' : `${formatInt(n)} días`)
const sellosTexto = (n: number) => (n === 1 ? '1 sello' : `${formatInt(n)} sellos`)

function desdeTexto(inicio: string, hoy: string): string {
  if (inicio === hoy) return 'Desde hoy'
  if (inicio === addDays(hoy, -1)) return 'Desde ayer'
  return `Desde el ${formatFriendly(inicio)}`
}

interface Props {
  onIrAAjustes: () => void
  onIrAActividades: () => void
}

/**
 * Caminos (desde Inicio): la ruta actual con sus etapas, la credencial, la semana, las siguientes y las terminadas. Avanza con
 * los km de las actividades (caminar, correr y senderismo) desde el día en que se elige la primera ruta.
 */
export default function CaminosTab({ onIrAAjustes, onIrAActividades }: Props) {
  const hoy = todayISO()
  const estado = useCaminos(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [cambiando, setCambiando] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [editor, setEditor] = useState<{ ruta?: RutaPropia; n: number } | null>(null)

  if (!estado) return <div className="px-page pt-5"><LoadingState /></div>
  if (!estado.visible) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Caminos" />
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

  async function empezarCon(r: Ruta) {
    try {
      avisar({ mensaje: `Empiezas ${r.nombre}`, onDeshacer: deshacer(await caminosRepo.guardar(empezar(hoy, r.id))) })
    } catch {
      avisarError('No se ha podido elegir la ruta. Inténtalo de nuevo.')
    }
  }

  const comoFunciona = <ComoFunciona nombre="Caminos"><ComoSeAvanza /></ComoFunciona>

  if (!c || !config) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Caminos" overline="Rutas reales y de ficción con tus km" action={comoFunciona} />
      <Card className="space-y-3">
        <TrazadoCamino expedicion={{ ruta: RUTAS[0], metros: 0 }} decorativo />
        <p className="break-words text-body text-fg">Recorre rutas reales y de libro con los km que caminas y corres. Elige la primera: empiezas hoy, sin plazo.</p>
        <Button variant="ghost" size="sm" onClick={onIrAActividades}>Ir a Actividades</Button>
      </Card>
      {tusRutas(empezarCon, true)}
      {COLECCIONES.map((col) => <section key={col} aria-label={NOMBRE_COLECCION[col]} className="space-y-stack">
        <SectionHeader variant="section">{NOMBRE_COLECCION[col]}</SectionHeader>
        <p className="break-words text-body-sm text-fg-muted">{NOTA_COLECCION[col]}</p>
        <ListGroup aria-label={NOMBRE_COLECCION[col]}><ListaRutas rutas={RUTAS.filter((r) => r.coleccion === col)} sugerida={RUTAS[0].id} onElegir={empezarCon} /></ListGroup>
      </section>)}
      {editorRuta}
      {toast}
    </div>
  }

  const { actual } = c
  const propiaActual = propiaDe(actual.ruta)
  const enMapa = propiaActual ? posicionEnRutaPropia(propiaActual, actual.metros) : null
  const etapa = etapaActual(actual)
  const total = metrosRuta(actual.ruta)
  const finales = finalesDeEtapa(actual.ruta)
  const lunes = startOfWeek(hoy)
  const metrosSemana = metrosEntre(c.tramos, lunes, addDays(lunes, 6))
  const opciones = rutasParaCambiar(c, rutasPropias)
  const veces = vecesTerminada(c)
  const proximas = actual.ruta.etapas.map((e, i) => ({ ...e, i })).filter(({ i }) => actual.etapas[i] === null).slice(0, PROXIMAS)

  async function cambiarA(r: Ruta) {
    const nueva = config && c ? cambiarRuta(config, c, r.id, rutasPropias) : null
    if (!nueva) throw new Error('Ruta no válida')
    const antes = await caminosRepo.guardar(nueva)
    setCambiando(false)
    avisar({ mensaje: `Ahora recorres ${r.nombre}`, onDeshacer: deshacer(antes) })
  }

  const filaEtapa = (i: number) => {
    const marca = actual.etapas[i]
    return <li key={i} className="flex min-h-touch items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className={`block break-words text-body ${marca ? 'font-medium text-fg' : 'text-fg-muted'}`}>{actual.ruta.etapas[i].hasta}</span>
        <span className="tabular block text-caption text-fg-muted">Etapa {formatInt(i + 1)} · {kmTexto(Math.round(actual.ruta.etapas[i].km * 1000))}</span>
      </span>
      <span className="tabular shrink-0 text-body-sm text-fg-muted">{marca ? formatFriendly(marca.fecha) : `Faltan ${kmTexto(finales[i] - actual.metros)}`}</span>
    </li>
  }

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Caminos" overline="Rutas reales y de ficción con tus km" action={comoFunciona} />

    <Card className="space-y-3">
      <div>
        <h2 className="break-words text-heading text-fg">{nombreExpedicion(actual)}</h2>
        <p className="break-words text-body-sm text-fg-muted">{actual.ruta.zona} · desde {actual.ruta.desde}</p>
      </div>
      {propiaActual && enMapa
        ? <MapaRuta puntos={puntosDe(propiaActual)} recorrido={enMapa.recorrido} posicion={enMapa.posicion} label={`${actual.ruta.nombre}: ${formatKm(actual.metros)} de ${kmTexto(total)}, por la etapa hacia ${etapa.hasta}`} />
        : <TrazadoCamino expedicion={actual} />}
      <Metric valor={formatKm(actual.metros)} unidad={`de ${kmTexto(total)}`} />
      <p className="tabular break-words text-body-sm text-fg">
        Etapa {formatInt(etapa.indice + 1)} de {formatInt(actual.ruta.etapas.length)}: {etapa.desde} → {etapa.hasta} · {formatKm(etapa.recorridos)} de {kmTexto(etapa.total)}
      </p>
      <p className="tabular break-words text-body-sm text-fg-muted">
        {metrosSemana > 0 ? `+${kmTexto(metrosSemana)} esta semana` : 'Esta semana aún no has avanzado'} · {sellosTexto(actual.sellos.length)} en la credencial
      </p>
      {opciones.length > 0 && <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setCambiando(true) }}>Cambiar de ruta</Button>}
    </Card>

    <section aria-label="Próximas etapas" className="space-y-stack">
      <SectionHeader variant="section">Próximas etapas</SectionHeader>
      <ListGroup aria-label={`Próximas etapas de ${actual.ruta.nombre}`}>{proximas.map(({ i }) => filaEtapa(i))}</ListGroup>
      {actual.ruta.etapas.length > PROXIMAS && <Disclosure title={`Todas las etapas (${formatInt(actual.ruta.etapas.length)})`}>
        <ul className="app-list-flat" aria-label={`Etapas de ${actual.ruta.nombre}`}>{actual.ruta.etapas.map((_, i) => filaEtapa(i))}</ul>
      </Disclosure>}
    </section>

    <section aria-label="Tu viaje" className="space-y-stack">
      <SectionHeader variant="section">Tu viaje</SectionHeader>
      <div className="grid grid-cols-2 gap-stack">
        <Card><Metric size="title" label="Rutas" valor={c.completadas.length} caption={`${formatInt(veces.size)} de ${formatInt(RUTAS.length)} distintas`} /></Card>
        <Card><Metric size="title" label="Recorridos" valor={formatKm(c.metrosTotales)} unidad="km" caption={desdeTexto(c.inicio, hoy)} /></Card>
      </div>
    </section>

    <section aria-label="Siguientes" className="space-y-stack">
      <SectionHeader variant="section">Siguientes</SectionHeader>
      <ListGroup aria-label="Rutas siguientes">
        {c.siguientes.map((r, i) => <li key={`${r.id}-${i}`} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block break-words text-body font-medium text-fg">{r.nombre}{i === 0 && <span className="ml-2 text-caption font-normal text-fg-muted">La próxima</span>}</span>
            <span className="block break-words text-body-sm text-fg-muted">{r.zona}{veces.has(r.id) ? ` · hecha ${vecesTexto(veces.get(r.id) ?? 0)}` : ''}</span>
          </span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{kmTexto(metrosRuta(r))}</span>
        </li>)}
      </ListGroup>
    </section>

    <section aria-label="Mis caminos" className="space-y-stack">
      <SectionHeader variant="section">Mis caminos</SectionHeader>
      {c.completadas.length === 0
        ? <EmptyState>Aún ninguno. Al llegar, la ruta queda aquí con su fecha, lo que tardaste y los sellos de su credencial.</EmptyState>
        : <ListGroup aria-label="Rutas terminadas">
          {[...c.completadas].reverse().map((x) => {
            const dias = diasDeExpedicion(x)
            return <li key={`${x.ruta.id}-${x.vez}`} className="flex min-h-touch items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block break-words text-body font-semibold text-fg">{nombreExpedicion(x)}</span>
                <span className="tabular block break-words text-body-sm text-fg-muted">{x.llegada ? formatFriendly(x.llegada.fecha) : ''}{dias !== null ? ` · en ${diasTexto(dias)}` : ''} · {sellosTexto(x.sellos.length)}</span>
              </span>
              <span className="tabular shrink-0 text-body-sm text-fg">{kmTexto(metrosRuta(x.ruta))}</span>
            </li>
          })}
        </ListGroup>}
    </section>

    {tusRutas((r) => abrirEditor(propiaDe(r)), false)}


    {editorRuta}
    <CambiarRutaSheet key={`cambiar-${aperturas}`} open={cambiando} onClose={() => setCambiando(false)} actual={actual} opciones={opciones} veces={veces} onElegir={cambiarA} />
    {toast}
  </div>
}
