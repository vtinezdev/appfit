import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../db'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup } from '../lib/backup'

export default function Ajustes() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!settings) return <div className="p-4 text-slate-400">Cargando…</div>

  async function exportar() {
    const data = await exportarBackup()
    descargarBackup(data)
  }

  async function importar(file: File) {
    try {
      const texto = await file.text()
      await importarBackup(texto)
      setMensaje('Backup importado correctamente.')
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error importando el backup.')
    }
  }

  async function confirmarBorrado() {
    await borrarTodosLosDatos()
    setConfirmandoBorrado(false)
    setMensaje('Todos los datos han sido borrados.')
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-4">
      <section className="space-y-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gemini</h2>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">API key (Google AI Studio)</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="AIza…"
            className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-600"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Modelo</span>
          <input
            value={settings.modelo}
            onChange={(e) => updateSettings({ modelo: e.target.value })}
            className="w-full rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100"
          />
        </label>
        <p className="text-xs text-slate-600">
          Consigue una key gratuita en ai.google.dev. Se guarda solo en este móvil (IndexedDB), nunca en ningún servidor.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Objetivos diarios</h2>
        {(
          [
            ['kcal', 'Calorías (kcal)'],
            ['prot', 'Proteína (g)'],
            ['carb', 'Carbohidratos (g)'],
            ['grasa', 'Grasa (g)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">{label}</span>
            <input
              type="number"
              inputMode="decimal"
              value={settings.objetivos[key]}
              onChange={(e) => updateSettings({ objetivos: { ...settings.objetivos, [key]: Number(e.target.value) || 0 } })}
              className="w-24 rounded-lg bg-slate-800 px-3 py-2 text-right text-slate-100"
            />
          </label>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backup</h2>
        <p className="text-xs text-slate-600">Tus datos viven solo en este móvil. Exporta un JSON de vez en cuando por si acaso.</p>
        <div className="flex gap-2">
          <button onClick={exportar} className="flex-1 rounded-xl bg-slate-800 py-2.5 font-medium text-slate-200">
            Exportar
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl bg-slate-800 py-2.5 font-medium text-slate-200">
            Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importar(file)
              e.target.value = ''
            }}
          />
        </div>
        {mensaje && <p className="text-sm text-brand-400">{mensaje}</p>}
      </section>

      <section className="space-y-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">Zona peligrosa</h2>
        {!confirmandoBorrado ? (
          <button onClick={() => setConfirmandoBorrado(true)} className="w-full rounded-xl bg-red-900/40 py-2.5 font-medium text-red-400">
            Borrar todos los datos
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-400">¿Seguro? Esto borra nutrición, gym y ajustes de este móvil. No se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmandoBorrado(false)} className="flex-1 rounded-xl bg-slate-800 py-2.5 font-medium text-slate-200">
                Cancelar
              </button>
              <button onClick={confirmarBorrado} className="flex-1 rounded-xl bg-red-700 py-2.5 font-medium text-white">
                Sí, borrar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
