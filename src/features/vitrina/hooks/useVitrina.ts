// Lecturas de la Vitrina (solo lectura: se usan en useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import type { EstadoAtributos } from '../../atributos/hooks/useAtributos'
import { leerCumbres } from '../../cumbres/hooks/useCumbres'
import * as foodsRepo from '../../nutricion/data/foodsRepo'
import { calcularVitrina, type ResultadoVitrina } from '../lib/vitrina'

export type EstadoVitrina = { visible: false } | (Extract<EstadoAtributos, { visible: true }> & { vitrina: ResultadoVitrina })

/** Vitrina de todo el historial hasta `hoy` (incluye Atributos, Ritmo y Cumbres). `undefined` mientras carga. */
export function useVitrina(hoy: string): EstadoVitrina | undefined {
  return useLiveQuery(async (): Promise<EstadoVitrina> => {
    const estado = await leerCumbres(hoy)
    if (!estado.visible) return estado
    const { workouts, sets, exercises, entries } = estado.datos
    const categorias = estado.conNutricion ? await foodsRepo.categoriasDeEntradas(entries) : new Map<string, string>()
    return { ...estado, vitrina: calcularVitrina({ hoy, atributos: estado.resultado, workouts, sets, exercises, entries, categorias, conNutricion: estado.conNutricion, pausas: estado.pausas, cumbres: estado.cumbres }) }
  }, [hoy])
}
