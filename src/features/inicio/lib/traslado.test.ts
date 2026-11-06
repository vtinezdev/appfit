import { describe, expect, it } from 'vitest'
import type { EstadoCuenta } from '../../cuenta/copiaNube'
import { caminoTraslado, direccionNueva, hayQueTrasladar, textoTraslado } from './traslado'

describe('direccionNueva', () => {
  it('sin variable, o con una que no es https, no hay traslado', () => {
    expect(direccionNueva(undefined)).toBeNull()
    expect(direccionNueva('  ')).toBeNull()
    expect(direccionNueva('cumbrafit.app')).toBeNull()
    expect(direccionNueva('http://cumbrafit.app')).toBeNull()
  })

  it('se queda con el origen y el nombre para los textos', () => {
    expect(direccionNueva('https://cumbrafit.app/')).toEqual({ origen: 'https://cumbrafit.app', host: 'cumbrafit.app' })
  })

  it('en local también vale http, para probarlo', () => {
    expect(direccionNueva('http://appfit-nueva.localhost:5173')).toEqual({ origen: 'http://appfit-nueva.localhost:5173', host: 'appfit-nueva.localhost:5173' })
  })
})

describe('hayQueTrasladar', () => {
  const nueva = { origen: 'https://cumbrafit.app', host: 'cumbrafit.app' }

  it('avisa en la dirección vieja y no en la nueva', () => {
    expect(hayQueTrasladar('https://appfit.vtinez-dev.workers.dev', nueva)).toBe(true)
    expect(hayQueTrasladar('https://cumbrafit.app', nueva)).toBe(false)
  })

  it('sin dirección nueva, nunca', () => {
    expect(hayQueTrasladar('https://appfit.vtinez-dev.workers.dev', null)).toBe(false)
  })
})

describe('caminoTraslado', () => {
  const estado = (fase: EstadoCuenta['fase'], error?: string): EstadoCuenta => ({ fase, error })

  it('sin cuenta, o con cuenta pero sin copia, se exporta e importa', () => {
    expect(caminoTraslado(false, estado('al-dia'))).toBe('copia')
    expect(caminoTraslado(true, estado('sin-sesion'))).toBe('copia')
    expect(caminoTraslado(true, estado('sin-copia'))).toBe('copia')
  })

  it('con la copia al día basta con entrar en la nueva', () => {
    expect(caminoTraslado(true, estado('al-dia'))).toBe('cuenta-al-dia')
  })

  it('con algo pendiente o por resolver, primero la copia', () => {
    for (const fase of ['pendiente', 'subiendo', 'sin-conexion', 'error', 'conflicto', 'perdida'] as const) {
      expect(caminoTraslado(true, estado(fase))).toBe('cuenta-revisar')
    }
    expect(caminoTraslado(true, estado('sin-sesion', 'La sesión ha caducado'))).toBe('cuenta-revisar')
  })
})

describe('textoTraslado', () => {
  it('nombra la dirección nueva y lo que hay que hacer en cada caso', () => {
    expect(textoTraslado('cuenta-al-dia', 'cumbrafit.app')).toMatch(/cumbrafit\.app.*entra con tu cuenta/)
    expect(textoTraslado('cuenta-revisar', 'cumbrafit.app')).toMatch(/deja al día tu copia/)
    expect(textoTraslado('copia', 'cumbrafit.app')).toMatch(/Exporta una copia.*Copias de seguridad/)
  })
})
