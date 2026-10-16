import { describe, expect, it } from 'vitest'
import { crearIdDeEnvio } from './intento'

describe('identidad de un envío', () => {
  it('no duplica al reintentar el mismo contenido recreado en otro render', () => {
    let n = 0
    const id = crearIdDeEnvio(() => String(++n))
    expect(id(['seguidores', { texto: 'Hola' }])).toBe(id(['seguidores', { texto: 'Hola' }]))
    expect(n).toBe(1)
  })
  it('no reutiliza el UUID de otra audiencia, contenido o formulario editado', () => {
    let n = 0
    const id = crearIdDeEnvio(() => String(++n))
    const primero = id(['seguidores', { texto: 'Hola' }])
    expect(id(['grupo', { texto: 'Hola' }])).not.toBe(primero)
    expect(id(['grupo', { texto: 'Otro texto' }])).toBe('3')
    expect(id(['Otro nombre', 'Descripción'])).toBe('4')
  })
})
