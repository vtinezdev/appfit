import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { NubeError } from './nube'
import { traducir } from './nubeSupabase'

describe('traducir', () => {
  it('un 5xx del servidor no se presenta como falta de conexión', () => {
    // Así llega un fallo del SMTP de Supabase en /otp: 500 con error_code unexpected_failure.
    const error = traducir(new AuthRetryableFetchError('Error sending magic link email', 500), 'No se ha podido enviar el código.')
    expect(error.message).toBe('No se ha podido enviar el código.')
    expect(error.tipo).toBe('otro')
  })

  it('sin mensaje propio, un 5xx da el mensaje genérico de servidor', () => {
    const error = traducir(new AuthRetryableFetchError('Service Unavailable', 503))
    expect(error.message).toMatch(/inténtalo más tarde/i)
    expect(error.tipo).toBe('otro')
  })

  it('sin respuesta del servidor (status 0) sí es falta de conexión', () => {
    expect(traducir(new AuthRetryableFetchError('Failed to fetch', 0)).tipo).toBe('sin-conexion')
    expect(traducir(new TypeError('Failed to fetch')).tipo).toBe('sin-conexion')
  })

  it('traduce los errores conocidos de la API de auth', () => {
    expect(traducir(new AuthApiError('Token has expired or is invalid', 403, 'otp_expired')).message).toMatch(/caducado/)
    expect(traducir(new AuthApiError('Rate limit', 429, 'over_email_send_rate_limit')).message).toMatch(/demasiados códigos/)
  })

  it('deja pasar un NubeError tal cual', () => {
    const original = new NubeError('ya traducido', 'sesion')
    expect(traducir(original)).toBe(original)
  })
})
