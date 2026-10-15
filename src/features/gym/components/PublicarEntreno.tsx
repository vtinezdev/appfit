import { useLiveQuery } from 'dexie-react-hooks'
import { todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { useLigas } from '../../liga/hooks/useLigas'
import { ascensosDeEntreno } from '../../liga/lib/liga'
import { ascensoDestacado, textoAscenso } from '../../liga/lib/textos'
import Publicar, { SiPuedePublicar } from '../../social/components/Publicar'
import { resumenEntreno } from '../../social/lib/publicacion'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { logrosDeEntreno, nombreConNivel } from '../../vitrina/lib/logros'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { describirRecord, type RecordEjercicio } from '../lib/records'
import { efectivas, ordenEjerciciosSesion } from '../lib/workout'

interface Props {
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
 * Compartir un entreno terminado en Amigos (al terminarlo y en su detalle): junta lo que ya se ve en pantalla
 * (récords, cambios de liga, piezas nuevas de la Vitrina y ejercicios) en el resumen publicable. Nada sin Amigos.
 */
export default function PublicarEntreno(props: Props) {
  return <SiPuedePublicar><Contenido {...props} /></SiPuedePublicar>
}

function Contenido({ workoutId, titulo, inicio, fin, series, volumen, records, nombres }: Props) {
  const hoy = todayISO()
  const workout = useLiveQuery(() => workoutsRepo.obtener(workoutId), [workoutId])
  const sets = useLiveQuery(() => setsRepo.delWorkout(workoutId), [workoutId])
  const ligas = useLigas(hoy)
  const vitrina = useVitrina(hoy)
  if (!workout || !sets || ligas === undefined || vitrina === undefined) return null

  const nombre = (id: number) => nombres[id] ?? 'Ejercicio'
  const conSeries = [...new Set(efectivas([...sets].sort((a, b) => a.createdAt - b.createdAt)).map((s) => s.exerciseId))]
  const resumen = resumenEntreno({
    titulo, inicio, fin, series, volumenKg: volumen,
    ejercicios: ordenEjerciciosSesion([], conSeries, workout.ordenEjercicios, workout.ejerciciosOmitidos).map(nombre),
    records: records.map((r) => ({ ejercicio: nombre(r.exerciseId), texto: describirRecord(r, (n) => formatNumber(n, 2)) })),
    ligas: ligas.visible
      ? ascensosDeEntreno(ligas.ligas, workoutId).filter(ascensoDestacado).map((a) => ({ ejercicio: nombre(a.exerciseId), texto: textoAscenso(a) }))
      : [],
    logros: vitrina.visible ? logrosDeEntreno(vitrina.vitrina.logros, workoutId).map(nombreConNivel) : [],
  })
  return <Publicar publicacion={workout.publicacion} fecha={inicio} resumen={resumen} onAnotar={(id) => workoutsRepo.marcarPublicacion(workoutId, id)} />
}
