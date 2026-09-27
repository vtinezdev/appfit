import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../db'
import { getSettings } from '../../db'
import { formatShort, monthDates, todayISO, weekDates } from '../../lib/dates'
import { distribucionPCG, macrosDeRango, mediaDiaria, sumMacros } from '../../lib/nutrition'

type Rango = 'semana' | 'mes'

export default function Resumen() {
  const [rango, setRango] = useState<Rango>('semana')
  const fechas = rango === 'semana' ? weekDates(todayISO()) : monthDates(todayISO())
  const settings = useLiveQuery(() => getSettings(), [])

  const entries = useLiveQuery(
    () => db.entries.where('fecha').anyOf(fechas).toArray(),
    [fechas.join(',')],
  )

  if (!entries || !settings) {
    return <div className="p-4 text-slate-400">Cargando…</div>
  }

  const macros = macrosDeRango(entries, fechas)
  const media = mediaDiaria(macros)
  const totalRango = sumMacros(macros)
  const distribucion = distribucionPCG(totalRango)

  const chartData = fechas.map((f, i) => ({
    dia: formatShort(f),
    Proteína: macros[i].prot,
    Carbohidratos: macros[i].carb,
    Grasa: macros[i].grasa,
  }))

  return (
    <div className="space-y-5 pb-4">
      <div className="flex gap-2">
        {(['semana', 'mes'] as Rango[]).map((r) => (
          <button
            key={r}
            onClick={() => setRango(r)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize ${
              rango === r ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Macros por día (g)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="Proteína" stackId="m" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Carbohidratos" stackId="m" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Grasa" stackId="m" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Media diaria</h3>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>Kcal: {Math.round(media.kcal)}</li>
            <li>Prot: {Math.round(media.prot)} g</li>
            <li>Carb: {Math.round(media.carb)} g</li>
            <li>Grasa: {Math.round(media.grasa)} g</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Distribución</h3>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>Proteína: {distribucion.prot}%</li>
            <li>Carbohidratos: {distribucion.carb}%</li>
            <li>Grasa: {distribucion.grasa}%</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
