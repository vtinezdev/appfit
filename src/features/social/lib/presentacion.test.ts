import { describe, expect, it } from 'vitest'
import { ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import type { Comentario } from './feed'
import { agruparPorPeriodo, etiquetaPublicacion, hilosComentarios, panelEjercicio, sugerenciaCompartir, textoMasTrabajado } from './presentacion'
import { resumenActividad, resumenTexto, type MapaCompartido, type ResumenEntreno, type ResumenLogro } from './publicacion'

const entreno: ResumenEntreno = { v: 1, tipo: 'entreno', titulo: 'Pierna', series: 12, ejercicios: [], records: [], ligas: [], logros: [] }
const logro: ResumenLogro = { v: 1, tipo: 'logro', titulo: 'Entrenos', logroId: 'entrenos', grupo: 'entreno', nivel: 2, descripcion: '50 entrenos' }
const mapa = (niveles: Partial<MapaCompartido>): MapaCompartido => ({ ...Object.fromEntries(ZONAS_MUSCULARES.map(z => [z, 0])), ...niveles }) as MapaCompartido

describe('etiquetaPublicacion', () => {
  const fecha = new Date(2026, 9, 18, 18, 40).getTime()
  it('nombra el tipo y la actividad', () => {
    expect(etiquetaPublicacion(entreno, fecha, new Date(2026, 9, 18, 19).toISOString())).toBe('Entreno')
    expect(etiquetaPublicacion(resumenActividad({ tipo: 'correr', titulo: 'Rodaje', duracionSeg: 1800, distanciaM: 5000 }), fecha)).toBe('Correr')
    expect(etiquetaPublicacion(logro, fecha)).toBe('Logro')
    expect(etiquetaPublicacion(resumenTexto('Hola')!, fecha)).toBeNull()
  })
  it('dice el día de la sesión si se publicó otro día', () => {
    expect(etiquetaPublicacion(entreno, fecha, new Date(2026, 9, 20, 9).toISOString())).toMatch(/^Entreno del domingo/)
  })
})

describe('textoMasTrabajado', () => {
  it('las zonas del nivel más alto, dos como mucho, en el orden del mapa', () => {
    expect(textoMasTrabajado(mapa({ cuadriceps: 5, gluteos: 5, isquiotibiales: 5, gemelos: 2 }))).toBe('Cuádriceps e isquiotibiales')
    expect(textoMasTrabajado(mapa({ gluteos: 5, cuadriceps: 5 }))).toBe('Cuádriceps y glúteos')
    expect(textoMasTrabajado(mapa({ pecho: 3, triceps: 4 }))).toBe('Tríceps')
  })
  it('sin mapa o sin trabajo, nada', () => {
    expect(textoMasTrabajado(undefined)).toBeNull()
    expect(textoMasTrabajado(mapa({}))).toBeNull()
  })
})

describe('agruparPorPeriodo', () => {
  // Domingo 18 de octubre de 2026; la semana empieza el lunes 12.
  const ahora = new Date(2026, 9, 18, 12).getTime()
  it('hoy, esta semana (desde el lunes) y antes, sin grupos vacíos ni reordenar', () => {
    const items = [new Date(2026, 9, 18, 9), new Date(2026, 9, 12, 0, 5), new Date(2026, 9, 11, 23, 50), new Date(2026, 9, 18, 7)].map((d, i) => ({ i, creado: d.getTime() }))
    expect(agruparPorPeriodo(items, ahora).map(g => [g.periodo, g.items.map(x => x.i)])).toEqual([['Hoy', [0, 3]], ['Esta semana', [1]], ['Antes', [2]]])
    expect(agruparPorPeriodo([], ahora)).toEqual([])
  })
  it('un domingo, la semana sigue empezando el lunes anterior', () => {
    const domingo = new Date(2026, 9, 25, 20).getTime()
    expect(agruparPorPeriodo([{ creado: new Date(2026, 9, 19, 8).getTime() }], domingo)[0].periodo).toBe('Esta semana')
  })
})

describe('hilosComentarios', () => {
  const c = (id: string, respuestaA?: string): Comentario => ({ id, alias: id, nombre: null, texto: id, creado: 0, mio: false, puedoBorrar: false, ...(respuestaA ? { respuestaA, respuestaAlias: respuestaA } : {}) })
  it('agrupa cada respuesta bajo su comentario, en orden', () => {
    const hilos = hilosComentarios([c('a'), c('b'), c('r1', 'a'), c('r2', 'b'), c('r3', 'a')])
    expect(hilos.map(h => [h.raiz.id, h.respuestas.map(r => r.id), h.suelta])).toEqual([['a', ['r1', 'r3'], false], ['b', ['r2'], false]])
  })
  it('una respuesta sin su original cargado queda suelta en su sitio', () => {
    expect(hilosComentarios([c('r0', 'viejo'), c('a')]).map(h => [h.raiz.id, h.suelta])).toEqual([['r0', true], ['a', false]])
  })
})

describe('sugerenciaCompartir', () => {
  const ahora = Date.UTC(2026, 9, 18, 12)
  const hora = 3_600_000
  it('lo más reciente sin publicar', () => {
    expect(sugerenciaCompartir({ inicio: ahora - 2 * hora }, { inicio: ahora - 5 * hora }, ahora)).toBe('entreno')
    expect(sugerenciaCompartir({ inicio: ahora - 9 * hora }, { inicio: ahora - 5 * hora }, ahora)).toBe('actividad')
    expect(sugerenciaCompartir(undefined, { inicio: ahora - hora }, ahora)).toBe('actividad')
  })
  it('si lo último ya está publicado, no se sugiere lo anterior', () => {
    expect(sugerenciaCompartir({ inicio: ahora - hora, publicacion: 'p' }, { inicio: ahora - 5 * hora }, ahora)).toBeNull()
  })
  it('nada con más de una semana o sin registros', () => {
    expect(sugerenciaCompartir({ inicio: ahora - 8 * 24 * hora }, undefined, ahora)).toBeNull()
    expect(sugerenciaCompartir(undefined, undefined, ahora)).toBeNull()
  })
})

describe('panelEjercicio', () => {
  const record = { ejercicio: 'Press banca', texto: '100 kg', tipo: 'peso' as const, modo: 'externa' as const, valor: 100, anterior: 95 }
  it('la liga, las series y el récord en la suya', () => {
    const r: ResumenEntreno = { ...entreno, ejercicios: ['Press banca', 'Remo'], records: [record],
      detalles: [{ liga: 'Plata', cambio: 'Sube a Plata', series: ['95 kg × 5', '100 kg × 5'], records: [{ serie: 1, mejora: '+5 kg' }] }, {}] }
    expect(panelEjercicio(r, 0)).toEqual({ liga: 'Plata', cambio: 'Sube a Plata', series: [{ texto: '95 kg × 5', mejora: null }, { texto: '100 kg × 5', mejora: '+5 kg' }], mejoras: [] })
    expect(panelEjercicio(r, 1)).toBeNull()
  })
  it('publicaciones antiguas: la liga de su línea de texto y las subidas aparte', () => {
    const r: ResumenEntreno = { ...entreno, ejercicios: ['Press banca', 'Remo'], records: [record], ligas: [{ ejercicio: 'Remo', texto: 'Llega a Élite: ciclo completado' }] }
    expect(panelEjercicio(r, 0)).toEqual({ liga: null, cambio: null, series: [], mejoras: [{ mejora: '+5 kg' }] })
    expect(panelEjercicio(r, 1)).toMatchObject({ liga: 'Élite', cambio: 'Llega a Élite: ciclo completado' })
  })
})
