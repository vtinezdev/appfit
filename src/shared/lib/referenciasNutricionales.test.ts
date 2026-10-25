import { describe, expect, it } from 'vitest'
import { referenciaNutricional, referenciasNutrientes, textoReferencia } from './referenciasNutricionales'

const objetivos = { kcal: 1800, prot: 100, carb: 200, grasa: 60 }
describe('referencias compartidas con valores reales y procedencia explícita', () => {
  it('los cuatro objetivos reflejan Ajustes, sin sustituirlos ni inventar una fuente clínica', () => {
    const antes = { ...objetivos }
    for (const id of ['kcal', 'prot', 'carb', 'grasa'] as const) {
      const r = referenciaNutricional(id, objetivos)
      expect(r.valor).toBe(objetivos[id])
      expect(r.tipo).toBe('objetivo')
      expect(r.fuente.url).toBeUndefined()
      expect(r.particularidades.join(' ')).toContain('no documenta una fuente clínica')
      expect(r.minimo).toBeUndefined()
      expect(r.maximo).toBeUndefined()
    }
    expect(objetivos).toEqual(antes)
  })
  it('el consumo y el detalle utilizan la misma referencia sin inventar rangos', () => {
    const barras = referenciasNutrientes(objetivos.kcal)
    for (const id of ['fibra', 'azucares', 'sal', 'agSat'] as const) expect(referenciaNutricional(id, objetivos).valor).toBe(barras[id].gramos)
    expect(referenciaNutricional('fibra', objetivos)).toMatchObject({ minimo: 25, comparador: '≥' })
    expect(referenciaNutricional('fibra', objetivos).maximo).toBeUndefined()
    expect(referenciaNutricional('sal', objetivos)).toMatchObject({ maximo: 5, comparador: '<' })
    expect(referenciaNutricional('sal', objetivos).minimo).toBeUndefined()
    expect(textoReferencia(referenciaNutricional('agSat', objetivos))).toBe('≤ 20 g/día')
  })
  it('azúcares totales mantiene la referencia de etiquetado y no crea un límite', () => {
    const r = referenciaNutricional('azucares', { ...objetivos, kcal: 3500 })
    expect(r.valor).toBe(90)
    expect(r.tipo).toBe('referencia')
    expect(r.maximo).toBeUndefined()
    expect(r.descripcion).toContain('No es un máximo')
    expect(r.particularidades.join(' ')).toContain('no permiten separar los azúcares libres')
  })
  it('la referencia de kcal indica su origen: Perfil o Ajustes', () => {
    expect(referenciaNutricional('kcal', objetivos).fuente.nombre).toMatch(/Ajustes/)
    const delPerfil = referenciaNutricional('kcal', objetivos, 'perfil')
    expect(delPerfil.fuente.nombre).toMatch(/Perfil/)
    expect(delPerfil.valor).toBe(1800)
    expect(delPerfil.tipo).toBe('objetivo')
  })
})
