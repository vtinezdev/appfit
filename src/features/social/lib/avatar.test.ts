import { describe, expect, it } from 'vitest'
import type { Logro } from '../../vitrina/lib/logros'
import { avatarDeResumen, avatarDisponible, DISCIPLINAS_AVATAR, estadoPaisajes, idAvatar, leerAvatar, logrosPorGrupo, mismoAvatar, nombreAvatar, PAISAJES_AVATAR, TONOS_AVATAR, type Avatar } from './avatar'

const logro = (id: Logro['id'], grupo: Logro['grupo'], hecho: boolean, extra: Partial<Logro> = {}): Logro => ({
  id, grupo, nombre: id, descripcion: `Descripción de ${id}`, niveles: [hecho ? { fecha: '2026-10-01' } : null], ...extra,
})

describe('identificador del avatar', () => {
  it('ida y vuelta de cada tipo', () => {
    const avatares: Avatar[] = [
      { tipo: 'disciplina', disciplina: 'padel', tono: 'magenta' },
      { tipo: 'paisaje', paisaje: 'cumbre' },
      { tipo: 'logro', logro: 'records-batidos', grupo: 'entreno' },
    ]
    for (const a of avatares) expect(leerAvatar(idAvatar(a))).toEqual(a)
    expect(idAvatar(avatares[0])).toBe('disciplina.padel.magenta')
    expect(idAvatar(avatares[2])).toBe('logro.entreno.records-batidos')
  })

  it('todo el catálogo cabe en el formato que admite el servidor', () => {
    const formato = /^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+)$/
    const catalogo: Avatar[] = [
      ...DISCIPLINAS_AVATAR.flatMap(d => TONOS_AVATAR.map(t => ({ tipo: 'disciplina' as const, disciplina: d.id, tono: t.id }))),
      ...PAISAJES_AVATAR.map(p => ({ tipo: 'paisaje' as const, paisaje: p.id })),
    ]
    expect(new Set(catalogo.map(idAvatar)).size).toBe(catalogo.length)
    for (const a of catalogo) {
      expect(idAvatar(a)).toMatch(formato)
      expect(idAvatar(a).length).toBeLessThanOrEqual(64)
      expect(leerAvatar(idAvatar(a))).toEqual(a)
    }
  })

  it.each([
    null, 42, '', 'paisaje', 'paisaje.atlantida', 'paisaje.cumbre.oro', 'disciplina.pesas', 'disciplina.pesas.rosa',
    'disciplina.inventada.bosque', 'logro.entreno', 'logro.entreno.inventado', 'logro.constructor.entrenos', 'logro.toString.entrenos',
    'foto.https://ejemplo.com/cara.png', `paisaje.${'x'.repeat(80)}`,
  ])('lo desconocido es monograma: %s', x => expect(leerAvatar(x)).toBeNull())

  it('el logro publicado de antes se pinta como un logro de catálogo', () => {
    expect(avatarDeResumen({ v: 1, tipo: 'logro', titulo: 'Entrenos', logroId: 'entrenos', grupo: 'entreno', nivel: 1, descripcion: '10 entrenos' }))
      .toEqual({ tipo: 'logro', logro: 'entrenos', grupo: 'entreno' })
  })

  it('compara por identificador', () => {
    expect(mismoAvatar(null, null)).toBe(true)
    expect(mismoAvatar({ tipo: 'paisaje', paisaje: 'mar' }, { tipo: 'paisaje', paisaje: 'mar' })).toBe(true)
    expect(mismoAvatar({ tipo: 'disciplina', disciplina: 'bici', tono: 'oro' }, { tipo: 'disciplina', disciplina: 'bici', tono: 'salvia' })).toBe(false)
    expect(mismoAvatar(null, { tipo: 'paisaje', paisaje: 'mar' })).toBe(false)
  })

  it('nombre legible', () => {
    expect(nombreAvatar(null)).toBe('Tus iniciales')
    expect(nombreAvatar({ tipo: 'disciplina', disciplina: 'natacion', tono: 'cobalto' })).toBe('Natación · Cobalto')
    expect(nombreAvatar({ tipo: 'paisaje', paisaje: 'volcan' })).toBe('Paisaje · Volcán')
    expect(nombreAvatar({ tipo: 'logro', logro: 'cumbres', grupo: 'cumbres' }, [{ id: 'cumbres', nombre: 'Cumbres' }])).toBe('Logro · Cumbres')
    expect(nombreAvatar({ tipo: 'logro', logro: 'cumbres', grupo: 'cumbres' })).toBe('Logro · Cumbres')
  })
})

