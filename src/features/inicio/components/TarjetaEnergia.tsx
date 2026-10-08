import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Objetivos } from '../../../shared/db/types'
import { MACROS } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { fraseKcal, type Macros } from '../../nutricion/lib/nutrition'
import { anilloEnergia, type TipoTramo } from '../lib/anilloEnergia'

interface Props {
  totales: Macros
  objetivos: Objetivos
  /** Abre el día en Nutrición. */
  onAbrir: () => void
}

/** Geometría del SVG (viewBox 120): anillo exterior de consumo y anillo interior fino para la segunda vuelta. */
const R = 52
const GROSOR = 12
/** Lo que falta va en un carril más fino que lo consumido: el negro sigue ahí, pero mandan los colores de P/C/G. */
const GROSOR_RESTO = 6
const R_VUELTA = 40
const GROSOR_VUELTA = 5
const CIRC = 2 * Math.PI * R
const CIRC_VUELTA = 2 * Math.PI * R_VUELTA
/** Separación entre tramos contiguos, en unidades del viewBox. */
const HUECO = 1.5

const TRAZO: Record<TipoTramo, string> = { prot: 'stroke-protein', carbs: 'stroke-carbs', fat: 'stroke-fat', otros: 'stroke-kcal' }
const LEYENDA = [
  { key: 'prot', nombre: MACROS.prot.label, valor: (t: Macros) => t.prot },
  { key: 'carbs', nombre: 'Hidratos', valor: (t: Macros) => t.carb },
  { key: 'fat', nombre: MACROS.fat.label, valor: (t: Macros) => t.grasa },
] as const

/**
 * Energía del día en Inicio: rueda con lo consumido en los colores de P/C/G (proporcional a sus kcal) y lo que falta
 * en negro, sobre un carril más fino; si te pasas, el exceso da una segunda vuelta por dentro. Toda la tarjeta abre el día.
 */
export default function TarjetaEnergia({ totales, objetivos, onAbrir }: Props) {
  const { tramos, vuelta } = anilloEnergia(totales, objetivos.kcal)
  const meta = Math.round(objetivos.kcal)
  const frase = fraseKcal(totales.kcal, objetivos.kcal)
  const hueco = tramos.length > 1 ? HUECO : 0

  return (
    <Card padded={false} className="energia-card">
      <button type="button" onClick={onAbrir} className="energia-cuerpo flex w-full flex-wrap items-center gap-5 rounded-lg p-card text-left">
        <span className="relative block h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="block h-full w-full -rotate-90" aria-hidden="true" fill="none">
            <circle cx="60" cy="60" r={R} strokeWidth={GROSOR_RESTO} className="stroke-kcal-rest" />
            {tramos.map((t) => (
              <circle key={t.tipo} cx="60" cy="60" r={R} strokeWidth={GROSOR} className={TRAZO[t.tipo]}
                strokeDasharray={`${Math.max(t.largo * CIRC - hueco, 0)} ${CIRC}`} strokeDashoffset={-t.inicio * CIRC} />
            ))}
            {vuelta > 0 && <>
              <circle cx="60" cy="60" r={R_VUELTA} strokeWidth={GROSOR_VUELTA} className="stroke-surface-muted" />
              <circle cx="60" cy="60" r={R_VUELTA} strokeWidth={GROSOR_VUELTA} strokeLinecap="round" className="stroke-kcal"
                strokeDasharray={`${vuelta * CIRC_VUELTA} ${CIRC_VUELTA}`} />
            </>}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular font-numeric text-metric text-fg">{formatInt(totales.kcal)}</span>
            <span className="text-caption text-fg-muted">kcal</span>
          </span>
        </span>
        <span className="energia-texto flex min-w-0 flex-1 basis-32 flex-col gap-2">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-label text-fg-muted">Energía</span>
            <Icon name="chevron-right" size={18} className="text-fg-subtle" />
          </span>
          {meta > 0 && <span className="tabular text-body-sm text-fg-muted">de <strong className="font-semibold text-fg">{formatInt(meta)}</strong> kcal</span>}
          {frase && <span className="tabular text-body-sm text-fg">{frase}</span>}
          <span className="flex flex-col gap-1">
            {LEYENDA.map((m) => (
              <span key={m.key} className="tabular flex items-center gap-2 text-body-sm">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-pill ${MACROS[m.key].bg}`} />
                <span className="min-w-0 flex-1 text-fg-muted">{m.nombre}</span>
                <span className="text-fg">{formatInt(m.valor(totales))} g</span>
              </span>
            ))}
          </span>
        </span>
      </button>
    </Card>
  )
}
