import { useEffect, useMemo, useState } from 'react'
import Button from '../../../shared/components/Button'
import { todayISO } from '../../../shared/lib/dates'
import { useAportesMusculares } from '../hooks/useAportesMusculares'
import { MUSCULOS } from '../lib/musculos'
import { fraseSubidas, musculosDelEntreno, nivelesDeProgreso, nombreNivel, progresoMuscular, subidasDeNivel, textoSemana } from '../lib/progresoMuscular'
import { FigurasMusculares } from './MapaMuscular'
import type { FiguraMapa } from './mapaMuscularGeometria'

/**
 * Al terminar un entreno (ADR 051): el mapa de progreso sobre grafito, como el póster, y lo que esta sesión aporta a la semana de cada
 * grupo que trabaja. Si algún grupo sube de nivel, empieza en «antes» y pasa una vez a «después» (el color cambia en `--dur-progreso`;
 * con Reduce Motion, un fundido corto), con un botón para alternar.
 */
export default function ProgresoSesion({ workoutId, figura }: { workoutId: number; figura?: FiguraMapa }) {
  const datos = useAportesMusculares()
  const [vista, setVista] = useState<'antes' | 'despues'>('antes')
  const calculo = useMemo(() => {
    if (!datos?.aportes.some(a => a.workoutId === workoutId)) return null
    const hoy = todayISO()
    const antes = progresoMuscular(datos.aportes.filter(a => a.workoutId !== workoutId), hoy, [], datos.pausas)
    const despues = progresoMuscular(datos.aportes, hoy, [], datos.pausas)
    return { antes, despues, cambia: subidasDeNivel(antes, despues).length > 0, trabajados: musculosDelEntreno(datos.aportes, workoutId) }
  }, [datos, workoutId])
  const cambia = !!calculo?.cambia
  useEffect(() => {
    if (!cambia) return
    const t = setTimeout(() => setVista('despues'), 700)
    return () => clearTimeout(t)
  }, [cambia])
  if (!calculo) return null

  const { antes, despues, trabajados } = calculo
  const enAntes = cambia && vista === 'antes'
  const { levels, huella } = nivelesDeProgreso(enAntes ? antes : despues)

  return <section aria-labelledby="progreso-sesion" className="training-surface session-poster space-y-stack p-5">
    <div className="space-y-1">
      <h2 id="progreso-sesion" className="text-heading">Tu progreso muscular</h2>
      <p className="training-muted text-body-sm">{enAntes ? 'Antes de este entreno' : 'Después de este entreno'}</p>
    </div>
    <FigurasMusculares levels={levels} escala="progreso" huella={huella} figura={figura} className="muscle-transicion" />
    <p aria-live="polite" className="text-body-sm font-semibold">{enAntes ? 'Así estaba tu mapa antes de esta sesión.' : fraseSubidas(antes, despues)}</p>
    <section aria-label="Esta semana" className="space-y-2">
      <h3 className="training-muted text-rotulo">Esta semana</h3>
      <ul className="space-y-2">{trabajados.map(m => <li key={m} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="muscle-swatch shrink-0" data-escala="progreso" data-level={despues.musculos[m].nivel} />
          <span className="min-w-0 break-words text-body-sm">{MUSCULOS[m]}<span className="training-muted block text-caption">{nombreNivel(despues.musculos[m].nivel)}</span></span>
        </span>
        <span className="training-muted tabular ml-auto text-right text-caption">{textoSemana(despues.musculos[m])}</span>
      </li>)}</ul>
    </section>
    {cambia && <Button variant="ghost" block className="training-secondary" onClick={() => setVista(v => (v === 'antes' ? 'despues' : 'antes'))}>
      {vista === 'antes' ? 'Ver después' : 'Ver antes'}
    </Button>}
  </section>
}
