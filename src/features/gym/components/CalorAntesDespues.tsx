import { useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import { todayISO } from '../../../shared/lib/dates'
import { useAportesMusculares } from '../hooks/useAportesMusculares'
import { calorMuscular, fraseSubidas, nivelesDeCalor } from '../lib/calorMuscular'
import { FigurasMusculares } from './MapaMuscular'
import type { FiguraMapa } from './mapaMuscularGeometria'

/**
 * Al terminar un entreno (ADR 046): el mapa acumulado antes y después de esta sesión, sobre grafito como el póster.
 * Empieza en «antes» y pasa una vez a «después» (el color cambia en `--dur-calor`; con Reduce Motion, un fundido corto).
 */
export default function CalorAntesDespues({ workoutId, figura }: { workoutId: number; figura?: FiguraMapa }) {
  const datos = useAportesMusculares()
  const [vista, setVista] = useState<'antes' | 'despues'>('antes')
  const listo = !!datos?.aportes.some(a => a.workoutId === workoutId)
  useEffect(() => {
    if (!listo) return
    const t = setTimeout(() => setVista('despues'), 700)
    return () => clearTimeout(t)
  }, [listo])
  if (!datos || !listo) return null

  const hoy = todayISO()
  const antes = calorMuscular(datos.aportes.filter(a => a.workoutId !== workoutId), hoy)
  const despues = calorMuscular(datos.aportes, hoy)
  const { levels, huella } = nivelesDeCalor(vista === 'antes' ? antes : despues)

  return <section aria-labelledby="calor-antes-despues" className="training-surface session-poster space-y-stack p-5">
    <div className="space-y-1">
      <h2 id="calor-antes-despues" className="text-heading">Tu mapa muscular</h2>
      <p className="training-muted text-body-sm">{vista === 'antes' ? 'Antes de este entreno' : 'Después de este entreno'}</p>
    </div>
    <FigurasMusculares levels={levels} huella={huella} figura={figura} className="muscle-transicion" />
    <p aria-live="polite" className="training-muted text-body-sm">{vista === 'antes' ? 'Así estaba tu mapa antes de esta sesión.' : fraseSubidas(antes, despues)}</p>
    <Button variant="ghost" block className="training-secondary" onClick={() => setVista(v => (v === 'antes' ? 'despues' : 'antes'))}>
      {vista === 'antes' ? 'Ver después' : 'Ver antes'}
    </Button>
  </section>
}
