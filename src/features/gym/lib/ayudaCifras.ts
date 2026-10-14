import type { ModoCarga } from '../../../shared/db/types'

export interface DefinicionCifra {
  nombre: string
  texto: string
}

/**
 * Qué significa cada cifra de Progreso según el tipo de carga, para la hoja de la «i». `rm` indica si este ejercicio
 * estima 1RM (carga externa sin variante unilateral, tempo ni negativas).
 */
export function ayudaCifras(modo: ModoCarga, rm: boolean): DefinicionCifra[] {
  const cambio = { nombre: 'Cambio', texto: 'Compara la primera y la última sesión.' }
  switch (modo) {
    case 'externa':
      return rm
        ? [{ nombre: '1RM estimado', texto: 'El peso que podrías levantar una vez, estimado con la fórmula de Epley.' }, { nombre: 'Volumen', texto: 'Kg externos × repeticiones.' }, cambio]
        : [{ nombre: 'Sin 1RM', texto: 'Las variantes unilaterales o con tempo se comparan por separado, sin estimar 1RM.' }, { nombre: 'Volumen', texto: 'Suma los lados registrados.' }, cambio]
    case 'lastre':
      return [{ nombre: 'Volumen', texto: 'Cuenta solo el lastre. No se estima 1RM con peso corporal.' }, cambio]
    case 'asistencia':
      return [{ nombre: 'Asistencia', texto: 'Menos asistencia significa menos ayuda. Compara también las repeticiones: no equivale a una medida exacta de carga efectiva.' }, cambio]
    default:
      return [{ nombre: 'Repeticiones', texto: 'Se comparan las repeticiones. La masa corporal no se convierte en volumen ni en 1RM.' }, cambio]
  }
}
