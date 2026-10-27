import { describe, expect, it } from 'vitest'
import { GRUPOS_AJUSTES, resumenAjustes, SECCIONES_AJUSTES, type DatosResumen, type SeccionAjustes } from './seccionesAjustes'

const base: DatosResumen = {
  settings: { id: 1, objetivos: { kcal: 2400, prot: 150, carb: 280, grasa: 70 } },
  objetivos: { kcal: 2400, prot: 150, carb: 280, grasa: 70 },
  tema: 'system',
  fondo: 'curvas',
  entrenosPlan: 3,
}

describe('índice de Ajustes', () => {
  it('cada sección sale una vez en el índice, salvo Borrar, que va aparte', () => {
    const enGrupos = GRUPOS_AJUSTES.flatMap(g => g.secciones)
    expect(new Set(enGrupos).size).toBe(enGrupos.length)
    const todas = Object.keys(SECCIONES_AJUSTES) as SeccionAjustes[]
    expect(todas.filter(s => !enGrupos.includes(s))).toEqual(['borrar'])
  })

  it('resume el valor actual con cifras formateadas', () => {
    expect(resumenAjustes('objetivos', base)).toBe('2.400 kcal · 150 g de proteína')
    expect(resumenAjustes('apariencia', base)).toBe('Sistema · Fondo curvas')
    expect(resumenAjustes('entreno', base)).toBe('Con sonido · Pregunta el RIR')
    expect(resumenAjustes('gamificacion', base)).toBe('Con nutrición · 3 entrenos por semana')
    expect(resumenAjustes('copias', base)).toBe('Aún sin copia exportada')
  })

  it('refleja los valores no por defecto', () => {
    const d: DatosResumen = {
      ...base, entrenosPlan: 1,
      settings: { ...base.settings, sonidoDescanso: false, rirAlCompletar: false, gamificacionConNutricion: false },
    }
    expect(resumenAjustes('entreno', d)).toBe('Sin sonido · Sin preguntar el RIR')
    expect(resumenAjustes('gamificacion', d)).toBe('Solo entreno · 1 entreno por semana')
    expect(resumenAjustes('gamificacion', { ...d, settings: { ...d.settings, gamificacionVisible: false } })).toBe('Ocultos')
  })
})
