import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup } from '../shared/lib/backup'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import { Input } from '../shared/components/Input'
import { LoadingState } from '../shared/components/StateMessage'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import SectionHeader from '../shared/components/SectionHeader'

export default function Ajustes() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [incluirApiKey, setIncluirApiKey] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!settings) return <LoadingState />

  async function exportar() {
    const data = await exportarBackup({ incluirApiKey })
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
      <Card className="space-y-3">
        <SectionHeader>Gemini</SectionHeader>
        <label className="block space-y-1">
          <span className="text-body-sm text-fg-muted">API key (Google AI Studio)</span>
          <Input
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="AIza…"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-body-sm text-fg-muted">Modelo</span>
          <Input
            value={settings.modelo}
            onChange={(e) => updateSettings({ modelo: e.target.value })}
          />
        </label>
        <p className="text-caption text-fg-subtle">
          Consigue una key gratuita en ai.google.dev. Se guarda solo en este móvil (IndexedDB), nunca en ningún servidor.
        </p>
      </Card>

      <Card className="space-y-3">
        <SectionHeader>Objetivos diarios</SectionHeader>
        {(
          [
            ['kcal', 'Calorías (kcal)'],
            ['prot', 'Proteína (g)'],
            ['carb', 'Carbohidratos (g)'],
            ['grasa', 'Grasa (g)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-fg-muted">{label}</span>
            <Input
              type="number"
              inputMode="decimal"
              value={settings.objetivos[key]}
              onChange={(e) => updateSettings({ objetivos: { ...settings.objetivos, [key]: Number(e.target.value) || 0 } })}
              className="w-24 text-right"
            />
          </label>
        ))}
      </Card>

      <Card className="space-y-3">
        <SectionHeader>Backup</SectionHeader>
        <p className="text-caption text-fg-subtle">Tus datos viven solo en este móvil. Exporta un JSON de vez en cuando por si acaso.</p>
        <label className="flex items-center gap-3 text-body-sm text-fg-muted">
          <input type="checkbox" checked={incluirApiKey} onChange={(e) => setIncluirApiKey(e.target.checked)} className="h-5 w-5 shrink-0 accent-accent" />
          Incluir la API key en el backup
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportar} className="flex-1">
            Exportar
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="flex-1">
            Importar
          </Button>
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
        {mensaje && <p className="text-body-sm text-accent">{mensaje}</p>}
      </Card>

      <CatalogoAjustes />

      <Card className="space-y-3">
        <SectionHeader tone="destructive">Zona peligrosa</SectionHeader>
        {!confirmandoBorrado ? (
          <Button variant="destructive" block onClick={() => setConfirmandoBorrado(true)}>
            Borrar todos los datos
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-body-sm text-destructive">¿Seguro? Esto borra nutrición, gym y ajustes de este móvil. No se puede deshacer.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmandoBorrado(false)} className="flex-1">
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmarBorrado} className="flex-1">
                Sí, borrar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
