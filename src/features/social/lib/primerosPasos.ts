// Primeros pasos de Social: tres acciones y cuántas están hechas. Lo remoto (seguidores, comunidades) puede no haber llegado:
// entonces el paso queda sin saber (`null`) y el progreso no se muestra, para no dar una cifra falsa.

export type IdPaso = 'codigo' | 'comunidad' | 'entreno'

export interface Paso {
  id: IdPaso
  /** `null` mientras no se sabe (consulta remota en curso o fallida). */
  hecho: boolean | null
}

export interface EstadoPasos {
  codigo?: boolean
  comunidad?: boolean
  entreno: boolean
}

export function primerosPasos(e: EstadoPasos): { pasos: Paso[]; hechos: number | null; total: number } {
  const pasos: Paso[] = [
    { id: 'codigo', hecho: e.codigo ?? null },
    { id: 'comunidad', hecho: e.comunidad ?? null },
    { id: 'entreno', hecho: e.entreno },
  ]
  const hechos = pasos.some((p) => p.hecho === null) ? null : pasos.filter((p) => p.hecho).length
  return { pasos, hechos, total: pasos.length }
}
