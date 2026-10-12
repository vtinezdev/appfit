import { formatInt } from '../../../shared/lib/format'

/** A partir de aquí los segmentos serían demasiado finos: se dibuja una barra continua. */
const MAX_SEGMENTOS = 24

/**
 * Series hechas de la sesión: un segmento por serie, rellenos los completados, para contar de un vistazo lo que queda.
 * Con muchas series (o ninguna), una barra continua. Va sobre la superficie de entreno.
 */
export default function ProgresoSeries({ hechas, total }: { hechas: number; total: number }) {
  const texto = `${formatInt(hechas)} de ${formatInt(total)} series marcadas`
  return (
    <div role="progressbar" aria-label="Series completadas" aria-valuemin={0} aria-valuemax={Math.max(total, 1)} aria-valuenow={hechas} aria-valuetext={texto}
      className="progreso-series" data-continuo={total === 0 || total > MAX_SEGMENTOS || undefined}>
      {total > 0 && total <= MAX_SEGMENTOS
        ? Array.from({ length: total }, (_, i) => <span key={i} data-hecha={i < hechas || undefined} />)
        : <span data-hecha style={{ width: `${total > 0 ? (hechas / total) * 100 : 0}%` }} />}
    </div>
  )
}
