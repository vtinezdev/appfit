import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import type { Comida } from '../../../shared/db/types'
import { comidaPorHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import * as comidasTipicasRepo from '../../nutricion/data/comidasTipicasRepo'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as mealsRepo from '../../nutricion/data/mealsRepo'
import type { LoDeSiempre } from '../../nutricion/lib/comidasTipicas'
import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import type { Aviso } from '../../../shared/hooks/useAviso'

const NOMBRE: Record<Comida, string> = { desayuno: 'desayuno', comida: 'comida', cena: 'cena', snack: 'snack' }
const TITULO: Record<Comida, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }

interface Props {
  hoy: string
  /** Abre Añadir comida en Nutrición, ya en esa comida. */
  onAnadir: (comida: Comida) => void
  avisar: (aviso: Aviso) => void
  avisarError: (mensaje: string) => void
}

/**
 * Pie de la tarjeta de energía: «Añadir desayuno» (la comida según la hora) y, si esa comida se repite (3 de los últimos
 * 7 días) y hoy aún no tiene nada, la fila «Lo de siempre» con sus alimentos y kcal, que la añade en un toque con Deshacer.
 * Neutros, sin acento: la tarjeta sigue siendo un resumen.
 */
export default function RegistroRapido({ hoy, onAnadir, avisar, avisarError }: Props) {
  const comida = comidaPorHora()
  const siempre = useLiveQuery(() => comidasTipicasRepo.loDeSiempre(hoy, comida), [hoy, comida])
  const [anadiendo, setAnadiendo] = useState(false)

  async function anadirLoDeSiempre(s: LoDeSiempre) {
    if (anadiendo) return
    setAnadiendo(true)
    try {
      const ids = await mealsRepo.aplicarSugerencia(s.items, { fecha: hoy, comida })
      if (ids.length === 0) throw new Error('sin entradas')
      void congelarObjetivoDia(hoy)
      avisar({ mensaje: `${TITULO[comida]} añadido · ${formatInt(s.kcal)} kcal`, onDeshacer: () => entriesRepo.borrarVarias(ids) })
    } catch {
      avisarError('No se ha podido añadir. Inténtalo de nuevo.')
    } finally {
      setAnadiendo(false)
    }
  }

  return (
    <div className="space-y-2 border-t border-line px-4 py-3">
      <Button variant="secondary" size="sm" block onClick={() => onAnadir(comida)}><Icon name="plus" size={18} />Añadir {NOMBRE[comida]}</Button>
      {siempre && <ListRow tone="muted" className="flex-wrap" disabled={anadiendo} onClick={() => anadirLoDeSiempre(siempre)}
        aria-label={`Añadir lo de siempre a ${NOMBRE[comida]}: ${siempre.nombre}, ${formatInt(siempre.kcal)} kcal`}>
        {/* Con texto muy ampliado, las kcal y el «+» bajan de línea en vez de estrujar los alimentos. */}
        <span className="min-w-0 flex-1 basis-32">
          <span className="block text-body-sm font-semibold text-fg">Lo de siempre</span>
          <span className="line-clamp-2 break-words text-caption text-fg-muted">{siempre.nombre}</span>
        </span>
        <span className="tabular shrink-0 text-body-sm text-fg">{formatInt(siempre.kcal)} <span className="text-caption text-fg-muted">kcal</span></span>
        <Icon name="plus" size={18} className="shrink-0 text-fg-muted" />
      </ListRow>}
    </div>
  )
}
