/** Las capas siguen la zona visible con teclado; sin visualViewport usan 100dvh. Geometría, no tokens estáticos. */
export function initViewport() {
  const viewport = window.visualViewport
  if (!viewport) return
  const sync = () => {
    document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`)
    document.documentElement.style.setProperty('--viewport-top', `${viewport.offsetTop}px`)
  }
  sync()
  viewport.addEventListener('resize', sync)
  viewport.addEventListener('scroll', sync)
}
