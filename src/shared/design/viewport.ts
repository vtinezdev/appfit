/** Diferencia mínima con la pantalla que se toma por teclado abierto (el teclado más bajo de iPhone ronda los 260 px). */
const UMBRAL_TECLADO = 120

/**
 * Alto del área visible. En la PWA instalada de iOS, `visualViewport.height` (y `innerHeight`) se queda a veces
 * más corto que la pantalla —p. ej. tras cerrar el teclado, o por el alto de la barra de estado con
 * `black-translucent`— y deja una franja vacía bajo la app y las hojas. Sin teclado, la app ocupa la pantalla entera.
 */
export function altoVisible(e: {
  alto: number
  standaloneIOS: boolean
  pantalla: { ancho: number; alto: number }
  horizontal: boolean
}) {
  if (!e.standaloneIOS) return e.alto
  const lados = [e.pantalla.ancho, e.pantalla.alto]
  const completo = e.horizontal ? Math.min(...lados) : Math.max(...lados)
  return completo > e.alto && completo - e.alto < UMBRAL_TECLADO ? completo : e.alto
}

/** Shell y capas siguen el teclado, sin cambiar el diseño al hacer zoom con los dedos. */
export function initViewport() {
  const viewport = window.visualViewport
  const sync = () => {
    if (viewport && viewport.scale !== 1) return
    const height = altoVisible({
      alto: viewport?.height ?? window.innerHeight,
      // `navigator.standalone` solo existe en iOS: Android pinta sus barras fuera de la web y su `screen` las incluye.
      standaloneIOS: (window.navigator as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true,
      pantalla: { ancho: window.screen?.width ?? 0, alto: window.screen?.height ?? 0 },
      horizontal: window.innerWidth > window.innerHeight,
    })
    const style = document.documentElement.style
    style.setProperty('--viewport-height', `${height}px`)
    style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`)
    style.setProperty('--app-height', `${height}px`)
  }
  sync()
  window.addEventListener('resize', sync)
  viewport?.addEventListener('resize', sync)
  viewport?.addEventListener('scroll', sync)
  return () => {
    window.removeEventListener('resize', sync)
    viewport?.removeEventListener('resize', sync)
    viewport?.removeEventListener('scroll', sync)
  }
}
