// Lecturas de la Vitrina (solo lectura: se usan en useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import { leerCumbres, type EstadoCumbres } from '../../cumbres/hooks/useCumbres'
import { leerCaminos } from '../../caminos/hooks/useCaminos'
import * as foodsRepo from '../../nutricion/data/foodsRepo'
import { calcularVitrina, type ResultadoVitrina } from '../lib/vitrina'

export type EstadoVitrina = { visible: false } | (Extract<EstadoCumbres, { visible: true }> & { vitrina: ResultadoVitrina })

/** Vitrina de todo el historial hasta `hoy` (incluye la experiencia, Ritmo, Cumbres y Caminos; los tres primeros, también en el resultado). `undefined` mientras carga. */
export function useVitrina(hoy: string): EstadoVitrina | undefined {
  return useLiveQuery(async (): Promise<EstadoVitrina> => {
    const [estado, caminos] = await Promise.all([leerCumbres(hoy), leerCaminos(hoy)])
    if (!estado.visible) return estado
    const { workouts, sets, exercises, entries, actividades } = estado.datos
    const categorias = estado.conNutricion ? await foodsRepo.categoriasDeEntradas(entries) : new Map<string, string>()
    return { ...estado, vitrina: calcularVitrina({ hoy, experiencia: estado.resultado, workouts, sets, exercises, entries, categorias, conNutricion: estado.conNutricion, pausas: estado.pausas, cumbres: estado.cumbres, actividades, caminos: caminos.visible ? caminos.caminos : null }) }
  }, [hoy])
}
