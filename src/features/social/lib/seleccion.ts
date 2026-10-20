import type { Resumen } from './publicacion'

export interface SeleccionResumen { mapa: boolean; ejercicios: boolean; records: number[]; ligas: boolean; logros: boolean; duracion: boolean; volumen: boolean }
/** Omitir es quitar el campo del envío, nunca sustituir un dato privado por cero. */
export function seleccionarResumen(resumen: Resumen, seleccion: SeleccionResumen): Resumen {
  if(resumen.tipo!=='entreno' && resumen.tipo!=='actividad') return resumen
  const { duracionSeg, ...sinDuracion }=resumen
  const base=seleccion.duracion ? resumen : sinDuracion
  void duracionSeg
  if(resumen.tipo==='actividad') return base as Resumen
  const { mapa,volumenKg,catalogIds,insignias,...resto }=base as typeof resumen
  const records=resumen.records.filter((_,i)=>seleccion.records.includes(i))
  return {...resto,
    ...(seleccion.mapa && mapa ? {mapa}:{}),...(seleccion.volumen && volumenKg!==undefined?{volumenKg}:{}),
    ejercicios:seleccion.ejercicios?resumen.ejercicios:[], records,recordsTotal:records.length,recordsEjercicios:new Set(records.map(r=>r.ejercicio)).size,
    ...(seleccion.ejercicios && catalogIds ? {catalogIds}:{}),
    ligas:seleccion.ligas?resumen.ligas:[],logros:seleccion.logros?resumen.logros:[],...(seleccion.logros && insignias ? {insignias}:{}),
  }
}
