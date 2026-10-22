import { iniciarDiagnostico } from './shared/lib/diagnostico'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Arranque from './app/Arranque.tsx'
import LimiteErrores from './app/LimiteErrores.tsx'
import { initTheme } from './shared/design/theme.ts'
import { initViewport } from './shared/design/viewport.ts'
import { solicitarPersistencia } from './shared/lib/almacenamiento.ts'
import { iniciarActualizaciones } from './shared/pwa/actualizaciones.ts'
import { initInstalacion } from './shared/pwa/instalacion.ts'

iniciarDiagnostico()
initTheme()
initViewport()
initInstalacion()
iniciarActualizaciones()
void solicitarPersistencia()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteErrores><Arranque /></LimiteErrores>
  </StrictMode>,
)
