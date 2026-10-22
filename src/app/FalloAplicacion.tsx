import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import PageHeader from '../shared/components/PageHeader'
import { ErrorState } from '../shared/components/StateMessage'

export default function FalloAplicacion({ almacenamiento = false, onReintentar }: { almacenamiento?: boolean; onReintentar?: () => void }) {
  return <div className="app-shell fixed inset-x-0 flex h-app flex-col bg-bg">
    <main className="safe-top safe-inline min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-lg space-y-section px-page pb-section pt-5">
        <PageHeader title="AppFit" />
        <Card className="space-y-stack">
          <h2 className="text-heading text-fg">{almacenamiento ? 'No se han podido abrir tus registros' : 'No se ha podido mostrar la pantalla'}</h2>
          <ErrorState>{almacenamiento ? 'Ha fallado el acceso al almacenamiento de este dispositivo.' : 'Recarga AppFit para volver a intentarlo.'}</ErrorState>
          <p className="text-body-sm text-fg-muted">No se ha borrado ningún registro.</p>
          {onReintentar && <Button block variant="secondary" onClick={onReintentar}>Reintentar</Button>}
          <Button block variant={onReintentar ? 'ghost' : 'secondary'} onClick={() => window.location.reload()}>Recargar AppFit</Button>
        </Card>
      </div>
    </main>
  </div>
}
