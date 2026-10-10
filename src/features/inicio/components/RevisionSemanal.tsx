import { useState, type ReactNode } from 'react'
import { IconButton } from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import ModalPage from '../../../shared/components/ModalPage'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { addDays, etiquetaPeriodo } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { ListaRecords } from '../../gym/components/WorkoutFinished'
import { formatDuracion } from '../../gym/lib/workout'
import { useRevision } from '../hooks/useRevisionSemanal'
import { useAtributos } from '../../atributos/hooks/useAtributos'
import { semanaRitmo } from '../../ritmo/lib/ritmo'
import { cifrasSemana, textoEstado, textoHilo } from '../../ritmo/lib/textos'
import Card from '../../../shared/components/Card'
import { formatAgua, partesAgua } from '../lib/agua'
import { formatDiferencia, semanaARevisar, type Revision } from '../lib/revisionSemanal'

/** Récords que se listan; el resto se resume en «y N más». */
const RECORDS_VISIBLES = 3
const MINUTO_MS = 60_000

interface Props {
  /** Lunes de la semana que se abre. */
  lunes: string
  hoy: string
  onClose: () => void
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-3">
      <h2 className="text-heading text-fg">{titulo}</h2>
      {children}
    </section>
  )
}

const frenteAnterior = (diferencia: string) => `${diferencia} frente a la anterior`
const unir = (...partes: (string | null | false)[]) => partes.filter(Boolean).join(' · ')

/**
 * Revisión de una semana cerrada (lunes-domingo) frente a la anterior: peso, nutrición, entreno, récords y agua.
 * Cifras y diferencias sin juicio de valor; cada bloque sin datos lo dice en su sitio.
 */
export default function RevisionSemanal({ lunes: lunesInicial, hoy, onClose }: Props) {
  const [lunes, setLunes] = useState(lunesInicial)
  const ultima = semanaARevisar(hoy).lunes
  const revision = useRevision(lunes, hoy)
  const atributos = useAtributos(hoy)
  const ritmo = atributos?.visible ? semanaRitmo(atributos.resultado.ritmo, lunes) : undefined
  const cargada = revision?.semana.lunes === lunes ? revision : undefined

  return (
    <ModalPage title="Revisión semanal" closeLabel="Inicio" onClose={onClose}>
      <div className="space-y-section">
        <div className="flex items-center justify-between gap-2">
          <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" onClick={() => setLunes(addDays(lunes, -7))} />
          <p className="tabular min-w-0 text-center text-title text-fg" aria-live="polite">{etiquetaPeriodo('semana', lunes)}</p>
          <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" disabled={lunes >= ultima} onClick={() => setLunes(addDays(lunes, 7))} />
        </div>
        {!cargada ? <LoadingState /> : !cargada.hayDatos ? (
          <EmptyState title="Sin registros esta semana">Las comidas, pesajes, entrenos y el agua de la semana aparecerán aquí.</EmptyState>
        ) : <>
          {ritmo && <Card tone="muted" className="space-y-1">
            <p className="text-label text-fg-muted">Ritmo</p>
            <p className="text-title text-fg">{textoEstado(ritmo)}</p>
            <p className="tabular break-words text-body-sm text-fg-muted">{cifrasSemana(ritmo)} · {textoHilo(ritmo.hilo).toLocaleLowerCase('es')}</p>
          </Card>}
          <Contenido revision={cargada} />
        </>}
      </div>
    </ModalPage>
  )
}

