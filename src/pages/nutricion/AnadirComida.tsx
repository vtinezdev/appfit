import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, normalizeName, type Comida, type Entry } from '../../db'
import { getSettings } from '../../db'
import { comidaPorHora } from '../../lib/dates'
import { interpretarComida, GeminiError, type GeminiItem } from '../../lib/gemini'
import { macrosPorGramos } from '../../lib/nutrition'
import VoiceRecorder from '../../components/VoiceRecorder'
import NumberStepper from '../../components/NumberStepper'
import Sheet from '../../components/Sheet'

interface Props {
  fecha: string
  entryEditar?: Entry
  onClose: () => void
  onGuardado: () => void
}

interface ItemRevision extends GeminiItem {
  foodId?: number
}

const COMIDAS: { key: Comida; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'comida', label: 'Comida' },
  { key: 'cena', label: 'Cena' },
  { key: 'snack', label: 'Snack' },
]

async function upsertFood(item: GeminiItem, existingFoodId?: number): Promise<number> {
  const nombreNorm = normalizeName(item.nombre)
  const existing = existingFoodId
    ? await db.foods.get(existingFoodId)
    : await db.foods.where('nombreNorm').equals(nombreNorm).first()

  if (existing?.id) {
    await db.foods.update(existing.id, {
      nombre: item.nombre,
      kcal100: item.kcal100,
      prot100: item.prot100,
      carb100: item.carb100,
      grasa100: item.grasa100,
      fuente: 'manual',
      updatedAt: Date.now(),
    })
    return existing.id
  }
  return db.foods.add({
    nombreNorm,
    nombre: item.nombre,
    kcal100: item.kcal100,
    prot100: item.prot100,
    carb100: item.carb100,
    grasa100: item.grasa100,
    fuente: 'gemini',
    updatedAt: Date.now(),
  })
}

