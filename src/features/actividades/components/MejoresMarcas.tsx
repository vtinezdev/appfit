import Card from '../../../shared/components/Card'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Actividad } from '../../../shared/db/types'
import { formatDiaMes } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { formatKm, formatRitmo, NOMBRE_TIPO } from '../lib/actividad'
import { mejoresMarcas, NOMBRE_MARCA, TIPOS_MARCA, type TipoMarca } from '../lib/marcas'

function cifra(tipo: TipoMarca, valor: number): [string, string] {
  if (tipo === 'distancia') return [formatKm(valor), 'km']
  if (tipo === 'desnivel') return [formatInt(valor), 'm']
  const [v, u] = formatRitmo(valor).split(' ')
  return [v, u]
}

/**
 * «Tus mejores marcas» arriba de Actividades (A24): la más larga, la de más desnivel y el mejor ritmo (salidas de 5 km o
 * más), todas las actividades juntas. Tocar una abre su actividad. Con menos de dos salidas no se muestra.
 */
export default function MejoresMarcas({ actividades, onAbrir }: { actividades: readonly Actividad[]; onAbrir: (id: number) => void }) {
  if (actividades.filter((a) => !a.enCurso).length < 2) return null
  const mejores = mejoresMarcas(actividades)
  return (
    <section aria-label="Tus mejores marcas" className="space-y-stack">
      <SectionHeader variant="section">Tus mejores marcas</SectionHeader>
      <Card className="space-y-2">
        <ul className="metric-grid gap-3">
          {TIPOS_MARCA.map((tipo) => {
            const m = mejores[tipo]
            if (!m) return null
            const [valor, unidad] = cifra(tipo, m.valor)
            return <li key={tipo} className="min-w-0">
              <button type="button" onClick={() => onAbrir(m.actividad.id)} className="app-button -mx-1 block min-h-touch w-full rounded-md px-1 py-1 text-left">
                <span className="mb-1 block text-rotulo text-fg-muted">{NOMBRE_MARCA[tipo]}</span>
                <span className="flex flex-wrap items-baseline gap-x-1.5 text-fg">
                  <span className="tabular min-w-0 break-words font-numeric text-heading">{valor}</span>
                  <span className="text-caption text-fg-muted">{unidad}</span>
                </span>
                <span className="tabular mt-1 block break-words text-caption text-fg-muted">{NOMBRE_TIPO[m.actividad.tipo]} · {formatDiaMes(m.actividad.inicio)}</span>
              </button>
            </li>
          })}
        </ul>
        <p className="text-caption text-fg-muted">El mejor ritmo cuenta salidas de 5 km o más.</p>
      </Card>
    </section>
  )
}
