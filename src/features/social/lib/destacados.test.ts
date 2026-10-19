import { describe, expect, it } from 'vitest'
import type { Logro } from '../../vitrina/lib/logros'
import { alternarDestacado, logrosElegibles, logrosNoElegibles, MAX_DESTACADOS } from './destacados'
import type { Resumen } from './publicacion'

const logro = (id: string) => ({ id, resumen: { v: 1, tipo: 'logro', titulo: `Logro ${id}`, logroId: 'entrenos', grupo: 'entreno', nivel: null, descripcion: '' } as Resumen })
const texto = (id: string) => ({ id, resumen: { v: 1, tipo: 'texto', titulo: 'Hola' } as unknown as Resumen })

describe('logros destacados del perfil deportivo', () => {
  it('elegibles: destacados, avatar y logros publicados, sin repetir ni publicaciones de otro tipo', () => {
    const a = logro('a'), b = logro('b'), c = logro('c')
    const elegibles = logrosElegibles({ destacados: [a], avatarId: 'b', avatar: b.resumen }, [texto('t'), c, a, b])
    expect(elegibles.map(p => p.id)).toEqual(['a', 'b', 'c'])
    expect(logrosElegibles({ destacados: [], avatarId: null, avatar: null }, [texto('t')])).toEqual([])
  })

  it('alternar marca y desmarca, y no pasa de tres', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(logro)
    let sel = alternarDestacado([], a)
    expect(sel.map(p => p.id)).toEqual(['a'])
    sel = alternarDestacado(alternarDestacado(sel, b), c)
    expect(sel).toHaveLength(MAX_DESTACADOS)
    expect(alternarDestacado(sel, d)).toBe(sel)
    expect(alternarDestacado(sel, b).map(p => p.id)).toEqual(['a', 'c'])
  })

  it('no elegibles: conseguidos sin publicar y sin conseguir; lo publicado (de cualquier nivel) no se repite', () => {
    const local = (id: string, hecho: boolean): Logro => ({ id, nombre: id, grupo: 'entreno', descripcion: '', niveles: [hecho ? { fecha: '2026-10-01' } : null] } as unknown as Logro)
    const entrenos = local('entrenos', true), series = local('series', true), toneladas = local('toneladas', false)
    const publicado = { ...logro('p'), resumen: { ...logro('p').resumen, logroId: 'entrenos', nivel: 1 } as Resumen }
    expect(logrosNoElegibles([entrenos, series, toneladas], [publicado, texto('t')])).toEqual({ sinCompartir: [series], sinConseguir: [toneladas] })
    expect(logrosNoElegibles([], [])).toEqual({ sinCompartir: [], sinConseguir: [] })
  })
})
