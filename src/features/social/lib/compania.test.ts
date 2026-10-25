import { describe, expect, it } from 'vitest'
import { animosRecibidos, candidatos, conAnimo, hayQueSubir, heAnimado, leerCompanias, plazasLibres, semanaPropia, situacion, textoSituacion, type Compania } from './compania'
import type { Persona } from './relacion'

const LUNES = '2026-10-19'
const grupo: Compania = {
  id: 'g1',
  miembros: [
    { alias: 'ana', nombre: 'Ana', yo: true, estado: 'activo', semana: { lunes: LUNES, hechas: 1, objetivo: 3 } },
    { alias: 'beto', nombre: null, yo: false, estado: 'activo', semana: { lunes: LUNES, hechas: 2, objetivo: 3 } },
  ],
  animos: [{ de: 'beto', para: 'ana', lunes: LUNES }, { de: 'beto', para: 'ana', lunes: '2026-10-12' }],
}

describe('leerCompanias', () => {
  it('lee grupos e invitaciones', () => {
    const c = leerCompanias({
      grupos: [{ id: 'g1', miembros: [{ alias: 'ana', nombre: 'Ana', yo: true, estado: 'activo', semana: { lunes: LUNES, hechas: 1, objetivo: 3 } }, { alias: 'beto', nombre: null, yo: false, estado: 'pausa', semana: { lunes: LUNES, hechas: 2, objetivo: 3 } }], animos: [{ de: 'beto', para: 'ana', lunes: LUNES }] }],
      invitaciones: [{ id: 'g2', de: 'carla', miembros: [{ alias: 'carla', nombre: null }] }],
    })
    expect(c.grupos).toHaveLength(1)
    expect(c.grupos[0].miembros[1]).toEqual({ alias: 'beto', nombre: null, yo: false, estado: 'pausa', semana: null })
    expect(c.grupos[0].animos).toEqual([{ de: 'beto', para: 'ana', lunes: LUNES }])
    expect(c.invitaciones).toEqual([{ id: 'g2', de: 'carla', miembros: [{ alias: 'carla', nombre: null }] }])
  })

  it('descarta lo mal formado sin romper el resto', () => {
    expect(leerCompanias(null)).toEqual({ grupos: [], invitaciones: [] })
    const c = leerCompanias({
      grupos: [
        { id: 'sin-mi', miembros: [{ alias: 'a', yo: false, estado: 'activo' }, { alias: 'b', yo: false, estado: 'activo' }] },
        { id: 'solo', miembros: [{ alias: 'a', yo: true, estado: 'activo' }] },
        { id: 'ok', miembros: [{ alias: 'a', yo: true, estado: 'activo', semana: { lunes: LUNES, hechas: 9, objetivo: 3 } }, { alias: 'b', yo: false, estado: 'raro' }, { alias: 'c', yo: false, estado: 'invitado' }], animos: 'x' },
      ],
      invitaciones: [{ id: 'i', miembros: [] }, { miembros: [{ alias: 'x' }] }],
    })
    expect(c.grupos.map(g => g.id)).toEqual(['ok'])
    expect(c.grupos[0].miembros.map(m => m.alias)).toEqual(['a', 'c'])
    expect(c.grupos[0].miembros[0].semana).toBeNull()
    expect(c.grupos[0].animos).toEqual([])
    expect(c.invitaciones).toEqual([])
  })
})

describe('situacion', () => {
  it('cuenta contra el plan de cada uno, sin ventaja por hacer de más', () => {
    expect(textoSituacion(situacion(grupo.miembros[1], LUNES))).toBe('2 de 3')
    expect(situacion({ estado: 'activo', semana: { lunes: LUNES, hechas: 4, objetivo: 3 } }, LUNES)).toEqual({ tipo: 'cumplida', hechas: 4, objetivo: 3 })
    expect(textoSituacion(situacion({ estado: 'activo', semana: { lunes: LUNES, hechas: 2, objetivo: 2 } }, LUNES))).toBe('Semana cumplida')
  })

  it('pausa, invitación, plan sin entrenos y semana vieja son neutros', () => {
    expect(textoSituacion(situacion({ estado: 'pausa', semana: null }, LUNES))).toBe('En pausa')
    expect(textoSituacion(situacion({ estado: 'invitado', semana: null }, LUNES))).toBe('Invitación enviada')
    expect(textoSituacion(situacion({ estado: 'activo', semana: { lunes: LUNES, hechas: 0, objetivo: 0 } }, LUNES))).toBe('Sin entrenos en su plan')
    expect(textoSituacion(situacion({ estado: 'activo', semana: { lunes: '2026-10-12', hechas: 3, objetivo: 3 } }, LUNES))).toBe('Sin datos esta semana')
    expect(textoSituacion(situacion({ estado: 'activo', semana: null }, LUNES))).toBe('Sin datos esta semana')
  })
})

