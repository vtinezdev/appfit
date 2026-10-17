import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { hayDatosGuardados } from '../../../shared/db/estadoDatos'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { necesitaRecordatorioBackup, posponerHasta, textoSinCopia, UMBRAL_BACKUP_POR_DEFECTO } from '../../../shared/lib/recordatorioBackup'
import { useState } from 'react'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useCuenta } from '../../cuenta/useCuenta'
import { cuentaDisponible } from '../../cuenta/servicio'
import { avisoCuenta, cuentaEnUso } from '../../cuenta/lib/estado'

/**
 * Aviso discreto de copia de seguridad: sin notificaciones, una banda de una línea en Inicio. Cerrarla es «Más tarde».
 * Con la cuenta en uso, la copia es la de la nube: avisa si lleva días sin guardarse o si hay que elegir copia o
 * volver a entrar (esto último no se pospone).
 */
export default function AvisoBackup({ onExportar, onRevisarCuenta, ahora = Date.now() }: { onExportar: () => void; onRevisarCuenta: () => void; ahora?: number }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const cuenta = useCuenta()
  const [error, setError] = useState(false)
  if (!settings || hayDatos === undefined || (cuentaDisponible && cuenta.fase === 'cargando')) return null
  const umbral = settings.recordatorioBackupDias ?? UMBRAL_BACKUP_POR_DEFECTO
  const conCuenta = cuentaEnUso(cuenta)
  const ultima = conCuenta ? cuenta.ultimaCopia : settings.ultimaExportacion
  const recordatorio = necesitaRecordatorioBackup(ultima, hayDatos, ahora, umbral, settings.recordatorioBackupPospuesto)
  const aviso = conCuenta ? avisoCuenta(cuenta, recordatorio, ahora) : recordatorio ? { titulo: textoSinCopia(ultima, ahora), posponible: true } : null
  if (!aviso) return null

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
      <div className={`flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted py-1 pl-3 ${aviso.posponible ? 'pr-1' : 'pr-2'}`}>
        <div className="flex min-w-0 flex-1 basis-28 items-center gap-2">
          <Icon name={conCuenta ? 'alert' : 'download'} size={20} className="shrink-0 text-fg-muted" />
          <p className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold text-fg">{aviso.titulo}</span>
            <span className="block text-caption text-fg-muted">{conCuenta ? 'Tu copia en la nube necesita tu atención' : 'Tus registros solo están en este móvil'}</span>
          </p>
        </div>
        {conCuenta
          ? <Button variant="secondary" size="sm" onClick={onRevisarCuenta}>Revisar</Button>
          : <Button variant="secondary" size="sm" onClick={onExportar}>Exportar</Button>}
        {aviso.posponible && <IconButton icon="close" label="Más tarde" variant="ghost" onClick={masTarde} />}
      </div>
      {error && <ErrorState>No se ha podido posponer el aviso.</ErrorState>}
    </div>
  )
}
