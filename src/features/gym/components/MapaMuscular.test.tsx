import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { ZONAS_MUSCULARES } from '../lib/musculos'
import { ZONAS_FRONTALES, ZONAS_TRASERAS } from './mapaMuscularGeometria'
import MapaMuscular from './MapaMuscular'

describe('mapa corporal como representación de datos', () => {
  it('frontal/trasera cubren todas las zonas identificables sin usar categorías genéricas', () => {
    expect(new Set([...Object.keys(ZONAS_FRONTALES), ...Object.keys(ZONAS_TRASERAS)])).toEqual(new Set(ZONAS_MUSCULARES))
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
