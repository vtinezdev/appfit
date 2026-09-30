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
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import Badge from '../../../shared/components/Badge'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { Input, SearchInput } from '../../../shared/components/Input'
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
    <div className="space-y-section">
      <SegmentedControl opciones={VISTAS} valor={vista} onChange={setVista} />

      {vista === 'alimentos' && (
        <div className="space-y-stack">
          <div className="flex items-center gap-2">
            <SearchInput
              tone="surface"
              aria-label="Buscar en tus alimentos"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alimento…"
              className="flex-1"
            />
            <Button
              size="md"
              onClick={() => abrir({ nombre: '', kcal100: 0, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual' })}
            >
              <Icon name="plus" size={18} />
              Nuevo
            </Button>
          </div>

          {filtrados?.length === 0 && <EmptyState icon="utensils" title={busqueda.trim() ? 'Sin coincidencias' : 'Aún no hay alimentos'}>{busqueda.trim() ? 'Prueba con otro nombre.' : 'Los alimentos que crees o edites aparecerán aquí.'}</EmptyState>}
          {filtrados && filtrados.length > 0 && (
            <ListGroup aria-label="Tus alimentos">
              {filtrados.map((f) => (
                <li key={f.id}>
                  <ListRow onClick={() => abrir(f)}>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-body-sm font-medium text-fg">{f.nombre}</p>
                      <p className="tabular text-caption text-fg-muted">
                        P{formatInt(f.prot100)} C{formatInt(f.carb100)} G{formatInt(f.grasa100)} · por 100 g
                      </p>
                    </div>
                    <Metric size="title" align="right" valor={formatInt(f.kcal100)} unidad="kcal" />
                  </ListRow>
                </li>
              ))}
            </ListGroup>
          )}
        </div>
      )}

      {vista === 'plantillas' && (
        <div className="space-y-stack">
          {plantillas?.length === 0 && <EmptyState icon="copy" title="Aún no hay plantillas">Guarda una comida como plantilla desde el menú «⋯» de Hoy.</EmptyState>}
          {plantillas && plantillas.length > 0 && (
            <ListGroup aria-label="Plantillas">
              {plantillas.map((m) => (
                <li key={m.id}>
                  <ListRow onClick={() => setPlantillaEditando(m)}>
                    <span className="line-clamp-2 min-w-0 flex-1 text-body-sm font-medium text-fg">{m.nombre}</span>
                    <Badge>
                      {m.items.length} alimento{m.items.length === 1 ? '' : 's'}
                    </Badge>
                  </ListRow>
                </li>
              ))}
            </ListGroup>
          )}
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
