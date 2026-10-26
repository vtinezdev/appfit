import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import { addDays, etiquetaPeriodo } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { resumenSemanal } from '../lib/resumenSemanal'
import { formatDuracion } from '../lib/workout'

/**
 * Una semana del historial (la cabecera de su grupo la abre): sesiones, tiempo y volumen, y las series efectivas por grupo
 * muscular. Sin rangos recomendados. Se monta al abrir.
 */
export default function SemanaGymSheet({ lunes, onClose }: { lunes: string; onClose: () => void }) {
  const datos = useLiveQuery(async () => ({ w: await workoutsRepo.listar(), s: await setsRepo.todas(), e: await exercisesRepo.listar() }), [])
  const r = datos ? resumenSemanal(lunes, addDays(lunes, 6), datos.w, datos.s, datos.e) : null
  return <Sheet open onClose={onClose} title={`Semana del ${etiquetaPeriodo('semana', lunes)}`}>
    {!r ? <LoadingState /> : <div className="space-y-stack">
      <div className="metric-grid gap-3">
        <Metric size="title" label="Sesiones" valor={r.sesiones} />
        <Metric size="title" label="Tiempo" valor={formatDuracion(r.duracionMs)} />
        <Metric size="title" label="Volumen" valor={formatNumber(r.volumen, 0)} unidad="kg" />
      </div>
      <h3 className="text-label text-fg-muted">Series por músculo · {formatNumber(r.series, 0)} efectivas</h3>
      {r.porMusculo.length === 0 ? <p className="text-body-sm text-fg-muted">Los ejercicios de esta semana no tienen músculo clasificado.</p> : (
        <ListGroup variante="plana" aria-label="Series efectivas por músculo"
          pie={`Cada serie cuenta 1 al músculo principal y 0,5 a los secundarios; los calentamientos no cuentan.${r.sinClasificar > 0 ? ` ${r.sinClasificar} ${r.sinClasificar === 1 ? 'serie' : 'series'} sin músculo clasificado no se reparten.` : ''}`}>
          {r.porMusculo.map((m) => (
            // Cada músculo con una barra proporcional al más trabajado: se ve de un vistazo dónde se ha cargado la semana.
            <li key={m.musculo} className="grid min-h-touch grid-cols-3 items-center gap-3 py-2">
              <span className="min-w-0 break-words text-body-sm text-fg">{m.nombre}</span>
              <span aria-hidden className="h-2 overflow-hidden rounded-pill bg-surface-muted">
                <span className="block h-full rounded-pill bg-accent-strong" style={{ width: `${Math.max(6, (m.series / r.porMusculo[0].series) * 100)}%` }} />
              </span>
              <span className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(m.series, 1)} <span className="font-normal text-fg-muted">{m.series === 1 ? 'serie' : 'series'}</span></span>
            </li>
          ))}
        </ListGroup>
      )}
    </div>}
  </Sheet>
}
