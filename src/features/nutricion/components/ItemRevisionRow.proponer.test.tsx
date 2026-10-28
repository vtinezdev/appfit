import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { itemDesdeElegible, itemSinCoincidencia } from '../lib/alimentos'
import ItemRevisionRow from './ItemRevisionRow'

// Con el envío al creador disponible (cuenta configurada), como en producción.
vi.mock('../../cuenta/mensajes', () => ({ envioDisponible: true, enviarAlCreador: vi.fn() }))

const noop = () => {}

describe('ItemRevisionRow: proponer un alimento que no está', () => {
  it('sin encontrar, ofrece «Propónselo a AppFit» junto a buscar otro y escribir sus valores', () => {
    const html = renderToStaticMarkup(<ItemRevisionRow item={itemSinCoincidencia('tarta de queso de la abuela', 100)} onChange={noop} onCambiar={noop} />)
    expect(html).toContain('Escribir sus valores')
    expect(html).toContain('Propónselo a AppFit')
  })
  it('un alimento encontrado no lo ofrece', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'user', id: 1 }, nombre: 'Manzana', categoria: 'Frutas', kcal100: 52, prot100: 0.3, carb100: 14, grasa100: 0.2 }, 150)
    expect(renderToStaticMarkup(<ItemRevisionRow item={item} onChange={noop} />)).not.toContain('Propónselo a AppFit')
  })
})
