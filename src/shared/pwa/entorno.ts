// Cómo se ha abierto Cumbra Fit: la app de Google Play (TWA, android/twa-manifest.json), la app instalada desde la web o
// el navegador. La TWA abre la página con `document.referrer` = `android-app://<paquete>`; al recargar se pierde, así que
// se recuerda en la sesión. ADR 067.

/** El paquete de Google Play (ADR 063); `manifest.test.ts` vigila que sea el de la TWA. */
export const PAQUETE_ANDROID = 'app.cumbrafit'
const CLAVE_SESION = 'appfit-app-android'

export type ModoApp = 'app-android' | 'instalada' | 'navegador'

/** Puro: si la sesión es de la app de Android, por el referrer de la primera carga o por lo recordado en la sesión. */
export function detectarAppAndroid(referrer: string, recordado: string | null): boolean {
  return recordado === '1' || referrer.startsWith(`android-app://${PAQUETE_ANDROID}`)
}

let appAndroid: boolean | undefined

/** Si Cumbra Fit se ha abierto desde la app de Google Play. Se calcula una vez y se recuerda en la sesión. */
export function esAppAndroid(): boolean {
  if (appAndroid !== undefined) return appAndroid
  let recordado: string | null = null
  try { recordado = sessionStorage.getItem(CLAVE_SESION) } catch { /* sin almacenamiento de sesión: solo el referrer */ }
  appAndroid = typeof document !== 'undefined' && detectarAppAndroid(document.referrer, recordado)
  if (appAndroid) { try { sessionStorage.setItem(CLAVE_SESION, '1') } catch { /* nada que recordar */ } }
  return appAndroid
}

/** Para el informe de «Comunicar un problema». */
export function modoApp(): ModoApp {
  if (esAppAndroid()) return 'app-android'
  const instalada = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return instalada ? 'instalada' : 'navegador'
}
