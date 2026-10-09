/** Estado de interacción de la sesión: no modifica series, esquema Dexie ni copias de seguridad. */
export interface SessionUI { completed: number[]; restSeconds: number; restEndsAt: number | null
  /** Duración del descanso en curso (puede venir del objetivo del ejercicio y no del global). */
  restTotal?: number }
export const emptySession = (): SessionUI => ({ completed: [], restSeconds: 0, restEndsAt: null })
const key = (id: number) => `appfit:workout-ui:${id}`

export function readSession(id: number): SessionUI {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(id)) ?? 'null')
    if (!value || !Array.isArray(value.completed)) return emptySession()
    return {
      completed: value.completed.filter((n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0),
      restSeconds: [0, 60, 90, 120].includes(value.restSeconds) ? value.restSeconds : 0,
      restEndsAt: typeof value.restEndsAt === 'number' && Number.isFinite(value.restEndsAt) ? value.restEndsAt : null,
      ...(typeof value.restTotal === 'number' && value.restTotal > 0 && value.restTotal <= 3600 ? { restTotal: value.restTotal } : {}),
    }
  } catch { return emptySession() }
}
export function writeSession(id: number, value: SessionUI) {
  try { sessionStorage.setItem(key(id), JSON.stringify(value)) } catch { /* Sin storage, la interacción continúa en memoria. */ }
}
export function clearSession(id: number) { try { sessionStorage.removeItem(key(id)) } catch { /* optional */ } }
export function remainingSeconds(endsAt: number, now = Date.now()) { return Math.max(0, Math.ceil((endsAt - now) / 1000)) }
export function clockText(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

/** Descanso tras una serie: el del objetivo del ejercicio si lo tiene; si no, el global (0 = sin temporizador). */
export function descansoParaEjercicio(descansoObjetivo: number | undefined, global: number): number {
  return descansoObjetivo !== undefined && descansoObjetivo > 0 ? descansoObjetivo : global
}

/** −15/+15 del descanso en curso: mueve el deadline sin pasar de ahora. Si no queda tiempo, el descanso termina (sin aviso: lo decidió el usuario). */
export function ajustarDescanso(s: SessionUI, deltaSeg: number, now = Date.now()): SessionUI {
  if (s.restEndsAt === null) return s
  const fin = s.restEndsAt + deltaSeg * 1000
  if (fin <= now) return { ...s, restEndsAt: null }
  const total = s.restTotal ?? s.restSeconds
  return { ...s, restEndsAt: fin, restTotal: Math.min(3600, Math.max(total + deltaSeg, remainingSeconds(fin, now))) }
}
