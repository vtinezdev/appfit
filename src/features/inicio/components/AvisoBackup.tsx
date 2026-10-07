import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import { hayDatosGuardados } from '../../../shared/db/estadoDatos'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { necesitaRecordatorioBackup, posponerHasta, UMBRAL_BACKUP_POR_DEFECTO } from '../../../shared/lib/recordatorioBackup'
import { useState } from 'react'
import { ErrorState } from '../../../shared/components/StateMessage'

/** Aviso discreto de copia de seguridad: sin notificaciones, solo una banda en Inicio. */
export default function AvisoBackup({ onExportar, ahora = Date.now() }: { onExportar: () => void; ahora?: number }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const [error, setError] = useState(false)
  if (!settings || hayDatos === undefined) return null
  const umbral = settings.recordatorioBackupDias ?? UMBRAL_BACKUP_POR_DEFECTO
  if (!necesitaRecordatorioBackup(settings.ultimaExportacion, hayDatos, ahora, umbral, settings.recordatorioBackupPospuesto)) return null

  async function masTarde() {
    setError(false)
    try {
      await updateSettings({ recordatorioBackupPospuesto: posponerHasta(Date.now()) })
    } catch {
      setError(true)
    }
  }

  return (
    <Card tone="muted" role="region" aria-label="Recordatorio de copia de seguridad" className="space-y-3">
      <div className="space-y-1">
        <p className="text-title text-fg">{settings.ultimaExportacion === undefined ? 'Aún no has hecho una copia' : 'Toca hacer una copia'}</p>
        <p className="text-body-sm text-fg-muted">Tus registros solo están en este móvil. Exporta una copia para no perderlos.</p>
      </div>
      {error && <ErrorState>No se ha podido posponer el aviso.</ErrorState>}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={masTarde}>Más tarde</Button>
        <Button className="flex-1" onClick={onExportar}>Exportar ahora</Button>
      </div>
    </Card>
  )
}
