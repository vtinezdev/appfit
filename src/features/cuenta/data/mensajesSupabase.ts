import { clienteSupabase } from './clienteSupabase'
import { NubeError } from './nube'
import { traducir } from './nubeSupabase'
import type { MensajeCreador } from '../mensajes'

/** Se carga con `import()` al enviar: quien no envía nada no descarga supabase-js. */

const DEMASIADOS = 'Has enviado varios mensajes seguidos. Inténtalo dentro de un rato.'
const FALLO = 'No se ha podido enviar. Inténtalo de nuevo más tarde.'

/** El freno del servidor («demasiados mensajes») tiene su propio mensaje; lo demás, como el resto de la nube. */
export function traducirEnvio(error: unknown): NubeError {
  if (/demasiados mensajes/i.test((error as { message?: string } | null)?.message ?? '')) return new NubeError(DEMASIADOS)
  const e = traducir(error, FALLO)
  return e.tipo === 'otro' && e.message !== FALLO && !/sesión/.test(e.message) ? new NubeError(FALLO) : e
}

export async function enviar(url: string, clave: string, m: MensajeCreador): Promise<void> {
  const sb = clienteSupabase(url, clave)
  let error: unknown
  try {
    ;({ error } = await sb.rpc('enviar_mensaje_creador', { p_tipo: m.tipo, p_texto: m.texto, p_datos: m.datos ?? null, p_version: m.version }))
  } catch (e) {
    throw traducirEnvio(e)
  }
  if (error) throw traducirEnvio(error)
}
