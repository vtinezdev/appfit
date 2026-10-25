import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { clienteSupabase } from './clienteSupabase'
import type { ClavesNube } from '../lib/cifrado'
import { NubeError, type CopiaRemota, type EstadoRemoto, type Nube } from './nube'

/** Se carga con `import()` solo cuando hace falta: quien no usa la cuenta no descarga supabase-js. */

const SIN_CONEXION = 'No hay conexión con la nube. Revisa la conexión e inténtalo de nuevo.'
const GENERICO = 'No se ha podido conectar con tu cuenta. Inténtalo de nuevo.'
const FALLO_SERVIDOR = 'La nube no responde ahora mismo. Inténtalo más tarde.'
const FALLO_ENVIO = 'No se ha podido enviar el código. Inténtalo más tarde.'

/**
 * Pasa un error de supabase-js a un `NubeError` con el mensaje para la persona. `falloServidor` es el mensaje cuando el
 * servidor responde con un 5xx (p. ej. falla el SMTP al enviar el código): hay red, así que no es «sin conexión».
 */
export function traducir(error: unknown, falloServidor = FALLO_SERVIDOR): NubeError {
  if (error instanceof NubeError) return error
  // auth-js da AuthRetryableFetchError tanto si no hay red (status 0) como si el servidor responde 5xx.
  if (isAuthRetryableFetchError(error) && error.status >= 500) return new NubeError(falloServidor)
  if (isAuthRetryableFetchError(error) || error instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return new NubeError(SIN_CONEXION, 'sin-conexion')
  }
  if (isAuthApiError(error)) {
    if (error.code === 'otp_expired') return new NubeError('El código no es correcto o ha caducado. Revisa el correo o pide otro.')
    if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
      return new NubeError('Has pedido demasiados códigos seguidos. Espera unos minutos y vuelve a intentarlo.')
    }
    if (error.code === 'email_address_invalid' || error.code === 'validation_failed') return new NubeError('Ese email no parece válido.')
  }
  const e = error as { code?: string; message?: string; status?: number } | null
  if (e?.code === 'PGRST301' || e?.status === 401 || /jwt/i.test(e?.message ?? '')) {
    return new NubeError('Tu sesión ha caducado. Vuelve a entrar en tu cuenta.', 'sesion')
  }
  if (/fetch|network/i.test(e?.message ?? '')) return new NubeError(SIN_CONEXION, 'sin-conexion')
  return new NubeError(GENERICO)
}

export async function intentar<T>(fn: () => Promise<{ data: T; error: unknown }>, falloServidor?: string): Promise<T> {
  let resultado: { data: T; error: unknown }
  try {
    resultado = await fn()
  } catch (e) {
    throw traducir(e, falloServidor)
  }
  if (resultado.error) throw traducir(resultado.error, falloServidor)
  return resultado.data
}

export function crearNubeSupabase(url: string, clave: string): Nube {
  const sb = clienteSupabase(url, clave)

  return {
    async enviarCodigo(email) {
      await intentar(() => sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }), FALLO_ENVIO)
    },
    async verificarCodigo(email, codigo) {
      await intentar(() => sb.auth.verifyOtp({ email, token: codigo, type: 'email' }))
    },
    async usuario() {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      return u ? { id: u.id, email: u.email ?? '' } : null
    },
    async cerrarSesion() {
      // Sin conexión, signOut falla en la red pero borra igual la sesión local: es lo que importa aquí.
      await sb.auth.signOut({ scope: 'local' }).catch(() => undefined)
    },
    async leerEstado() {
      return intentar(async () => await sb.from('copias').select('revision, actualizada').maybeSingle<EstadoRemoto>())
    },
    async leerCopia() {
      return intentar(async () => await sb.from('copias').select('revision, actualizada, datos, claves').maybeSingle<CopiaRemota>())
    },
    async subir(revisionBase, datos, claves?: ClavesNube) {
      const nueva = await intentar(async () => await sb.rpc('subir_copia', { p_revision_base: revisionBase, p_datos: datos, p_claves: claves ?? null }))
      return typeof nueva === 'number' ? nueva : null
    },
    async actualizarClaves(claves) {
      await intentar(async () => await sb.rpc('actualizar_claves', { p_claves: claves }))
    },
    async marcarActividad() {
      await intentar(async () => await sb.rpc('marcar_actividad'))
    },
    async borrarCuenta() {
      await intentar(async () => await sb.rpc('borrar_cuenta'))
      await sb.auth.signOut({ scope: 'local' }).catch(() => undefined)
    },
  }
}
