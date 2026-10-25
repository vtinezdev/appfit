// Lecturas de la revisión semanal (solo lectura: se usan en useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import * as cheatDaysRepo from '../../nutricion/data/cheatDaysRepo'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import { getPerfil } from '../../perfil/data/perfilRepo'
import * as aguaRepo from '../data/aguaRepo'
import * as pesosRepo from '../data/pesosRepo'
import { resolverObjetivoAgua } from '../lib/agua'
import { addDays } from '../../../shared/lib/dates'
import { SEMANAS_CRUZADAS, semanasCruzadas, type SemanaCruzada } from '../lib/lecturasCruzadas'
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
    const [objetivos, cheatDays] = await Promise.all([objetivosPorFecha(semana.fechas, hoy), cheatDaysRepo.entreFechas(anterior.lunes, semana.domingo)])
    return {
      semana,
      cerradaAntes: revisionSemanalCerrada,
      peso: bloquePeso(semana, anterior, pesos),
      nutricion: bloqueNutricion(semana, anterior, entries, objetivos, hoy, new Set(cheatDays)),
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
    const [entries, cheatDays, objetivos, pesos, agua, settings, perfil, workouts, sets, exercises] = await Promise.all([
      entriesRepo.entreFechas(anterior.lunes, semana.domingo),
      cheatDaysRepo.entreFechas(anterior.lunes, semana.domingo),
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
    return calcularRevision(lunes, { entries, cheatDays: new Set(cheatDays), objetivos, pesos, agua, objetivoAguaMl, workouts, sets, exercises }, hoy)
  }, [lunes, hoy])
}

/**
 * «Tus 8 semanas» (B11): las 8 semanas que acaban en la de `lunes`, para las lecturas cruzadas del final de la revisión.
 * `undefined` mientras carga.
 */
export function useSemanasCruzadas(lunes: string, hoy: string): SemanaCruzada[] | undefined {
  return useLiveQuery(async () => {
    const desde = addDays(lunes, -7 * (SEMANAS_CRUZADAS - 1))
    const hasta = addDays(lunes, 6)
    const fechas = Array.from({ length: SEMANAS_CRUZADAS * 7 }, (_, i) => addDays(desde, i))
    const [entries, cheatDays, objetivos, pesos, workouts, sets] = await Promise.all([
      entriesRepo.entreFechas(desde, hasta),
      cheatDaysRepo.entreFechas(desde, hasta),
      objetivosPorFecha(fechas, hoy),
      pesosRepo.delRango(desde, hasta),
      workoutsRepo.listar(),
      setsRepo.todas(),
    ])
    return semanasCruzadas(lunes, { entries, cheatDays: new Set(cheatDays), objetivos, pesos, workouts, sets }, hoy)
  }, [lunes, hoy])
}
