// Lecturas de la Vitrina (solo lectura: se usan dentro del lector compartido, `experiencia/hooks/useProgreso`).
import { leerCumbres, type EstadoCumbres } from '../../cumbres/hooks/leerCumbres'
import { leerCaminos, type EstadoCaminos } from '../../caminos/hooks/leerCaminos'
import * as foodsRepo from '../../nutricion/data/foodsRepo'
import * as gimnasiosRepo from '../../gym/data/gimnasiosRepo'
import { nombresGimnasios } from '../../gym/lib/gimnasios'
import { calcularVitrina, type ResultadoVitrina } from '../lib/vitrina'

export type EstadoVitrina = { visible: false } | (Extract<EstadoCumbres, { visible: true }> & { vitrina: ResultadoVitrina; caminos: EstadoCaminos })

/** Vitrina de todo el historial hasta `hoy` (incluye la experiencia, Ritmo, Cumbres y Caminos). Solo lectura: para usar dentro de un liveQuery. */
export async function leerVitrina(hoy: string): Promise<EstadoVitrina> {
  const [estado, caminos] = await Promise.all([leerCumbres(hoy), leerCaminos(hoy)])
  if (!estado.visible) return estado
  const { workouts, sets, exercises, entries, actividades } = estado.datos
  const categorias = estado.conNutricion ? await foodsRepo.categoriasDeEntradas(entries) : new Map<string, string>()
  const gimnasios = nombresGimnasios(await gimnasiosRepo.listar())
  return { ...estado, caminos, vitrina: calcularVitrina({ hoy, experiencia: estado.resultado, workouts, sets, exercises, entries, categorias, conNutricion: estado.conNutricion, pausas: estado.pausas, cumbres: estado.cumbres, actividades,
    caminos: caminos.visible ? caminos.caminos : null, pasos: caminos.visible ? caminos.pasos : [], gimnasios }) }
}
