import { useState } from 'react'
import Button from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import ComoFunciona from '../../shared/components/ComoFunciona'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { ConfigCumbres } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { addDays, formatFriendly, startOfWeek, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import {
  entrenoHoy, textoEntrenoHoy, XP, XP_ACTIVIDAD, xpPorDia,
} from '../experiencia/lib/experiencia'
import { pausaActiva } from '../ritmo/lib/pausas'
import CambiarMontanaSheet from './components/CambiarMontanaSheet'
import ComoSeSube from './components/ComoSeSube'
import FilasMetros from './components/FilasMetros'
import ListaMontanas from './components/ListaMontanas'
import PerfilMontana from './components/PerfilMontana'
import * as cumbresRepo from './data/cumbresRepo'
import { useCumbres } from './hooks/useCumbres'
import {
  cambiarMontana, diasDeExpedicion, empezar, hitosDe, metrosEntre, metrosTexto, montanasParaCambiar,
  nombreExpedicion, vecesCoronada, vecesTexto,
} from './lib/cumbres'
import { MONTANAS, type Montana } from './lib/montanas'

/** Días con metros que se muestran de entrada y en cada «Ver más días». */
const DIAS_POR_PAGINA = 14

const diasTexto = (n: number) => (n === 1 ? '1 día' : `${formatInt(n)} días`)

function desdeTexto(inicio: string, hoy: string): string {
  if (inicio === hoy) return 'Desde hoy'
  if (inicio === addDays(hoy, -1)) return 'Desde ayer'
  return `Desde el ${formatFriendly(inicio)}`
}

/**
 * Cumbres (desde Inicio): la montaña actual con su perfil y sus hitos, la semana frente al plan, los metros de cada día con su
 * porqué, las siguientes y las coronadas (también las repetidas).
 */
export default function CumbresTab({ onIrAAjustes, onVolver }: { onIrAAjustes: () => void; onVolver?: () => void }) {
  const volver = onVolver ? { etiqueta: 'Inicio', onVolver } : undefined
  const hoy = todayISO()
  const estado = useCumbres(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [cambiando, setCambiando] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [diasVisibles, setDiasVisibles] = useState(DIAS_POR_PAGINA)

  if (!estado) return <div className="px-page pt-5"><LoadingState /></div>
  if (!estado.visible) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Cumbres" volver={volver} />
      <EmptyState title="Cumbres ocultas" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Las has ocultado en Ajustes junto con Caminos, Ritmo y Vitrina.
      </EmptyState>
    </div>
  }

  const { cumbres: c, config, conNutricion, plan, resultado: r, nombres } = estado
  const deshacer = (antes: ConfigCumbres | undefined) => () => cumbresRepo.guardar(antes)

  async function empezarCon(m: Montana) {
    try {
      avisar({ mensaje: `Empiezas el ${m.nombre}`, onDeshacer: deshacer(await cumbresRepo.guardar(empezar(hoy, m.id))) })
    } catch {
      avisarError('No se ha podido elegir la montaña. Inténtalo de nuevo.')
    }
  }

  const comoFunciona = <ComoFunciona nombre="Cumbres"><ComoSeSube plan={plan} conNutricion={conNutricion} /></ComoFunciona>

  if (!c || !config) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Cumbres" volver={volver} overline="Montañas reales con lo que entrenas" action={comoFunciona} />
      <Card className="space-y-3">
        <PerfilMontana expedicion={{ montana: MONTANAS[0], metros: 0 }} variante="tarjeta" decorativo />
        <p className="break-words text-body text-fg">Cada entreno, récord, kilómetro andado{conNutricion ? ', comida registrada' : ''} y semana cumplida te sube metros. Elige la primera montaña: empiezas hoy desde el nivel del mar, sin plazo.</p>
      </Card>
      <section aria-label="Elige tu primera montaña" className="space-y-stack">
        <SectionHeader variant="section">Elige tu primera montaña</SectionHeader>
        <ListGroup aria-label="Montañas"><ListaMontanas montanas={MONTANAS} sugerida={MONTANAS[0].id} onElegir={empezarCon} /></ListGroup>
      </section>
      {toast}
    </div>
  }

  const { actual } = c
  const enPausa = pausaActiva(estado.pausas, hoy) !== null
  const lunes = startOfWeek(hoy)
  const metrosSemana = metrosEntre(c.tramos, lunes, addDays(lunes, 6))
  const opciones = montanasParaCambiar(c)
  const veces = vecesCoronada(c)
  const semana = r.semanaActual
  const faltan = [
    semana.entrenos < plan.entrenos ? `${formatInt(plan.entrenos - semana.entrenos)} ${plan.entrenos - semana.entrenos === 1 ? 'entreno' : 'entrenos'}` : null,
    semana.diasRegistrados !== null && semana.diasRegistrados < plan.diasRegistro
      ? `${formatInt(plan.diasRegistro - semana.diasRegistrados)} ${plan.diasRegistro - semana.diasRegistrados === 1 ? 'día registrado' : 'días registrados'}` : null,
  ].filter(Boolean)
  // Solo los días desde el inicio: lo anterior no sube.
  const dias = xpPorDia(r).filter((d) => d.fecha >= c.inicio)

  async function cambiarA(m: Montana) {
    const nueva = config && c ? cambiarMontana(config, c, m.id) : null
    if (!nueva) throw new Error('Montaña no válida')
    const antes = await cumbresRepo.guardar(nueva)
    setCambiando(false)
    avisar({ mensaje: `Ahora subes el ${m.nombre}`, onDeshacer: deshacer(antes) })
  }

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Cumbres" volver={volver} overline="Montañas reales con lo que entrenas" action={comoFunciona} />

    <Card className="space-y-3">
      <div>
        <h2 className="break-words text-heading text-fg">{nombreExpedicion(actual)}</h2>
        <p className="break-words text-body-sm text-fg-muted">{actual.montana.zona}</p>
      </div>
      <PerfilMontana expedicion={actual} />
      <Metric valor={actual.metros} unidad={`de ${metrosTexto(actual.montana.altitud)}`} />
      <p className="tabular break-words text-body-sm text-fg-muted">
        Faltan {metrosTexto(actual.montana.altitud - actual.metros)} · {metrosSemana > 0 ? `+${metrosTexto(metrosSemana)} esta semana` : 'Esta semana aún no has subido'}
      </p>
      <p className="break-words text-body-sm text-fg">{textoEntrenoHoy(entrenoHoy(r, hoy))}</p>
      {enPausa && <p className="break-words text-body-sm text-fg">En el refugio mientras dure la pausa de Ritmo.</p>}
      {opciones.length > 0 && <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setCambiando(true) }}>Cambiar montaña</Button>}
    </Card>

    <section aria-label="Hitos" className="space-y-stack">
      <SectionHeader variant="section">Hitos</SectionHeader>
      <ListGroup aria-label={`Hitos del ${actual.montana.nombre}`}>
        {hitosDe(actual).map((h) => <li key={h.metros} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className={`tabular text-body ${h.cumbre ? 'font-semibold' : 'font-medium'} ${h.alcanzado ? 'text-fg' : 'text-fg-muted'}`}>{h.cumbre ? `Cumbre · ${metrosTexto(h.metros)}` : metrosTexto(h.metros)}</span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{h.alcanzado ? formatFriendly(h.alcanzado.fecha) : `Faltan ${metrosTexto(h.metros - actual.metros)}`}</span>
        </li>)}
      </ListGroup>
    </section>

    <section aria-label="Esta semana" className="space-y-stack">
      <SectionHeader variant="section">Esta semana</SectionHeader>
      <Card className="space-y-3">
        <dl className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Entrenos</dt>
            <dd className="tabular text-body font-semibold text-fg">{formatInt(semana.entrenos)} de {formatInt(plan.entrenos)}</dd>
          </div>
          {semana.diasRegistrados !== null && <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Días registrados</dt>
            <dd className="tabular text-body font-semibold text-fg">{formatInt(semana.diasRegistrados)} de {formatInt(plan.diasRegistro)}</dd>
          </div>}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Días con actividad</dt>
            <dd className="tabular text-body font-semibold text-fg">{formatInt(semana.diasActividad)} de {formatInt(XP_ACTIVIDAD.diasPorSemana)}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Subidos</dt>
            <dd className="tabular text-body font-semibold text-fg">{metrosTexto(metrosSemana)}</dd>
          </div>
        </dl>
        <p className="break-words text-body-sm text-fg">
          {semana.cumplida ? `Semana cumplida: +${metrosTexto(XP.semanaCumplida)}.` : `Para cumplirla: ${faltan.join(' y ')} más (+${metrosTexto(XP.semanaCumplida)}).`}
        </p>
      </Card>
    </section>

    <section aria-label="Tu expedición" className="space-y-stack">
      <SectionHeader variant="section">Tu expedición</SectionHeader>
      <div className="grid grid-cols-2 gap-stack">
        <Card><Metric size="title" label="Cumbres" valor={c.coronadas.length} caption={`${formatInt(veces.size)} de ${formatInt(MONTANAS.length)} montañas`} /></Card>
        <Card><Metric size="title" label="Subidos" valor={c.metrosTotales} unidad="m" caption={desdeTexto(c.inicio, hoy)} /></Card>
      </div>
    </section>

    <section aria-label="Metros de cada día" className="space-y-stack">
      <SectionHeader variant="section">Cada día</SectionHeader>
      {dias.length === 0
        ? <EmptyState>Aún no has subido nada. Termina un entreno{conNutricion ? ', registra una comida' : ''} o sal a caminar y aparecerá aquí con su porqué.</EmptyState>
        : <>
          {dias.slice(0, diasVisibles).map((d) => <section key={d.fecha} aria-label={formatFriendly(d.fecha)} className="space-y-2">
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
              <span className="text-body-sm font-semibold text-fg">{formatFriendly(d.fecha)}</span>
              <span className="tabular text-body-sm text-fg-muted">+{metrosTexto(metrosEntre(c.tramos, d.fecha, d.fecha))}</span>
            </h3>
            <ListGroup aria-label={`Metros del ${formatFriendly(d.fecha)}`}>
              <FilasMetros eventos={d.eventos} sinXp={d.sinXp} actividadesSinXp={d.actividadesSinXp} nombres={nombres} hoy={hoy} />
            </ListGroup>
          </section>)}
          {dias.length > diasVisibles && <Button variant="subtle" block onClick={() => setDiasVisibles((v) => v + DIAS_POR_PAGINA)}>Ver más días</Button>}
        </>}
    </section>

    <section aria-label="Siguientes" className="space-y-stack">
      <SectionHeader variant="section">Siguientes</SectionHeader>
      <ListGroup aria-label="Montañas siguientes">
        {c.siguientes.map((m, i) => <li key={`${m.id}-${i}`} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block break-words text-body font-medium text-fg">{m.nombre}{i === 0 && <span className="ml-2 text-caption font-normal text-fg-muted">La próxima</span>}</span>
            <span className="block break-words text-body-sm text-fg-muted">{m.zona}{veces.has(m.id) ? ` · coronada ${vecesTexto(veces.get(m.id) ?? 0)}` : ''}</span>
          </span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{metrosTexto(m.altitud)}</span>
        </li>)}
      </ListGroup>
    </section>

    <section aria-label="Mis cumbres" className="space-y-stack">
      <SectionHeader variant="section">Mis cumbres</SectionHeader>
      {c.coronadas.length === 0
        ? <EmptyState>Aún ninguna. Al llegar a la cima, la montaña queda aquí con su fecha y lo que tardaste.</EmptyState>
        : <ListGroup aria-label="Cumbres coronadas">
          {[...c.coronadas].reverse().map((x) => {
            const dias = diasDeExpedicion(x)
            return <li key={`${x.montana.id}-${x.vez}`} className="flex min-h-touch items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block break-words text-body font-semibold text-fg">{nombreExpedicion(x)}</span>
                <span className="tabular block break-words text-body-sm text-fg-muted">{x.cumbre ? formatFriendly(x.cumbre.fecha) : ''}{dias !== null ? ` · en ${diasTexto(dias)}` : ''}</span>
              </span>
              <span className="tabular shrink-0 text-body-sm text-fg">{metrosTexto(x.montana.altitud)}</span>
            </li>
          })}
        </ListGroup>}
    </section>


    <CambiarMontanaSheet key={`cambiar-${aperturas}`} open={cambiando} onClose={() => setCambiando(false)} actual={actual} opciones={opciones} veces={veces} onElegir={cambiarA} />
    {toast}
  </div>
}
