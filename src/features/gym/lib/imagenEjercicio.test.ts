import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOGO_POR_ID } from './catalogoEjercicios'
import { EJERCICIOS_CON_IMAGEN } from './ejerciciosConImagen'
import { imagenEjercicio } from './imagenEjercicio'

describe('imagenEjercicio', () => {
  it('devuelve la ruta del propio origen para un ejercicio con imagen', () => {
    expect(imagenEjercicio('appfit:press-banca')).toBe('/ejercicios/press-banca.webp')
  })
  it('devuelve null para personalizados o ids desconocidos', () => {
    expect(imagenEjercicio(undefined)).toBeNull()
    expect(imagenEjercicio(null)).toBeNull()
    expect(imagenEjercicio('ciqual:press-banca')).toBeNull()
    expect(imagenEjercicio('appfit:no-existe')).toBeNull()
  })
  it('la lista generada solo contiene ejercicios del catálogo y sus archivos existen', () => {
    for (const slug of EJERCICIOS_CON_IMAGEN) {
      expect(CATALOGO_POR_ID.has(`appfit:${slug}`), slug).toBe(true)
      expect(existsSync(`public/ejercicios/${slug}.webp`), slug).toBe(true)
    }
  })
})
