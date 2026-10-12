import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Actividad } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import { useCumbres } from '../../cumbres/hooks/useCumbres'
import { describirActividadSinXp, describirEvento, xpDeActividadId } from '../../experiencia/lib/experiencia'
import { useCaminos } from '../hooks/useCaminos'
import { caminoDeActividad, nombreExpedicion } from '../lib/caminos'

function Fila({ titulo, detalle, cifra }: { titulo: string; detalle: string; cifra?: string }) {
  return <li className="flex items-start justify-between gap-3 py-3">
    <span className="min-w-0">
      <span className="block break-words text-body font-medium text-fg">{titulo}</span>
      <span className="tabular block break-words text-body-sm text-fg-muted">{detalle}</span>
    </span>
    {cifra && <span className="tabular shrink-0 text-body font-semibold text-fg">{cifra}</span>}
  </li>
}

/**
 * Lo que dio una actividad: los metros de su día en Cumbres (o por qué no suben) y lo que avanzó en Caminos (etapas
 * terminadas y llegadas). No aparece con la gamificación oculta.
 */
export default function AvanceActividad({ actividad }: { actividad: Actividad }) {
  const hoy = todayISO()
  const cumbres = useCumbres(hoy)
  const caminos = useCaminos(hoy)
  if (!cumbres?.visible || !caminos?.visible) return null

  const xp = xpDeActividadId(cumbres.resultado, actividad.id)
  const enCumbres = cumbres.cumbres !== null && actividad.fecha >= cumbres.cumbres.inicio
  const filaCumbres = !cumbres.cumbres
    ? <Fila titulo="Cumbres" detalle="Elige tu primera montaña en Más › Cumbres y los km te subirán metros." />
    : !enCumbres
      ? <Fila titulo="Cumbres" detalle="Es de antes de empezar Cumbres." />
      : xp.evento
        ? <Fila titulo="Cumbres" detalle={`${describirEvento(xp.evento, {}).detalle}${xp.evento.actividadIds.length > 1 ? ', con las demás del día' : ''}`} cifra={`+${formatInt(xp.evento.xp)} m`} />
        : <Fila titulo="No sube en Cumbres" detalle={xp.sinXp ? describirActividadSinXp(xp.sinXp, hoy) : 'Sin metros'} />

  const r = caminos.caminos
  const avance = r ? caminoDeActividad(r, actividad.id) : null
  const expedicion = r?.tramos.find((t) => t.actividadId === actividad.id && t.metros > 0)
  let filaCaminos
  if (!r || !avance) filaCaminos = <Fila titulo="Caminos" detalle="Elige tu primer Camino en Más › Caminos y los km de tus actividades lo avanzarán." />
  else if (actividad.fecha < r.inicio) filaCaminos = <Fila titulo="Caminos" detalle="Es de antes de empezar Caminos." />
  else if (avance.metros === 0 || !expedicion) filaCaminos = <Fila titulo="Caminos" detalle="No avanzó ningún camino." />
  else {
    const x = r.expediciones[expedicion.expedicion]
    const etapas = avance.etapas.map((e) => e.expedicion.ruta.etapas[e.indice].hasta)
    const detalle = avance.llegadas.length
      ? `Llegada a ${avance.llegadas[0].ruta.etapas.at(-1)?.hasta ?? 'la meta'}`
      : etapas.length ? `Llegaste a ${etapas.join(', ')}` : 'Sigues en la misma etapa'
    filaCaminos = <Fila titulo={nombreExpedicion(x)} detalle={detalle} cifra={`+${kmTexto(avance.metros)}`} />
  }

  return <section aria-label="Cumbres y Caminos" className="space-y-stack">
    <SectionHeader variant="section">Cumbres y Caminos</SectionHeader>
    <ListGroup aria-label="Lo que dio esta actividad">
      {filaCumbres}
      {filaCaminos}
    </ListGroup>
  </section>
}
