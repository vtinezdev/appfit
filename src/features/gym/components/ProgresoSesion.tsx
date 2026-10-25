import { useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import { MUSCULOS } from '../lib/musculos'
import { fraseSubidas, nivelesDeProgreso, nombreNivel, textoSemana } from '../lib/progresoMuscular'
import type { ProgresoDeSesion } from '../hooks/useProgresoSesion'
import { FigurasMusculares } from './MapaMuscular'
import type { FiguraMapa } from './mapaMuscularGeometria'

/**
 * Al terminar un entreno (ADR 051), el único muñeco del póster (ENT-10): el mapa de progreso. Si algún grupo sube de nivel,
 * empieza en «antes» y pasa una vez a «después» (el color cambia en `--dur-progreso`; con Reduce Motion, un fundido
 * corto), con un botón para alternar. Diferido con la geometría de los muñecos.
 */
export function FigurasProgresoSesion({ progreso, figura }: { progreso: ProgresoDeSesion; figura?: FiguraMapa }) {
  const [vista, setVista] = useState<'antes' | 'despues'>('antes')
  const cambia = progreso.subidas.length > 0
  useEffect(() => {
    if (!cambia) return
    const t = setTimeout(() => setVista('despues'), 700)
    return () => clearTimeout(t)
  }, [cambia])
  const enAntes = cambia && vista === 'antes'
  const { levels, huella } = nivelesDeProgreso(enAntes ? progreso.antes : progreso.despues)
  return <div className="space-y-stack">
    <p className="training-muted text-caption">Tu progreso muscular · {enAntes ? 'antes de este entreno' : 'después de este entreno'}</p>
    <FigurasMusculares levels={levels} escala="progreso" huella={huella} figura={figura} className="muscle-transicion" />
    <p aria-live="polite" className="text-body-sm font-semibold">{enAntes ? 'Así estaba tu mapa antes de esta sesión.' : fraseSubidas(progreso.antes, progreso.despues)}</p>
    {cambia && <Button variant="ghost" block className="training-secondary" onClick={() => setVista(v => (v === 'antes' ? 'despues' : 'antes'))}>
      {vista === 'antes' ? 'Ver después' : 'Ver antes'}
    </Button>}
  </div>
}

/** Bloque «Cuerpo»: lo que esta sesión aporta a la semana de cada grupo que trabaja, con su nivel. */
export function SemanaProgresoSesion({ progreso }: { progreso: ProgresoDeSesion }) {
  const { despues, trabajados } = progreso
  return <section aria-label="Esta semana" className="space-y-2">
    <h3 className="text-rotulo text-fg-muted">Esta semana</h3>
    <ul className="space-y-2">{trabajados.map(m => <li key={m} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="muscle-swatch shrink-0" data-escala="progreso" data-level={despues.musculos[m].nivel} />
        <span className="min-w-0 break-words text-body-sm text-fg">{MUSCULOS[m]}<span className="block text-caption text-fg-muted">{nombreNivel(despues.musculos[m].nivel)}</span></span>
      </span>
      <span className="tabular ml-auto text-right text-caption text-fg-muted">{textoSemana(despues.musculos[m])}</span>
    </li>)}</ul>
  </section>
}
