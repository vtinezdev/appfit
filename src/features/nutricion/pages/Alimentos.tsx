import { useState } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import type { Meal } from '../../../shared/db/types'
import * as foodsRepo from '../data/foodsRepo'
import * as mealsRepo from '../data/mealsRepo'
import GestionPlantillaSheet from '../components/GestionPlantillaSheet'
import MacroInputs from '../components/MacroInputs'
import { filtrarAlimentos } from '../lib/alimentos'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import { Input } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'
import { useAviso } from '../../../shared/hooks/useAviso'

type FoodDraft = foodsRepo.FoodInput & { id?: number }
type Vista = 'alimentos' | 'plantillas'

const VISTAS: { valor: Vista; label: string }[] = [
  { valor: 'alimentos', label: 'Alimentos' },
  { valor: 'plantillas', label: 'Plantillas' },
]

export default function Alimentos() {
  const [vista, setVista] = useState<Vista>('alimentos')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<FoodDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plantillaEditando, setPlantillaEditando] = useState<Meal | null>(null)
  const foods = useLiveQuery(() => foodsRepo.listar(), [])
  const plantillas = useLiveQuery(() => mealsRepo.listar(), [])
  const { avisar, toast } = useAviso()

  const filtrados = busqueda.trim() ? foods && filtrarAlimentos(foods, busqueda, Infinity) : foods

  function abrir(draft: FoodDraft | null) {
    setError(null)
    setEditando(draft)
  }

  async function guardar() {
    if (!editando) return
    const { nombre, kcal100, prot100, carb100, grasa100 } = editando
    const datos: foodsRepo.FoodInput = { nombre: nombre.trim(), kcal100, prot100, carb100, grasa100, fuente: 'manual' }
    try {
      if (editando.id) {
        await foodsRepo.actualizar(editando.id, datos)
      } else {
        await foodsRepo.crear(datos)
      }
      abrir(null)
    } catch (e) {
      setError(e instanceof foodsRepo.NombreDuplicadoError ? e.message : 'No se ha podido guardar el alimento.')
    }
  }

  async function borrar(id: number) {
    try {
      const food = await foodsRepo.borrar(id)
      abrir(null)
      if (food) avisar({ mensaje: `Borrado «${food.nombre}»`, onDeshacer: () => foodsRepo.restaurar(food) })
    } catch {
      setError('No se ha podido borrar el alimento. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <SegmentedControl opciones={VISTAS} valor={vista} onChange={setVista} />

      {vista === 'alimentos' && (
        <>
          <div className="flex items-center gap-2">
            <Input
              tone="surface"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alimento…"
              className="flex-1"
            />
            <IconButton
              icon="plus"
              label="Nuevo alimento"
              variant="primary"
              onClick={() => abrir({ nombre: '', kcal100: 0, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual' })}
            />
          </div>

          <div className="space-y-2">
            {filtrados?.length === 0 && <EmptyState>No hay alimentos guardados todavía.</EmptyState>}
            {filtrados?.map((f) => (
              <ListRow key={f.id} onClick={() => abrir(f)}>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-fg">{f.nombre}</p>
                  <p className="text-caption text-fg-subtle">
                    {formatInt(f.kcal100)} kcal · P{formatInt(f.prot100)} C{formatInt(f.carb100)} G{formatInt(f.grasa100)} /100g
                  </p>
                </div>
                <Icon name={f.fuente === 'manual' ? 'pencil' : 'sparkles'} size={16} className="text-fg-subtle" label={f.fuente === 'manual' ? 'Añadido a mano' : 'Interpretado con IA'} />
              </ListRow>
            ))}
          </div>
        </>
      )}

      {vista === 'plantillas' && (
        <div className="space-y-2">
          {plantillas?.length === 0 && <EmptyState>No hay plantillas guardadas todavía.</EmptyState>}
          {plantillas?.map((m) => (
            <ListRow key={m.id} onClick={() => setPlantillaEditando(m)}>
              <span className="truncate text-body-sm font-medium text-fg">{m.nombre}</span>
              <span className="ml-2 shrink-0 text-caption text-fg-subtle">
                {m.items.length} alimento{m.items.length === 1 ? '' : 's'}
              </span>
            </ListRow>
          ))}
        </div>
      )}

      <Sheet open={editando !== null} onClose={() => abrir(null)} title={editando?.id ? 'Editar alimento' : 'Nuevo alimento'}>
        {editando && (
          <div className="space-y-3">
            <Input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre"
            />
            <MacroInputs valores={editando} onChange={(patch) => setEditando({ ...editando, ...patch })} className="text-body-sm text-fg-muted" />
            {error && <ErrorState>{error}</ErrorState>}
            <div className="flex gap-2">
              {editando.id && (
                <Button variant="destructive" onClick={() => borrar(editando.id!)} className="flex-1">
                  Borrar
                </Button>
              )}
              <Button onClick={guardar} disabled={!editando.nombre.trim()} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {plantillaEditando && (
        <GestionPlantillaSheet meal={plantillaEditando} onClose={() => setPlantillaEditando(null)} onBorrada={() => setPlantillaEditando(null)} />
      )}

      {toast}
    </div>
  )
}
