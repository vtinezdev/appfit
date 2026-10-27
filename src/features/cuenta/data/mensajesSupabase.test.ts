import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { traducirEnvio } from './mensajesSupabase'

describe('traducirEnvio', () => {
  it('el freno del servidor pide esperar', () => {
    expect(traducirEnvio({ message: 'demasiados mensajes', code: 'P0001' }).message).toMatch(/dentro de un rato/)
  })

  it('sin red, falta de conexión', () => {
    expect(traducirEnvio(new TypeError('Failed to fetch')).tipo).toBe('sin-conexion')
    expect(traducirEnvio(new AuthRetryableFetchError('Failed to fetch', 0)).tipo).toBe('sin-conexion')
  })

  it('otro error (p. ej. sin la función en el servidor) no se envía y lo dice', () => {
    const e = traducirEnvio({ message: 'Could not find the function public.enviar_mensaje_creador', code: 'PGRST202' })
    expect(e.message).toBe('No se ha podido enviar. Inténtalo de nuevo más tarde.')
  })
})
