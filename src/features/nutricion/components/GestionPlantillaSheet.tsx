import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import type { Comida, Meal, MealItem } from '../../../shared/db/types'
import * as mealsRepo from '../data/mealsRepo'
import { por100DesdeEntrada, type Por100 } from '../lib/alimentos'
import { itemConGramos, itemsConGramosValidos } from '../lib/plantillas'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Input } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  meal: Pick<Meal, 'nombre' | 'items'> & { id?: number }
  comida?: Comida
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
export default function GestionPlantillaSheet({ meal, comida, onClose, onBorrada }: Props) {
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
  const puedeGuardar = nombre.trim() !== '' && items.length > 0 && itemsConGramosValidos(items) && !guardando

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      if (meal.id === undefined) await mealsRepo.crearDesdeItems({ nombre, comida, items })
      else await mealsRepo.actualizar(meal.id, { nombre: nombre.trim(), items })
      onClose()
    } catch {
      setError('No se ha podido guardar la comida típica. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (borrando || meal.id === undefined) return
    setBorrando(true)
    setError(null)
    try {
      await mealsRepo.borrar(meal.id)
      onClose()
      onBorrada()
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido quitar la comida guardada. Inténtalo de nuevo.')
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={meal.id === undefined ? 'Guardar comida típica' : 'Editar comida típica'} footer={<div className="space-y-2">        {error && <ErrorState>{error}</ErrorState>}

        {confirmandoBorrado ? (
          <ConfirmacionDestructiva
            mensaje={`¿Dejar de guardar «${meal.nombre}»? Tus registros del diario se mantienen. Si la repites a menudo, puede seguir apareciendo como sugerencia.`}
            confirmar="Sí, quitar"
            onConfirmar={borrar}
            onCancelar={() => setConfirmandoBorrado(false)}
            ocupado={borrando}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {meal.id !== undefined && <Button variant="destructive" onClick={() => setConfirmandoBorrado(true)} disabled={guardando} className="flex-1 basis-40">
              Dejar de guardar
            </Button>}
            <Button loading={guardando} onClick={guardar} disabled={!puedeGuardar} className="flex-1 basis-40">
              {guardando ? 'Guardando…' : 'Guardar comida típica'}
            </Button>
          </div>
        )}</div>}>
      <div className="space-y-3">
        {meal.id === undefined && <p className="text-body-sm text-fg-muted">Detectada por repetición. Guárdala para tenerla siempre a mano, aunque dejes de repetirla durante un tiempo.</p>}
        <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la comida típica</span><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>

        <div className="space-y-2">
          {entradas.length === 0 && <EmptyState>Sin alimentos.</EmptyState>}
          {entradas.map(({ item: it }, i) => (
            <div key={i} className="space-y-1.5 rounded-md bg-surface-muted px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-body text-fg">{it.nombre}</p>
                <IconButton icon="trash" label={`Quitar ${it.nombre}`} variant="ghost" size="sm" onClick={() => quitar(i)} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-caption text-fg-subtle">{formatInt(it.kcal)} kcal</span>
                {!it.rapida && <NumberStepper label={`Gramos de ${it.nombre}`} value={it.gramos} onChange={(g) => cambiarGramos(i, g)} step={10} suffix="g" />}
              </div>
              {!it.rapida && it.gramos <= 0 && <p className="text-caption text-destructive">Indica unos gramos válidos.</p>}
            </div>
          ))}
        </div>


      </div>
    </Sheet>
  )
}
