import { lazy, Suspense, useState, type ReactNode } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import Ayuda from '../../shared/components/Ayuda'
import Card from '../../shared/components/Card'
import ComoFunciona from '../../shared/components/ComoFunciona'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { Pausa } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { addDays, formatDiaMes, formatFriendly, parseISODate, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { useExperiencia } from '../experiencia/hooks/useExperiencia'
import CalendarioSemanas from './components/CalendarioSemanas'
import Icon from '../../shared/components/Icon'
import ComoFuncionaRitmo from './components/ComoFuncionaRitmo'
import SemanaCuadros from './components/SemanaCuadros'
import PausarSheet from './components/PausarSheet'
import * as pausasRepo from './data/pausasRepo'
import { describirPausa, pausaActiva } from './lib/pausas'
import { ESTADOS_SEMANA, MAX_COMODINES, SEMANAS_POR_COMODIN } from './lib/ritmo'
import { pistaHitos } from './lib/hitos'
import { cifrasSemana, faltaParaCumplir, textoHilo } from './lib/textos'

const RevisionSemanal = lazy(() => import('../inicio/components/RevisionSemanal'))

/** Fecha corta, para la pista de hitos. */
const formatFecha = (iso: string) => formatDiaMes(parseISODate(iso).getTime())
const semanasTexto = (n: number) => (n === 1 ? '1 semana' : `${formatInt(n)} semanas`)

/** Ritmo (desde Inicio): la semana en curso, hilo y comodines, el calendario de semanas, hitos y pausas. */
export default function RitmoTab({ onIrAAjustes, onVolver, incrustada = false, debajoDeSemana, trasSemana }: { onIrAAjustes: () => void; onVolver?: () => void
  /** Como pestaña de Progreso (B12): sin márgenes de página ni título visible; «Cómo funciona», en el título de la semana. */
  incrustada?: boolean
  /** Lo que va dentro de «Esta semana», bajo su tarjeta (en Progreso, Cumbres, Caminos y Vitrina de la semana). */
  debajoDeSemana?: ReactNode
  /** Lo que va entre la semana y el hilo (en Progreso, las metas). */
  trasSemana?: ReactNode }) {
  const volver = onVolver && !incrustada ? { etiqueta: 'Inicio', onVolver } : undefined
  const marco = incrustada ? '' : 'px-page pt-5'
  const hoy = todayISO()
  const estado = useExperiencia(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [pausando, setPausando] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  /** Lunes de la semana cuya revisión está abierta (la misma de Inicio, aunque allí ya se cerrara). */
  const [revision, setRevision] = useState<string | null>(null)

  if (!estado) return <div className={marco}><LoadingState /></div>
  if (!estado.visible) {
    return <div className={`space-y-section ${marco}`}>
      <PageHeader incrustada={incrustada} title="Ritmo" volver={volver} />
      <EmptyState title="Ritmo oculto" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Lo has ocultado en Ajustes junto con Cumbres, Caminos y Vitrina.
      </EmptyState>
      {trasSemana}
    </div>
  }

  const { resultado: r, plan, pausas, conNutricion } = estado
  const ritmo = r.ritmo
  const s = ritmo.actual
  const activa = pausaActiva(pausas, hoy)
  const deshacer = (antes: Pausa[]) => () => pausasRepo.restaurar(antes)
  const comoFunciona = <ComoFunciona nombre="Ritmo"><ComoFuncionaRitmo plan={plan} conNutricion={conNutricion} /></ComoFunciona>
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = addDays(s.lunes, i)
    return { fecha, entreno: r.diasEntreno.has(fecha), comidas: conNutricion && r.diasRegistro ? r.diasRegistro.has(fecha) : null }
  })
  const pista = pistaHitos(ritmo.hitos, ritmo.cumplidas)

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

  return <div className={`space-y-section ${marco}`}>
    {!incrustada && <PageHeader title="Ritmo" volver={volver} overline="Tu constancia semana a semana" action={comoFunciona} />}

    {activa && <Card tone="muted" className="space-y-3">
      <p className="text-title text-fg">En pausa</p>
      <p className="break-words text-body-sm text-fg-muted">{describirPausa(activa)}. El hilo se congela mientras dure.</p>
      <Button variant="secondary" onClick={() => reanudar(activa)}>Reanudar hoy</Button>
    </Card>}

    <section aria-label="Esta semana" className="space-y-stack">
      <SectionHeader variant="section" action={incrustada ? comoFunciona : undefined}>Esta semana</SectionHeader>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-title text-fg">{s.cumplida ? ESTADOS_SEMANA.cumplida.nombre : s.estado === 'vacia' ? 'En curso' : `${ESTADOS_SEMANA[s.estado].nombre} por ahora`}</p>
          <p className="tabular text-caption text-fg-muted">{textoHilo(ritmo.hiloActual)}</p>
        </div>
        <SemanaCuadros dias={dias} hoy={hoy} />
        <div className="space-y-1 border-t border-line pt-3">
          <p className="tabular break-words text-body-sm font-semibold text-fg">{faltaParaCumplir(s) ?? 'Plan de la semana cumplido'}</p>
          <p className="tabular break-words text-caption text-fg-muted">{cifrasSemana(s)}{faltaParaCumplir(s) ? '' : '. Entrenar o registrar de más no suma.'}</p>
        </div>
      </Card>
      {debajoDeSemana}
    </section>

    {trasSemana}

    <section aria-label="Hilo y comodines" className="space-y-stack">
      <SectionHeader variant="section">Hilo</SectionHeader>
      {/* Las cuatro cifras en una ficha de 2 × 2, como «Tus datos» de Perfil. */}
      <Card padded={false} className="grid grid-cols-2 overflow-hidden">
        {[
          <Metric key="h" size="title" label="Hilo actual" valor={ritmo.hiloActual} unidad={ritmo.hiloActual === 1 ? 'semana' : 'semanas'} caption="Seguidas con presencia" />,
          <Metric key="m" size="title" label="Mejor hilo" valor={ritmo.mejorHilo} unidad={ritmo.mejorHilo === 1 ? 'semana' : 'semanas'} caption="No se pierde nunca" />,
          <Metric key="c" size="title" label="Comodines" valor={`${formatInt(ritmo.comodines)} de ${formatInt(MAX_COMODINES)}`}
            caption={ritmo.comodines >= MAX_COMODINES ? 'Al máximo' : `Otro en ${semanasTexto(SEMANAS_POR_COMODIN - ritmo.progresoComodin)} cumplidas`} />,
          <Metric key="k" size="title" label="Cumplidas" valor={ritmo.cumplidas} unidad={ritmo.cumplidas === 1 ? 'semana' : 'semanas'} caption={ritmo.vueltas ? `${formatInt(ritmo.vueltas)} ${ritmo.vueltas === 1 ? 'vuelta' : 'vueltas'} tras una semana vacía` : 'Desde el principio'} />,
        ].map((m, i) => <div key={i} className={`min-w-0 border-line px-card py-3 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''}`}>{m}</div>)}
      </Card>
    </section>

    <section aria-label="Semanas" className="space-y-stack">
      <SectionHeader variant="section">Semanas</SectionHeader>
      <Card><CalendarioSemanas ritmo={ritmo} hoy={hoy} onVerRevision={setRevision} /></Card>
    </section>

    <section aria-label="Hitos" className="space-y-stack">
      <SectionHeader variant="section" action={<Ayuda titulo="Hitos">
        <p>Los hitos cuentan las semanas cumplidas en total, desde que empezaste: no hace falta que sean seguidas y no se pierden nunca.</p>
        <p>Son los niveles del logro «Semanas cumplidas» de la Vitrina: al llegar a cada uno ({pista.tramos.map((t) => formatInt(t.semanas)).join(', ')} semanas) ganas su pieza.</p>
      </Ayuda>}>Hitos</SectionHeader>
      <Card className="space-y-4">
        <div className="space-y-0.5">
          <p className="text-title text-fg">{pista.siguiente ? `Próximo: ${formatInt(pista.siguiente.semanas)} semanas cumplidas` : 'Todos los hitos logrados'}</p>
          <p className="tabular text-body-sm text-fg-muted">{pista.siguiente ? `Llevas ${semanasTexto(ritmo.cumplidas)} · faltan ${formatInt(pista.siguiente.faltan)}` : `${semanasTexto(ritmo.cumplidas)} cumplidas`}</p>
        </div>
        {/* Cuatro por fila; con el texto ampliado bajan a otra fila en vez de apretar el trofeo. */}
        <ol aria-label="Hitos de semanas cumplidas" className="flex flex-wrap gap-1">
          {pista.tramos.map((t) => <li key={t.semanas} className="min-w-0 flex-1 basis-14 space-y-2">
            <span aria-hidden className="flex items-center gap-1">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-muted"><span className="block h-full rounded-pill bg-accent-strong" style={{ width: `${t.relleno * 100}%` }} /></span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${t.estado === 'logrado' ? 'bg-accent text-accent-on' : t.estado === 'siguiente' ? 'border-2 border-accent-strong text-accent-strong' : 'bg-surface-muted text-fg-subtle'}`}>
                <Icon name={t.estado === 'logrado' ? 'check' : 'trophy'} size={14} />
              </span>
            </span>
            <span className="block text-right">
              <span className="tabular block text-body-sm font-semibold text-fg">{formatInt(t.semanas)}</span>
              <span className="tabular block break-words text-caption text-fg-muted">{t.fecha ? formatFecha(t.fecha) : t.estado === 'siguiente' ? `Faltan ${formatInt(t.semanas - ritmo.cumplidas)}` : 'semanas'}</span>
            </span>
            <span className="sr-only">{formatInt(t.semanas)} semanas cumplidas: {t.fecha ? `logrado el ${formatFriendly(t.fecha)}` : `faltan ${formatInt(t.semanas - ritmo.cumplidas)}`}</span>
          </li>)}
        </ol>
      </Card>
    </section>

    <section aria-label="Pausas" className="space-y-stack">
      <SectionHeader variant="section" action={!activa && <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setPausando(true) }}>Pausar</Button>}>Pausas</SectionHeader>
      {pausas.length === 0
        ? <EmptyState>Sin pausas. Úsalas en vacaciones, enfermedad, lesión o viaje.</EmptyState>
        : <ListGroup aria-label="Pausas declaradas">
          {[...pausas].reverse().map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 break-words text-body-sm text-fg">{describirPausa(p)}</span>
            <IconButton icon="trash" label={`Borrar la pausa: ${describirPausa(p)}`} variant="ghost" onClick={() => borrar(p)} />
          </li>)}
        </ListGroup>}
    </section>

    <PausarSheet key={`pausar-${aperturas}`} open={pausando} hoy={hoy} onClose={() => setPausando(false)}
      onPausado={(antes) => { setPausando(false); avisar({ mensaje: 'Pausa guardada', onDeshacer: deshacer(antes) }) }} />
    {revision && <Suspense fallback={null}><RevisionSemanal lunes={revision} hoy={hoy} closeLabel="Ritmo" onClose={() => setRevision(null)} /></Suspense>}
    {toast}
  </div>
}
