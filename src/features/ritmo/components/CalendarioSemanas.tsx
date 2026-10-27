import { useState } from 'react'
import { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import { startOfWeek } from '../../../shared/lib/dates'
import { mesesDelAnio, semanasDelAnio } from '../lib/calendario'
import { formatInt } from '../../../shared/lib/format'
import { tieneRevision, type EstadoSemana, type ResultadoRitmo, type SemanaRitmo } from '../lib/ritmo'
import { cifrasSemana, textoEstado } from '../lib/textos'

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Cada estado con su forma, no solo con su tono (punto 19): cumplida, cuadro lleno en acento; parcial, medio cuadro;
 * presente, un punto; vacía, el cuadro gris; en pausa, borde discontinuo; sin datos, solo el contorno. El color nunca va solo (leyenda y lista).
 */
function Celda({ estado, futura = false, actual = false }: { estado: EstadoSemana | 'pausa' | 'futura'; futura?: boolean; actual?: boolean }) {
  const anillo = actual ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''
  if (estado === 'pausa') return <span className={`block aspect-square rounded-sm border border-dashed border-line-strong ${anillo}`} />
  // Sin datos (antes de empezar o por delante): solo el contorno, para no confundirla con una vacía.
  if (estado === 'futura') return <span className={`block aspect-square rounded-sm border border-line ${futura ? 'opacity-60' : ''} ${anillo}`} />
  return <span className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-sm ${estado === 'cumplida' ? 'bg-accent' : 'bg-surface-muted'} ${futura ? 'opacity-40' : ''} ${anillo}`}>
    {estado === 'parcial' && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-accent" />}
    {estado === 'presente' && <span className="block h-1/3 w-1/3 rounded-pill bg-accent-strong" />}
  </span>
}

/** Nombre de cada estado en singular y plural, para el resumen del año. */
const NOMBRES: Record<EstadoSemana | 'pausa', [string, string]> = {
  cumplida: ['cumplida', 'cumplidas'], parcial: ['parcial', 'parciales'], presente: ['presente', 'presentes'], vacia: ['vacía', 'vacías'], pausa: ['en pausa', 'en pausa'],
}

function estadoCelda(s: SemanaRitmo | undefined, futura: boolean): EstadoSemana | 'pausa' | 'futura' {
  if (futura || !s) return 'futura'
  if (s.congelada || (s.pausa && s.estado === 'vacia')) return 'pausa'
  return s.estado
}

const etiquetaSemana = (lunes: string) => {
  const [, m, d] = lunes.split('-').map(Number)
  return `Semana del ${d} ${MESES_ABREV[m - 1]}`
}

/**
 * Calendario de semanas de un año (Ritmo): una fila por mes con sus semanas (punto 19) y, arriba, cuántas hay de cada
 * estado, que sirve también de leyenda. Hoy la semana en curso lleva anillo. Decorativo; la lista desplegable da el estado de cada semana en texto; en las cerradas con algo
 * registrado, la fila entera abre su revisión semanal (`onVerRevision`), con chevrón.
 */
export default function CalendarioSemanas({ ritmo, hoy, onVerRevision }: { ritmo: ResultadoRitmo; hoy: string; onVerRevision?: (lunes: string) => void }) {
  const anioActual = Number(hoy.slice(0, 4))
  const primero = ritmo.semanas.length ? Number(ritmo.semanas[0].lunes.slice(0, 4)) : anioActual
  const [anio, setAnio] = useState(anioActual)
  const porLunes = new Map(ritmo.semanas.map((s) => [s.lunes, s]))
  const lunesActual = startOfWeek(hoy)
  const semanas = semanasDelAnio(anio)
  const conDatos = semanas.map((l) => porLunes.get(l)).filter((s): s is SemanaRitmo => s !== undefined)
  const cuenta = (e: EstadoSemana) => conDatos.filter((s) => s.estado === e && (s.cerrada || e !== 'vacia') && estadoCelda(s, false) !== 'pausa').length
  const enPausa = conDatos.filter((s) => estadoCelda(s, false) === 'pausa').length
  // Los meses de antes de tus primeros registros no se pintan: el año empieza donde empiezan tus datos.
  const todos = mesesDelAnio(anio, hoy)
  const primerMes = Math.max(0, todos.findIndex((m) => m.semanas.some((l) => porLunes.has(l))))
  const meses = todos.slice(primerMes)
  const resumen = [
    ...(['cumplida', 'parcial', 'presente', 'vacia'] as const).map((e) => ({ estado: e, n: cuenta(e) })),
    { estado: 'pausa' as const, n: enPausa },
  ]

  return (
    <div className="calendario-ritmo space-y-3">
      <div className="calendario-cabecera flex items-center justify-between gap-2">
        <IconButton icon="chevron-left" label="Año anterior" variant="ghost" disabled={anio <= primero} onClick={() => setAnio(anio - 1)} />
        <p className="tabular text-title text-fg" aria-live="polite">{anio}</p>
        <IconButton icon="chevron-right" label="Año siguiente" variant="ghost" disabled={anio >= anioActual} onClick={() => setAnio(anio + 1)} />
      </div>
      {/* Cuántas semanas de cada estado: la leyenda con sus cifras. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label={`Resumen de ${anio}`}>
        {resumen.filter((r) => r.n > 0 || r.estado !== 'pausa').map((r) => <li key={r.estado} className="flex items-center gap-1.5">
          <span aria-hidden className="block w-4"><Celda estado={r.estado} /></span>
          <span className="tabular text-body-sm font-semibold text-fg">{formatInt(r.n)}</span>
          <span className="text-caption text-fg-muted">{NOMBRES[r.estado][r.n === 1 ? 0 : 1]}</span>
        </li>)}
      </ul>
      <div role="img" aria-label={`${anio}: ${formatInt(cuenta('cumplida'))} semanas cumplidas, ${formatInt(cuenta('parcial'))} parciales, ${formatInt(cuenta('presente'))} presentes y ${formatInt(cuenta('vacia'))} vacías`}
        className="space-y-1.5">
        {meses.map(({ mes, semanas: delMes }) => <div key={mes} className="flex items-center gap-2">
          <span aria-hidden className="w-9 shrink-0 text-caption text-fg-muted">{MESES_ABREV[mes]}</span>
          <span className="grid max-w-xs flex-1 grid-cols-5 gap-1.5">
            {delMes.map((l) => <Celda key={l} estado={estadoCelda(porLunes.get(l), l > lunesActual)} futura={l > lunesActual} actual={l === lunesActual} />)}
          </span>
        </div>)}
      </div>
      {conDatos.length > 0 && <Disclosure title={`Semanas de ${anio}`}>
        <ListGroup variante="plana" aria-label={`Semanas de ${anio}`}>
          {[...conDatos].reverse().map((s) => {
            const contenido = <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-body-sm font-semibold text-fg">{etiquetaSemana(s.lunes)}</span>
                <span className="text-body-sm text-fg">{textoEstado(s)}</span>
              </span>
              <span className="tabular block text-caption text-fg-muted">{cifrasSemana(s)}{s.hilo > 0 ? ` · hilo\u00a0${formatInt(s.hilo)}` : ''}</span>
            </span>
            return <li key={s.lunes}>
              {onVerRevision && tieneRevision(s)
                ? <ListRow aria-label={`${etiquetaSemana(s.lunes)}, ${textoEstado(s)}. Ver revisión`} onClick={() => onVerRevision(s.lunes)}>
                    {contenido}<Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
                  </ListRow>
                : <div className="flex px-1 py-2">{contenido}</div>}
            </li>
          })}
        </ListGroup>
      </Disclosure>}
    </div>
  )
}
