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
 * Medidas de pantalla para diagnosticar la PWA de iOS (Ajustes › Actualizaciones). Solo se leen y se enseñan.
 * `zona` es lo que da iOS; `app`, el rectángulo del shell; los márgenes, lo que vale `env(safe-area-inset-*)`.
 */
export interface MedidasPantalla {
  pantalla: { ancho: number; alto: number }
  ventana: { ancho: number; alto: number }
  visible: { alto: number; desplazamiento: number } | null
  documento: number
  app: { arriba: number; alto: number } | null
  margenes: { arriba: number; abajo: number }
  instalada: boolean
}

/** Las medidas, una por línea, para leerlas en una captura (px CSS, redondeados). */
export function lineasMedidas(m: MedidasPantalla) {
  const r = Math.round
  return [
    ['Pantalla', `${r(m.pantalla.ancho)} × ${r(m.pantalla.alto)}`],
    ['Ventana', `${r(m.ventana.ancho)} × ${r(m.ventana.alto)}`],
    ['Zona visible', m.visible ? `${r(m.visible.alto)} (desplazada ${r(m.visible.desplazamiento)})` : 'Sin datos'],
    ['Documento', `${r(m.documento)}`],
    ['App', m.app ? `${r(m.app.alto)} desde ${r(m.app.arriba)}` : 'Sin datos'],
    ['Margen arriba', `${r(m.margenes.arriba)}`],
    ['Margen abajo', `${r(m.margenes.abajo)}`],
    ['Instalada (iOS)', m.instalada ? 'Sí' : 'No'],
  ] as const
}

/** Lee las medidas en el navegador. Los márgenes se miden con un elemento temporal con `env()`. */
export function leerMedidas(): MedidasPantalla {
  const sonda = document.createElement('div')
  sonda.className = 'sonda-margenes'
  document.body.appendChild(sonda)
  const estilo = getComputedStyle(sonda)
  const margenes = { arriba: parseFloat(estilo.paddingTop) || 0, abajo: parseFloat(estilo.paddingBottom) || 0 }
  sonda.remove()
  const shell = document.querySelector('[data-app-shell]')?.getBoundingClientRect()
  const viewport = window.visualViewport
  return {
    pantalla: { ancho: window.screen.width, alto: window.screen.height },
    ventana: { ancho: window.innerWidth, alto: window.innerHeight },
    visible: viewport ? { alto: viewport.height, desplazamiento: viewport.offsetTop } : null,
    documento: document.documentElement.clientHeight,
    app: shell ? { arriba: shell.top, alto: shell.height } : null,
    margenes,
    instalada: (navigator as Navigator & { standalone?: boolean }).standalone === true,
  }
}

/** Shell y capas siguen el teclado, sin cambiar el diseño al hacer zoom con los dedos. */
export function initViewport() {
  const viewport = window.visualViewport
  const sync = () => {
    if (viewport && viewport.scale !== 1) return
    const standaloneIOS = (window.navigator as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true
    const teclado = abreTeclado(document.activeElement as HTMLElement | null)
    // El alto es el que da iOS, aunque sea menos que la pantalla: en la PWA, iOS a veces solo pinta hasta unos 64 pt antes
    // del borde (§318). Estirar la app hasta la pantalla entera la metía en esa zona sin pintar y cortaba el botón.
    const height = viewport?.height ?? window.innerHeight
    // Sin teclado en la PWA de iOS, pegada arriba: un desplazamiento que iOS no devuelve subiría la app y la cortaría.
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
