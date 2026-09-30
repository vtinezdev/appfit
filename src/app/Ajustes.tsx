import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup } from '../shared/lib/backup'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { LoadingState } from '../shared/components/StateMessage'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import ConfirmacionDestructiva from '../shared/components/ConfirmacionDestructiva'
import PageHeader from '../shared/components/PageHeader'
import SectionHeader from '../shared/components/SectionHeader'

export default function Ajustes() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!settings) return <LoadingState />

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
    <div className="space-y-section px-page pt-6">
      <PageHeader title="Ajustes" />

      <ObjetivosAjustes objetivos={settings.objetivos} onGuardar={(objetivos) => updateSettings({ objetivos })} />

      <section aria-label="Backup" className="space-y-stack">
        <SectionHeader variant="section">Backup</SectionHeader>
        <Card className="space-y-3">
          <p className="text-body-sm text-fg-muted">Tus datos viven solo en este móvil. Exporta un JSON de vez en cuando por si acaso.</p>
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
          {mensaje && (
            <p role="status" className="text-body-sm text-accent-strong">
              {mensaje}
            </p>
          )}
        </Card>
      </section>

      <CatalogoAjustes />

      <section aria-label="Zona peligrosa" className="space-y-stack">
        <SectionHeader variant="section" tone="destructive">
          Zona peligrosa
        </SectionHeader>
        <Card>
          {!confirmandoBorrado ? (
            <Button variant="destructive" block onClick={() => setConfirmandoBorrado(true)}>
              Borrar todos los datos
            </Button>
          ) : (
            <ConfirmacionDestructiva
              mensaje="¿Seguro? Esto borra nutrición, gym y ajustes de este móvil. No se puede deshacer."
              confirmar="Sí, borrar"
              onConfirmar={confirmarBorrado}
              onCancelar={() => setConfirmandoBorrado(false)}
            />
          )}
        </Card>
      </section>
    </div>
  )
}
