import { describe, expect, it } from 'vitest'
import { preparacionAlimento } from './preparacionAlimento'
describe('preparación explícita del alimento', () => {
  it('distingue crudo y cocinado solo si el nombre lo dice', () => {
    for (const nombre of ['Arroz crudo', 'Pasta sin cocer', 'Pollo crudo, sin piel']) expect(preparacionAlimento(nombre)).toBe('En crudo')
    for (const nombre of ['Arroz blanco cocido', 'Patatas al horno', 'Pollo a la plancha']) expect(preparacionAlimento(nombre)).toBe('Ya cocinado')
    expect(preparacionAlimento('Arroz blanco cocido al vapor, crudo')).toBe('Preparación por comprobar')
    for (const nombre of ['Arroz', 'Frutos secos', 'Yogur natural']) expect(preparacionAlimento(nombre)).toBeNull()
  })
})
