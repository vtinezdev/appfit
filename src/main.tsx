import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { initTheme } from './shared/design/theme.ts'
import { ensureSettings } from './shared/db/settings.ts'

initTheme()
navigator.storage?.persist?.().catch(() => {})
ensureSettings()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
