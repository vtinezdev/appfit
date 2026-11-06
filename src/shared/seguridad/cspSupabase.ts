/**
 * `public/_headers` permite en `connect-src` cualquier proyecto de Supabase (`*.supabase.co`), porque el repositorio no
 * sabe cuál es el de la app. Al construir con `VITE_SUPABASE_URL` (la del proyecto, que ya va dentro de la app), la build
 * lo cambia por ese proyecto exacto: si alguna vez se colara un script, no podría enviar datos a otro proyecto de
 * Supabase. Con otra URL (pruebas en local, un Supabase falso) o sin ella, la política queda como está.
 */
const COMODIN = 'https://*.supabase.co wss://*.supabase.co'
const PROYECTO = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/

export function cabecerasConSupabase(cabeceras: string, url: string | undefined): string {
  const m = PROYECTO.exec(url?.trim() ?? '')
  if (!m || !cabeceras.includes(COMODIN)) return cabeceras
  return cabeceras.replaceAll(COMODIN, `https://${m[1]}.supabase.co wss://${m[1]}.supabase.co`)
}
