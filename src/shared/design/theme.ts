/**
 * Tema claro/oscuro. La preferencia ('light' | 'dark' | 'system') vive en localStorage
 * (es una preferencia de pantalla, no un dato de la app) y se aplica como `data-theme` en <html>.
 * Los valores de cada tema están en tokens.css; aquí no hay colores de interfaz.
 */
export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'appfit-theme'
const listeners = new Set<() => void>()

/** Tema ya resuelto por el sistema existente; también sirve como snapshot de React. */
export function getResolvedTheme(): 'light' | 'dark' {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const theme = resolve(pref)
  document.documentElement.dataset.theme = theme
  // La barra del sistema (meta theme-color) usa el fondo del tema: se lee del token, no se duplica aquí.
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${bg.split(/\s+/).join(',')})`)
  listeners.forEach(listener => listener())
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    /* sin almacenamiento: el tema solo dura esta sesión */
  }
  applyTheme(pref)
}

/** Aplica el tema al arrancar y lo mantiene sincronizado con el sistema mientras la preferencia sea 'system'. */
export function initTheme() {
  applyTheme()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system')
  })
}
