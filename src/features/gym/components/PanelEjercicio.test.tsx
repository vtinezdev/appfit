import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry } from '../../../shared/db/types'
import PanelEjercicio from './PanelEjercicio'
import { ListaRecords } from './WorkoutFinished'
import ObjetivoRutina from './ObjetivoRutina'

const noop = () => {}
const ex: Exercise = { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho' }
const s = (id: number, over: Partial<SetEntry> = {}): SetEntry => ({ id, workoutId: 1, exerciseId: 1, orden: id, reps: 8, peso: 60, createdAt: id, ...over })

describe('PanelEjercicio', () => {
  const props = { ejercicio: ex, barraKg: 20, onActualizar: noop, onBorrar: noop, onAgregar: noop }

  it('numera las efectivas y marca el calentamiento con «C»; muestra RIR y objetivo', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1, { tipo: 'calentamiento', peso: 20 }), s(2, { rir: 2 }), s(3)]}
      objetivo={{ series: 3, repsMin: 8, repsMax: 12, descansoSeg: 120 }} />)
    expect(html).toContain('aria-label="Repeticiones, calentamiento de Press banca"')
    expect(html).toContain('aria-label="Repeticiones, serie 1 de Press banca"')
    expect(html).toContain('aria-label="Repeticiones, serie 2 de Press banca"')
    expect(html).toContain('aria-label="RIR, serie 1 de Press banca"')
    expect(html).toContain('<option value="2" selected="">2</option>')
    expect(html).toContain('Objetivo: 3 × 8–12 reps')
    expect(html).toContain('120 s de descanso')
    expect(html).toContain('Opciones de serie 1 de Press banca')
  })

  it('en la sesión activa el número es un botón; en el editor no', () => {
    const activa = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} completadas={[]} onCompletar={noop} />)
    expect(activa).toContain('aria-pressed="false"')
    expect(renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} />)).not.toContain('aria-pressed')
  })

  it('los botones de mover solo aparecen con varios ejercicios y se desactivan en los extremos', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[]} mover={{ puedeSubir: false, puedeBajar: true, onSubir: noop, onBajar: noop }} />)
    expect(html).toContain('aria-label="Subir Press banca"')
    expect(html).toMatch(/aria-label="Subir Press banca"[^>]*disabled|disabled[^>]*aria-label="Subir Press banca"/)
    expect(renderToStaticMarkup(<PanelEjercicio {...props} sets={[]} />)).not.toContain('Subir')
  })

  it('la papelera identifica la sesión y se desactiva junto a las filas mientras hay una operación', () => {
    const html = renderToStaticMarkup(<PanelEjercicio {...props} sets={[s(1)]} onQuitar={noop} bloqueado />)
    expect(html).toContain('aria-label="Quitar Press banca de este entreno"')
    expect(html).toMatch(/aria-label="Quitar Press banca de este entreno"[^>]*disabled|disabled[^>]*aria-label="Quitar Press banca de este entreno"/)
    expect(html).toContain('data-exercise-id="1"')
    expect(renderToStaticMarkup(<PanelEjercicio {...props} sets={[]} />)).not.toContain('Quitar Press banca')
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
