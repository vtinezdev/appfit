import { useState } from 'react'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import { MarcaFirma } from '../shared/components/Marca'
import { ErrorState } from '../shared/components/StateMessage'
import { descargarBackup, exportarBackup } from '../shared/lib/backup'

/**
 * Salida de un fallo de arranque o de pantalla. Si el fallo se repite en cada arranque no se llega a Ajustes,
 * así que aquí se puede exportar la copia: solo lee, no anota la exportación ni escribe nada.
 */
export default function FalloAplicacion({ almacenamiento = false, onReintentar }: { almacenamiento?: boolean; onReintentar?: () => void }) {
  const [exportando, setExportando] = useState(false)
  const [errorCopia, setErrorCopia] = useState(false)

  async function exportar() {
    setErrorCopia(false)
    setExportando(true)
    try {
      descargarBackup(await exportarBackup())
    } catch {
      setErrorCopia(true)
    } finally {
      setExportando(false)
    }
  }

  return <div className="app-shell fixed inset-x-0 flex h-app flex-col bg-bg">
    <main className="safe-top safe-inline min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg space-y-section px-page pb-section pt-5">
        <header className="page-header flex min-h-touch items-center"><h1><MarcaFirma alto={40} /></h1></header>
        <Card className="space-y-stack">
          <h2 className="text-heading text-fg">{almacenamiento ? 'No se han podido abrir tus registros' : 'No se ha podido mostrar la pantalla'}</h2>
          <ErrorState>{almacenamiento ? 'Ha fallado el acceso al almacenamiento de este dispositivo.' : 'Recarga Cumbra Fit para volver a intentarlo.'}</ErrorState>
          <p className="text-body-sm text-fg-muted">No se ha borrado ningún registro.</p>
          {onReintentar && <Button block variant="secondary" onClick={onReintentar}>Reintentar</Button>}
          <Button block variant={onReintentar ? 'ghost' : 'secondary'} onClick={() => window.location.reload()}>Recargar Cumbra Fit</Button>
        </Card>
        <Card className="space-y-stack">
          <p className="text-body-sm text-fg-muted">Si vuelve a pasar al abrir la app, guarda una copia de tus registros antes de nada. Se descarga como archivo y luego puedes importarla en Ajustes.</p>
          <Button block variant="ghost" loading={exportando} disabled={exportando} onClick={exportar}>Exportar una copia de seguridad</Button>
          {errorCopia && <ErrorState>No se ha podido exportar la copia. Recarga e inténtalo de nuevo.</ErrorState>}
        </Card>
      </div>
    </main>
  </div>
}
