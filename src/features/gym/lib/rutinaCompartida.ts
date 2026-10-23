// Rutinas compartidas en Social (ADR 055): de una rutina propia al resumen que se publica (solo su estructura) y de una
// rutina publicada a lo que se guarda en las rutinas de quien la ve, con sus propios ejercicios y sin cargas.
import type { Exercise, ObjetivoEjercicio, Routine } from '../../../shared/db/types'
import type { DatosRutina, EjercicioRutinaPublicado, ResumenRutina } from '../../social/lib/publicacion'
import { CATALOGO_POR_ID } from './catalogoEjercicios'
import { textoDescanso } from './descansoSugerido'
import { sanearObjetivo, textoCalentamientos, textoObjetivo } from './objetivos'
import type { SeleccionEjercicio } from './selectorEjercicios'

/** Lo que se comparte de una rutina: sus ejercicios en orden, con el del catálogo si lo es y su objetivo. */
export function datosRutinaCompartida(r: Routine, ejercicios: ReadonlyMap<number, Exercise>): DatosRutina {
  return {
    nombre: r.nombre,
    ejercicios: r.exerciseIds.flatMap((id) => {
      const e = ejercicios.get(id)
      if (!e) return []
      const objetivo = r.objetivos?.[id]
      return [{ nombre: e.nombre, ...(e.catalogId ? { catalogId: e.catalogId } : {}), ...(objetivo ? { objetivo } : {}) }]
    }),
  }
}

/** El objetivo publicado como objetivo de rutina, dentro de los límites de la app; sin series, ninguno. */
export function objetivoCompartido(e: EjercicioRutinaPublicado): ObjetivoEjercicio | undefined {
  if (e.series === undefined || e.repsMin === undefined || e.repsMax === undefined) return undefined
  return sanearObjetivo({ series: e.series, repsMin: e.repsMin, repsMax: e.repsMax,
    ...(e.descansoSeg !== undefined ? { descansoSeg: e.descansoSeg } : {}), ...(e.calentamientos !== undefined ? { calentamientos: e.calentamientos } : {}) })
}

/** «3 × 8–12 reps · 90 s de descanso · 2 de calentamiento» (o «2 min de descanso»), o `null` sin objetivo. */
export function textoEjercicioCompartido(e: EjercicioRutinaPublicado): string | null {
  const o = objetivoCompartido(e)
  if (!o) return null
  return [`${textoObjetivo(o)} reps`, o.descansoSeg ? `${textoDescanso(o.descansoSeg)} de descanso` : null, textoCalentamientos(o)].filter(Boolean).join(' · ')
}

export interface FilaRutinaCompartida {
  /** Nombre con el que se compartió. */
  nombre: string
  catalogId: string | null
  objetivo?: ObjetivoEjercicio
  /** Con qué ejercicio propio se guarda: el del catálogo si existe en esta versión de la app; si no, hay que elegirlo. */
  seleccion: SeleccionEjercicio | null
}

/** Las filas de «Guardar en mis rutinas»: los del catálogo ya resueltos; los propios (o desconocidos), por elegir. */
export function filasRutinaCompartida(r: ResumenRutina): FilaRutinaCompartida[] {
  return r.ejercicios.map((e) => {
    const objetivo = objetivoCompartido(e)
    return {
      nombre: e.nombre,
      catalogId: e.catalogId,
      ...(objetivo ? { objetivo } : {}),
      seleccion: e.catalogId && CATALOGO_POR_ID.has(e.catalogId) ? { tipo: 'catalogo', catalogId: e.catalogId } : null,
    }
  })
}
