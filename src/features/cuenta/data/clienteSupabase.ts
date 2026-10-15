import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | undefined

/**
 * El único cliente de supabase-js de la app: la cuenta (copia) y la parte social comparten sesión. Se carga diferido
 * con `import()` desde `nubeSupabase` y `social/data/socialSupabase`, así que quien no usa la cuenta no lo descarga.
 */
export function clienteSupabase(url: string, clave: string): SupabaseClient {
  cliente ??= createClient(url, clave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'appfit-cuenta' },
  })
  return cliente
}
