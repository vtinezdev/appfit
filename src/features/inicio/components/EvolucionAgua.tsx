import { useState } from 'react'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { formatShort, parseISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { barrasAgua } from '../lib/barrasAgua'
import { formatAgua, partesAgua } from '../lib/agua'

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
type Periodo = '7' | '30' | '90'

/**
 * Evolución del agua en la hoja de Inicio: una barra por día con la línea del objetivo (en tinta las que lo alcanzan) y,
 * encima, la media y los días en el objetivo. Sin texto de cómo leerla: los días sin agua quedan sin barra.
 */
export default function EvolucionAgua({ registros, hoy, objetivoMl }: { registros: { fecha: string; ml: number }[]; hoy: string; objetivoMl: number | null }) {
  const [periodo, setPeriodo] = useState<Periodo>('7')
  const dias = Number(periodo)
  const r = barrasAgua(registros, hoy, dias, objetivoMl)
  const cifra = (valor: string, unidad: string, rotulo: string) => <div className="min-w-0">
    <p className="text-rotulo text-fg-muted">{rotulo}</p>
    <p className="tabular flex items-baseline gap-1"><span className="font-numeric text-heading text-fg">{valor}</span><span className="text-caption text-fg-muted">{unidad}</span></p>
  </div>
  return <section aria-labelledby="agua-evolucion" className="space-y-3">
    <h3 id="agua-evolucion" className="text-title text-fg">Evolución</h3>
    <SegmentedControl<Periodo> label="Periodo del agua" valor={periodo} onChange={setPeriodo} opciones={[{ valor: '7', label: '7 días' }, { valor: '30', label: '30 días' }, { valor: '90', label: '90 días' }]} />
    <div className="grid grid-cols-2 gap-3">
      {r.media === null ? cifra('—', '', 'Media') : cifra(partesAgua(r.media).valor, partesAgua(r.media).unidad, 'Media')}
      {objetivoMl !== null && cifra(formatNumber(r.diasEnObjetivo), `de ${formatNumber(dias)} días`, 'En tu objetivo')}
    </div>
    <div role="img" className="space-y-1"
      aria-label={`Agua de los últimos ${dias} días: ${r.media === null ? 'sin registros' : `media de ${formatAgua(r.media)}`}${objetivoMl !== null ? `, ${r.diasEnObjetivo} días en el objetivo de ${formatAgua(objetivoMl)}` : ''}.`}>
      <div className="relative flex h-28 items-end gap-1">
        {r.lineaObjetivo !== null && <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-goal" style={{ bottom: `${r.lineaObjetivo * 100}%` }} />}
        {r.barras.map((b) => <span key={b.fecha} aria-hidden className="flex h-full min-w-0 flex-1 items-end">
          <span className={`block w-full rounded-sm ${b.ml === 0 ? 'bg-line' : b.enObjetivo ? 'bg-fg' : 'bg-fg-subtle'}`} style={{ height: b.ml === 0 ? '2px' : `${b.alto * 100}%` }} />
        </span>)}
      </div>
      {dias === 7
        ? <div aria-hidden className="flex gap-1">{r.barras.map((b) => <span key={b.fecha} className={`min-w-0 flex-1 text-center text-caption ${b.fecha === hoy ? 'font-bold text-fg' : 'text-fg-muted'}`}>{LETRAS[parseISODate(b.fecha).getDay()]}</span>)}</div>
        : <div aria-hidden className="flex justify-between text-caption text-fg-muted"><span>{formatShort(r.barras[0].fecha)}</span><span>Hoy</span></div>}
    </div>
  </section>
}
