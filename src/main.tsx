import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { initTheme } from './shared/design/theme.ts'
import { initViewport } from './shared/design/viewport.ts'
import { ensureSettings } from './shared/db/settings.ts'
import { solicitarPersistencia } from './shared/lib/almacenamiento.ts'
import { sincronizarCatalogo } from './features/nutricion/lib/catalogo/sincronizar.ts'

initTheme()
initViewport()
void solicitarPersistencia()

/**
 * Descarga/actualiza el catálogo de alimentos en segundo plano: unos 2 s después del arranque, cuando el navegador
 * esté ocioso (Safari iOS no tiene requestIdleCallback: se lanza sin más) y solo con conexión. Sin conexión o si
 * falla no pasa nada: se reintenta en el siguiente arranque y Ajustes permite lanzarlo a mano (allí sí se ve el error).
 */
function programarSincronizacionCatalogo() {
  const lanzar = () => {
    if (navigator.onLine) sincronizarCatalogo().catch(() => {})
  }
  setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(lanzar, { timeout: 5000 })
    else lanzar()
  }, 2000)
}

ensureSettings().then(programarSincronizacionCatalogo)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
