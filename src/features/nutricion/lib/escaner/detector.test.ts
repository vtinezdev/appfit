/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primerCodigoValido } from './detector'

describe('primerCodigoValido', () => {
  it('devuelve el primer EAN/UPC válido, normalizado a 13 cifras', () => {
    expect(primerCodigoValido([{ rawValue: '036000291452', format: 'upc_a' }])).toBe('0036000291452')
    expect(primerCodigoValido([{ rawValue: '96385074', format: 'ean_8' }])).toBe('0000096385074')
  })

  it('ignora otros formatos y códigos no válidos', () => {
    expect(primerCodigoValido([{ rawValue: 'https://x', format: 'qr_code' }, { rawValue: '12', format: 'ean_13' }])).toBeUndefined()
    expect(primerCodigoValido([{ rawValue: '8410000000000', format: 'code_128' }, { rawValue: '8480000123456', format: 'ean_13' }])).toBe('8480000123456')
    expect(primerCodigoValido([])).toBeUndefined()
  })
})

describe('versión del .wasm del escáner', () => {
  it('zxing-wasm (del que se sirve el .wasm) es la versión que usa barcode-detector', () => {
    const leer = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
    const pedida = leer('node_modules/barcode-detector/package.json').dependencies['zxing-wasm']
    expect(leer('node_modules/zxing-wasm/package.json').version).toBe(pedida)
    expect(leer('package.json').dependencies['zxing-wasm']).toBe(pedida)
  })
})
