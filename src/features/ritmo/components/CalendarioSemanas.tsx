import { useState } from 'react'
import { IconButton } from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import { addDays, startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { ESTADOS_SEMANA, type EstadoSemana, type ResultadoRitmo, type SemanaRitmo } from '../lib/ritmo'
import { cifrasSemana, textoEstado } from '../lib/textos'

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Clase de cada celda: el estado en grafito de más a menos lleno; el color nunca va solo (leyenda y lista). */
const CELDA: Record<EstadoSemana, string> = {
  cumplida: 'border-fg bg-fg',
  parcial: 'border-fg-muted bg-fg-muted',
  presente: 'border-line-strong bg-line-strong',
  vacia: 'border-line-strong',
}

function claseCelda(s: SemanaRitmo | undefined, futura: boolean): string {
  if (futura || !s) return `border-line ${futura ? 'opacity-40' : ''}`
  if (s.congelada || (s.pausa && s.estado === 'vacia')) return 'border-dashed border-line-strong'
  return CELDA[s.estado]
}

/** Lunes de las semanas que empiezan en `anio` (52 o 53). */
function semanasDelAnio(anio: number): string[] {
  let lunes = startOfWeek(`${anio}-01-01`)
  if (lunes < `${anio}-01-01`) lunes = addDays(lunes, 7)
  const res: string[] = []
  for (; lunes.startsWith(String(anio)); lunes = addDays(lunes, 7)) res.push(lunes)
  return res
}

const etiquetaSemana = (lunes: string) => {
  const [, m, d] = lunes.split('-').map(Number)
  return `Semana del ${d} ${MESES_ABREV[m - 1]}`
}

/**
 * Calendario de semanas de un año (Ritmo): una celda por semana, en filas de 13 (un trimestre). Hoy la semana en curso
 * lleva anillo. Decorativo; la lista desplegable da el estado de cada semana en texto.
 */
export default function CalendarioSemanas({ ritmo, hoy }: { ritmo: ResultadoRitmo; hoy: string }) {
  const anioActual = Number(hoy.slice(0, 4))
  const primero = ritmo.semanas.length ? Number(ritmo.semanas[0].lunes.slice(0, 4)) : anioActual
  const [anio, setAnio] = useState(anioActual)
  const porLunes = new Map(ritmo.semanas.map((s) => [s.lunes, s]))
  const lunesActual = startOfWeek(hoy)
  const semanas = semanasDelAnio(anio)
  const conDatos = semanas.map((l) => porLunes.get(l)).filter((s): s is SemanaRitmo => s !== undefined)
  const cuenta = (e: EstadoSemana) => conDatos.filter((s) => s.estado === e && (s.cerrada || e !== 'vacia')).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <IconButton icon="chevron-left" label="Año anterior" variant="ghost" disabled={anio <= primero} onClick={() => setAnio(anio - 1)} />
        <p className="tabular text-title text-fg" aria-live="polite">{anio}</p>
        <IconButton icon="chevron-right" label="Año siguiente" variant="ghost" disabled={anio >= anioActual} onClick={() => setAnio(anio + 1)} />
      </div>
      <div role="img" aria-label={`${anio}: ${formatInt(cuenta('cumplida'))} semanas cumplidas, ${formatInt(cuenta('parcial'))} parciales, ${formatInt(cuenta('presente'))} presentes y ${formatInt(cuenta('vacia'))} vacías`}
        className="grid grid-cols-13 gap-1">
        {semanas.map((l) => <span key={l} className={`block aspect-square rounded-sm border ${claseCelda(porLunes.get(l), l > lunesActual)} ${l === lunesActual ? 'ring-2 ring-accent-strong ring-offset-2 ring-offset-surface' : ''}`} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted" aria-label="Leyenda">
        {(['cumplida', 'parcial', 'presente', 'vacia'] as EstadoSemana[]).map((e) => <li key={e} className="flex items-center gap-1.5">
          <span aria-hidden className={`block h-3 w-3 rounded-sm border ${CELDA[e]}`} />{ESTADOS_SEMANA[e].nombre}
        </li>)}
        <li className="flex items-center gap-1.5"><span aria-hidden className="block h-3 w-3 rounded-sm border border-dashed border-line-strong" />En pausa</li>
      </ul>
      {conDatos.length > 0 && <Disclosure title={`Semanas de ${anio}`}>
        <ListGroup variante="plana" aria-label={`Semanas de ${anio}`}>
          {[...conDatos].reverse().map((s) => <li key={s.lunes} className="py-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body-sm font-semibold text-fg">{etiquetaSemana(s.lunes)}</span>
              <span className="text-body-sm text-fg">{textoEstado(s)}</span>
            </p>
            <p className="tabular text-caption text-fg-muted">{cifrasSemana(s)}{s.hilo > 0 ? ` · hilo ${formatInt(s.hilo)}` : ''}</p>
          </li>)}
        </ListGroup>
      </Disclosure>}
    </div>
  )
}
