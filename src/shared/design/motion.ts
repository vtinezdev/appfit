/** Duración de un token; las transiciones espaciales consultan reduceMotion aparte. */
export function motionMs(token: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return parseFloat(v) || 0
}

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const motionEasing = () => getComputedStyle(document.documentElement).getPropertyValue('--ease-standard').trim()

export function haptic(kind: 'selection' | 'success' | 'finish' = 'selection') {
  if (reduceMotion() || document.visibilityState !== 'visible') return
  // Vibration API es opcional: Safari/iOS no la expone. No simularla con audio ni hacks.
  try { navigator.vibrate?.(kind === 'finish' ? [16, 45, 24] : kind === 'success' ? 18 : 8) } catch { /* feedback visual siempre disponible */ }
}
