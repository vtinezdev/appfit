import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatDiaMes, parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { describirMarca, SESIONES_EVOLUCION, trazadoEvolucion, type MuroEjercicio } from '../lib/muro'

/** Ejercicios que se ven de entrada y en cada «Ver más». */
const POR_PAGINA = 15

const fechaCorta = (fecha: string, hoy: string) => (fecha === hoy ? 'Hoy' : formatDiaMes(parseISODate(fecha).getTime()))

/** Lo que ha mejorado la marca principal: «+17,5 kg», «+2 reps» o, en asistencia, «−9 kg» (menos ayuda). */
function textoMejora(m: MuroEjercicio): string | null {
  if (m.mejora === null) return null
  const tipo = m.marcas[0].tipo
  if (tipo === 'reps') return `+${formatInt(m.mejora)} ${m.mejora === 1 ? 'rep' : 'reps'}`
  return `${tipo === 'asistencia' ? '−' : '+'}${formatNumber(m.mejora, 2)} kg`
}

/**
 * Muro de récords: cada ejercicio y variante con su marca principal en grande, cuándo la lograste (y el 1RM si lo hay),
 * una minigráfica de su mejor serie en las últimas sesiones y cuánto ha mejorado (R4). De la más reciente a la más antigua.
 */
export default function RecordsVista({ muro, nombres }: { muro: MuroEjercicio[]; nombres: Readonly<Record<number, string>> }) {
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const hoy = todayISO()
  if (muro.length === 0) return <EmptyState>Aún no hay marcas. Termina un entreno y aquí aparecerá lo mejor de cada ejercicio.</EmptyState>
  return <div className="space-y-stack">
    <ListGroup aria-label="Mejores marcas por ejercicio" className="records-lista">
      {muro.slice(0, visibles).map((m) => {
        const [principal, ...resto] = m.marcas.map((marca) => ({ marca, ...describirMarca(marca, m.modo) }))
        const trazo = trazadoEvolucion(m.evolucion, { invertir: principal.marca.tipo === 'asistencia' })
        const mejora = textoMejora(m)
        return <li key={`${m.exerciseId}-${m.modo}-${m.variante ?? ''}`} className="flex min-h-touch items-center gap-3 py-3">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-body font-semibold text-fg">{nombres[m.exerciseId] ?? 'Ejercicio'}</span>
            {m.variante && <span className="block break-words text-caption text-fg-muted">{m.variante}</span>}
            <span className="tabular block break-words text-caption text-fg-muted">
              <span className="sr-only">{principal.nombre}, </span>{fechaCorta(principal.marca.fecha, hoy)}
              {resto.map((r) => ` · ${r.marca.tipo === '1rm' ? '1RM' : r.nombre} ${r.valor}`).join('')}
            </span>
          </span>
          {trazo && <svg viewBox="0 0 64 28" className="record-grafica mini-grafica w-16 shrink-0" aria-hidden="true" focusable="false">
            <path d={trazo.d} className="mini-grafica-linea" />
            <circle cx={trazo.ultimo.x} cy={trazo.ultimo.y} r={2.75} className="mini-grafica-punto" />
          </svg>}
          <span className="tabular w-20 shrink-0 text-right">
            <span className="block break-words font-numeric text-title text-fg">{principal.valor}</span>
            {mejora && <span className="block text-caption font-semibold text-accent-strong">{mejora}<span className="sr-only"> en tus últimas {formatInt(Math.min(SESIONES_EVOLUCION, m.evolucion.length))} sesiones</span></span>}
          </span>
        </li>
      })}
    </ListGroup>
    {muro.length > visibles && <Button variant="subtle" block onClick={() => setVisibles((v) => v + POR_PAGINA)}>Ver más ejercicios</Button>}
  </div>
}