describe('tu semana', () => {
  const ritmo = { actual: { lunes: LUNES, entrenos: 2, plan: { entrenos: 3 } } } as Parameters<typeof semanaPropia>[0]

  it('sale de Ritmo, acotada a la semana', () => {
    expect(semanaPropia(ritmo)).toEqual({ lunes: LUNES, hechas: 2, objetivo: 3 })
    expect(semanaPropia({ actual: { lunes: LUNES, entrenos: 9, plan: { entrenos: 9 } } } as Parameters<typeof semanaPropia>[0])).toEqual({ lunes: LUNES, hechas: 7, objetivo: 7 })
    expect(semanaPropia(null)).toBeNull()
  })

  it('se sube solo si estás activo en un grupo y ha cambiado', () => {
    const c = { grupos: [grupo], invitaciones: [] }
    expect(hayQueSubir(c, { lunes: LUNES, hechas: 1, objetivo: 3 })).toBe(false)
    expect(hayQueSubir(c, { lunes: LUNES, hechas: 2, objetivo: 3 })).toBe(true)
    expect(hayQueSubir(c, { lunes: '2026-10-26', hechas: 1, objetivo: 3 })).toBe(true)
    expect(hayQueSubir(c, null)).toBe(false)
    const enPausa = { ...grupo, miembros: grupo.miembros.map(m => m.yo ? { ...m, estado: 'pausa' as const, semana: null } : m) }
    expect(hayQueSubir({ grupos: [enPausa], invitaciones: [] }, { lunes: LUNES, hechas: 2, objetivo: 3 })).toBe(false)
    expect(hayQueSubir({ grupos: [], invitaciones: [] }, { lunes: LUNES, hechas: 2, objetivo: 3 })).toBe(false)
  })
})

describe('ánimos', () => {
  it('los de esta semana, de quien sigue en el grupo', () => {
    expect(animosRecibidos(grupo, LUNES)).toEqual(['beto'])
    expect(animosRecibidos(grupo, '2026-10-26')).toEqual([])
    const sinBeto = { ...grupo, miembros: [grupo.miembros[0], { ...grupo.miembros[1], estado: 'invitado' as const }] }
    expect(animosRecibidos(sinBeto, LUNES)).toEqual([])
  })

  it('dar y quitar en la copia local', () => {
    expect(heAnimado(grupo, 'beto', LUNES)).toBe(false)
    const dado = conAnimo(grupo, 'beto', LUNES, true)
    expect(heAnimado(dado, 'beto', LUNES)).toBe(true)
    expect(heAnimado(conAnimo(conAnimo(dado, 'beto', LUNES, true), 'beto', LUNES, false), 'beto', LUNES)).toBe(false)
    expect(conAnimo(dado, 'beto', LUNES, true).animos).toHaveLength(dado.animos.length)
  })
})

describe('invitar', () => {
  const p = (alias: string, sigo: Persona['sigo'], meSigue: Persona['meSigue']): Persona => ({ alias, nombre: null, sigo, meSigue })

  it('solo a quien os seguís mutuamente y no está dentro', () => {
    const personas = [p('beto', 'aceptado', 'aceptado'), p('carla', 'aceptado', 'aceptado'), p('dani', 'aceptado', 'no'), p('eva', 'pendiente', 'aceptado')]
    expect(candidatos(personas).map(x => x.alias)).toEqual(['beto', 'carla'])
    expect(candidatos(personas, grupo).map(x => x.alias)).toEqual(['carla'])
  })

  it('grupos de 2 o 3', () => {
    expect(plazasLibres()).toBe(2)
    expect(plazasLibres(grupo)).toBe(1)
    expect(plazasLibres({ ...grupo, miembros: [...grupo.miembros, { ...grupo.miembros[1], alias: 'carla' }] })).toBe(0)
  })
})
