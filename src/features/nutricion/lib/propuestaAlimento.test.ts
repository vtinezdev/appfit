import { describe, expect, it } from 'vitest'
import { errorPropuesta, mensajePropuesta } from './propuestaAlimento'

const base = { nombre: 'Tarta de la abuela', marca: '', codigo: '', nota: '' }

describe('propuesta de alimento', () => {
  it('pide el nombre y valida el código y los tamaños', () => {
    expect(errorPropuesta({ ...base, nombre: '  ' })).toMatch(/nombre/)
    expect(errorPropuesta(base)).toBeNull()
    expect(errorPropuesta({ ...base, codigo: '12345' })).toMatch(/8 a 14/)
    expect(errorPropuesta({ ...base, codigo: '8410000000000' })).toBeNull()
    expect(errorPropuesta({ ...base, nota: 'x'.repeat(1001) })).toMatch(/nota/)
  })

  it('el mensaje lleva solo lo escrito, limpio', () => {
    expect(mensajePropuesta(base)).toEqual({ texto: 'Alimento: Tarta de la abuela', datos: { nombre: 'Tarta de la abuela', marca: null, codigo: null } })
    const m = mensajePropuesta({ nombre: ' Yogur  proteico ', marca: 'Marca X', codigo: '8410000000000', nota: 'De Mercadona' })
    expect(m.texto).toBe('Alimento: Yogur proteico\nMarca: Marca X\nCódigo de barras: 8410000000000\nNota: De Mercadona')
    expect(m.datos).toEqual({ nombre: 'Yogur proteico', marca: 'Marca X', codigo: '8410000000000' })
  })
})
