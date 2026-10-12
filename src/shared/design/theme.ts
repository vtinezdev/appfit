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

/**
 * Fondo de las secciones: con la fotografía de su atmósfera, liso (solo el color del tema y sus luces estáticas)
 * o dibujado (curvas de nivel o rejilla de puntos, con un halo volt).
 * También es una preferencia de pantalla: vive en localStorage y se aplica como `data-fondo` en <html>.
 */
export type FondoPref = 'foto' | 'liso' | 'curvas' | 'puntos'
const KEY_FONDO = 'appfit-fondo'
const FONDOS: readonly FondoPref[] = ['foto', 'liso', 'curvas', 'puntos']

/** Lo guardado se interpreta así: cualquier valor desconocido (o nada) son las curvas, el fondo por defecto (ADR 036). */
export function fondoDe(valor: string | null | undefined): FondoPref {
  return FONDOS.find(f => f === valor) ?? 'curvas'
}

export function getFondoPref(): FondoPref {
  try {
    return fondoDe(localStorage.getItem(KEY_FONDO))
  } catch {
    return 'curvas'
  }
}

export function applyFondo(pref: FondoPref = getFondoPref()) {
  if (pref === 'foto') delete document.documentElement.dataset.fondo
  else document.documentElement.dataset.fondo = pref
}

export function setFondoPref(pref: FondoPref) {
  try {
    if (pref === 'curvas') localStorage.removeItem(KEY_FONDO)
    else localStorage.setItem(KEY_FONDO, pref)
  } catch {
    /* sin almacenamiento: el fondo solo dura esta sesión */
  }
  applyFondo(pref)
}

/** Aplica el tema (y el fondo) al arrancar y lo mantiene sincronizado con el sistema mientras la preferencia sea 'system'. */
export function initTheme() {
  applyTheme()
  applyFondo()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system')
  })
}
