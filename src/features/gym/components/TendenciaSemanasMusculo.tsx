import { formatInt, formatNumber } from '../../../shared/lib/format'
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import type { SemanaMusculo } from '../lib/progresoMuscular'

const ANCHO = 320, ALTO = 96, ARRIBA = 4

/**
 * Series de las últimas semanas de un músculo (PRO-03): una barra por semana con la línea de la dosis de AppFit y la
 * semana en curso resaltada. El SVG solo dibuja barras y dosis; cifras y fechas van debajo en texto, en una rejilla con
 * una columna por barra, para que crezcan con el tamaño de letra; bajo cada barra, solo el día del lunes (el mes, en el
 * pie), para que quepa también con letra grande. «P» marca las semanas en pausa de Ritmo. Sin series en ninguna, nada.
 */
export default function TendenciaSemanasMusculo({ semanas, dosis, musculo }: { semanas: SemanaMusculo[]; dosis: number; musculo: string }) {
  const tope = Math.max(dosis * 1.15, ...semanas.map(s => s.series))
  const y = (v: number) => ALTO - (v / tope) * (ALTO - ARRIBA)
  const paso = ANCHO / semanas.length
  const barra = Math.min(28, paso * 0.62)
  const fecha = (lunes: string) => formatDiaMes(parseISODate(lunes).getTime())
  const cifra = (v: number) => (Number.isInteger(v) ? formatInt(v) : formatNumber(v, 1))
  const ultima = semanas.length - 1
  if (semanas.every(s => s.series === 0)) return null
  return (
    <section aria-label={`Series de ${musculo} por semana`} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-rotulo text-fg-muted">Series por semana · últimas {formatInt(semanas.length)}</h3>
        <p className="tabular text-caption text-fg-muted">┄ Dosis {formatInt(dosis)}</p>
      </div>
      <div aria-hidden="true">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block w-full" preserveAspectRatio="none" focusable="false">
          {semanas.map((s, i) => s.series > 0 && <rect key={s.lunes} x={i * paso + (paso - barra) / 2} y={y(s.series)} width={barra} height={ALTO - y(s.series)} rx={3}
            className={i === ultima ? 'fill-accent-strong' : 'fill-fg-muted/50'} />)}
          <line x1={0} x2={ANCHO} y1={y(dosis)} y2={y(dosis)} className="stroke-fg-muted" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={ANCHO} y1={ALTO - 0.5} y2={ALTO - 0.5} className="stroke-line-strong" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="grid grid-cols-8 pt-1 text-center">
          {semanas.map((s, i) => <div key={s.lunes} className={`min-w-0 text-caption ${i === ultima ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
            <span className="tabular block">{s.pausa && s.series === 0 ? 'P' : cifra(s.series)}</span>
            <span className="tabular block">{formatInt(parseISODate(s.lunes).getDate())}</span>
          </div>)}
        </div>
      </div>
      <table className="sr-only">
        <caption>Series de {musculo} que cuentan cada semana; la dosis es {formatInt(dosis)}</caption>
        <thead><tr><th scope="col">Semana del</th><th scope="col">Series</th></tr></thead>
        <tbody>{semanas.map((s, i) => <tr key={s.lunes}>
          <td>{fecha(s.lunes)}{i === ultima ? ' (en curso)' : ''}{s.pausa ? ', en pausa' : ''}</td><td>{cifra(s.series)}</td>
        </tr>)}</tbody>
      </table>
      <p className="text-caption text-fg-muted">Semanas del {fecha(semanas[0].lunes)} al {fecha(semanas[ultima].lunes)}; la última, en curso{semanas.some(s => s.pausa) ? '; P, en pausa' : ''}. Directas e indirectas, como en «Esta semana».</p>
    </section>
  )
}
