import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { itemDesdeElegible, itemSinCoincidencia } from '../lib/alimentos'
import DetallesAlimento from './DetallesAlimento'
import ItemRevisionRow from './ItemRevisionRow'

const noop = () => {}

describe('ItemRevisionRow: lo que falta', () => {
  it('nada se abre solo: lo que falta sale como etiqueta y la fila sigue cerrada', () => {
    const item = itemSinCoincidencia('tortilla de patata', 150)
    const html = renderToStaticMarkup(<ItemRevisionRow item={item} onChange={noop} pedirCategoria />)
    expect(html).toContain('Faltan sus valores')
    expect(html).toContain('aria-expanded="false"')
    const conValores = renderToStaticMarkup(<ItemRevisionRow item={{ ...item, kcal100: 180 }} onChange={noop} pedirCategoria />)
    expect(conValores).toContain('Elige su categoría')
    const lista = renderToStaticMarkup(<ItemRevisionRow item={{ ...item, kcal100: 180, categoria: 'Platos preparados' }} onChange={noop} pedirCategoria />)
    expect(lista).not.toContain('bg-destructive')
  })

  it('un alimento tuyo lleva su fuente y no pide categoría', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'user', id: 1 }, nombre: 'Café con leche', categoria: 'Bebidas', kcal100: 40, prot100: 2, carb100: 4, grasa100: 1.5 }, 200)
    const html = renderToStaticMarkup(<ItemRevisionRow item={item} onChange={noop} />)
    expect(html).toContain('Tuyo')
    expect(html).toContain('80')
    expect(html).not.toContain('bg-destructive')
  })
})

describe('DetallesAlimento: categoría', () => {
  it('si el ítem va a crear un alimento, pide la categoría y la marca como pendiente hasta elegirla', () => {
    const item = itemSinCoincidencia('tortilla de patata', 150)
    const html = renderToStaticMarkup(<DetallesAlimento item={item} onChange={noop} pedirCategoria />)
    expect(html).toContain('Elige una categoría')
    expect(html).toMatch(/<select[^>]*aria-invalid="true"/)
    const elegida = renderToStaticMarkup(<DetallesAlimento item={{ ...item, categoria: 'Platos preparados' }} onChange={noop} pedirCategoria />)
    expect(elegida).toMatch(/<select[^>]*aria-invalid="false"/)
    expect(renderToStaticMarkup(<DetallesAlimento item={item} onChange={noop} />)).not.toContain('Elige una categoría')
  })
})
