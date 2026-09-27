import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, normalizeName, type Routine } from '../../db'
import Sheet from '../../components/Sheet'

type RoutineDraft = Omit<Routine, 'id'> & { id?: number }

export default function Rutinas() {
  const [editando, setEditando] = useState<RoutineDraft | null>(null)
  const [busquedaEj, setBusquedaEj] = useState('')
  const rutinas = useLiveQuery(() => db.routines.toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const exerciseMap = new Map((exercises ?? []).map((e) => [e.id!, e]))
  const busquedaNorm = normalizeName(busquedaEj)
  const resultados = exercises?.filter((e) => e.nombreNorm.includes(busquedaNorm) && !editando?.exerciseIds.includes(e.id!))
  const existeExacto = exercises?.some((e) => e.nombreNorm === busquedaNorm)

  async function guardar() {
    if (!editando || !editando.nombre.trim()) return
    if (editando.id) {
      await db.routines.update(editando.id, { nombre: editando.nombre, exerciseIds: editando.exerciseIds })
    } else {
      await db.routines.add({ nombre: editando.nombre, exerciseIds: editando.exerciseIds })
    }
    setEditando(null)
  }

  async function borrar(id: number) {
    await db.routines.delete(id)
    setEditando(null)
  }

  async function crearEjercicioYAgregar() {
    const nombre = busquedaEj.trim()
    if (!nombre || !editando) return
    const id = await db.exercises.add({ nombre, nombreNorm: normalizeName(nombre), grupo: 'General' })
    setEditando({ ...editando, exerciseIds: [...editando.exerciseIds, id] })
    setBusquedaEj('')
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
      <button
        onClick={() => setEditando({ nombre: '', exerciseIds: [] })}
        className="w-full rounded-2xl bg-brand-600 py-3 font-medium text-white"
      >
        Nueva rutina
      </button>

      {rutinas?.length === 0 && <p className="px-1 text-sm text-slate-500">Todavía no tienes rutinas.</p>}
      {rutinas?.map((r) => (
        <button key={r.id} onClick={() => setEditando(r)} className="w-full rounded-xl bg-slate-900 px-3 py-3 text-left">
          <p className="font-medium text-slate-100">{r.nombre}</p>
          <p className="text-xs text-slate-500">{r.exerciseIds.length} ejercicios</p>
        </button>
      ))}

      <Sheet open={editando !== null} onClose={() => setEditando(null)} title={editando?.id ? 'Editar rutina' : 'Nueva rutina'}>
        {editando && (
          <div className="space-y-3">
            <input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre de la rutina"
              className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
            />

            <div className="space-y-1">
              {editando.exerciseIds.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
                  <span className="text-sm text-slate-100">{exerciseMap.get(id)?.nombre ?? '…'}</span>
                  <button onClick={() => quitarEjercicio(id)} className="text-slate-500">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <input
              value={busquedaEj}
              onChange={(e) => setBusquedaEj(e.target.value)}
              placeholder="Buscar o crear ejercicio…"
              className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {resultados?.map((ex) => (
                <button key={ex.id} onClick={() => agregarEjercicio(ex.id!)} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-left text-sm text-slate-100">
                  {ex.nombre}
                </button>
              ))}
              {busquedaEj.trim() && !existeExacto && (
                <button onClick={crearEjercicioYAgregar} className="w-full rounded-lg bg-brand-600/20 px-3 py-2 text-left text-sm text-brand-400">
                  Crear "{busquedaEj.trim()}"
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {editando.id && (
                <button onClick={() => borrar(editando.id!)} className="flex-1 rounded-xl bg-slate-800 py-2.5 font-medium text-red-400">
                  Borrar
                </button>
              )}
              <button onClick={guardar} disabled={!editando.nombre.trim()} className="flex-1 rounded-xl bg-brand-600 py-2.5 font-medium text-white disabled:opacity-40">
                Guardar
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
