import { CLAVE_NUBE, cuentaDisponible, URL_NUBE } from './servicio'

/**
 * Mensajes al creador de AppFit (ADR 061): «Comunicar un problema» y «Proponer un alimento» mandan lo que la persona ha
 * revisado en pantalla, con o sin cuenta, a la tabla privada `mensajes_creador` de Supabase (solo se lee desde su panel).
 * Sin Supabase configurado no hay envío y las pantallas ofrecen copiar.
 */
export type TipoMensaje = 'problema' | 'alimento'
export interface MensajeCreador {
  tipo: TipoMensaje
  texto: string
  datos?: Record<string, string | number | null>
  version: string
}

export const envioDisponible = cuentaDisponible

export async function enviarAlCreador(m: MensajeCreador): Promise<void> {
  const { enviar } = await import('./data/mensajesSupabase')
  await enviar(URL_NUBE!, CLAVE_NUBE!, m)
}
