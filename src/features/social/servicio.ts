import { CLAVE_NUBE, cuentaDisponible, URL_NUBE } from '../cuenta/servicio'
import type { Social } from './data/social'

/** La parte social existe si existe la cuenta (mismo proyecto de Supabase, ADR 040). */
export const socialDisponible = cuentaDisponible

let social: Promise<Social> | undefined

/** supabase-js se descarga la primera vez que se usa (normalmente ya lo cargó la cuenta). */
export function cargarSocial(): Promise<Social> {
  social ??= import('./data/socialSupabase').then((m) => m.crearSocialSupabase(URL_NUBE!, CLAVE_NUBE!))
  return social
}
