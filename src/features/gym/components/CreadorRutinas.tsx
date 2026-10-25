import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import { startOfWeek, todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import ModalPage from '../../../shared/components/ModalPage'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import FilterChips from '../../../shared/components/FilterChips'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { planDeSemana } from '../../ritmo/lib/plan'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as setsRepo from '../data/setsRepo'
import { CATALOGO_POR_ID, EQUIPAMIENTO, MUSCULOS } from '../lib/catalogoEjercicios'
import {
  DIAS_CREADOR, DURACIONES, MATERIALES, MUSCULOS_PRIORIZABLES, OBJETIVOS_CREADOR, REPARTOS, cambiarEjercicio, diasPorDefecto, generarPlan, otraSugerencia,
  sugerenciasCambio, type ContextoCreador, type Material, type ObjetivoCreador, type PlanCreador, type RespuestasCreador,
} from '../lib/creadorRutinas'
import { catalogoDeLocal, opcionesEjercicios, type SeleccionEjercicio } from '../lib/selectorEjercicios'
import { textoObjetivo } from '../lib/objetivos'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import SelectorEjercicios from './SelectorEjercicios'
import { textoAgarre } from '../lib/agarres'

interface Props {
  onClose: () => void
  /** Tras guardar: los ids de las rutinas creadas, en orden. */
  onGuardado: (ids: number[]) => void
}

type Hueco = { dia: number; indice: number }

const PRIORIZABLES = Object.fromEntries(MUSCULOS_PRIORIZABLES.map((m) => [m, MUSCULOS[m]])) as Record<(typeof MUSCULOS_PRIORIZABLES)[number], string>
const descanso = (seg?: number) => (seg ? ` · ${formatInt(seg)} s` : '')

/**
 * Creador de rutinas por reglas: preguntas en una pantalla, vista previa del plan con «Cambiar», «Otra sugerencia» y
 * «Regenerar todo», y nada se guarda hasta «Guardar». La lógica está en `lib/creadorRutinas`.
 */
export default function CreadorRutinas({ onClose, onGuardado }: Props) {
  const settings = useLiveQuery(() => getSettings(), [])
  const locales = useLiveQuery(() => exercisesRepo.listar(), [])
  const series = useLiveQuery(() => setsRepo.todas(), [])
  const [elegidas, setRespuestas] = useState<RespuestasCreador | null>(null)
  const [plan, setPlan] = useState<PlanCreador | null>(null)
  const [semilla, setSemilla] = useState(0)
  const [cambiando, setCambiando] = useState<Hueco | null>(null)
  const [eligiendo, setEligiendo] = useState<Hueco | null>(null)
  const elegirOtro = useRef<Hueco | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const opciones = useMemo(() => opcionesEjercicios(locales ?? []), [locales])
  const ctx: ContextoCreador = useMemo(() => {
    const delCatalogo = opciones.filter((o) => o.catalogId && CATALOGO_POR_ID.has(o.catalogId))
    return { disponibles: new Set(delCatalogo.map((o) => o.catalogId!)), nombres: new Map(delCatalogo.map((o) => [o.catalogId!, o.name])) }
  }, [opciones])
  const hechos = useMemo(() => {
    const porId = new Map((locales ?? []).map((e) => [e.id, e]))
    return new Set((series ?? []).flatMap((s) => { const e = porId.get(s.exerciseId); const c = e && catalogoDeLocal(e); return c ? [c.id] : [] }))
  }, [locales, series])

  if (!settings || !locales || !series) return <ModalPage title="Crear con el asistente" onClose={onClose}><LoadingState /></ModalPage>
  const respuestas: RespuestasCreador = elegidas
    ?? { dias: diasPorDefecto(planDeSemana(settings.planSemanal, startOfWeek(todayISO())).entrenos), duracion: 60, material: 'gimnasio', objetivo: 'hipertrofia', prioridad: [] }
  const cambiar = (c: Partial<RespuestasCreador>) => setRespuestas({ ...respuestas, ...c })

  function verPlan(nueva: number) {
    setError(null)
    setSemilla(nueva)
    setPlan(generarPlan(respuestas, nueva, ctx))
  }

  async function guardar() {
    if (!plan || guardando) return
    setGuardando(true)
    setError(null)
    try {
      onGuardado(await routinesRepo.guardarPlan(plan))
      onClose()
    } catch {
      setError('No se han podido guardar las rutinas. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function elegirDelSelector(valor: SeleccionEjercicio) {
    if (!plan || !eligiendo) return
    const local = valor.tipo === 'local' ? locales!.find((e) => e.id === valor.id) : undefined
    const catalogId = valor.tipo === 'catalogo' ? valor.catalogId : local ? catalogoDeLocal(local)?.id : undefined
    const nombre = valor.tipo === 'personalizado' ? valor.nombre.trim() : local?.nombre ?? (catalogId && (ctx.nombres?.get(catalogId) ?? CATALOGO_POR_ID.get(catalogId)?.name)) ?? 'Ejercicio'
    setPlan(cambiarEjercicio(plan, eligiendo.dia, eligiendo.indice, { seleccion: valor, nombre, catalogId }, respuestas.objetivo))
  }

  if (!plan) {
    return <ModalPage title="Crear con el asistente" onClose={onClose}
      footer={<Button block onClick={() => verPlan(0)}>Ver el plan</Button>}>
      <div className="space-y-section">
        <p className="text-body-sm text-fg-muted">Responde y te propongo un plan de rutinas, una por día. Podrás cambiar cualquier ejercicio antes de guardarlo.</p>
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">Días por semana</p>
          <SegmentedControl label="Días por semana" valor={String(respuestas.dias)} onChange={(v) => cambiar({ dias: Number(v) as RespuestasCreador['dias'] })}
            opciones={DIAS_CREADOR.map((n) => ({ valor: String(n), label: String(n) }))} />
          <p className="text-caption text-fg-muted">{REPARTOS[respuestas.dias].nombre}: {REPARTOS[respuestas.dias].dias.map((d) => d.nombre).join(' · ')}.</p>
        </div>
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">Tiempo por sesión</p>
          <SegmentedControl label="Tiempo por sesión" valor={String(respuestas.duracion)} onChange={(v) => cambiar({ duracion: Number(v) as RespuestasCreador['duracion'] })}
            opciones={DURACIONES.map((n) => ({ valor: String(n), label: `${n} min` }))} />
        </div>
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">Material</p>
          <SegmentedControl label="Material" variante="vertical" valor={respuestas.material} onChange={(v) => cambiar({ material: v })}
            opciones={(Object.keys(MATERIALES) as Material[]).map((m) => ({ valor: m, label: MATERIALES[m].label, descripcion: MATERIALES[m].descripcion }))} />
        </div>
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">Objetivo</p>
          <SegmentedControl label="Objetivo" valor={respuestas.objetivo} onChange={(v) => cambiar({ objetivo: v })}
            opciones={(Object.keys(OBJETIVOS_CREADOR) as ObjetivoCreador[]).map((o) => ({ valor: o, label: OBJETIVOS_CREADOR[o] }))} />
        </div>
        <FilterChips label="Músculos a priorizar (opcional)" opciones={PRIORIZABLES} seleccion={respuestas.prioridad.filter((m): m is keyof typeof PRIORIZABLES => m in PRIORIZABLES)}
          onChange={(prioridad) => cambiar({ prioridad })} />
      </div>
    </ModalPage>
  }

  const enCambio = cambiando && plan.dias[cambiando.dia]?.ejercicios[cambiando.indice]
  const sugerencias = cambiando ? sugerenciasCambio(plan, cambiando.dia, cambiando.indice, respuestas.material, hechos, ctx) : []
  const excluir = eligiendo ? plan.dias[eligiendo.dia].ejercicios.flatMap((e) => {
    if (e.seleccion.tipo === 'local') return [e.seleccion.id]
    const local = opciones.find((o) => o.catalogId === e.catalogId)?.localId
    return local === undefined ? [] : [local]
  }) : []
  const n = plan.dias.length

  return <ModalPage title="Tu plan" onClose={onClose} busy={guardando}
    footer={<div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="flex-1" disabled={guardando} onClick={() => verPlan(semilla + 1)}>Regenerar todo</Button>
        <Button className="flex-1" loading={guardando} onClick={guardar}>{`Guardar ${formatInt(n)} rutinas`}</Button>
      </div>
    </div>}>
    <div className="space-y-section">
      <div className="space-y-2">
        <p className="text-body-sm text-fg-muted">
          {REPARTOS[respuestas.dias].nombre} · {formatInt(respuestas.dias)} días · {formatInt(respuestas.duracion)} min · {MATERIALES[respuestas.material].label} · {OBJETIVOS_CREADOR[respuestas.objetivo]}
        </p>
        <Button variant="ghost" size="sm" className="-ml-3" disabled={guardando} onClick={() => setPlan(null)}>Cambiar respuestas</Button>
      </div>
      {plan.dias.map((d, dia) => <section key={d.nombre} aria-label={d.nombre} className="space-y-2">
        <SectionHeader variant="section">{d.nombre}</SectionHeader>
        <p className="tabular text-caption text-fg-muted">{formatInt(d.ejercicios.length)} ejercicios · {formatInt(d.ejercicios.reduce((s, e) => s + e.objetivo.series, 0))} series</p>
        <ListGroup variante="plana" aria-label={`Ejercicios de ${d.nombre}`}>
          {d.ejercicios.map((e, indice) => <li key={`${indice}-${e.catalogId ?? e.nombre}`} className="flex items-center gap-1">
            <ListRow tone="flat" className="min-w-0 flex-1" aria-haspopup="dialog" aria-label={`Cambiar ${e.nombre}`} disabled={guardando}
              onClick={() => setCambiando({ dia, indice })}>
              <MiniaturaEjercicio catalogId={e.catalogId} />
              <span className="min-w-0 flex-1 break-words">
                <span className="block text-body font-semibold text-fg">{e.nombre}</span>
                {e.seleccion.agarre !== undefined && <span className="block text-caption text-fg-muted">{textoAgarre(e.seleccion.agarre) || 'Agarre sin especificar'}</span>}
                <span className="tabular block text-caption text-fg-muted">{textoObjetivo(e.objetivo)}{descanso(e.objetivo.descansoSeg)}</span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
            </ListRow>
            <IconButton icon="sparkles" label={`Otra sugerencia para ${e.nombre}`} variant="ghost" disabled={guardando}
              onClick={() => setPlan(otraSugerencia(plan, dia, indice, respuestas, ctx))} />
          </li>)}
        </ListGroup>
      </section>)}
    </div>

    <Sheet open={cambiando !== null} onClose={() => setCambiando(null)} title={enCambio ? `Cambiar ${enCambio.nombre}` : 'Cambiar ejercicio'}
      onExited={() => { if (elegirOtro.current) { setEligiendo(elegirOtro.current); elegirOtro.current = null } }}
      footer={<Button variant="secondary" block onClick={() => { elegirOtro.current = cambiando; setCambiando(null) }}>Elegir otro…</Button>}>
      {sugerencias.length === 0 ? <p className="text-body-sm text-fg-muted">No hay más ejercicios de este tipo con tu material. Elige otro del catálogo.</p> : (
        <ListGroup variante="plana" aria-label="Sugerencias">
          {sugerencias.map((s) => <li key={s.id}>
            <ListRow tone="flat" onClick={() => {
              if (cambiando) setPlan(cambiarEjercicio(plan, cambiando.dia, cambiando.indice, { seleccion: { tipo: 'catalogo', catalogId: s.id }, nombre: ctx.nombres?.get(s.id) ?? s.name, catalogId: s.id }, respuestas.objetivo))
              setCambiando(null)
            }}>
              <MiniaturaEjercicio catalogId={s.id} />
              <span className="min-w-0 flex-1 break-words">
                <span className="block text-body font-semibold text-fg">{ctx.nombres?.get(s.id) ?? s.name}</span>
                <span className="block text-caption text-fg-muted">
                  {[s.primaryMuscles.map((m) => MUSCULOS[m]).join(', '), s.equipment.map((q) => EQUIPAMIENTO[q]).join(', '), hechos.has(s.id) && 'Ya lo has hecho'].filter(Boolean).join(' · ')}
                </span>
              </span>
            </ListRow>
          </li>)}
        </ListGroup>
      )}
    </Sheet>
    {eligiendo && <SelectorEjercicios excluir={excluir} onClose={() => setEligiendo(null)} onElegir={elegirDelSelector} />}
  </ModalPage>
}
