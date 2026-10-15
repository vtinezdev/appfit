import { describe, expect, it } from 'vitest'
import { traducirSocial } from './socialSupabase'

describe('traducirSocial', () => {
  it('las claves del SQL llegan con su mensaje', () => {
    const error = traducirSocial({ code: 'P0001', message: 'alias_ocupado' })
    expect(error.message).toMatch(/ya lo usa otra persona/)
    expect(error.tipo).toBe('otro')
  })

  it('sin sesión pide volver a entrar', () => {
    expect(traducirSocial({ code: 'P0001', message: 'sin_sesion' }).tipo).toBe('sesion')
  })

  it('si el SQL aún no está en el servidor, lo dice sin hablar de errores técnicos', () => {
    expect(traducirSocial({ code: 'PGRST202', message: 'Could not find the function public.mi_perfil' }).message).toMatch(/aún no está disponible/)
  })

  it('lo demás, como la cuenta: sin red es «sin conexión»', () => {
    expect(traducirSocial(new TypeError('Failed to fetch')).tipo).toBe('sin-conexion')
  })
})
