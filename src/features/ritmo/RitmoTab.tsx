import { useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import Disclosure from '../../shared/components/Disclosure'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { Pausa } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { formatFriendly, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { useAtributos } from '../atributos/hooks/useAtributos'
import { SERIES_MINIMAS } from '../atributos/lib/atributos'
import CalendarioSemanas from './components/CalendarioSemanas'
import DiasSemana from './components/DiasSemana'
import PausarSheet from './components/PausarSheet'
import * as pausasRepo from './data/pausasRepo'
import { describirPausa, pausaActiva } from './lib/pausas'
import { DIAS_PRESENCIA, ESTADOS_SEMANA, MAX_COMODINES, SEMANAS_POR_COMODIN } from './lib/ritmo'
import { cifrasSemana, faltaParaCumplir } from './lib/textos'

const semanasTexto = (n: number) => (n === 1 ? '1 semana' : `${formatInt(n)} semanas`)

/** Ritmo (en Más): la semana en curso, hilo y comodines, el calendario de semanas, hitos y pausas. */
export default function RitmoTab({ onIrAAjustes }: { onIrAAjustes: () => void }) {
  const hoy = todayISO()
  const estado = useAtributos(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [pausando, setPausando] = useState(false)
  const [aperturas, setAperturas] = useState(0)

  if (!estado) return <div className="px-page pt-5"><LoadingState /></div>
  if (!estado.visible) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Ritmo" />
      <EmptyState title="Ritmo oculto" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Lo has ocultado en Ajustes junto con Atributos y Vitrina.
      </EmptyState>
    </div>
  }

  const { resultado: r, plan, pausas, conNutricion } = estado
  const ritmo = r.ritmo
  const s = ritmo.actual
  const activa = pausaActiva(pausas, hoy)
  const deshacer = (antes: Pausa[]) => () => pausasRepo.restaurar(antes)

  async function reanudar(p: Pausa) {
    try {
      avisar({ mensaje: 'Pausa terminada', onDeshacer: deshacer(await pausasRepo.reanudar(p.id, hoy)) })
    } catch {
      avisarError('No se ha podido reanudar. Inténtalo de nuevo.')
    }
  }
  async function borrar(p: Pausa) {
    try {
      avisar({ mensaje: 'Pausa borrada', onDeshacer: deshacer(await pausasRepo.borrar(p.id)) })
    } catch {
      avisarError('No se ha podido borrar la pausa. Inténtalo de nuevo.')
    }
  }

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Ritmo" overline="Tu constancia semana a semana" />

    {activa && <Card tone="muted" className="space-y-3">
      <p className="text-title text-fg">En pausa</p>
      <p className="break-words text-body-sm text-fg-muted">{describirPausa(activa)}. El hilo se congela mientras dure.</p>
      <Button variant="secondary" onClick={() => reanudar(activa)}>Reanudar hoy</Button>
    </Card>}

    <section aria-label="Esta semana" className="space-y-stack">
      <SectionHeader variant="section">Esta semana</SectionHeader>
      <Card className="space-y-3">
        <p className="text-title text-fg">{s.cumplida ? ESTADOS_SEMANA.cumplida.nombre : s.estado === 'vacia' ? 'En curso' : `${ESTADOS_SEMANA[s.estado].nombre} por ahora`}</p>
        <DiasSemana lunes={s.lunes} hoy={hoy} diasEntreno={r.diasEntreno} diasRegistro={conNutricion ? r.diasRegistro : null} />
        <p className="text-caption text-fg-muted">Círculo relleno: entreno de {formatInt(SERIES_MINIMAS)} series efectivas o más.{conNutricion ? ' Punto relleno: día con comidas registradas.' : ''}</p>
        <p className="tabular break-words text-body-sm text-fg-muted">{cifrasSemana(s)}</p>
        <p className="break-words text-body-sm text-fg">{faltaParaCumplir(s) ?? 'Plan de la semana cumplido. Entrenar o registrar de más no suma.'}</p>
      </Card>
    </section>

    <section aria-label="Hilo y comodines" className="space-y-stack">
      <SectionHeader variant="section">Hilo</SectionHeader>
      <div className="grid grid-cols-2 gap-stack">
        <Card><Metric size="title" label="Hilo actual" valor={ritmo.hiloActual} unidad={ritmo.hiloActual === 1 ? 'semana' : 'semanas'} caption="Seguidas con presencia" /></Card>
        <Card><Metric size="title" label="Mejor hilo" valor={ritmo.mejorHilo} unidad={ritmo.mejorHilo === 1 ? 'semana' : 'semanas'} caption="No se pierde nunca" /></Card>
        <Card><Metric size="title" label="Comodines" valor={`${formatInt(ritmo.comodines)} de ${formatInt(MAX_COMODINES)}`}
          caption={ritmo.comodines >= MAX_COMODINES ? 'Al máximo' : `Otro en ${semanasTexto(SEMANAS_POR_COMODIN - ritmo.progresoComodin)} cumplidas`} /></Card>
        <Card><Metric size="title" label="Cumplidas" valor={ritmo.cumplidas} unidad={ritmo.cumplidas === 1 ? 'semana' : 'semanas'} caption={ritmo.vueltas ? `${formatInt(ritmo.vueltas)} ${ritmo.vueltas === 1 ? 'vuelta' : 'vueltas'} tras una semana vacía` : 'Desde el principio'} /></Card>
      </div>
    </section>

    <section aria-label="Semanas" className="space-y-stack">
      <SectionHeader variant="section">Semanas</SectionHeader>
      <Card><CalendarioSemanas ritmo={ritmo} hoy={hoy} /></Card>
    </section>

    <section aria-label="Hitos" className="space-y-stack">
      <SectionHeader variant="section">Hitos</SectionHeader>
      <ListGroup aria-label="Hitos de semanas cumplidas">
        {ritmo.hitos.map((h) => <li key={h.semanas} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="text-body font-medium text-fg">{formatInt(h.semanas)} semanas cumplidas</span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{h.fecha ? formatFriendly(h.fecha) : `Faltan ${formatInt(h.semanas - ritmo.cumplidas)}`}</span>
        </li>)}
      </ListGroup>
    </section>

    <section aria-label="Pausas" className="space-y-stack">
      <SectionHeader variant="section" action={!activa && <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setPausando(true) }}>Pausar</Button>}>Pausas</SectionHeader>
      {pausas.length === 0
        ? <EmptyState>Sin pausas. Úsalas en vacaciones, enfermedad, lesión o viaje: la semana no rompe el hilo.</EmptyState>
        : <ListGroup aria-label="Pausas declaradas">
          {[...pausas].reverse().map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 break-words text-body-sm text-fg">{describirPausa(p)}</span>
            <IconButton icon="trash" label={`Borrar la pausa: ${describirPausa(p)}`} variant="ghost" onClick={() => borrar(p)} />
          </li>)}
        </ListGroup>}
    </section>

    <Disclosure title="Cómo funciona">
      <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">
        <li>Cada semana (lunes a domingo) es cumplida con tu plan: {formatInt(plan.entrenos)} entrenos de {formatInt(SERIES_MINIMAS)} series efectivas o más{conNutricion ? ` y ${formatInt(plan.diasRegistro)} días con comidas registradas` : ''}. {conNutricion ? 'Parcial, con solo una de las dos partes. ' : ''}Presente, con al menos un entreno{conNutricion ? ` o ${formatInt(DIAS_PRESENCIA)} días registrados` : ''}. Si no, vacía.</li>
        <li>El hilo cuenta las semanas seguidas con presencia. La semana en curso no lo rompe hasta que acaba, y los registros atrasados siempre cuentan.</li>
        <li>Ganas un comodín por cada {formatInt(SEMANAS_POR_COMODIN)} semanas cumplidas, hasta {formatInt(MAX_COMODINES)}. Se gasta solo en una semana vacía y el hilo sigue.</li>
        <li>Una semana en pausa no rompe el hilo ni gasta comodines. En una pausa de entreno, la semana se juzga solo con el registro de comidas.</li>
        <li>Entrenar por encima del plan no suma. Descansar forma parte del plan.</li>
      </ul>
      <Button variant="ghost" size="sm" className="mt-3" onClick={onIrAAjustes}>Cambiar el plan en Ajustes</Button>
    </Disclosure>

    <PausarSheet key={`pausar-${aperturas}`} open={pausando} hoy={hoy} onClose={() => setPausando(false)}
      onPausado={(antes) => { setPausando(false); avisar({ mensaje: 'Pausa guardada', onDeshacer: deshacer(antes) }) }} />
    {toast}
  </div>
}
