import NotaAmpliable from '../../../shared/components/NotaAmpliable'
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

  return <section aria-label="Cumbres, Caminos, Ritmo y Vitrina" className="space-y-stack">
    <SegmentedControl label="Mostrar Cumbres, Caminos, Ritmo y Vitrina" valor={visibles ? 'si' : 'no'} onChange={(v) => guardar({ gamificacionVisible: v === 'si' })}
      opciones={[{ valor: 'si', label: 'Mostrar' }, { valor: 'no', label: 'Ocultar' }]} />
    <NotaAmpliable resumen="Ocultarlos no borra nada."><p>Montaña, ruta, semanas y logros salen en Inicio, en la revisión del lunes y al terminar un entreno. Todo sale de tus registros.</p></NotaAmpliable>
    {visibles && <>
      {nutricionApagada
        ? <p className="text-body-sm text-fg-muted">Nutrición está apagada en «Lo que usas»: cuenta solo el entreno.</p>
        : <SegmentedControl label="Nutrición en Cumbres, Ritmo y Vitrina" valor={conNutricion ? 'si' : 'no'} onChange={(v) => guardar({ gamificacionConNutricion: v === 'si' })}
          opciones={[{ valor: 'si', label: 'Con nutrición' }, { valor: 'no', label: 'Solo entreno' }]} />}
      <NotaAmpliable resumen="Las kcal y el peso nunca cuentan."><p>Con nutrición, registrar comidas y llegar a la proteína suben metros y cuentan para la semana; la Vitrina añade sus logros y el Herbario.</p></NotaAmpliable>
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-fg">Entrenos por semana</p>
        <SegmentedControl label="Entrenos por semana" valor={String(plan.entrenos)} onChange={(v) => guardarPlan({ entrenos: Number(v) })}
          opciones={OPCIONES_ENTRENOS.map((n) => ({ valor: String(n), label: String(n) }))} />
      </div>
      {conNutricion && <div className="space-y-2">
        <p className="text-body-sm font-medium text-fg">Días con comidas registradas por semana</p>
        <SegmentedControl label="Días con comidas registradas por semana" valor={String(plan.diasRegistro)} onChange={(v) => guardarPlan({ diasRegistro: Number(v) })}
          opciones={OPCIONES_DIAS_REGISTRO.map((n) => ({ valor: String(n), label: String(n) }))} />
      </div>}
      <NotaAmpliable resumen={settings.planSemanal?.length ? 'Un cambio vale desde esta semana.' : 'El primer plan vale también para las semanas anteriores.'}>
        <p>Tu plan decide cuándo una semana está cumplida y cuántos entrenos suben metros (los del plan). {settings.planSemanal?.length ? 'Las semanas anteriores conservan su plan.' : 'Después, cada cambio vale desde esa semana.'}</p>
      </NotaAmpliable>
    </>}
  </section>
}
