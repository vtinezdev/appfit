import { lazy, Suspense, useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { LoadingState } from '../../../shared/components/StateMessage'
import { todayISO } from '../../../shared/lib/dates'
import PosterImagen from './PosterImagen'
import PosterSesion from './PosterSesion'
import CumbreSesion from '../../cumbres/components/CumbreSesion'
import { cumbreDeSesion, nombreExpedicion } from '../../cumbres/lib/cumbres'
import NuevosLogros from '../../vitrina/components/NuevosLogros'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { logrosDeEntreno, nombreConNivel } from '../../vitrina/lib/logros'
import AscensosLiga from '../../liga/components/AscensosLiga'
import { useLigas } from '../../liga/hooks/useLigas'
import { ascensosDeEntreno } from '../../liga/lib/liga'
import { ascensoDestacado, textoAscenso } from '../../liga/lib/textos'
import PublicarEntreno from './PublicarEntreno'
import BloqueSesion from './BloqueSesion'
import HitosSesion from './HitosSesion'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import { useHitoEntrenos } from '../hooks/useHitoEntrenos'
import { useProgresoSesion } from '../hooks/useProgresoSesion'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import { hitosDeSesion, resumenCuerpo, resumenCumbresLigas, resumenRecords, type DatosHitos } from '../lib/fichaEntreno'
import { MUSCULOS } from '../lib/musculos'
import { nombreNivel } from '../lib/progresoMuscular'
import type { RecordEjercicio } from '../lib/records'
import RecordsSesion from './RecordsSesion'

// Diferido: la geometría de los muñecos pesa más que el resto del mapa.
const MapaMuscular = lazy(() => import('./MapaMuscular'))
const FigurasProgresoSesion = lazy(() => import('./ProgresoSesion').then(m => ({ default: m.FigurasProgresoSesion })))
const SemanaProgresoSesion = lazy(() => import('./ProgresoSesion').then(m => ({ default: m.SemanaProgresoSesion })))

type Bloque = 'records' | 'cuerpo' | 'cumbres' | 'vitrina'

export interface WorkoutSummary {
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  inicio: number
  fin: number
  sets: number
  volume: number
  muscle?: ResumenMuscular
  /** Récords frente a los entrenos anteriores y nombres de ejercicio para mostrarlos. */
  records?: RecordEjercicio[]
  nombres?: Record<number, string>
  /** Para las miniaturas de los récords. */
  catalogIds?: Record<number, string | undefined>
  /** Para mostrar los metros que sube el entreno (Cumbres). */
  workoutId?: number
}

/**
 * Fin de sesión ordenado por momentos (ENT-10): arriba el póster con la franja «Hoy» (hasta tres hitos) y un solo muñeco, el
 * del progreso muscular (antes → después); debajo, Récords · Cuerpo · Cumbres y ligas · Vitrina plegables con su resumen,
 * solo uno abierto (al llegar, el primero con contenido); «Compartir» y «Volver a Entreno» siempre al final. Cumbres, ligas
 * y Vitrina se leen una vez aquí para los hitos y los resúmenes; sus bloques (de B, tal cual) solo se montan al abrirlos.
 */
export default function WorkoutFinished({ summary, onClose }: { summary: WorkoutSummary; onClose: () => void }) {
  const figura = useFiguraMapa()
  const hoy = todayISO()
  const id = summary.workoutId
  const progreso = useProgresoSesion(id)
  const hito = useHitoEntrenos(id)
  const vitrina = useVitrina(hoy)
  const ligas = useLigas(hoy)
  const nombres = summary.nombres ?? {}
  const records = summary.records ?? []
  const gamificacion = vitrina?.visible === true

  const subidas = (progreso?.subidas ?? []).map(m => ({ musculo: MUSCULOS[m], nivel: nombreNivel(progreso!.despues.musculos[m].nivel) }))
  const cumbres = vitrina?.visible && vitrina.cumbres && id !== undefined ? vitrina.cumbres : null
  const enCumbre = cumbres && id !== undefined ? cumbreDeSesion(cumbres, id) : null
  const ascensos = ligas?.visible && id !== undefined ? ascensosDeEntreno(ligas.ligas, id) : []
  const datos: DatosHitos = {
    records, nombres, subidas,
    cumbre: enCumbre ? { metros: enCumbre.metros, cimas: enCumbre.cumbres.map(nombreExpedicion) } : null,
    ligas: ascensos.filter(ascensoDestacado).map(a => ({ exerciseId: a.exerciseId, texto: textoAscenso(a) })),
    logros: vitrina?.visible && id !== undefined ? logrosDeEntreno(vitrina.vitrina.logros, id).map(nombreConNivel) : [],
  }
  const hitos = hitosDeSesion(gamificacion ? datos : { ...datos, cumbre: null, ligas: [], logros: [] })

  // Qué bloques hay y cuáles tienen algo que contar (el primero de estos sale abierto).
  const bloques: { clave: Bloque; titulo: string; resumen: string; contenido: boolean }[] = [
    ...(records.length ? [{ clave: 'records' as const, titulo: 'Récords', resumen: resumenRecords(records, nombres), contenido: true }] : []),
    ...(progreso || summary.muscle ? [{ clave: 'cuerpo' as const, titulo: 'Cuerpo', resumen: resumenCuerpo(subidas, progreso?.trabajados.length ?? 0), contenido: true }] : []),
    ...(gamificacion && id !== undefined ? [{ clave: 'cumbres' as const, titulo: 'Cumbres y ligas',
      resumen: resumenCumbresLigas(datos.cumbre, datos.ligas, ascensos.length - datos.ligas.length, nombres, !!cumbres), contenido: !!enCumbre?.metros || ascensos.length > 0 }] : []),
    ...(gamificacion && datos.logros.length ? [{ clave: 'vitrina' as const, titulo: 'Vitrina', resumen: datos.logros.length === 1 ? datos.logros[0] : `${datos.logros[0]} y ${datos.logros.length - 1} más`, contenido: true }] : []),
  ]
  const cargado = progreso !== undefined && vitrina !== undefined && ligas !== undefined
  const [abierto, setAbierto] = useState<Bloque | null | undefined>(undefined)
  const porDefecto = bloques.find(b => b.contenido)?.clave ?? null
  useEffect(() => { if (cargado && abierto === undefined) setAbierto(porDefecto) }, [cargado, abierto, porDefecto])

  return <div className="space-y-section px-page pt-5">
    <PosterSesion titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin} series={summary.sets} volumen={summary.volume} levels={summary.muscle?.levels} figura={figura}
      estado={<p role="status" className="flex items-center gap-2 text-label"><span className="workout-finish-mark flex h-touch w-touch items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="check" size={24} /></span>Sesión guardada en el historial</p>}
      hoy={hitos.length ? <HitosSesion hitos={hitos} /> : undefined}
      hito={hito} figuras={progreso ? <Suspense fallback={<div className="poster-map-reserva" />}><FigurasProgresoSesion progreso={progreso} figura={figura} /></Suspense> : undefined} />
    <PosterImagen titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin} series={summary.sets} volumen={summary.volume} hoy={hitos} hito={hito} levels={summary.muscle?.levels} figura={figura} />
    {bloques.length > 0 && <div>
      {bloques.map(b => <BloqueSesion key={b.clave} titulo={b.titulo} resumen={b.resumen} abierto={abierto === b.clave} onCambiar={a => setAbierto(a ? b.clave : null)}>
        {b.clave === 'records' && <RecordsSesion records={records} nombres={nombres} catalogIds={summary.catalogIds} sinTitulo />}
        {b.clave === 'cuerpo' && <Suspense fallback={<LoadingState />}>
          {progreso && <SemanaProgresoSesion progreso={progreso} />}
          {summary.muscle && <MapaMuscular summary={summary.muscle} figura={figura} figuras={false} />}
        </Suspense>}
        {b.clave === 'cumbres' && id !== undefined && <><CumbreSesion workoutId={id} /><AscensosLiga workoutId={id} nombres={nombres} /></>}
        {b.clave === 'vitrina' && id !== undefined && <NuevosLogros workoutId={id} />}
      </BloqueSesion>)}
    </div>}
    {id !== undefined && <PublicarEntreno workoutId={id} titulo={summary.titulo} inicio={summary.inicio} fin={summary.fin}
      series={summary.sets} volumen={summary.volume} records={records} nombres={nombres} />}
    <Button variant="secondary" block size="lg" onClick={onClose}>Volver a Entreno<Icon name="chevron-right" size={18} /></Button>
  </div>
}
