import { it, expect } from 'vitest'
/**
 * Publicaciones de otras personas llegan del servidor con cualquier forma (alguien puede llamar a `publicar` a mano).
 * Miles de resúmenes válidos con un campo cambiado por un valor hostil: leerlos nunca lanza, lo que se acepta tiene
 * cifras finitas y presentarlo tampoco lanza. Semilla fija: siempre las mismas pruebas.
 */
import { leerResumen, resumenEntreno, resumenTexto, conNota } from './publicacion'
import { etiquetaPublicacion, textoMasTrabajado, panelEjercicio } from './presentacion'
import { leerPublicacion, leerComentario, leerAvisos, leerAvatares, leerPaginaComentarios, leerUltimosComentarios } from './feed'

const HOSTILES: unknown[] = [null, undefined, 0, -1, 1e308, -1e308, 1.5, NaN, '', ' ', 'x'.repeat(5000), '__proto__', [], [null], [[]], {}, { __proto__: { x: 1 } }, true, false, '2026-13-45', 'constructor', 'toString', Infinity]
let semilla = 7
const azar = (n: number) => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla % n }
function mutar(x: unknown, prof = 0): unknown {
  if (azar(4) === 0 || prof > 4) return HOSTILES[azar(HOSTILES.length)]
  if (Array.isArray(x)) return x.map(e => (azar(3) === 0 ? mutar(e, prof + 1) : e))
  if (x && typeof x === 'object') {
    const o: Record<string, unknown> = { ...(x as Record<string, unknown>) }
    for (const k of Object.keys(o)) if (azar(3) === 0) o[k] = mutar(o[k], prof + 1)
    if (azar(5) === 0) o[['__proto__', 'constructor', 'extra', 'v', 'tipo'][azar(5)]] = HOSTILES[azar(HOSTILES.length)]
    return o
  }
  return x
}
const base = [
  resumenEntreno({ titulo: 'Torso', inicio: 0, fin: 3600_000, series: 5, volumenKg: 100, ejercicios: ['Press banca', 'Remo'], catalogIds: ['appfit:press-banca', null],
    records: [{ ejercicio: 'Press banca', texto: '100 kg × 5', tipo: 'peso', modo: 'externa', valor: 100, anterior: 95 }], detalles: [{ liga: 'Bronce', series: ['100 kg × 5'], records: [{ serie: 0, mejora: '+5 kg' }] }, {}],
    logros: ['Constancia II'], insignias: [{ id: 'cinco-mas-altos', grupo: 'constancia', nivel: 2 }] } as never),
  { v: 1, tipo: 'actividad', actividad: 'correr', titulo: 'Rodaje', duracionSeg: 1800, distanciaM: 5000, desnivelM: 30 },
  { v: 1, tipo: 'rutina', titulo: 'Full body', ejercicios: [{ nombre: 'Sentadilla', catalogId: null, series: 3, repsMin: 8, repsMax: 12, descansoSeg: 90 }] },
  resumenTexto('Hola'),
  { v: 1, tipo: 'semana', titulo: 'x', lunes: '2026-11-02', estado: 'semana', dias: [true, false, false, true, false, false, false], entrenos: 2, objetivo: 3, hilo: 4 },
  { v: 1, tipo: 'logro', titulo: 'Cinco', logroId: 'cinco-mas-altos', grupo: 'constancia', nivel: 2, descripcion: 'd' },
].map(r => conNota(r as never, 'nota'))

it('un resumen o una fila hostiles nunca rompen la lectura ni la presentación', () => {
  let validos = 0
  for (const b of base) expect(leerResumen(b), JSON.stringify(b).slice(0, 80)).not.toBeNull()
  for (let i = 0; i < 40000; i++) {
    const b = base[i % base.length]
    // Un solo cambio en un punto al azar del árbol.
    const m = structuredClone(b) as unknown as Record<string, unknown>
    let nodo: Record<string, unknown> | unknown[] = m
    for (let p = 0; p < 4; p++) {
      const claves = Object.keys(nodo)
      if (!claves.length) break
      const k = claves[azar(claves.length)]
      const hijo = (nodo as Record<string, unknown>)[k]
      if (hijo && typeof hijo === 'object' && azar(2) === 0) { nodo = hijo as Record<string, unknown>; continue }
      ;(nodo as Record<string, unknown>)[k] = azar(3) === 0 ? mutar(hijo, 3) : HOSTILES[azar(HOSTILES.length)]
      break
    }
    let r
    try { r = leerResumen(m) } catch (e) { throw new Error(`leerResumen lanza con ${JSON.stringify(m).slice(0, 300)}: ${e}`) }
    if (!r) continue
    validos++
    try {
      etiquetaPublicacion(r, Date.now(), new Date().toISOString())
      if (r.tipo === 'entreno') { textoMasTrabajado(r.mapa); for (let k = 0; k < r.ejercicios.length + 1; k++) panelEjercicio(r, k) }
      JSON.stringify(r)
      for (const v of Object.values(r)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    } catch (e) { throw new Error(`presentación lanza con ${JSON.stringify(m).slice(0, 300)}: ${e}`) }
    const fila = mutar({ id: 'a', alias: 'ana', nombre: 'Ana', fecha: new Date().toISOString(), creada: new Date().toISOString(), resumen: m, reacciones: 1, comentarios: 2, reaccione: false, mia: false })
    for (const f of [leerPublicacion, leerComentario, leerAvisos, leerAvatares, leerPaginaComentarios, leerUltimosComentarios] as ((x: unknown) => unknown)[]) {
      for (const entrada of [fila, mutar(fila), [fila], { items: [fila], total: 1, lista: [fila] }]) {
        try { f(entrada) } catch (e) { if (e instanceof TypeError || e instanceof RangeError) throw new Error(`${f.name} lanza ${e} con ${JSON.stringify(entrada).slice(0, 300)}`) }
      }
    }
  }
  // Que la prueba no sea trivial: una parte de los cambios sigue siendo una publicación válida.
  expect(validos).toBeGreaterThan(500)
})
