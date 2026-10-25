import { lazy, Suspense } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatInt } from '../../../shared/lib/format'
import * as exercisesRepo from '../../gym/data/exercisesRepo'
import * as routinesRepo from '../../gym/data/routinesRepo'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { useFiguraMapa } from '../../gym/hooks/useFiguraMapa'
import { masTrabajados, trabajoMuscularWorkout } from '../../gym/lib/cargaMuscular'
import { MUSCULOS } from '../../gym/lib/musculos'
import { unir } from '../../gym/lib/presentacionEjercicio'
import { formatHora, resumenUltimoEntreno } from '../../gym/lib/workout'
import TarjetaAcceso from './TarjetaAcceso'

// Diferido: la geometría de los muñecos no entra en el arranque de Inicio.
const MiniMapa = lazy(() => import('../../gym/components/MapaMuscular').then(m => ({ default: m.MiniMapa })))

/**
 * Entreno en Inicio (tarjeta ancha): la sesión en curso o el último entreno terminado con su rutina, «Ayer · 52 min ·
 * 6.420 kg», el mapa muscular en miniatura y lo más trabajado en texto (el mapa no depende solo del color). Solo lectura;
 * toda la tarjeta abre Entreno.
 */
export default function AccesoEntreno({ onAbrir }: { onAbrir: () => void }) {
  const figura = useFiguraMapa()
  const activo = useLiveQuery(async () => ((await workoutsRepo.activo()) ?? null), [])
  const ultimo = useLiveQuery(async () => {
    const w = await workoutsRepo.ultimoTerminado()
    if (!w) return null
    const [sets, rutina, ejercicios] = await Promise.all([setsRepo.delWorkout(w.id), w.routineId ? routinesRepo.obtener(w.routineId) : undefined, w.muscleSnapshot ? [] : exercisesRepo.listar()])
    return { workout: w, sets, rutina: rutina?.nombre, ejercicios }
  }, [])

  const cargando = activo === undefined || ultimo === undefined
  const resumen = ultimo ? resumenUltimoEntreno(ultimo.workout, ultimo.sets) : null
  const detalle = resumen ? [resumen.cuando, resumen.duracion, resumen.volumen > 0 ? `${formatInt(resumen.volumen)} kg` : null].filter(Boolean).join(' · ') : ''
  const trabajo = ultimo ? trabajoMuscularWorkout(ultimo.workout, ultimo.sets, ultimo.ejercicios) : null
  const top = trabajo ? masTrabajados(trabajo).map(m => MUSCULOS[m]) : []
  const frase = top.length === 2 ? `${unir(top[0], top[1])}, lo más trabajado` : top.length === 1 ? `${top[0]}, lo más trabajado` : null

  return (
    <TarjetaAcceso etiqueta={activo ? 'Entreno' : 'Último entreno'} onAbrir={onAbrir}>
      {cargando ? null : activo ? <>
        <span className="text-title text-accent-strong">En curso</span>
        <span className="tabular text-body-sm text-fg-muted">Desde {formatHora(activo.inicio)}</span>
      </> : resumen && ultimo ? <span className="flex items-center gap-4">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="break-words text-title text-fg">{ultimo.rutina ?? 'Entreno libre'}</span>
          <span className="tabular text-body-sm text-fg-muted">{detalle}</span>
          {frase && <span className="break-words text-body-sm text-fg">{frase}</span>}
        </span>
        {trabajo && top.length > 0 && <Suspense fallback={<span className="muscle-mini" />}><MiniMapa levels={trabajo.levels} figura={figura} /></Suspense>}
      </span> : <>
        <span className="text-title text-fg">Sin entrenos</span>
        <span className="text-body-sm text-fg-muted">Empieza el primero</span>
      </>}
    </TarjetaAcceso>
  )
}
