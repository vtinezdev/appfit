import { describe, expect, it } from 'vitest'
import { DESTINOS, destinosOcultos, EN_ARCO, seccionDe } from './navegacion'

describe('seccionDe', () => {
  it('todo destino cae en una sección de la media luna', () => {
    for (const { key } of DESTINOS) expect(EN_ARCO).toContain(seccionDe(key))
  })
  it('Amigos va con Social, Referencias con Ajustes y el progreso con Inicio', () => {
    expect(seccionDe('amigos')).toBe('social')
    expect(seccionDe('referencias')).toBe('ajustes')
    for (const tab of ['cumbres', 'caminos', 'ritmo', 'vitrina'] as const) expect(seccionDe(tab)).toBe('inicio')
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
})