function Contenido({ revision }: { revision: Revision }) {
  const { peso, nutricion, entreno, records, agua } = revision
  const { actual, anterior } = entreno
  return (
    <>
      <Bloque titulo="Peso">
        {peso.media === null ? <EmptyState>Sin pesajes esta semana.</EmptyState> : (
          <div className="grid grid-cols-2 gap-3">
            <Metric size="title" label="Peso medio" valor={formatNumber(peso.media, 1)} unidad="kg"
              caption={peso.diferencia === null ? 'Sin pesajes la semana anterior' : frenteAnterior(formatDiferencia(peso.diferencia, 1, 'kg'))} />
            <Metric size="title" label="Pesajes" valor={peso.pesajes} caption="de 7 días" />
          </div>
        )}
      </Bloque>

      <Bloque titulo="Nutrición">
        {nutricion.kcalMedia === null ? <EmptyState>Sin comidas registradas esta semana.</EmptyState> : (
          <div className="grid grid-cols-2 gap-3">
            <Metric size="title" label="Kcal al día" valor={nutricion.kcalMedia} unidad="kcal"
              caption={unir(nutricion.kcalObjetivo !== null && `Objetivo ${formatInt(nutricion.kcalObjetivo)}`, nutricion.diferenciaKcal !== null && frenteAnterior(formatDiferencia(nutricion.diferenciaKcal, 0, 'kcal')))} />
            <Metric size="title" label="Proteína al día" valor={nutricion.protMedia ?? 0} unidad="g"
              caption={nutricion.protObjetivo !== null ? `Objetivo ${formatInt(nutricion.protObjetivo)} g` : undefined} />
            <Metric size="title" label="Días registrados" valor={`${formatInt(nutricion.diasRegistrados)} de 7`} />
            {nutricion.kcalObjetivo !== null && nutricion.adherencia !== null && (
              <Metric size="title" label="En objetivo" valor={formatInt(nutricion.adherencia)} unidad="%"
                caption={`${formatInt(nutricion.diasEnRango)} de ${formatInt(nutricion.diasRegistrados)} días a ±10 %`} />
            )}
          </div>
        )}
      </Bloque>

      <Bloque titulo="Entreno">
        {actual.sesiones === 0 ? <EmptyState>{anterior.sesiones > 0 ? `Sin entrenos esta semana (${formatInt(anterior.sesiones)} la anterior).` : 'Sin entrenos esta semana.'}</EmptyState> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric size="title" label="Sesiones" valor={actual.sesiones} caption={frenteAnterior(formatDiferencia(actual.sesiones - anterior.sesiones))} />
              <Metric size="title" label="Duración" valor={formatDuracion(actual.duracionMs)}
                caption={frenteAnterior(formatDiferencia(Math.round((actual.duracionMs - anterior.duracionMs) / MINUTO_MS), 0, 'min'))} />
              <Metric size="title" label="Series efectivas" valor={actual.series} caption={frenteAnterior(formatDiferencia(actual.series - anterior.series))} />
              <Metric size="title" label="Volumen" valor={formatNumber(actual.volumen, 0)} unidad="kg" caption={frenteAnterior(formatDiferencia(actual.volumen - anterior.volumen, 0, 'kg'))} />
            </div>
            {entreno.destacados.length > 0 && (
              <div className="space-y-2">
                <p className="text-label text-fg-muted">Grupos con más series</p>
                <ListGroup aria-label="Grupos con más series">
                  {entreno.destacados.map((g) => (
                    <li key={g.musculo} className="flex min-h-touch items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words text-body text-fg">{g.nombre}</span>
                      <span className="tabular shrink-0 text-body-sm text-fg-muted">{formatNumber(g.series, 1)} series</span>
                    </li>
                  ))}
                </ListGroup>
              </div>
            )}
          </>
        )}
      </Bloque>

      {actual.sesiones > 0 && (records.length ? (
        <div className="space-y-2">
          <ListaRecords records={records.slice(0, RECORDS_VISIBLES)} nombres={revision.nombres} />
          {records.length > RECORDS_VISIBLES && <p className="text-caption text-fg-muted">y {formatInt(records.length - RECORDS_VISIBLES)} más</p>}
        </div>
      ) : (
        <Bloque titulo="Récords personales"><EmptyState>Sin récords esta semana.</EmptyState></Bloque>
      ))}

      <Bloque titulo="Agua">
        {agua.mediaMl === null ? <EmptyState>Sin agua registrada esta semana.</EmptyState> : (
          <div className="grid grid-cols-2 gap-3">
            <Metric size="title" label="Agua al día" valor={partesAgua(agua.mediaMl).valor} unidad={partesAgua(agua.mediaMl).unidad}
              caption={`${formatInt(agua.dias)} de 7 días con registro`} />
            {agua.diasEnObjetivo !== null && agua.objetivoMl !== null && (
              <Metric size="title" label="Días en objetivo" valor={`${formatInt(agua.diasEnObjetivo)} de ${formatInt(agua.dias)}`} caption={`Objetivo ${formatAgua(agua.objetivoMl)}`} />
            )}
          </div>
        )}
      </Bloque>
    </>
  )
}
