import { useState } from 'react'
import type { Entry } from '../db'
import { todayISO } from '../lib/dates'
import Hoy from './nutricion/Hoy'
import Resumen from './nutricion/Resumen'
import Alimentos from './nutricion/Alimentos'
import AnadirComida from './nutricion/AnadirComida'

type Vista = 'hoy' | 'resumen' | 'alimentos'

export default function NutricionTab() {
  const [vista, setVista] = useState<Vista>('hoy')
  const [fecha, setFecha] = useState(todayISO())
  const [mostrarAnadir, setMostrarAnadir] = useState(false)
  const [entryEditar, setEntryEditar] = useState<Entry | undefined>(undefined)

  function cerrarAnadir() {
    setMostrarAnadir(false)
    setEntryEditar(undefined)
  }

  return (
    <div className="relative min-h-full px-4 pt-4">
      <div className="mb-4 flex gap-2">
        {(
          [
            ['hoy', 'Hoy'],
            ['resumen', 'Resumen'],
            ['alimentos', 'Alimentos'],
          ] as [Vista, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setVista(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${vista === key ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {vista === 'hoy' && (
        <Hoy
          fecha={fecha}
          onFechaChange={setFecha}
          onEditarEntry={(e) => {
            setEntryEditar(e)
            setMostrarAnadir(true)
          }}
        />
      )}
      {vista === 'resumen' && <Resumen />}
      {vista === 'alimentos' && <Alimentos />}

      {vista === 'hoy' && (
        <button
          onClick={() => setMostrarAnadir(true)}
          className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg"
        >
          +
        </button>
      )}

      {mostrarAnadir && (
        <AnadirComida fecha={entryEditar?.fecha ?? fecha} entryEditar={entryEditar} onClose={cerrarAnadir} onGuardado={cerrarAnadir} />
      )}
    </div>
  )
}
