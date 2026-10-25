/**
 * Pitido corto con Web Audio para avisar del fin del descanso. Solo suena con la app abierta (iOS no ofrece
 * Vibration API ni permite avisos en segundo plano sin notificaciones). Cualquier fallo se ignora.
 */
export function pitar(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => { void ctx.close().catch(() => undefined) }
  } catch { /* sin audio: el aviso visual y háptico siguen disponibles */ }
}
