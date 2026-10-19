import { describe, expect, it } from 'vitest'
import type { Logro } from '../../vitrina/lib/logros'
import { alternarDestacado, destacadosAlDia, leerLogrosDestacados, MAX_DESTACADOS, opcionesDestacados } from './destacados'
import type { ResumenLogro } from './publicacion'

const medalla = (logroId: string, nivel: number | null = null): ResumenLogro =>
  ({ v: 1, tipo: 'logro', titulo: `Logro ${logroId}`, logroId, grupo: 'entreno', nivel, descripcion: `Requisito ${nivel ?? ''}`.trim() }) as ResumenLogro

/** Un logro de la Vitrina con tres niveles; `alcanzados`: cuántos. */
const local = (id: string, alcanzados: number): Logro => ({
  id, nombre: `Logro ${id}`, grupo: 'entreno', descripcion: 'Siguiente', umbrales: [10, 50, 100],
  niveles: [0, 1, 2].map(i => (i < alcanzados ? { fecha: '2026-10-01' } : null)), textoNivel: (u: number) => `${u} veces`,
}) as unknown as Logro

describe('logros destacados del perfil deportivo', () => {
  it('lee las medallas de 0016 sin nota, sin repetir logro y hasta tres', () => {
    const conNota = { ...medalla('entrenos', 2), nota: 'Por fin' }
    const leidos = leerLogrosDestacados({ logros: [conNota, medalla('entrenos', 1), { v: 1, tipo: 'texto', titulo: 'x', texto: 'x' }, medalla('series'), medalla('records'), medalla('ligas')] })
    expect(leidos.map(r => r.logroId)).toEqual(['entrenos', 'series', 'records'])
    expect(leidos[0]).not.toHaveProperty('nota')
    expect(leidos[0].nivel).toBe(2)
    expect(leidos).toHaveLength(MAX_DESTACADOS)
  })

  it('sin 0016 lee el resumen de las publicaciones destacadas; sin nada, ninguno', () => {
    expect(leerLogrosDestacados({ destacados: [{ id: 'p', resumen: medalla('entrenos', 1) }, null] }).map(r => r.logroId)).toEqual(['entrenos'])
    expect(leerLogrosDestacados({ logros: [], destacados: [{ id: 'p', resumen: medalla('entrenos', 1) }] })).toEqual([])
    expect(leerLogrosDestacados({})).toEqual([])
  })

  it('alternar marca y desmarca por logro, y no pasa de tres', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => medalla(id))
    let sel = alternarDestacado([], a)
    expect(sel.map(r => r.logroId)).toEqual(['a'])
    sel = alternarDestacado(alternarDestacado(sel, b), c)
    expect(sel).toHaveLength(MAX_DESTACADOS)
    expect(alternarDestacado(sel, d)).toBe(sel)
    expect(alternarDestacado(sel, medalla('b', 3)).map(r => r.logroId)).toEqual(['a', 'c'])
  })

  it('los elegidos se ponen al día con el nivel de la Vitrina; lo que no está en ella se queda como estaba', () => {
    const guardados = [medalla('entrenos', 1), medalla('compostela')]
    const [entrenos, compostela] = destacadosAlDia(guardados, [local('entrenos', 3)])
    expect(entrenos).toMatchObject({ logroId: 'entrenos', nivel: 3, descripcion: '100 veces' })
    expect(compostela).toBe(guardados[1])
    // Un logro que ya no se tiene (datos borrados) conserva la medalla guardada.
    expect(destacadosAlDia(guardados, [local('entrenos', 0)])[0]).toBe(guardados[0])
  })

  it('opciones: desbloqueados con su nivel más alto (y los elegidos que la Vitrina no tenga) y por desbloquear', () => {
    const vitrina = [local('entrenos', 2), local('series', 0), local('records', 1)]
    const { desbloqueados, bloqueados } = opcionesDestacados(vitrina, [medalla('records', 1), medalla('compostela')])
    expect(desbloqueados.map(r => [r.logroId, r.nivel])).toEqual([['compostela', null], ['entrenos', 2], ['records', 1]])
    expect(bloqueados.map(l => l.id)).toEqual(['series'])
    expect(opcionesDestacados([], [])).toEqual({ desbloqueados: [], bloqueados: [] })
  })
})
