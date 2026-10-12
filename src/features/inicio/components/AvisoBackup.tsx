import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { hayDatosGuardados } from '../../../shared/db/estadoDatos'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { necesitaRecordatorioBackup, posponerHasta, textoSinCopia, UMBRAL_BACKUP_POR_DEFECTO } from '../../../shared/lib/recordatorioBackup'
import { useState } from 'react'
import { ErrorState } from '../../../shared/components/StateMessage'

/** Aviso discreto de copia de seguridad: sin notificaciones, una banda de una línea en Inicio. Cerrarla es «Más tarde». */
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
    <div role="region" aria-label="Recordatorio de copia de seguridad" className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg bg-surface-muted py-1 pl-3 pr-1">
        <Icon name="download" size={20} className="shrink-0 text-fg-muted" />
        <p className="min-w-0 flex-1">
          <span className="block text-body-sm font-semibold text-fg">{textoSinCopia(settings.ultimaExportacion, ahora)}</span>
          <span className="block text-caption text-fg-muted">Tus registros solo están en este móvil</span>
        </p>
        <Button variant="secondary" size="sm" onClick={onExportar}>Exportar</Button>
        <IconButton icon="close" label="Más tarde" variant="ghost" onClick={masTarde} />
      </div>
      {error && <ErrorState>No se ha podido posponer el aviso.</ErrorState>}
    </div>
  )
}
