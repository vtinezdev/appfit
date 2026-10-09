// Lecturas de la revisión semanal (solo lectura: se usan en useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import { getPerfil } from '../../perfil/data/perfilRepo'
import * as aguaRepo from '../data/aguaRepo'
import * as pesosRepo from '../data/pesosRepo'
import { resolverObjetivoAgua } from '../lib/agua'
import {
  bloqueNutricion, bloquePeso, calcularRevision, debeMostrarRevision, entrenosDeSemana, hayDatosSemana, semanaAnterior, semanaARevisar, semanaDe,
  type BloqueNutricion, type BloquePeso, type Revision, type Semana,
} from '../lib/revisionSemanal'

export interface ResumenTarjetaRevision {
  semana: Semana
  /** Valor previo de `revisionSemanalCerrada`, para deshacer el cierre. */
  cerradaAntes: string | undefined
  peso: BloquePeso
  nutricion: BloqueNutricion
  sesiones: number
  sesionesAnterior: number
}

/**
 * Datos de la tarjeta de Inicio, o `null` si no toca mostrarla (ya cerrada o semana sin datos). Solo lee lo barato:
 * nada de series, que solo hacen falta en el detalle. `undefined` mientras carga.
 */
export function useTarjetaRevision(hoy: string): ResumenTarjetaRevision | null | undefined {
  return useLiveQuery(async () => {
    const semana = semanaARevisar(hoy)
    const anterior = semanaAnterior(semana)
    const { revisionSemanalCerrada } = await getSettings()
    if (!debeMostrarRevision(semana.lunes, revisionSemanalCerrada, true)) return null
    const [entries, pesos, agua, workouts] = await Promise.all([
      entriesRepo.entreFechas(anterior.lunes, semana.domingo),
      pesosRepo.delRango(anterior.lunes, semana.domingo),
      aguaRepo.entreFechas(semana.lunes, semana.domingo),
      workoutsRepo.listar(),
    ])
    if (!hayDatosSemana(semana, { entries, pesos, agua, workouts })) return null
    const objetivos = await objetivosPorFecha(semana.fechas, hoy)
    return {
      semana,
      cerradaAntes: revisionSemanalCerrada,
      peso: bloquePeso(semana, anterior, pesos),
      nutricion: bloqueNutricion(semana, anterior, entries, objetivos, hoy),
      sesiones: entrenosDeSemana(semana, workouts).length,
      sesionesAnterior: entrenosDeSemana(anterior, workouts).length,
    }
  }, [hoy])
}

/** Revisión completa de la semana que empieza en `lunes`, frente a la anterior. `undefined` mientras carga. */
export function useRevision(lunes: string, hoy: string): Revision | undefined {
  return useLiveQuery(async () => {
    const semana = semanaDe(lunes)
    const anterior = semanaAnterior(semana)
    const [entries, objetivos, pesos, agua, settings, perfil, workouts, sets, exercises] = await Promise.all([
      entriesRepo.entreFechas(anterior.lunes, semana.domingo),
      objetivosPorFecha(semana.fechas, hoy),
      pesosRepo.delRango(anterior.lunes, semana.domingo),
      aguaRepo.entreFechas(semana.lunes, semana.domingo),
      getSettings(),
      getPerfil(),
      workoutsRepo.listar(),
      setsRepo.todas(),
      exercisesRepo.listar(),
    ])
    const objetivoAguaMl = resolverObjetivoAgua(settings.aguaObjetivoMl, perfil.sexo)?.ml ?? null
    return calcularRevision(lunes, { entries, objetivos, pesos, agua, objetivoAguaMl, workouts, sets, exercises }, hoy)
  }, [lunes, hoy])
}
