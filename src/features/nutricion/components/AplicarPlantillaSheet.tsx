import { useState } from 'react'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from '../../../shared/components/Sheet'
import type { Comida, Meal } from '../../../shared/db/types'
import * as foodsRepo from '../data/foodsRepo'
import * as mealsRepo from '../data/mealsRepo'
import { resolverItemsPlantilla } from '../lib/plantillas'
import { resumenMacros, sumMacros } from '../lib/nutrition'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'

const LABELS: Record<Comida, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }

interface Props {
  meal: Meal
  fecha: string
  comida: Comida
  onClose: () => void
  onAplicado: (ids: number[]) => void
}

/** Vista previa (con los valores actuales de cada alimento) y confirmación al usar una plantilla (A1). */
export default function AplicarPlantillaSheet({ meal, fecha, comida, onClose, onAplicado }: Props) {
  const foodIds = meal.items.map((it) => it.foodId).filter((id): id is number => id !== undefined)
  const foodsById = useLiveQuery(() => foodsRepo.porIds(foodIds), [meal.id])
  const resueltos = foodsById ? resolverItemsPlantilla(meal.items, foodsById) : null
  const total = resueltos ? sumMacros(resueltos) : null
  const kcalTotal = total ? Math.round(total.kcal) : 0
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function aplicar() {
    if (aplicando) return
    setAplicando(true)
    setError(null)
    try {
      const ids = await mealsRepo.aplicar(meal.id, { fecha, comida })
      onClose()
      onAplicado(ids)
    } catch {
      setError('No se ha podido aplicar la plantilla. Inténtalo de nuevo.')
    } finally {
      setAplicando(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Usar plantilla" footer={<div className="space-y-3">
      {total && <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-label text-fg-muted">Total</span>
        <span className="tabular break-words text-title text-fg">{formatInt(kcalTotal)} <span className="text-caption text-fg-muted">kcal</span></span>
      </div>}
      {error && <ErrorState>{error}</ErrorState>}
      <Button block loading={aplicando} onClick={aplicar} disabled={!resueltos}>
        {aplicando ? 'Añadiendo…' : `Añadir a ${LABELS[comida]}`}
      </Button>
    </div>}>
      <div className="space-y-4">
        <h3 className="break-words text-title text-fg">{meal.nombre}</h3>
        {resueltos && (
          <ul className="divide-y divide-line">
            {resueltos.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-body font-medium text-fg">{it.nombre}</span>
                  <span className="tabular block text-caption text-fg-subtle">
                    {it.gramos > 0 ? `${formatNumber(it.gramos, 1)} g · ` : ''}
                    {resumenMacros(it)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-body-sm text-fg">{formatInt(it.kcal)} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
