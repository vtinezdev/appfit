import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { updateSettings } from '../../../shared/db/settings'
import type { PlanSemanal, Settings } from '../../../shared/db/types'
import { startOfWeek, todayISO } from '../../../shared/lib/dates'
import { cambiarPlan, OPCIONES_DIAS_REGISTRO, OPCIONES_ENTRENOS, planDeSemana } from '../../ritmo/lib/plan'

interface Props {
  settings: Settings
  onError: (mensaje: string) => void
}

const ERROR = 'No se ha podido guardar el ajuste. Inténtalo de nuevo.'

/** Sección de Ajustes: mostrar u ocultar Atributos, Ritmo y Vitrina, incluir la nutrición y el plan semanal. Cada elección se guarda al tocarla. */
export default function AtributosAjustes({ settings, onError }: Props) {
  const visibles = settings.gamificacionVisible !== false
  const conNutricion = settings.gamificacionConNutricion !== false
  const lunes = startOfWeek(todayISO())
  const plan = planDeSemana(settings.planSemanal, lunes)
  const guardar = (patch: Partial<Omit<Settings, 'id'>>) => { updateSettings(patch).catch(() => onError(ERROR)) }
  const guardarPlan = (cambio: Partial<PlanSemanal>) => guardar({ planSemanal: cambiarPlan(settings.planSemanal, { ...plan, ...cambio }, lunes) })

  return <section aria-label="Atributos, Ritmo y Vitrina" className="space-y-stack">
    <SectionHeader variant="section">Atributos, Ritmo y Vitrina</SectionHeader>
    <SegmentedControl label="Mostrar Atributos, Ritmo y Vitrina" valor={visibles ? 'si' : 'no'} onChange={(v) => guardar({ gamificacionVisible: v === 'si' })}
      opciones={[{ valor: 'si', label: 'Mostrar' }, { valor: 'no', label: 'Ocultar' }]} />
    <p className="text-caption text-fg-muted">Nivel, semanas y logros en Inicio, en Más, en la revisión del lunes y al terminar un entreno. Ocultarlos no borra nada: todo sale de tus registros.</p>
    {visibles && <>
      <SegmentedControl label="Nutrición en Atributos, Ritmo y Vitrina" valor={conNutricion ? 'si' : 'no'} onChange={(v) => guardar({ gamificacionConNutricion: v === 'si' })}
        opciones={[{ valor: 'si', label: 'Con nutrición' }, { valor: 'no', label: 'Solo entreno' }]} />
      <p className="text-caption text-fg-muted">Con nutrición, registrar comidas y llegar a la proteína suman experiencia y cuentan para la semana; la Vitrina añade sus logros y el Herbario. Las kcal y el peso nunca cuentan.</p>
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
      <p className="text-caption text-fg-muted">
        Tu plan decide cuándo una semana está cumplida y cuántos entrenos suman experiencia (los del plan).{' '}
        {settings.planSemanal?.length ? 'Un cambio vale desde esta semana: las anteriores conservan su plan.' : 'El primer plan que elijas vale también para las semanas anteriores; después, cada cambio vale desde esa semana.'}
      </p>
    </>}
  </section>
}
