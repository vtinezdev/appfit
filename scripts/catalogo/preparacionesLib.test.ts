import { describe, expect, it } from 'vitest'
import { informePreparaciones, validarPreparaciones, type Preparacion } from './preparacionesLib.ts'
import type { Receta } from './tipicosLib.ts'

const recetas = [{ id: 'tortilla' }, { id: 'lentejas' }]
const prep: Preparacion = { id: 'tortilla', raciones: 4, tiempoMin: 40, pasos: ['Pelar las patatas.', 'Cuajar la tortilla.'] }

describe('preparaciones de típicos', () => {
  it('acepta una preparación válida, con o sin notas', () => {
    expect(validarPreparaciones([prep, { ...prep, id: 'lentejas', notas: 'Mejor de un día para otro.' }], recetas)).toEqual([])
  })
  it('rechaza ids inexistentes o repetidos', () => {
    expect(validarPreparaciones([{ ...prep, id: 'pizza' }], recetas)).toEqual(['pizza: la receta no existe en recetas.json'])
    expect(validarPreparaciones([prep, prep], recetas)).toEqual(['tortilla: id repetido'])
  })
  it('rechaza raciones y tiempos fuera de rango o no enteros', () => {
    for (const raciones of [0, 51, 2.5]) expect(validarPreparaciones([{ ...prep, raciones }], recetas)).toHaveLength(1)
    for (const tiempoMin of [0, 2881, 10.5]) expect(validarPreparaciones([{ ...prep, tiempoMin }], recetas)).toHaveLength(1)
  })
  it('rechaza listas de pasos vacías o largas y pasos vacíos, con espacios o demasiado largos', () => {
    expect(validarPreparaciones([{ ...prep, pasos: [] }], recetas)).toHaveLength(1)
    expect(validarPreparaciones([{ ...prep, pasos: Array(41).fill('Paso.') }], recetas)).toHaveLength(1)
    expect(validarPreparaciones([{ ...prep, pasos: ['Uno.', ''] }], recetas)).toEqual(['tortilla: paso 2 vacío o con espacios sobrantes'])
    expect(validarPreparaciones([{ ...prep, pasos: [' Uno.'] }], recetas)).toHaveLength(1)
    expect(validarPreparaciones([{ ...prep, pasos: ['x'.repeat(1001)] }], recetas)).toHaveLength(1)
  })
  it('rechaza notas vacías o largas y campos desconocidos', () => {
    expect(validarPreparaciones([{ ...prep, notas: '' }], recetas)).toHaveLength(1)
    expect(validarPreparaciones([{ ...prep, notas: 'x'.repeat(2001) }], recetas)).toHaveLength(1)
    expect(validarPreparaciones([{ ...prep, foto: 'x.jpg' } as Preparacion], recetas)).toEqual(['tortilla: campos desconocidos: foto'])
  })
  it('el informe da valores por ración desde CIQUAL y avisa si el peso final supera la suma de ingredientes', () => {
    const receta: Receta = { id: 'tortilla', nombre: 'Tortilla, cuajada', categoria: 'Huevos', referencia: 'x', pesoFinalG: 400, ingredientes: [{ ciqual: '1', gramos: 300 }, { ciqual: '2', gramos: 50 }] }
    const ciqual: Parameters<typeof informePreparaciones>[2] = [['1', 'Huevo crudo', '', 'Huevos', 140, 12, 1, 10], ['2', 'Aceite', '', 'Aceites', 900, 0, 0, 100]]
    const md = informePreparaciones([{ ...prep, raciones: 2, notas: 'Jugosa.' }], [receta], ciqual, 'Tanda')
    expect(md).toContain('2 raciones de 200 g · 40 min · por ración: 435 kcal, P 18 g, C 1,5 g, G 40 g')
    expect(md).toContain('- 300 g · Huevo crudo')
    expect(md).toContain('2. Cuajar la tortilla.')
    expect(md).toContain('*Notas:* Jugosa.')
    expect(md).toContain('**Revisar:** el peso final (400 g) supera la suma de ingredientes (350 g)')
  })
})
