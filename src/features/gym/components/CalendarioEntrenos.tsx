import { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { DiaCalendario } from '../lib/calendarioEntrenos'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Mes con los días entrenados rellenos según su volumen (rampa muscular) y hoy con contorno. Tocar un día entrenado lo abre.
 * Va en una tarjeta: el mes como cabecera (con las flechas) y la leyenda del volumen como pie.
 */
export default function CalendarioEntrenos({ mes, semanas, onMes, onDia }: {
  mes: string
  semanas: DiaCalendario[][]
  onMes: (mes: string) => void
  onDia: (dia: DiaCalendario) => void
}) {
  return <Card padded={false} className="overflow-hidden"><section aria-label="Calendario de entrenos">
    <div className="flex items-center gap-1 border-b border-line py-2 pl-card pr-2">
      <div className="min-w-0 flex-1">
        <p className="text-rotulo text-fg-muted">Calendario</p>
        <h2 className="break-words text-title text-fg first-letter:uppercase" aria-live="polite">{etiquetaPeriodo('mes', mes)}</h2>
      </div>
      <IconButton icon="chevron-left" label="Mes anterior" variant="ghost" onClick={() => onMes(desplazarPeriodo('mes', mes, -1))} />
      <IconButton icon="chevron-right" label="Mes siguiente" variant="ghost" disabled={esPeriodoActual('mes', mes)} onClick={() => onMes(desplazarPeriodo('mes', mes, 1))} />
    </div>
    {/* El contenedor de la consulta es el cuerpo (2 px a cada lado y el borde de la tarjeta): la rejilla sigue cabiendo desde los móviles de 360 px. */}
    <div className="calendario-entrenos px-0.5 pt-3">
    <div className="cal-vista-mes space-y-2">
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
    <div className="-mx-0.5 flex items-center gap-2 border-t border-line px-card py-2.5 text-caption text-fg-muted" aria-hidden="true">
      <span>Menos volumen</span><span className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <span key={n} className="muscle-swatch" data-level={n} />)}</span><span>Más</span>
    </div>
    </div>
    <div className="cal-lista px-3 pb-2">
      <p className="text-caption text-fg-muted">Días entrenados del mes</p>
      <ul className="divide-y divide-line" aria-label="Días entrenados">
        {semanas.flat().filter(d => d.delMes && d.workoutIds.length > 0).map(d => <li key={d.fecha}>
          <button type="button" onClick={() => onDia(d)} className="app-button flex min-h-touch w-full flex-wrap items-center justify-between gap-2 py-2 text-left" aria-label={`${fechaLarga(d.fecha)}: ${d.workoutIds.length} entrenos, ${formatInt(d.volumen)} kg`}>
            <span className="text-body-sm text-fg first-letter:uppercase">{fechaLarga(d.fecha)}</span>
            <span className="tabular text-caption text-fg-muted">{formatInt(d.volumen)} kg</span>
          </button>
        </li>)}
      </ul>
      {!semanas.flat().some(d => d.delMes && d.workoutIds.length > 0) && <p className="py-2 text-body-sm text-fg-muted">Sin entrenos este mes.</p>}
    </div>
    </div>
  </section></Card>
}
