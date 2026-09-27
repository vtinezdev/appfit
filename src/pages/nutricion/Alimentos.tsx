import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, normalizeName, type Food } from '../../db'
import Sheet from '../../components/Sheet'

type FoodDraft = Omit<Food, 'id'> & { id?: number }

export default function Alimentos() {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<FoodDraft | null>(null)
  const foods = useLiveQuery(() => db.foods.orderBy('nombre').toArray(), [])

  const filtrados = foods?.filter((f) => f.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  async function guardar() {
    if (!editando) return
    const payload = { ...editando, nombreNorm: normalizeName(editando.nombre), fuente: 'manual' as const, updatedAt: Date.now() }
    if (editando.id) {
      await db.foods.update(editando.id, payload)
    } else {
      await db.foods.add(payload)
    }
    setEditando(null)
  }

  async function borrar(id: number) {
    await db.foods.delete(id)
    setEditando(null)
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alimento…"
          className="min-w-0 flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
        />
        <button
          onClick={() =>
            setEditando({ nombre: '', nombreNorm: '', kcal100: 0, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual', updatedAt: Date.now() })
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xl text-white"
        >
          +
        </button>
      </div>

      <div className="space-y-2">
        {filtrados?.length === 0 && <p className="px-1 text-sm text-slate-500">No hay alimentos guardados todavía.</p>}
        {filtrados?.map((f) => (
          <button key={f.id} onClick={() => setEditando(f)} className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5 text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{f.nombre}</p>
              <p className="text-xs text-slate-500">
                {Math.round(f.kcal100)} kcal · P{Math.round(f.prot100)} C{Math.round(f.carb100)} G{Math.round(f.grasa100)} /100g
              </p>
            </div>
            <span className="text-xs text-slate-600">{f.fuente === 'manual' ? '✍️' : '🤖'}</span>
          </button>
        ))}
      </div>

      <Sheet open={editando !== null} onClose={() => setEditando(null)} title={editando?.id ? 'Editar alimento' : 'Nuevo alimento'}>
        {editando && (
          <div className="space-y-3">
            <input
              value={editando.nombre}
              onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Nombre"
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-600"
            />
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
              <label className="flex items-center gap-1">
                Kcal/100g
                <input
                  type="number"
                  inputMode="decimal"
                  value={editando.kcal100}
                  onChange={(e) => setEditando({ ...editando, kcal100: Number(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="flex items-center gap-1">
                Prot/100g
                <input
                  type="number"
                  inputMode="decimal"
                  value={editando.prot100}
                  onChange={(e) => setEditando({ ...editando, prot100: Number(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="flex items-center gap-1">
                Carb/100g
                <input
                  type="number"
                  inputMode="decimal"
                  value={editando.carb100}
                  onChange={(e) => setEditando({ ...editando, carb100: Number(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="flex items-center gap-1">
                Grasa/100g
                <input
                  type="number"
                  inputMode="decimal"
                  value={editando.grasa100}
                  onChange={(e) => setEditando({ ...editando, grasa100: Number(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                />
              </label>
            </div>
            <div className="flex gap-2">
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
