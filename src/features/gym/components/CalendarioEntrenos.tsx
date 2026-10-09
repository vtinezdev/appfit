import { IconButton } from '../../../shared/components/Button'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { DiaCalendario } from '../lib/calendarioEntrenos'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

/** Mes con los días entrenados rellenos según su volumen (rampa muscular) y hoy con contorno. Tocar un día entrenado lo abre. */
export default function CalendarioEntrenos({ mes, semanas, onMes, onDia }: {
  mes: string
  semanas: DiaCalendario[][]
  onMes: (mes: string) => void
  onDia: (dia: DiaCalendario) => void
}) {
  return <section aria-label="Calendario de entrenos" className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <IconButton icon="chevron-left" label="Mes anterior" variant="ghost" onClick={() => onMes(desplazarPeriodo('mes', mes, -1))} />
      <h2 className="min-w-0 text-center text-title text-fg first-letter:uppercase" aria-live="polite">{etiquetaPeriodo('mes', mes)}</h2>
      <IconButton icon="chevron-right" label="Mes siguiente" variant="ghost" disabled={esPeriodoActual('mes', mes)} onClick={() => onMes(desplazarPeriodo('mes', mes, 1))} />
    </div>
    <div className="cal-grid" aria-hidden="true">{DIAS.map(d => <span key={d} className="text-center text-caption text-fg-muted">{d}</span>)}</div>
    <ul className="cal-grid" aria-label={`Días de ${etiquetaPeriodo('mes', mes)}`}>
      {semanas.flat().map(dia => {
        const numero = parseISODate(dia.fecha).getDate()
        if (!dia.delMes) return <li key={dia.fecha} aria-hidden="true" />
        const sesiones = dia.workoutIds.length
        const texto = `${fechaLarga(dia.fecha)}${dia.hoy ? ' (hoy)' : ''}: ${sesiones === 0 ? 'sin entreno' : `${sesiones} ${sesiones === 1 ? 'entreno' : 'entrenos'}, ${formatInt(dia.volumen)} kg`}`
        return <li key={dia.fecha}>
          {sesiones > 0
            ? <button type="button" className="cal-dia app-button tabular" data-nivel={dia.nivel} data-hoy={dia.hoy} aria-label={texto} onClick={() => onDia(dia)}>{numero}</button>
            : <span className="cal-dia tabular" data-hoy={dia.hoy} data-futuro={dia.futuro}><span aria-hidden="true">{numero}</span><span className="sr-only">{texto}</span></span>}
        </li>
      })}
    </ul>
    <div className="flex items-center justify-end gap-2 text-caption text-fg-muted" aria-hidden="true">
      <span>Menos volumen</span><span className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <span key={n} className="muscle-swatch" data-level={n} />)}</span><span>Más</span>
    </div>
  </section>
}
