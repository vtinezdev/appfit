import { useLiveQuery } from 'dexie-react-hooks'
import type { Workout } from '../../../shared/db/types'
import { startOfWeek, toISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { useLigas } from '../../liga/hooks/useLigas'
import { ascensosDeEntreno, divisionEnSemana } from '../../liga/lib/liga'
import { ascensoDestacado, textoAscenso } from '../../liga/lib/textos'
import { resumenEntreno, type ResumenEntreno } from '../../social/lib/publicacion'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { logrosDeEntreno, nombreConNivel } from '../../vitrina/lib/logros'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { trabajoMuscularWorkout } from '../lib/cargaMuscular'
import { seriesPublicables } from '../lib/fichaEntreno'
import { describirRecord, recordsDeEntreno, type RecordEjercicio } from '../lib/records'
import { efectivas, ordenEjerciciosSesion, volumenSets } from '../lib/workout'

/** Lo que ya se ve en pantalla de un entreno terminado (al terminarlo o en su detalle) y hace falta para publicarlo. */
export interface DatosPublicarEntreno {
  workoutId: number
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  inicio: number
  fin: number
  series: number
  volumen: number
  records: RecordEjercicio[]
  nombres: Record<number, string>
}

/**
 * El resumen publicable de un entreno: junta récords, piezas nuevas de la Vitrina, ejercicios (con su liga en la semana
 * del entreno, si cambió y sus series) y el mapa muscular. `undefined` mientras carga. Solo lee.
 */
export function useResumenEntreno(d: DatosPublicarEntreno | undefined): { workout: Workout; resumen: ResumenEntreno } | undefined {
  const hoy = todayISO()
  const id = d?.workoutId
  const workout = useLiveQuery(() => (id === undefined ? undefined : workoutsRepo.obtener(id)), [id])
  const sets = useLiveQuery(() => (id === undefined ? undefined : setsRepo.delWorkout(id)), [id])
  const ejercicios = useLiveQuery(() => exercisesRepo.listar(), [])
  const ligas = useLigas(hoy)
  const vitrina = useVitrina(hoy)
  if (!d || !workout || !sets || !ejercicios || ligas === undefined || vitrina === undefined) return undefined

  const nombre = (exerciseId: number) => d.nombres[exerciseId] ?? 'Ejercicio'
  const conSeries = [...new Set(efectivas([...sets].sort((a, b) => a.createdAt - b.createdAt)).map((s) => s.exerciseId))]
  const orden = ordenEjerciciosSesion([], conSeries, workout.ordenEjercicios, workout.ejerciciosOmitidos)
  const catalogo = new Map(ejercicios.map((e) => [e.id, e.catalogId]))
  const nuevos = vitrina.visible ? logrosDeEntreno(vitrina.vitrina.logros, d.workoutId) : []
  const lunes = startOfWeek(toISODate(new Date(workout.inicio)))
  const ascensos = new Map(ligas.visible ? ascensosDeEntreno(ligas.ligas, d.workoutId).filter(ascensoDestacado).map((a) => [a.exerciseId, a]) : [])
  const resumen = resumenEntreno({
    titulo: d.titulo, inicio: d.inicio, fin: d.fin, series: d.series, volumenKg: d.volumen,
    mapa: trabajoMuscularWorkout(workout, sets, ejercicios).levels,
    ejercicios: orden.map(nombre),
    catalogIds: orden.map((id) => catalogo.get(id)),
    records: d.records.map((r) => ({ ejercicio: nombre(r.exerciseId), texto: describirRecord(r, (n) => formatNumber(n, 2)), tipo: r.tipo, modo: r.modoCarga ?? 'externa', valor: r.valor, anterior: r.anterior, ...(r.peso !== undefined ? { peso: r.peso } : {}), ...(r.variante ? { variante: r.variante } : {}) })),
    detalles: orden.map((id) => {
      const liga = ligas.visible ? ligas.porEjercicio.get(id) : undefined
      const division = liga ? divisionEnSemana(liga, lunes) : null
      const ascenso = ascensos.get(id)
      const { series, records } = seriesPublicables(sets.filter((s) => s.exerciseId === id), d.records.filter((r) => r.exerciseId === id))
      return { ...(division?.liga ? { liga: division.liga } : {}), ...(ascenso ? { cambio: textoAscenso(ascenso) } : {}), series, records }
    }),
    logros: nuevos.map(nombreConNivel),
    insignias: nuevos.map(({ logro, nivel }) => ({ id: logro.id, grupo: logro.grupo, nivel })),
  })
  return { workout, resumen }
}

/**
 * Lo mismo desde solo el id (la sugerencia de compartir de Social): título, series, volumen y récords salen del diario
 * igual que en el detalle del entreno. `null` si ya no existe o no está terminado.
 */
export function useResumenDeEntreno(workoutId: number): { workout: Workout; resumen: ResumenEntreno } | null | undefined {
  const datos = useLiveQuery(async (): Promise<DatosPublicarEntreno | null> => {
    const [w, sets, todos, todas, ejercicios] = await Promise.all([workoutsRepo.obtener(workoutId), setsRepo.delWorkout(workoutId), workoutsRepo.listar(), setsRepo.todas(), exercisesRepo.listar()])
    if (!w || w.fin === undefined) return null
    const rutina = w.routineId ? await routinesRepo.obtener(w.routineId) : undefined
    return {
      workoutId, titulo: rutina?.nombre ?? (w.routineId ? 'Entreno' : 'Entreno libre'), inicio: w.inicio, fin: w.fin,
      series: efectivas(sets).length, volumen: volumenSets(sets), records: recordsDeEntreno(workoutId, todos, todas),
      nombres: Object.fromEntries(ejercicios.map((e) => [e.id, e.nombre])),
    }
  }, [workoutId])
  const listo = useResumenEntreno(datos ?? undefined)
  if (datos === null) return null
  return listo
}