describe('desbloqueos', () => {
  const vitrina = [
    logro('cumbres', 'cumbres', true, { umbrales: [1, 3], niveles: [{ fecha: '2026-10-01' }, null], textoNivel: n => `Corona ${n} cumbre` }),
    logro('salidas', 'caminos', false, { umbrales: [10, 50], niveles: [null, null], textoNivel: n => `${n} salidas` }),
    logro('noctambulo', 'oculto', true, { oculto: true }),
    logro('atlas', 'entreno', false, { veces: [] }),
  ]

  it('cada paisaje depende del primer nivel de su logro y explica qué pide', () => {
    const estado = estadoPaisajes(vitrina)
    expect(estado.map(p => p.id)).toEqual(PAISAJES_AVATAR.map(p => p.id))
    expect(estado.find(p => p.id === 'cumbre')).toMatchObject({ desbloqueado: true, requisito: 'Corona 1 cumbre' })
    expect(estado.find(p => p.id === 'bosque')).toMatchObject({ desbloqueado: false, requisito: '10 salidas' })
    // Sin ese logro en la Vitrina (desactivada, por ejemplo): bloqueado con un texto genérico.
    expect(estado.find(p => p.id === 'mar')).toMatchObject({ desbloqueado: false, requisito: 'Se desbloquea con un logro de la Vitrina' })
  })

  it('qué se puede elegir', () => {
    expect(avatarDisponible({ tipo: 'disciplina', disciplina: 'pesas', tono: 'oro' }, [])).toBe(true)
    expect(avatarDisponible({ tipo: 'paisaje', paisaje: 'cumbre' }, vitrina)).toBe(true)
    expect(avatarDisponible({ tipo: 'paisaje', paisaje: 'bosque' }, vitrina)).toBe(false)
    expect(avatarDisponible({ tipo: 'logro', logro: 'noctambulo', grupo: 'oculto' }, vitrina)).toBe(true)
    expect(avatarDisponible({ tipo: 'logro', logro: 'atlas', grupo: 'entreno' }, vitrina)).toBe(false)
    expect(avatarDisponible({ tipo: 'logro', logro: 'maraton', grupo: 'oculto' }, vitrina)).toBe(false)
  })

  it('las disciplinas no requieren Vitrina y cada paisaje se gana con su logro', () => {
    for (const d of DISCIPLINAS_AVATAR) for (const t of TONOS_AVATAR) {
      expect(avatarDisponible({ tipo: 'disciplina', disciplina: d.id, tono: t.id }, [])).toBe(true)
    }
    for (const p of PAISAJES_AVATAR) {
      const a: Avatar = { tipo: 'paisaje', paisaje: p.id }
      expect(avatarDisponible(a, [])).toBe(false)
      expect(avatarDisponible(a, [logro(p.logro, 'caminos', false)])).toBe(false)
      expect(avatarDisponible(a, [logro(p.logro, 'caminos', true)])).toBe(true)
    }
  })

  it('agrupa los logros por sección en el orden de la Vitrina', () => {
    expect(logrosPorGrupo(vitrina).map(g => [g.grupo, g.logros.map(l => l.id)])).toEqual([
      ['entreno', ['atlas']], ['cumbres', ['cumbres']], ['caminos', ['salidas']], ['oculto', ['noctambulo']],
    ])
  })
})
