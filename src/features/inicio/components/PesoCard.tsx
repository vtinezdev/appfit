import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatNumber } from '../../../shared/lib/format'
import { puntosSparkline, type TendenciaPeso } from '../lib/peso'
import { formatFriendly } from '../../../shared/lib/dates'

interface Props {
  /** `null`: todavía no hay ningún pesaje. */
  tendencia: TendenciaPeso | null
  onRegistrar: () => void
  onVerHistorial: () => void
}

const ANCHO = 300
const ALTO = 44
const MARGEN = 2

/** «−0,6 kg en 7 días» (con el signo menos tipográfico). Sin juicio de valor: el mismo tono suba o baje. */
function fraseVariacion(v: number): string {
  if (v === 0) return 'Sin cambios en 7 días'
  return `${v < 0 ? '−' : '+'}${formatNumber(Math.abs(v), 1)} kg en 7 días`
}

/**
 * Último peso, variación respecto a hace una semana y mini gráfica de 30 días (SVG propio, sin Recharts:
 * Inicio es la pantalla de arranque). Los puntos se reparten por orden, no por fecha: solo enseña la tendencia.
 */
export default function PesoCard({ tendencia, onRegistrar, onVerHistorial }: Props) {
  const valores = tendencia?.serie30d.map((p) => p.kg) ?? []
  const trazo = puntosSparkline(valores, ANCHO, ALTO - 2 * MARGEN)

  return (
    <Card>
      <section aria-label="Peso" className="space-y-4">
        <div className="flex min-h-touch items-center justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-title text-fg">Peso</h2>
          <IconButton icon="more" label="Historial de peso" variant="ghost" size="sm" onClick={onVerHistorial} />
          <Button variant="ghost" size="sm" className="-mr-3" onClick={onRegistrar}>
            <Icon name="plus" size={16} />
            Registrar
          </Button>
        </div>
        {!tendencia ? (
          <EmptyState>Aún no hay pesajes</EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Metric size="metric" valor={formatNumber(tendencia.actual, 1)} unidad="kg" caption={formatFriendly(tendencia.fecha)} />
              {tendencia.variacion7d !== null && <p className="tabular text-body-sm text-fg-muted">{fraseVariacion(tendencia.variacion7d)}</p>}
            </div>
            {valores.length >= 2 && (
              <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                preserveAspectRatio="none"
                className="block h-12 w-full"
                role="img"
                aria-label={`Peso en los últimos 30 días: de ${formatNumber(valores[0], 1)} a ${formatNumber(valores[valores.length - 1], 1)} kg`}
              >
                <path
                  d={trazo}
                  transform={`translate(0 ${MARGEN})`}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-fg-muted"
                />
              </svg>
            )}
          </>
        )}
      </section>
    </Card>
  )
}
