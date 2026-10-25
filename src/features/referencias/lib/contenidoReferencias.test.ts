/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ESTADO_RECOMENDACIONES, FUENTES_CATALOGO, RECOMENDACIONES_ALIMENTARIAS } from './contenidoReferencias'

describe('procedencia y recomendaciones pendientes', () => {
  it('explica las fuentes realmente distribuidas en el catálogo', () => {
    const manifest = JSON.parse(readFileSync('public/catalogo/manifest.json', 'utf8'))
    expect(FUENTES_CATALOGO.map(f => f.id).sort()).toEqual(manifest.fuentes.map((f: { id: string }) => f.id).sort())
    expect(FUENTES_CATALOGO.every(f => f.url.startsWith('https://'))).toBe(true)
  })
  it('no inventa raciones ni una recomendación de cero para grupos pendientes', () => {
    expect(ESTADO_RECOMENDACIONES).toBe('pendiente-definicion')
    expect(RECOMENDACIONES_ALIMENTARIAS).toEqual([])
  })
})
