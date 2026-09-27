import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Comida, type Entry } from '../../db'
import { addDays, formatFriendly, todayISO } from '../../lib/dates'
import { getSettings } from '../../db'
import MacroBar from '../../components/MacroBar'
import { sumMacros } from '../../lib/nutrition'

interface Props {
  fecha: string
  onFechaChange: (fecha: string) => void
  onEditarEntry: (entry: Entry) => void
}

const ORDEN_COMIDAS: Comida[] = ['desayuno', 'comida', 'cena', 'snack']
const LABELS: Record<Comida, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  snack: 'Snack',
}

export default function Hoy({ fecha, onFechaChange, onEditarEntry }: Props) {
  const entries = useLiveQuery(() => db.entries.where('fecha').equals(fecha).toArray(), [fecha])
  const settings = useLiveQuery(() => getSettings(), [])

  async function borrar(id: number) {
    await db.entries.delete(id)
  }

  if (!entries || !settings) {
    return <div className="p-4 text-slate-400">Cargando…</div>
  }

  const totales = sumMacros(entries)
  const objetivos = settings.objetivos

  const porComida = new Map<Comida, Entry[]>()
  for (const c of ORDEN_COMIDAS) porComida.set(c, [])
  for (const e of entries) porComida.get(e.comida)?.push(e)

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => onFechaChange(addDays(fecha, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="text-base font-semibold capitalize text-slate-100">{formatFriendly(fecha)}</span>
        </div>
        <button
          onClick={() => onFechaChange(addDays(fecha, 1))}
          disabled={fecha >= todayISO()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="space-y-3 rounded-2xl bg-slate-900 p-4">
        <MacroBar label="Calorías" valor={totales.kcal} objetivo={objetivos.kcal} unidad="kcal" color="bg-brand-500" />
        <MacroBar label="Proteína" valor={totales.prot} objetivo={objetivos.prot} color="bg-emerald-500" />
        <MacroBar label="Carbohidratos" valor={totales.carb} objetivo={objetivos.carb} color="bg-amber-500" />
        <MacroBar label="Grasa" valor={totales.grasa} objetivo={objetivos.grasa} color="bg-rose-500" />
      </div>

      {ORDEN_COMIDAS.map((c) => {
        const items = porComida.get(c) ?? []
        return (
          <div key={c} className="space-y-2">
            <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{LABELS[c]}</h3>
            {items.length === 0 ? (
              <p className="px-1 text-sm text-slate-600">Sin registros</p>
            ) : (
              <div className="space-y-2">
                {items.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5"
                    onClick={() => onEditarEntry(e)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{e.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {e.gramos} g · {Math.round(e.kcal)} kcal · P{Math.round(e.prot)} C{Math.round(e.carb)} G
                        {Math.round(e.grasa)}
                      </p>
                    </div>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation()
                        if (e.id) borrar(e.id)
                      }}
                      className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-800"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
