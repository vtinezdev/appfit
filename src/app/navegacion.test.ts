import { describe, expect, it } from 'vitest'
import { DESTINOS, destinosOcultos, EN_ARCO, seccionDe } from './navegacion'

describe('seccionDe', () => {
  it('todo destino cae en una sección de la media luna', () => {
    for (const { key } of DESTINOS) expect(EN_ARCO).toContain(seccionDe(key))
  })
  it('Amigos va con Social y Referencias con Ajustes; Progreso es una sección (B12)', () => {
    expect(seccionDe('amigos')).toBe('social')
    expect(seccionDe('referencias')).toBe('ajustes')
    expect(seccionDe('progreso')).toBe('progreso')
    expect(EN_ARCO).toContain('progreso')
    expect(seccionDe('nutricion')).toBe('nutricion')
  })
})

describe('destinosOcultos', () => {
  it('Social sin cuenta y los módulos apagados', () => {
    expect(destinosOcultos(undefined, true)).toEqual([])
    expect(destinosOcultos({}, false)).toEqual(['social'])
    expect(destinosOcultos({ modulos: { nutricion: false } }, true)).toEqual(['nutricion'])
  })
  it('Entreno se queda con el gimnasio o con las actividades', () => {
    expect(destinosOcultos({ modulos: { gym: false } }, true)).toEqual([])
    expect(destinosOcultos({ modulos: { actividades: false } }, true)).toEqual([])
    expect(destinosOcultos({ modulos: { gym: false, actividades: false } }, true)).toEqual(['gym'])
  })
  it('Progreso sale con Cumbres, Caminos, Ritmo y Vitrina ocultos', () => {
    expect(destinosOcultos({ gamificacionVisible: false }, true)).toEqual(['progreso'])
  })
})
