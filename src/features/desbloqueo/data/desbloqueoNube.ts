import { CLAVE_NUBE, cuentaDisponible, URL_NUBE } from '../../cuenta/servicio'

/**
 * Pregunta a la nube si la cuenta con sesión tiene Cumbra Fit desbloqueada (`mi_desbloqueo`, 0031, ADR 068). `null` si
 * no se sabe (sin cuenta configurada, sin red o sin la migración): entonces vale lo recordado en el móvil. supabase-js
 * se carga diferido, como en la cuenta y en Social.
 */
export async function consultarMiDesbloqueo(): Promise<boolean | null> {
  if (!cuentaDisponible) return null
  try {
    const { clienteSupabase } = await import('../../cuenta/data/clienteSupabase')
    const { data, error } = await clienteSupabase(URL_NUBE!, CLAVE_NUBE!).rpc('mi_desbloqueo')
    return error ? null : data === true
  } catch {
    return null
  }
}