export default function AnadirComida({ fecha, entryEditar, onClose, onGuardado }: Props) {
  const [comida, setComida] = useState<Comida>(entryEditar?.comida ?? comidaPorHora())
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRevision[] | null>(
    entryEditar
      ? [
          {
            nombre: entryEditar.nombre,
            gramos: entryEditar.gramos,
            kcal100: round1((entryEditar.kcal / entryEditar.gramos) * 100),
            prot100: round1((entryEditar.prot / entryEditar.gramos) * 100),
            carb100: round1((entryEditar.carb / entryEditar.gramos) * 100),
            grasa100: round1((entryEditar.grasa / entryEditar.gramos) * 100),
            foodId: entryEditar.foodId,
          },
        ]
      : null,
  )
  const [gramosRapido, setGramosRapido] = useState<{ foodId: number; nombre: string; gramos: number } | null>(null)

  const foods = useLiveQuery(() => db.foods.orderBy('updatedAt').reverse().limit(10).toArray(), [])

  function round1(n: number): number {
    return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10
  }

  async function interpretar() {
    setError(null)
    setCargando(true)
    try {
      const settings = await getSettings()
      const alimentosConocidos = (await db.foods.toArray()).map((f) => f.nombre)
      const resultado = await interpretarComida({
        apiKey: settings.apiKey,
        modelo: settings.modelo,
        texto: texto || undefined,
        alimentosConocidos,
      })
      await construirRevision(resultado.items)
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'Error inesperado interpretando la comida.')
    } finally {
      setCargando(false)
    }
  }

  async function interpretarAudio(audioBase64: string, mimeType: string) {
    setError(null)
    setCargando(true)
    try {
      const settings = await getSettings()
      const alimentosConocidos = (await db.foods.toArray()).map((f) => f.nombre)
      const resultado = await interpretarComida({
        apiKey: settings.apiKey,
        modelo: settings.modelo,
        audioBase64,
        audioMime: mimeType,
        alimentosConocidos,
      })
      if (resultado.transcripcion) setTexto(resultado.transcripcion)
      await construirRevision(resultado.items)
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'Error inesperado interpretando el audio.')
    } finally {
      setCargando(false)
    }
  }

  async function construirRevision(geminiItems: GeminiItem[]) {
    const revisados: ItemRevision[] = []
    for (const it of geminiItems) {
      const local = await db.foods.where('nombreNorm').equals(normalizeName(it.nombre)).first()
      if (local) {
        revisados.push({
          nombre: local.nombre,
          gramos: it.gramos,
          kcal100: local.kcal100,
          prot100: local.prot100,
          carb100: local.carb100,
          grasa100: local.grasa100,
          foodId: local.id,
        })
      } else {
        revisados.push(it)
      }
    }
    setItems(revisados)
  }

  function actualizarItem(i: number, patch: Partial<ItemRevision>) {
    setItems((prev) => prev?.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) ?? null)
  }

  function quitarItem(i: number) {
    setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null)
  }

  async function guardar() {
    if (!items || items.length === 0) return
    setCargando(true)
    try {
      if (entryEditar?.id) {
        const item = items[0]
        const foodId = await upsertFood(item, item.foodId)
        const macros = macrosPorGramos(item, item.gramos)
        await db.entries.update(entryEditar.id, {
          comida,
          foodId,
          nombre: item.nombre,
          gramos: item.gramos,
          ...macros,
        })
      } else {
        for (const item of items) {
          const foodId = await upsertFood(item, item.foodId)
          const macros = macrosPorGramos(item, item.gramos)
          await db.entries.add({
            fecha,
            comida,
            foodId,
            nombre: item.nombre,
            gramos: item.gramos,
            ...macros,
            textoOriginal: texto || undefined,
            createdAt: Date.now(),
          })
        }
      }
      onGuardado()
    } finally {
      setCargando(false)
    }
  }

  async function confirmarRapido() {
    if (!gramosRapido) return
    const food = await db.foods.get(gramosRapido.foodId)
    if (!food) return
    const macros = macrosPorGramos(food, gramosRapido.gramos)
    await db.entries.add({
      fecha,
      comida,
      foodId: food.id,
      nombre: food.nombre,
      gramos: gramosRapido.gramos,
      ...macros,
      createdAt: Date.now(),
    })
    await db.foods.update(food.id!, { updatedAt: Date.now() })
    setGramosRapido(null)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <header className="safe-top flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <button onClick={onClose} className="text-slate-400">
          Cancelar
        </button>
        <h1 className="text-base font-semibold text-slate-100">{entryEditar ? 'Editar' : 'Añadir comida'}</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-2">
          {COMIDAS.map((c) => (
            <button
              key={c.key}
              onClick={() => setComida(c.key)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                comida === c.key ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {items === null && (
          <>
            <div className="mb-4 space-y-3">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej: 200 g de arroz con pollo y una manzana"
                rows={3}
                className="w-full rounded-xl bg-slate-900 p-3 text-slate-100 placeholder:text-slate-600"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={interpretar}
                  disabled={!texto.trim() || cargando}
                  className="flex-1 rounded-xl bg-brand-600 py-3 font-medium text-white disabled:opacity-40"
                >
                  {cargando ? 'Interpretando…' : 'Interpretar con IA'}
                </button>
                <VoiceRecorder onGrabado={interpretarAudio} onError={setError} disabled={cargando} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            {foods && foods.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Añadido rápido</h3>
                <div className="grid grid-cols-2 gap-2">
                  {foods.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setGramosRapido({ foodId: f.id!, nombre: f.nombre, gramos: 100 })}
                      className="rounded-xl bg-slate-900 px-3 py-2.5 text-left text-sm text-slate-200"
                    >
                      <p className="truncate font-medium">{f.nombre}</p>
                      <p className="text-xs text-slate-500">{Math.round(f.kcal100)} kcal/100g</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {items !== null && (
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={item.nombre}
                    onChange={(e) => actualizarItem(i, { nombre: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-100 outline-none"
                  />
                  {!entryEditar && (
                    <button onClick={() => quitarItem(i)} className="text-slate-500">
                      🗑️
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-slate-500">Gramos</span>
                  <NumberStepper value={item.gramos} onChange={(v) => actualizarItem(i, { gramos: v })} step={10} suffix="g" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <label className="flex items-center gap-1">
                    Kcal/100g
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.kcal100}
                      onChange={(e) => actualizarItem(i, { kcal100: Number(e.target.value) || 0 })}
                      className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Prot/100g
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.prot100}
                      onChange={(e) => actualizarItem(i, { prot100: Number(e.target.value) || 0 })}
                      className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Carb/100g
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.carb100}
                      onChange={(e) => actualizarItem(i, { carb100: Number(e.target.value) || 0 })}
                      className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Grasa/100g
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.grasa100}
                      onChange={(e) => actualizarItem(i, { grasa100: Number(e.target.value) || 0 })}
                      className="w-full min-w-0 rounded bg-slate-800 px-2 py-1 text-slate-100"
                    />
                  </label>
                </div>
              </div>
            ))}
            {!entryEditar && (
              <button onClick={() => setItems(null)} className="text-sm text-brand-400">
                ← Volver a interpretar
              </button>
            )}
          </div>
        )}
      </div>

      {items !== null && items.length > 0 && (
        <div className="safe-bottom border-t border-slate-800 p-4">
          <button onClick={guardar} disabled={cargando} className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white disabled:opacity-40">
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}

      <Sheet open={gramosRapido !== null} onClose={() => setGramosRapido(null)} title={gramosRapido?.nombre}>
        {gramosRapido && (
          <div className="space-y-4">
            <NumberStepper value={gramosRapido.gramos} onChange={(v) => setGramosRapido({ ...gramosRapido, gramos: v })} step={10} suffix="g" />
            <button onClick={confirmarRapido} className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white">
              Añadir
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
