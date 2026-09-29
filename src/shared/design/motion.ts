/** Duración de un token de motion en ms (`--dur-normal`…). Vale 0 con prefers-reduced-motion: quien lo use no anima. */
export function motionMs(token: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return parseFloat(v) || 0
}
