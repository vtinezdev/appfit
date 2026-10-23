import { useId } from 'react'
import Sheet from '../../../shared/components/Sheet'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { formatDiaMes } from '../../../shared/lib/dates'
import { textoMejorSerie, trazoMini, type HistorialEjercicio } from '../lib/progreso'

/**
 * Historial y récords de un ejercicio sin salir de la sesión (ENT-04): minigráfica, últimas sesiones y récords vigentes.
 * Solo lectura; los datos ya los tiene la sesión. La minigráfica es un SVG propio: Recharts no entra en el entreno.
 */
export default function HistorialEjercicioSheet({ open, onClose, nombre, historial, gimnasio }: {
  open: boolean; onClose: () => void; nombre: string; historial: HistorialEjercicio | null
  /** Solo en ejercicios de máquina: el historial es el de este gimnasio (ADR 054). */
  gimnasio?: string
}) {
  const trazo = historial && trazoMini(historial.puntos, 300, 64, 6)
  const id = useId()
  return (
    <Sheet open={open} onClose={onClose} title={nombre}>
      <div className="space-y-stack">
        <p className="text-caption text-fg-muted">Historial y récords{gimnasio ? ` · En ${gimnasio}` : ''}</p>
        {!historial ? <p className="text-body-sm text-fg-muted">
          Todavía no hay sesiones terminadas con este ejercicio {gimnasio ? 'en este gimnasio ' : ''}y esta forma de hacerlo.
        </p> : <>
          {trazo && <div className="space-y-1">
            <svg viewBox="0 0 300 64" className="mini-grafica w-full" aria-hidden="true" focusable="false">
              <path d={trazo.d} className="mini-grafica-linea" /><circle cx={trazo.ultimo.x} cy={trazo.ultimo.y} r={3.5} className="mini-grafica-punto" />
            </svg>
            <p className="tabular text-caption text-fg-muted">
              {historial.mide} de las {formatInt(historial.puntos.length)} últimas sesiones
            </p>
          </div>}
          <section aria-labelledby={`${id}-sesiones`} className="space-y-2">
            <h3 id={`${id}-sesiones`} className="text-rotulo text-fg-muted">Últimas sesiones</h3>
            <ul className="divide-y divide-line border-y border-line">
              {historial.sesiones.map(s => <li key={s.workoutId} className="flex min-h-touch items-center justify-between gap-3 py-2">
                <span className="tabular whitespace-nowrap text-body-sm text-fg">{formatDiaMes(s.inicio)}</span>
                <span className="min-w-0 text-right">
                  <span className="tabular block break-words text-body-sm font-semibold text-fg">{textoMejorSerie(s.mejor, historial.modo)}</span>
                  <span className="tabular block text-caption text-fg-muted">
                    {s.series === 1 ? '1 serie' : `${formatInt(s.series)} series`}{s.rirMedio !== null ? ` · RIR medio ${formatNumber(s.rirMedio, 1)}` : ''}
                  </span>
                </span>
              </li>)}
            </ul>
          </section>
          <section aria-labelledby={`${id}-records`} className="space-y-2">
            <h3 id={`${id}-records`} className="text-rotulo text-fg-muted">Récords vigentes</h3>
            <dl className="divide-y divide-line border-y border-line">
              {historial.records.map(r => <div key={r.etiqueta} className="flex min-h-touch items-center justify-between gap-3 py-2">
                <dt className="min-w-0 break-words text-body-sm text-fg-muted">{r.etiqueta}</dt>
                <dd className="text-right">
                  <span className="tabular block text-body-sm font-semibold text-fg">{r.texto}</span>
                  <span className="tabular block text-caption text-fg-muted">{formatDiaMes(r.inicio)}</span>
                </dd>
              </div>)}
            </dl>
          </section>
        </>}
      </div>
    </Sheet>
  )
}
