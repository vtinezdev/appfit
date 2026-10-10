import { useLiveQuery } from 'dexie-react-hooks'
import SectionHeader from '../../../shared/components/SectionHeader'
import { getSettings } from '../../../shared/db/settings'
import type { Entry } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import * as foodsRepo from '../data/foodsRepo'
import { PLANTAS_SEMANA, plantasDistintas } from '../lib/herbario'

/** Herbario del periodo del Resumen: plantas distintas (Vitrina). No aparece si la gamificación o su nutrición están desactivadas. */
export default function HerbarioResumen({ entries, semana }: { entries: Entry[]; semana: boolean }) {
  const activo = useLiveQuery(async () => { const s = await getSettings(); return s.gamificacionVisible !== false && s.gamificacionConNutricion !== false }, [])
  const categorias = useLiveQuery(() => foodsRepo.categoriasDeEntradas(entries), [entries])
  if (!activo || !categorias) return null
  const plantas = plantasDistintas(entries, categorias)
  if (plantas.length === 0) return null
  return <section aria-label="Plantas distintas" className="space-y-3">
    <SectionHeader variant="section">Plantas distintas</SectionHeader>
    <p className="tabular text-body text-fg"><span className="font-numeric text-heading">{formatInt(plantas.length)}</span>{semana ? ` de ${formatInt(PLANTAS_SEMANA)}` : ''}</p>
    <p className="break-words text-body-sm text-fg">{plantas.map((p) => p.nombre).join(', ')}</p>
    <p className="text-caption text-fg-muted">Frutas, verduras, tubérculos, legumbres, frutos secos y cereales distintos del periodo, por su nombre corto. Las recetas y los platos preparados no se descomponen. Más en Vitrina › Colecciones.</p>
  </section>
}
