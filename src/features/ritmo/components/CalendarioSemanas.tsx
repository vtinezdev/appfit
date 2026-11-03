import { useState } from 'react'
import { IconButton } from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { mesesDelAnio, rayasSemana, semanasDelAnio, type Rayas } from '../lib/calendario'
import { tieneRevision, type EstadoSemana, type ResultadoRitmo, type SemanaRitmo } from '../lib/ritmo'
import { cifrasSemana, textoEstado } from '../lib/textos'

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Nombre de cada estado en singular y plural, para el resumen del año. */
const NOMBRES: Record<EstadoSemana, [string, string]> = {
  cumplida: ['cumplida', 'cumplidas'], parcial: ['parcial', 'parciales'], presente: ['presente', 'presentes'], vacia: ['vacía', 'vacías'],
}

const enPausa = (s: SemanaRitmo) => s.congelada || (s.pausa !== null && s.estado === 'vacia')

const etiquetaSemana = (lunes: string) => {
  const [, m, d] = lunes.split('-').map(Number)
  return `Semana del ${d} ${MESES_ABREV[m - 1]}`
}

/** Las semanas visibles agrupadas por mes, en orden: cada tramo es un mes (1–12) y cuántas semanas suyas se ven. */
function tramosDeMes(lunes: readonly string[]): { mes: number; semanas: number }[] {
  const tramos: { mes: number; semanas: number }[] = []
  for (const l of lunes) {
    const mes = Number(l.slice(5, 7))
    const ultimo = tramos.at(-1)
    if (ultimo?.mes === mes) ultimo.semanas++
    else tramos.push({ mes, semanas: 1 })
  }
  return tramos
}

/**
 * Una semana como barra partida en dos (punto 19, C4): arriba, una raya por entreno del plan y abajo, una por día con
 * comidas, llenas de abajo arriba las hechas (en acento y en tinta, los mismos colores que los cuadros de la semana), para
 * contarlas de un vistazo. Todas igual de altas; en pausa, borde discontinuo; sin datos (antes de empezar o por delante),
 * solo el contorno. La semana en curso lleva anillo.
 */
function Barra({ s, actual }: { s: SemanaRitmo | undefined; actual: boolean }) {
  const anillo = actual ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''
  if (!s || enPausa(s)) return <span className={`h-full min-w-0 max-w-8 flex-1 rounded-sm border ${s ? 'border-dashed border-line-strong' : 'border-line'} ${anillo}`} />
  const { entreno, comidas } = rayasSemana(s)
  const mitad = ({ hechas, total }: Rayas, color: string) => <span className="flex min-h-0 flex-1 flex-col-reverse gap-0.5">
    {Array.from({ length: total }, (_, i) => <span key={i} className={`block min-h-0 flex-1 rounded-sm ${i < hechas ? color : 'bg-surface-muted'}`} />)}
  </span>
  return <span className={`flex h-full min-w-0 max-w-8 flex-1 flex-col gap-1 rounded-sm ${anillo}`}>
    {mitad(entreno, 'bg-accent')}
    {comidas !== null && mitad(comidas, 'bg-fg')}
  </span>
}

/**
 * Calendario de semanas de un año (Ritmo): una barra por semana desde el mes de tus primeros registros, con los meses
 * debajo; arriba, qué es cada mitad y cuántas semanas hay de cada estado. Decorativo; la lista desplegable da el estado de
 * cada semana en texto; en las cerradas con algo registrado, la fila entera abre su revisión semanal (`onVerRevision`), con chevrón.
 */
export default function CalendarioSemanas({ ritmo, hoy, onVerRevision }: { ritmo: ResultadoRitmo; hoy: string; onVerRevision?: (lunes: string) => void }) {
  const lunesActual = startOfWeek(hoy)
  // El año de la semana en curso: del 1 al 3 de enero puede seguir siendo la última de diciembre.
  const anioActual = Number(lunesActual.slice(0, 4))
  const primero = ritmo.semanas.length ? Number(ritmo.semanas[0].lunes.slice(0, 4)) : anioActual
  const [anio, setAnio] = useState(anioActual)
  const porLunes = new Map(ritmo.semanas.map((s) => [s.lunes, s]))
  const semanas = semanasDelAnio(anio)
  const conDatos = semanas.map((l) => porLunes.get(l)).filter((s): s is SemanaRitmo => s !== undefined)
  const cuenta = (e: EstadoSemana) => conDatos.filter((s) => s.estado === e && (s.cerrada || e !== 'vacia') && !enPausa(s)).length
  // El año empieza en el mes de tus primeros registros y, el actual, acaba en la semana en curso.
  const meses = mesesDelAnio(anio, hoy)
  const desde = meses.find((m) => m.semanas.some((l) => porLunes.has(l)))?.semanas[0] ?? semanas[0]
  const visibles = semanas.filter((l) => l >= desde && l <= lunesActual)
  const conNutricion = conDatos.some((s) => s.diasRegistrados !== null)

  return (
    <div className="calendario-ritmo space-y-3">
      <div className="calendario-cabecera flex items-center justify-between gap-2">
        <IconButton icon="chevron-left" label="Año anterior" variant="ghost" disabled={anio <= primero} onClick={() => setAnio(anio - 1)} />
        <p className="tabular text-title text-fg" aria-live="polite">{anio}</p>
        <IconButton icon="chevron-right" label="Año siguiente" variant="ghost" disabled={anio >= anioActual} onClick={() => setAnio(anio + 1)} />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted" aria-label="Leyenda">
        <li className="flex items-center gap-1.5"><span aria-hidden className="block h-3 w-3 rounded-sm bg-accent" />{conNutricion ? 'Arriba: entrenos del plan' : 'Entrenos del plan'}</li>
        {conNutricion && <li className="flex items-center gap-1.5"><span aria-hidden className="block h-3 w-3 rounded-sm bg-fg" />Abajo: días con comidas</li>}
      </ul>
      <p className="tabular text-body-sm text-fg-muted">
        {(['cumplida', 'parcial', 'presente', 'vacia'] as const).map((e, i) => <span key={e}>{i > 0 ? ' · ' : ''}<span className="font-semibold text-fg">{formatInt(cuenta(e))}</span> {NOMBRES[e][cuenta(e) === 1 ? 0 : 1]}</span>)}
      </p>
      {visibles.length > 0 && <div role="img" className="space-y-1"
        aria-label={`${anio}: ${formatInt(cuenta('cumplida'))} semanas cumplidas, ${formatInt(cuenta('parcial'))} parciales, ${formatInt(cuenta('presente'))} presentes y ${formatInt(cuenta('vacia'))} vacías`}>
        <div className="flex h-32 gap-0.5">
          {visibles.map((l) => <Barra key={l} s={porLunes.get(l)} actual={l === lunesActual} />)}
        </div>
        {/* Cada mes ocupa el ancho de sus semanas (como mucho 2 rem por barra), así su nombre cabe también con el texto ampliado. */}
        <div aria-hidden className="flex h-4 gap-0.5">
          {tramosDeMes(visibles).map(({ mes, semanas: n }, i) => <span key={`${mes}-${i}`} className="min-w-0 truncate text-caption text-fg-muted"
            style={{ flex: `${n} 1 0%`, maxWidth: `calc(${n} * 2rem + ${n - 1} * 0.125rem)` }}>{MESES_ABREV[mes - 1]}</span>)}
        </div>
      </div>}
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
