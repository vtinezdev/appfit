import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { itemDesdeElegible, itemSinCoincidencia } from '../lib/alimentos'
import ItemRevisionRow from './ItemRevisionRow'

const noop = () => {}

describe('ItemRevisionRow: categoría', () => {
  it('si el ítem va a crear un alimento, pide la categoría y la marca como pendiente hasta elegirla', () => {
    const item = itemSinCoincidencia('tortilla de patata', 150)
    const html = renderToStaticMarkup(<ItemRevisionRow item={item} onChange={noop} pedirCategoria />)
    expect(html).toContain('Elige una categoría')
    expect(html).toMatch(/<select[^>]*aria-invalid="true"/)
    const elegida = renderToStaticMarkup(<ItemRevisionRow item={{ ...item, categoria: 'Platos preparados' }} onChange={noop} pedirCategoria />)
    expect(elegida).toMatch(/<select[^>]*aria-invalid="false"/)
  })

  it('si no la pide, la muestra como icono con su nombre accesible', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'user', id: 1 }, nombre: 'Café con leche', categoria: 'Bebidas', kcal100: 40, prot100: 2, carb100: 4, grasa100: 1.5 }, 200)
    const html = renderToStaticMarkup(<ItemRevisionRow item={item} onChange={noop} />)
    expect(html).toContain('aria-label="Categoría: Bebidas"')
    expect(html).toContain('Tu alimento')
    expect(html).not.toContain('Elige una categoría')
  })
})
