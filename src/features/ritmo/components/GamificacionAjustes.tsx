import Icon from '../../../shared/components/Icon'
import Interruptor from '../../../shared/components/Interruptor'
import ListGroup from '../../../shared/components/ListGroup'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { updateSettings } from '../../../shared/db/settings'
import type { PlanSemanal, Settings } from '../../../shared/db/types'
import { startOfWeek, todayISO } from '../../../shared/lib/dates'
import { conNutricionEfectiva, moduloActivo } from '../../../shared/lib/modulos'
import { cambiarPlan, OPCIONES_DIAS_REGISTRO, OPCIONES_ENTRENOS, planDeSemana } from '../../ritmo/lib/plan'

interface Props {
  settings: Settings
  onError: (mensaje: string) => void
}

const ERROR = 'No se ha podido guardar el ajuste. Inténtalo de nuevo.'

/** Sección de Ajustes: mostrar u ocultar Cumbres, Caminos, Ritmo y Vitrina, incluir la nutrición y el plan semanal. Cada elección se guarda al tocarla. */
export default function GamificacionAjustes({ settings, onError }: Props) {
  const visibles = settings.gamificacionVisible !== false
  const conNutricion = conNutricionEfectiva(settings)
  // Con Nutrición apagada en «Lo que usas» (B9) cuenta solo el entreno, sin tocar este ajuste.
  const nutricionApagada = !moduloActivo(settings, 'nutricion')
  const lunes = startOfWeek(todayISO())
  const plan = planDeSemana(settings.planSemanal, lunes)
  const guardar = (patch: Partial<Omit<Settings, 'id'>>) => { updateSettings(patch).catch(() => onError(ERROR)) }
  const guardarPlan = (cambio: Partial<PlanSemanal>) => guardar({ planSemanal: cambiarPlan(settings.planSemanal, { ...plan, ...cambio }, lunes) })

  // Punto 29: interruptores en una lista con lo que hacen en su fila y el plan semanal en su tarjeta, con la nota como pie.
  return <section aria-label="Cumbres, Caminos, Ritmo y Vitrina" className="space-y-section">
    <ListGroup aria-label="Mostrar y contar" pie={visibles ? undefined : 'Montaña, ruta, semanas y logros salen de tus registros: al volver a mostrarlos estarán al día.'}>
      <li><Interruptor label="Mostrar Cumbres, Caminos, Ritmo y Vitrina" detalle="Ocultarlos no borra nada" activo={visibles} onChange={(v) => guardar({ gamificacionVisible: v })} /></li>
      {visibles && (nutricionApagada
        ? <li className="py-2"><span className="block text-body-sm font-semibold text-fg-muted">Contar la nutrición</span><span className="block text-caption text-fg-muted">Nutrición está apagada en «Lo que usas»: cuenta solo el entreno</span></li>
        : <li><Interruptor label="Contar la nutrición" detalle="Registrar comidas y llegar a la proteína suben metros y cuentan para la semana; las kcal y el peso, nunca" activo={conNutricion} onChange={(v) => guardar({ gamificacionConNutricion: v })} /></li>)}
    </ListGroup>
    {visibles && <section aria-labelledby="plan-semanal" className="space-y-2">
      <h3 id="plan-semanal" className="px-1 text-rotulo text-fg-muted">Tu plan semanal</h3>
      <ListGroup aria-label="Plan semanal" pie={settings.planSemanal?.length
        ? 'Decide cuándo una semana está cumplida. Un cambio vale desde esta semana; las anteriores conservan su plan.'
        : 'Decide cuándo una semana está cumplida. El primer plan vale también para las semanas anteriores.'}>
        <li className="space-y-2 py-3">
          <span className="flex items-center gap-2 text-body-sm font-semibold text-fg"><Icon name="dumbbell" size={16} className="text-fg-muted" />Entrenos por semana</span>
          <SegmentedControl label="Entrenos por semana" valor={String(plan.entrenos)} onChange={(v) => guardarPlan({ entrenos: Number(v) })}
            opciones={OPCIONES_ENTRENOS.map((n) => ({ valor: String(n), label: String(n) }))} />
        </li>
        {conNutricion && <li className="space-y-2 py-3">
          <span className="flex items-center gap-2 text-body-sm font-semibold text-fg"><Icon name="utensils" size={16} className="text-fg-muted" />Días con comidas registradas</span>
          <SegmentedControl label="Días con comidas registradas por semana" valor={String(plan.diasRegistro)} onChange={(v) => guardarPlan({ diasRegistro: Number(v) })}
            opciones={OPCIONES_DIAS_REGISTRO.map((n) => ({ valor: String(n), label: String(n) }))} />
        </li>}
      </ListGroup>
    </section>}
  </section>
}
