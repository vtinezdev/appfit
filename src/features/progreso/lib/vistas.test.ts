import { describe, expect, it } from 'vitest'
import { teselaDeVista, vistaDeTesela, vistasProgreso } from './vistas'

describe('vistas de Progreso', () => {
  it('Semana, Cumbres, Caminos y Vitrina; sin Actividades, sin Caminos', () => {
    expect(vistasProgreso({ actividades: true })).toEqual(['semana', 'cumbres', 'caminos', 'vitrina'])
    expect(vistasProgreso({ actividades: false })).toEqual(['semana', 'cumbres', 'vitrina'])
  })
  it('Ritmo abre Semana y Semana vuelve a la tesela de Ritmo', () => {
    expect(vistaDeTesela('ritmo')).toBe('semana')
    expect(vistaDeTesela('caminos')).toBe('caminos')
    expect(teselaDeVista('semana')).toBe('ritmo')
    expect(teselaDeVista('vitrina')).toBe('vitrina')
  })
})
