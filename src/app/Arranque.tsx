import { useEffect, useState } from 'react'
import App from './App'
import FalloAplicacion from './FalloAplicacion'
import { prepararDatos } from '../shared/db/arranque'
import { LoadingState } from '../shared/components/StateMessage'
import { sincronizarCatalogo } from '../features/nutricion/lib/catalogo/sincronizar'
import { iniciarCopiaNube } from '../features/cuenta/servicio'

function programarCatalogo() {
  return setTimeout(() => {
    const lanzar = () => { if (navigator.onLine) void sincronizarCatalogo().catch(() => {}) }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(lanzar, { timeout: 5000 })
    else lanzar()
  }, 2000)
}

/** No monta lecturas de features hasta que la base y los ajustes estén disponibles. */
export default function Arranque() {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout> | undefined
    prepararDatos().then(() => {
      if (!vivo) return
      timer = programarCatalogo()
      iniciarCopiaNube()
      setEstado('listo')
    }).catch(() => { if (vivo) setEstado('error') })
    return () => { vivo = false; clearTimeout(timer) }
  }, [intento])
  if (estado === 'error') return <FalloAplicacion almacenamiento onReintentar={() => { setEstado('cargando'); setIntento(n => n + 1) }} />
  if (estado === 'cargando') return <div className="safe-top px-page"><LoadingState>Abriendo tus registros…</LoadingState></div>
  return <App />
}
