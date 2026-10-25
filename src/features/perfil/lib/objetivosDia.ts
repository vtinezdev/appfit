import type { Objetivos } from '../../../shared/db/types'

/** Los objetivos de un día: su snapshot si existe; si no, los vigentes (como antes de guardar snapshots). */
export function objetivosDelDia(snapshot: Objetivos | undefined, vigentes: Objetivos): Objetivos {
  return snapshot ? { kcal: snapshot.kcal, prot: snapshot.prot, carb: snapshot.carb, grasa: snapshot.grasa } : { kcal: vigentes.kcal, prot: vigentes.prot, carb: vigentes.carb, grasa: vigentes.grasa }
}

/**
 * Media (redondeada) de los objetivos de varios días, cada uno con su snapshot o, sin él, los vigentes. Sin días,
 * los vigentes. Es el objetivo con el que se compara la media de un periodo.
 */
export function objetivosMedios(fechas: string[], snapshots: ReadonlyMap<string, Objetivos>, vigentes: Objetivos): Objetivos {
  if (fechas.length === 0) return objetivosDelDia(undefined, vigentes)
  const dias = fechas.map((f) => objetivosDelDia(snapshots.get(f), vigentes))
  const media = (k: keyof Objetivos) => Math.round(dias.reduce((a, d) => a + d[k], 0) / dias.length)
  return { kcal: media('kcal'), prot: media('prot'), carb: media('carb'), grasa: media('grasa') }
}
