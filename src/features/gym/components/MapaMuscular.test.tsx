import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { ZONAS_MUSCULARES } from '../lib/musculos'
import { CUERPOS } from './mapaMuscularGeometria'
import MapaMuscular from './MapaMuscular'

describe('mapa corporal como representación de datos', () => {
  it('frontal/trasera cubren todas las zonas identificables sin usar categorías genéricas, en hombre y en mujer', () => {
    for (const { frontal, trasera } of Object.values(CUERPOS)) {
      expect(new Set([...Object.keys(frontal.zonas), ...Object.keys(trasera.zonas)])).toEqual(new Set(ZONAS_MUSCULARES))
      for (const d of [frontal.silueta, trasera.silueta, ...Object.values(frontal.zonas), ...Object.values(trasera.zonas)]) expect(d).toMatch(/^M.*z$/)
    }
  })
  it('el muñeco cambia con la figura (hombre por defecto)', () => {
    const summary = trabajoMuscularWorkout({}, [], [])
    const hombre = renderToStaticMarkup(<MapaMuscular summary={summary} />), mujer = renderToStaticMarkup(<MapaMuscular summary={summary} figura="mujer" />)
    expect(hombre).toContain(CUERPOS.hombre.frontal.silueta)
    expect(mujer).toContain(CUERPOS.mujer.trasera.silueta)
    expect(mujer).not.toContain(CUERPOS.hombre.frontal.silueta)
  })
  it('datos de sesión cambian regiones/niveles y conservan alternativa textual', () => {
    const summary = trabajoMuscularWorkout({ muscleSnapshot: { version: 1, exercises: [{ exerciseId: 1, nombre: 'Press banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] }] } }, [{ id: 1, exerciseId: 1, workoutId: 1, reps: 8, peso: 60, orden: 0, createdAt: 1 }], [])
    const html = renderToStaticMarkup(<MapaMuscular summary={summary} />)
    expect(html).toContain('data-muscle="pecho" data-level="5"')
    expect(html).toContain('data-muscle="triceps" data-level="3"')
    expect(html).toContain('data-muscle="espalda" data-level="0"')
    expect(html).toContain('Muy alto')
    expect(html).toContain('Principal')
    expect(html).toContain('Secundario')
    expect(html.match(/aria-hidden="true" focusable="false"/g)).toHaveLength(2)
  })
  it('entrenamiento vacío muestra estado neutral y explicación', () => {
    const html = renderToStaticMarkup(<MapaMuscular summary={trabajoMuscularWorkout({}, [], [])} />)
    expect(html).toContain('No hay series con repeticiones')
    expect(html).not.toMatch(/data-muscle="[^"]+" data-level="[1-5]"/)
  })
})
