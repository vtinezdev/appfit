import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry } from '../../../shared/db/types'
import PanelEjercicio from './PanelEjercicio'
import { ListaRecords } from './WorkoutFinished'
import ObjetivoRutina from './ObjetivoRutina'
import { anterioresPorSerie } from '../lib/anterior'

const noop = () => {}
const ex: Exercise = { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho' }
const s = (id: number, over: Partial<SetEntry> = {}): SetEntry => ({ id, workoutId: 1, exerciseId: 1, orden: id, reps: 8, peso: 60, createdAt: id, ...over })

describe('PanelEjercicio', () => {
  const props = { ejercicio: ex, barraKg: 20, onActualizar: noop, onBorrar: noop, onAgregar: noop }

  it('numera las efectivas y marca el calentamiento con «C»; RIR en su celda y objetivo', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1, { tipo: 'calentamiento', peso: 20 }), s(2, { rir: 2 }), s(3)]}
      objetivo={{ series: 3, repsMin: 8, repsMax: 12, descansoSeg: 120 }} />)
    expect(html).toContain('aria-label="Repeticiones, calentamiento de Press banca"')
    expect(html).toContain('aria-label="Repeticiones, serie 1 de Press banca"')
    expect(html).toContain('aria-label="Repeticiones, serie 2 de Press banca"')
    expect(html).toContain('aria-label="RIR, serie 1 de Press banca: 2"')
    expect(html).toContain('aria-label="RIR, serie 2 de Press banca: sin dato"')
    expect(html).toContain('<span class="series-letter">C</span>')
    expect(html).toContain('Objetivo: 3 × 8–12 reps')
    expect(html).toContain('120 s de descanso')
    expect(html).toContain('Opciones de serie 1 de Press banca')
  })

  it('dropset y negativas se leen en el número; las bajadas son filas editables', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1, { bajadas: [{ id: 'a', reps: 5, peso: 40 }] }), s(2, { soloNegativas: true, excentricaSeg: 4 })]} />)
    expect(html).toContain('Opciones de serie 1 de Press banca (dropset)')
    expect(html).toContain('aria-label="Kg bajada 1, serie 1 de Press banca"')
    expect(html).toContain('Quitar bajada 1, serie 1 de Press banca')
    expect(html).toContain('Añadir bajada')
    expect(html).toContain('Opciones de serie 2 de Press banca (negativas)')
    expect(html).toContain('Bajada 4 s')
  })

  it('lados separados: una fila por lado con reps, kg y RIR; el lado ausente queda vacío', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1, { ejecucion: 'lados', reps: 0, peso: 0, lados: { izquierda: { reps: 10, peso: 14, rir: 2 } } })]} />)
    expect(html).toContain('aria-label="Repeticiones izquierda, serie 1 de Press banca"')
    expect(html).toContain('aria-label="RIR izquierda, serie 1 de Press banca: 2"')
    expect(html).toMatch(/aria-label="Repeticiones derecha, serie 1 de Press banca"[^>]*value=""/)
  })

  it('con acción de completar hay ✓ al final de la fila; sin ella, no', () => {
    const activa = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} completadas={[]} onCompletar={noop} />)
    expect(activa).toContain('aria-label="Completar serie 1 de Press banca"')
    expect(activa).toContain('aria-pressed="false"')
    expect(renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} />)).not.toContain('Completar serie')
  })

  it('con sesión anterior, cada fila lleva su «Anterior» (también lados y bajadas); sin ella no hay columna', () => {
    const anteriores = anterioresPorSerie([s(1), s(2), s(3, { bajadas: [{ id: 'a', reps: 5, peso: 40 }] })],
      [s(10, { workoutId: 2, peso: 62.5 }), s(11, { workoutId: 2, reps: 6 }), s(12, { workoutId: 2, bajadas: [{ id: 'b', reps: 4, peso: 30 }] })])
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1), s(2), s(3, { bajadas: [{ id: 'a', reps: 5, peso: 40 }] })]} anteriores={anteriores} />)
    expect(html).toContain('>Anterior</span>')
    expect(html).toContain('Anterior: 8 repeticiones con 62,5 kg')
    expect(html).toContain('Anterior: 6 repeticiones con 60 kg')
    expect(html).toContain('Anterior: 4 repeticiones con 30 kg')
    expect(html).toContain('con-anterior')
    const sin = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} anteriores={new Map()} />)
    expect(sin).not.toContain('Anterior')
    expect(sin).not.toContain('con-anterior')
  })

  it('cabecera con miniatura y «músculo · material»; la serie marcada se tiñe entera', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} ejercicio={{ ...ex, primaryMuscles: ['pecho'], equipment: ['barra'] }} sets={[s(1), s(2)]} completadas={[1]} onCompletar={noop} />)
    expect(html).toContain('Pecho · barra')
    expect(html).toMatch(/class="series-set[^"]*" data-done="true"/)
    expect(html).toMatch(/class="series-set[^"]*" data-done="false"/)
    expect(html).not.toContain('Última vez')
  })

  it('mover y quitar viven en el menú del ejercicio, desactivado durante una operación', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} onQuitar={noop} bloqueado mover={{ puedeSubir: false, puedeBajar: true, onSubir: noop, onBajar: noop }} />)
    expect(html).toMatch(/aria-label="Opciones de Press banca"[^>]*disabled|disabled[^>]*aria-label="Opciones de Press banca"/)
    expect(html).toContain('data-exercise-id="1"')
    expect(renderToStaticMarkup(<PanelEjercicio {...props} sets={[]} />)).not.toContain('Opciones de Press banca')
  })
})

describe('ObjetivoRutina y récords', () => {
  it('sin objetivo ofrece definirlo; con objetivo muestra el resumen', () => {
    const base = { nombre: 'Press', onChange: noop }
    expect(renderToStaticMarkup(<ObjetivoRutina {...base} />)).toContain('Sin objetivo')
    const con = renderToStaticMarkup(<ObjetivoRutina {...base} objetivo={{ series: 4, repsMin: 5, repsMax: 5 }} />)
    expect(con).toContain('Objetivo: 4 × 5 reps')
    expect(con).toContain('Quitar objetivo')
  })

  it('lista los récords con el nombre del ejercicio', () => {
    const html = renderToStaticMarkup(<ListaRecords records={[{ exerciseId: 1, tipo: 'peso', valor: 105, anterior: 100 }]} nombres={{ 1: 'Press banca' }} />)
    expect(html).toContain('Press banca')
    expect(html).toContain('Peso máximo: 105 kg')
  })
})
