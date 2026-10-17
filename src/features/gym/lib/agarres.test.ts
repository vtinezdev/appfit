import { describe, expect, it } from 'vitest'
import type { Exercise } from '../../../shared/db/types'
import { admiteElegirAgarre, cambiarAgarre, claveAgarre, perfilAgarre, validarAgarreEjercicio } from './agarres'
const ejercicio = (slug: string): Exercise => ({ id: 1, nombre: 'Ejercicio', nombreNorm: 'ejercicio', grupo: 'General', catalogId: `appfit:${slug}` })

describe('perfiles editoriales de agarre', () => {
  it('dominadas ofrece orientaciones y anchuras; una variante neutra conserva su orientación', () => {
    expect(perfilAgarre(ejercicio('dominadas'))).toMatchObject({ orientacion: ['prono', 'supino', 'neutro'], anchura: ['estrecho', 'medio', 'ancho'], accesorio: [] })
    expect(perfilAgarre(ejercicio('dominadas-neutras')).orientacion).toEqual(['neutro'])
    expect(cambiarAgarre(ejercicio('dominadas-neutras'), undefined, 'anchura', 'ancho')).toEqual({ orientacion: 'neutro', anchura: 'ancho' })
    expect(() => validarAgarreEjercicio(ejercicio('dominadas-neutras'), { orientacion: 'supino' })).toThrow('compatible')
  })
  it('barras rectas no ofrecen neutro y el mixto solo se ofrece en los pesos muertos correspondientes', () => {
    expect(perfilAgarre(ejercicio('remo-barra')).orientacion).not.toContain('neutro')
    expect(perfilAgarre(ejercicio('peso-muerto')).orientacion).toContain('mixto')
    expect(() => validarAgarreEjercicio(ejercicio('press-banca'), { orientacion: 'mixto' })).toThrow('compatible')
    expect(perfilAgarre(ejercicio('curl-inverso')).orientacion).toEqual(['prono'])
  })
  it('el accesorio restringe combinaciones y cambiarlo retira selecciones incompatibles', () => {
    const e = ejercicio('jalon-pecho')
    const anterior = { orientacion: 'prono' as const, anchura: 'ancho' as const, accesorio: 'barra' as const }
    const cuerda = cambiarAgarre(e, anterior, 'accesorio', 'cuerda')
    expect(cuerda).toEqual({ accesorio: 'cuerda', orientacion: 'neutro' })
    expect(perfilAgarre(e, cuerda).anchura).toEqual([])
    expect(() => validarAgarreEjercicio(e, { ...anterior, accesorio: 'cuerda' })).toThrow('compatible')
    expect(cambiarAgarre(e, cuerda, 'accesorio', 'barra-v')).toEqual({ accesorio: 'barra-v', orientacion: 'neutro', anchura: 'estrecho' })
    expect(cambiarAgarre(e, cuerda, 'accesorio', 'barra')).toEqual({ accesorio: 'barra' })
    expect(anterior).toEqual({ orientacion: 'prono', anchura: 'ancho', accesorio: 'barra' })
  })
  it('los ejercicios sin variantes relevantes se añaden directamente', () => {
    for (const slug of ['sentadilla', 'pilates-hundred', 'gemelos-maquina', 'curl-martillo']) expect(admiteElegirAgarre(ejercicio(slug))).toBe(false)
    for (const slug of ['press-banca', 'dominadas', 'jalon-pecho', 'remo-anillas']) expect(admiteElegirAgarre(ejercicio(slug))).toBe(true)
    expect(() => validarAgarreEjercicio(ejercicio('sentadilla'), { orientacion: 'prono' })).toThrow('compatible')
  })
  it('leer una variante antigua incompatible no la reescribe ni la convierte automáticamente', () => {
    const anterior = Object.freeze({ orientacion: 'supino' as const })
    perfilAgarre(ejercicio('jalon-neutro'), anterior)
    expect(anterior).toEqual({ orientacion: 'supino' })
    expect(claveAgarre({ anchura: 'ancho', orientacion: 'prono' })).toBe(claveAgarre({ orientacion: 'prono', anchura: 'ancho' }))
    expect(claveAgarre(undefined)).toBe(claveAgarre(null))
  })
})
