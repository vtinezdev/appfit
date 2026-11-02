const SIN_TECLADO = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

/** Hay algo enfocado que abre el teclado (campo de texto, área de texto o editable). */
export function abreTeclado(el: { tagName?: string; type?: string; isContentEditable?: boolean } | null | undefined) {
  if (!el?.tagName) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'textarea') return true
  if (tag === 'input') return !SIN_TECLADO.has((el.type ?? 'text').toLowerCase())
  return el.isContentEditable === true
}

/**
 * Alto del área visible. En la PWA instalada de iOS, `visualViewport.height` (y `innerHeight`) se queda a veces más corto
 * que la pantalla —p. ej. tras cerrar el teclado, al volver de segundo plano o por la barra de estado con
 * `black-translucent`— y deja una franja vacía bajo la app y las hojas, que cortaba el botón de secciones. Ahí, sin un
 * campo de texto enfocado no puede haber teclado: la app ocupa siempre la pantalla entera, falte lo que falte.
 */
export function altoVisible(e: {
  alto: number
  standaloneIOS: boolean
  pantalla: { ancho: number; alto: number }
  horizontal: boolean
  teclado: boolean
}) {
  if (!e.standaloneIOS || e.teclado) return e.alto
  const lados = [e.pantalla.ancho, e.pantalla.alto]
  const completo = e.horizontal ? Math.min(...lados) : Math.max(...lados)
  return Math.max(completo, e.alto)
}

/** Shell y capas siguen el teclado, sin cambiar el diseño al hacer zoom con los dedos. */
export function initViewport() {
  const viewport = window.visualViewport
  const sync = () => {
    if (viewport && viewport.scale !== 1) return
    const standaloneIOS = (window.navigator as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true
    const teclado = abreTeclado(document.activeElement as HTMLElement | null)
    const height = altoVisible({
      alto: viewport?.height ?? window.innerHeight,
      // `navigator.standalone` solo existe en iOS: Android pinta sus barras fuera de la web y su `screen` las incluye.
      standaloneIOS,
      pantalla: { ancho: window.screen?.width ?? 0, alto: window.screen?.height ?? 0 },
      horizontal: window.innerWidth > window.innerHeight,
      teclado,
    })
    // Sin teclado en la PWA de iOS, pegada arriba: un desplazamiento que iOS no devuelve subiría la app y dejaría hueco abajo.
    const top = standaloneIOS && !teclado ? 0 : viewport?.offsetTop ?? 0
    const style = document.documentElement.style
    style.setProperty('--viewport-height', `${height}px`)
    style.setProperty('--viewport-top', `${top}px`)
    style.setProperty('--app-height', `${height}px`)
  }
  // Al cerrar el teclado o volver a la app, iOS no siempre avisa con un resize: se recalcula también entonces.
  const syncTrasFoco = () => requestAnimationFrame(sync)
  const alVolver = () => { if (document.visibilityState === 'visible') sync() }
  sync()
  window.addEventListener('resize', sync)
  window.addEventListener('focusin', sync)
  window.addEventListener('focusout', syncTrasFoco)
  window.addEventListener('pageshow', sync)
  document.addEventListener?.('visibilitychange', alVolver)
  viewport?.addEventListener('resize', sync)
  viewport?.addEventListener('scroll', sync)
  return () => {
    window.removeEventListener('resize', sync)
    window.removeEventListener('focusin', sync)
    window.removeEventListener('focusout', syncTrasFoco)
    window.removeEventListener('pageshow', sync)
    document.removeEventListener?.('visibilitychange', alVolver)
    viewport?.removeEventListener('resize', sync)
    viewport?.removeEventListener('scroll', sync)
  }
}
