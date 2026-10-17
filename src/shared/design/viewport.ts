/** Shell y capas siguen el teclado, sin cambiar el diseño al hacer zoom con los dedos. */
export function initViewport() {
  const viewport = window.visualViewport
  const sync = () => {
    if (viewport && viewport.scale !== 1) return
    const height = viewport?.height ?? window.innerHeight
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
