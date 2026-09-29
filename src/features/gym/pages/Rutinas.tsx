import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import { normalizeName } from '../../../shared/lib/text'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import ListRow from '../../../shared/components/ListRow'
import { Input } from '../../../shared/components/Input'
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
    <div className="space-y-3 pb-4">
      <Button block
        onClick={() => abrir({ nombre: '', exerciseIds: [] })}
      >
        Nueva rutina
      </Button>

      {rutinas?.length === 0 && <EmptyState>Todavía no tienes rutinas.</EmptyState>}
      {rutinas?.map((r) => (
        <ListRow key={r.id} onClick={() => abrir(r)}>
          <p className="font-medium text-fg">{r.nombre}</p>
          <p className="text-caption text-fg-subtle">{r.exerciseIds.length} ejercicios</p>
        </ListRow>
      ))}

      <Sheet open={editando !== null} onClose={() => abrir(null)} title={editando?.id ? 'Editar rutina' : 'Nueva rutina'}>
        {editando && (
          <div className="space-y-3">
            <Input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre de la rutina"
            />

            <div className="space-y-1">
              {editando.exerciseIds.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-sm bg-surface-muted px-3 py-2">
                  <span className="text-body-sm text-fg">{exerciseMap.get(id)?.nombre ?? '…'}</span>
                  <IconButton icon="close" label="Quitar ejercicio" variant="ghost" size="sm" onClick={() => quitarEjercicio(id)} />
                </div>
              ))}
            </div>

            <Input
              value={busquedaEj}
              onChange={(e) => setBusquedaEj(e.target.value)}
              placeholder="Buscar o crear ejercicio…"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {resultados?.map((ex) => (
                <ListRow tone="muted" key={ex.id} onClick={() => agregarEjercicio(ex.id!)} className="text-body-sm">
                  {ex.nombre}
                </ListRow>
              ))}
              {busquedaEj.trim() && !existeExacto && (
                <ListRow tone="accent" onClick={crearEjercicioYAgregar} className="text-body-sm">
                  Crear "{busquedaEj.trim()}"
                </ListRow>
              )}
            </div>

            {error && <ErrorState>{error}</ErrorState>}

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
                <Button onClick={guardar} disabled={!editando.nombre.trim() || ocupado} className="flex-1">
                  Guardar
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
