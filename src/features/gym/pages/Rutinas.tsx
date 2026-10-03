import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import { normalizeName } from '../../../shared/lib/text'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { Input, SearchInput } from '../../../shared/components/Input'
import { EmptyState, ErrorState } from '../../../shared/components/StateMessage'

export default function Rutinas() {
  const [editando, setEditando] = useState<routinesRepo.RoutineInput | null>(null)
  const [busquedaEj, setBusquedaEj] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))
  const busquedaNorm = normalizeName(busquedaEj)
  const resultados = exercises?.filter((e) => e.nombreNorm.includes(busquedaNorm) && !editando?.exerciseIds.includes(e.id!))
  const existeExacto = exercises?.some((e) => e.nombreNorm === busquedaNorm)

  /** Abre o cierra el sheet de edición, sin arrastrar confirmaciones ni errores de la rutina anterior. */
  function abrir(draft: routinesRepo.RoutineInput | null) {
    setConfirmandoBorrado(false)
    setError(null)
    setEditando(draft)
  }

  async function guardar() {
    if (!editando || !editando.nombre.trim() || ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.guardar(editando)
      abrir(null)
    } catch {
      setError('No se ha podido guardar la rutina. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar(id: number) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await routinesRepo.borrar(id)
      abrir(null)
    } catch {
      setConfirmandoBorrado(false)
      setError('No se ha podido borrar la rutina. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function crearEjercicioYAgregar() {
    const nombre = busquedaEj.trim()
    if (!nombre || !editando) return
    setError(null)
    try {
      const id = await exercisesRepo.obtenerOCrear(nombre)
      if (!editando.exerciseIds.includes(id)) setEditando({ ...editando, exerciseIds: [...editando.exerciseIds, id] })
      setBusquedaEj('')
    } catch {
      setError('No se ha podido crear el ejercicio. Inténtalo de nuevo.')
    }
  }

  function agregarEjercicio(id: number) {
    if (!editando) return
    setEditando({ ...editando, exerciseIds: [...editando.exerciseIds, id] })
    setBusquedaEj('')
  }

  function quitarEjercicio(id: number) {
    if (!editando) return
    setEditando({ ...editando, exerciseIds: editando.exerciseIds.filter((e) => e !== id) })
  }

  return (
    <div className="space-y-stack">
      <Button block onClick={() => abrir({ nombre: '', exerciseIds: [] })}>
        <Icon name="plus" size={18} />
        Nueva rutina
      </Button>

      {rutinas?.length === 0 && <EmptyState icon="dumbbell" title="Todavía no tienes rutinas">Crea una para empezar tus entrenos con los ejercicios ya elegidos.</EmptyState>}
      {rutinas && rutinas.length > 0 && (
        <ListGroup aria-label="Tus rutinas">
          {rutinas.map((r) => (
            <li key={r.id}>
              <ListRow onClick={() => abrir(r)}>
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-fg">{r.nombre}</span>
                  <span className="block text-caption text-fg-muted">
                    {r.exerciseIds.length} ejercicio{r.exerciseIds.length === 1 ? '' : 's'}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} className="text-fg-subtle" />
              </ListRow>
            </li>
          ))}
        </ListGroup>
      )}

      <Sheet open={editando !== null} onClose={() => abrir(null)} title={editando?.id ? 'Editar rutina' : 'Nueva rutina'} footer={editando && <div className="space-y-2">            {error && <ErrorState>{error}</ErrorState>}

            {confirmandoBorrado && editando.id ? (
              <div className="pt-2">
                <ConfirmacionDestructiva
                  mensaje={`¿Borrar la rutina «${editando.nombre.trim() || 'sin nombre'}»? No se puede deshacer. Tus entrenos ya hechos no se borran.`}
                  confirmar="Sí, borrar"
                  onConfirmar={() => borrar(editando.id!)}
                  onCancelar={() => setConfirmandoBorrado(false)}
                  ocupado={ocupado}
                />
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                {editando.id && (
                  <Button variant="destructive" onClick={() => setConfirmandoBorrado(true)} className="flex-1">
                    Borrar
                  </Button>
                )}
                <Button loading={ocupado} onClick={guardar} disabled={!editando.nombre.trim()} className="flex-1">
                  Guardar
                </Button>
              </div>
            )}</div>}>
        {editando && (
          <div className="space-y-3">
            <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la rutina</span><Input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre de la rutina"
            /></label>

            <div className="space-y-1">
              {editando.exerciseIds.map((id, i) => (
                <div key={id} className="flex min-h-touch items-center justify-between gap-2 border-b border-line py-1">
                  <span className="tabular text-caption text-fg-muted">{i + 1}</span><span className="min-w-0 flex-1 break-words text-body text-fg">{exerciseMap.get(id)?.nombre ?? '…'}</span>
                  <IconButton icon="close" label={`Quitar ${exerciseMap.get(id)?.nombre ?? 'ejercicio'}`} variant="ghost" size="sm" onClick={() => quitarEjercicio(id)} />
                </div>
              ))}
            </div>

            <SearchInput
              aria-label="Buscar o crear ejercicio"
              value={busquedaEj}
              onChange={(e) => setBusquedaEj(e.target.value)}
              placeholder="Buscar o crear ejercicio…"
            />
            <div className="divide-y divide-line">
              {resultados?.map((ex) => (
                <ListRow tone="flat" key={ex.id} onClick={() => agregarEjercicio(ex.id!)} className="text-body">
                  {ex.nombre}
                </ListRow>
              ))}
              {busquedaEj.trim() && !existeExacto && (
                <ListRow tone="accent" onClick={crearEjercicioYAgregar} className="text-body-sm">
                  Crear «{busquedaEj.trim()}»
                </ListRow>
              )}
            </div>


          </div>
        )}
      </Sheet>
    </div>
  )
}
