import { useState, useSyncExternalStore } from 'react'
import { entornoDeApp } from '../lib/almacenamiento'
import { instalacionDisponible, instalarApp, subscribeInstalacion } from '../pwa/instalacion'
import Button from './Button'
import { ErrorState } from './StateMessage'

export default function InstalarApp() {
  const disponible = useSyncExternalStore(subscribeInstalacion, instalacionDisponible, () => false)
  const [error, setError] = useState(false)
  if ((!disponible && !error) || entornoDeApp().instalada) return null
  return <div className="space-y-2">
    {disponible && <Button block onClick={() => {
      setError(false)
      void instalarApp().catch(() => setError(true))
    }}>Instalar AppFit</Button>}
    {error && <ErrorState>No se pudo abrir la instalación. Usa el menú del navegador.</ErrorState>}
  </div>
}
