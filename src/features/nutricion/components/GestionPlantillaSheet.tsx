import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import type { Meal, MealItem } from '../../../shared/db/types'
import * as mealsRepo from '../data/mealsRepo'
import { por100DesdeEntrada, type Por100 } from '../lib/alimentos'
import { itemConGramos, itemsConGramosValidos } from '../lib/plantillas'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Input } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  meal: Meal
  onClose: () => void
  onBorrada: () => void
}

interface ItemEnEdicion {
  item: MealItem
  /** Valores por 100 g fijados al abrir el sheet: cambiar los gramos siempre escala desde aquí. */
  por100: Por100
}

/**
 * Gestión de una plantilla (A1) desde Alimentos: renombrar, cambiar los gramos de un alimento
 * (recalcula sus macros desde los valores por 100 g fijados al abrir el sheet, sin tocar el
 * alimento en vivo), quitar alimentos o borrar la plantilla entera.
 */
export default function GestionPlantillaSheet({ meal, onClose, onBorrada }: Props) {
  const [nombre, setNombre] = useState(meal.nombre)
  const [entradas, setEntradas] = useState<ItemEnEdicion[]>(() =>
    meal.items.map((item) => ({ item, por100: por100DesdeEntrada(item) })),
  )
  const [guardando, setGuardando] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cambiarGramos(i: number, gramos: number) {
    setEntradas((prev) => prev.map((e, idx) => (idx === i ? { ...e, item: itemConGramos(e.item, e.por100, gramos) } : e)))
  }

  function quitar(i: number) {
    setEntradas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const items = entradas.map((e) => e.item)
  const puedeGuardar = nombre.trim() !== '' && itemsConGramosValidos(items) && !guardando

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      await mealsRepo.actualizar(meal.id, { nombre: nombre.trim(), items })
      onClose()
    } catch {
      setError('No se ha podido guardar la plantilla. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (borrando) return
    setBorrando(true)
    setError(null)
    try {
      await mealsRepo.borrar(meal.id)
      onClose()
      onBorrada()
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar la plantilla. Inténtalo de nuevo.')
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Editar plantilla">
      <div className="space-y-3">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <div className="space-y-2">
          {entradas.length === 0 && <EmptyState>Sin alimentos.</EmptyState>}
          {entradas.map(({ item: it }, i) => (
            <div key={i} className="space-y-1.5 rounded-md bg-surface-muted px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-body-sm text-fg">{it.nombre}</p>
                <IconButton icon="trash" label={`Quitar ${it.nombre}`} variant="ghost" size="sm" onClick={() => quitar(i)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-fg-subtle">{formatInt(it.kcal)} kcal</span>
                {!it.rapida && <NumberStepper value={it.gramos} onChange={(g) => cambiarGramos(i, g)} step={10} suffix="g" compact inputTextoGrande />}
              </div>
              {!it.rapida && it.gramos <= 0 && <p className="text-caption text-destructive">Indica unos gramos válidos.</p>}
            </div>
          ))}
        </div>

        {error && <ErrorState>{error}</ErrorState>}

        {confirmandoBorrado ? (
          <ConfirmacionDestructiva
            mensaje={`¿Borrar la plantilla «${meal.nombre}»? No se puede deshacer. Lo que ya has registrado con ella no se borra.`}
            confirmar="Sí, borrar"
            onConfirmar={borrar}
            onCancelar={() => setConfirmandoBorrado(false)}
            ocupado={borrando}
          />
        ) : (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => setConfirmandoBorrado(true)} disabled={guardando} className="flex-1">
              Borrar plantilla
            </Button>
            <Button loading={guardando} onClick={guardar} disabled={!puedeGuardar} className="flex-1">
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
