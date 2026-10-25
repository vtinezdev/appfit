import { useState, type ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Perfil } from '../../../shared/db/types'
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as perfilRepo from '../data/perfilRepo'
import { actualizarObjetivoHoy } from '../data/objetivosDiaRepo'
import { KCAL_POR_KG, formatSigned, type ResultadoEnergia } from '../lib/energia'
import { DIAS_VENTANA, DIAS_VENTANA_MIN, FRACCION_REGISTRO_MIN, PESAJES_SEMANA_MIN, semanasCumplidas, type GastoObservado } from '../lib/gastoObservado'

interface Props {
  perfil: Perfil
  energia: ResultadoEnergia
  observado: GastoObservado
  hoy: string
  /** Con el perfil incompleto se pliega en un desplegable para no ocupar la pantalla. */
  plegado?: boolean
}

const diaMes = (iso: string) => formatDiaMes(parseISODate(iso).getTime())

function Requisito({ titulo, valor, meta, detalle, children }: { titulo: string; valor: number; meta: number; detalle: string; children?: ReactNode }) {
  const cumplido = valor >= meta
  return <div className="space-y-2">
    <p className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="flex min-w-0 items-center gap-2 text-body-sm font-semibold text-fg">
        {cumplido && <Icon name="check" size={16} className="shrink-0 text-accent-strong" />}<span className="min-w-0 break-words">{titulo}</span>
      </span>
      <span className="tabular text-body-sm text-fg">{formatNumber(valor)} de {formatNumber(meta)}</span>
    </p>
    <ProgressBar value={Math.min(valor, meta)} goal={meta} colorClass="bg-fg" label={titulo} valueText={`${formatNumber(valor)} de ${formatNumber(meta)}`} />
    <p className="text-caption text-fg-muted">{detalle}</p>
    {children}
  </div>
}

/** Los dos mínimos por separado, con las cifras de los registros reales: días con comidas y semanas con pesajes. */
function Requisitos({ observado }: { observado: GastoObservado }) {
  const semanas = observado.semanas
  return <div className="space-y-stack">
    <Requisito titulo="Días con comidas" valor={observado.diasRegistrados} meta={observado.diasMin}
      detalle={`Al menos ${formatNumber(observado.diasMin)} de los últimos ${formatNumber(observado.dias)} días, sin contar hoy.`} />
    <Requisito titulo="Semanas con pesajes" valor={semanasCumplidas(observado)} meta={semanas.length}
      detalle={`${formatNumber(PESAJES_SEMANA_MIN)} pesajes en cada una de las ${formatNumber(semanas.length)} semanas.`}>
      <ul aria-label="Pesajes por semana" className="flex flex-wrap gap-2">
        {semanas.map((s) => {
          const ok = s.pesajes >= PESAJES_SEMANA_MIN
          return <li key={s.desde} className="min-w-0 flex-1 basis-28 rounded-md bg-surface-muted px-3 py-2">
            <span className="tabular block break-words text-caption text-fg-muted">{diaMes(s.desde)} – {diaMes(s.hasta)}</span>
            <span className="tabular flex items-center gap-1 text-body-sm font-semibold text-fg">
              {ok && <Icon name="check" size={16} className="shrink-0 text-accent-strong" />}
              {formatNumber(s.pesajes)} de {formatNumber(PESAJES_SEMANA_MIN)}<span className="sr-only">{ok ? ' pesajes: cumplida' : ' pesajes'}</span>
            </span>
          </li>
        })}
      </ul>
    </Requisito>
  </div>
}

/** Gasto observado junto al estimado, con el progreso de sus requisitos y la opción de usarlo como gasto diario (desactivada por defecto). */
export default function GastoObservadoCard({ perfil, energia, observado, hoy, plegado = false }: Props) {
  const [error, setError] = useState<string | null>(null)
  const usando = perfil.usarGastoObservado === true
  const estimado = energia.estado === 'ok' ? energia.getEstimado : null
  const requisitosCumplidos = observado.diasRegistrados >= observado.diasMin && semanasCumplidas(observado) === observado.semanas.length

  async function cambiar(usar: boolean) {
    setError(null)
    try {
      await perfilRepo.guardarPerfil({ usarGastoObservado: usar })
      void actualizarObjetivoHoy(hoy, 'perfil')
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
    }
  }

  const contenido = <div className="space-y-stack">
    {observado.estado === 'ok' ? <>
      <div className="grid grid-cols-2 gap-3">
        <Metric size="title" label="Observado" valor={formatNumber(observado.gasto)} unidad="kcal/día" caption={`${formatSigned(observado.kgSemana * 1000)} g de peso por semana`} />
        {estimado !== null && <Metric size="title" label="Estimado" valor={formatNumber(Math.round(estimado))} unidad="kcal/día" caption="Ecuaciones" />}
      </div>
      <p className="tabular text-body-sm text-fg-muted">Con {formatNumber(observado.kcalMedia)} kcal de media en {formatNumber(observado.diasRegistrados)} de los últimos {formatNumber(observado.dias)} días y {formatNumber(observado.pesajes)} pesajes.</p>
    </> : <>
      <p className="text-body-sm text-fg-muted">Se calcula cuando se cumplen los dos requisitos.</p>
      <Requisitos observado={observado} />
      {requisitosCumplidos && observado.motivos.map((m) => <p key={m} className="text-body-sm text-fg-muted">{m}</p>)}
    </>}
    <div className="space-y-2">
      <SegmentedControl label="Usar el gasto observado" valor={usando ? 'si' : 'no'} onChange={(v) => void cambiar(v === 'si')}
        opciones={[{ valor: 'no', label: 'Usar el estimado' }, { valor: 'si', label: 'Usar el observado' }]} />
      {usando && observado.estado !== 'ok' && <p className="text-body-sm text-warning">Mientras falten datos se sigue usando el gasto estimado.</p>}
      {energia.estado === 'ok' && energia.origenGet === 'observado' && <p className="text-body-sm text-fg-muted">Tu objetivo diario parte ahora del gasto observado.</p>}
      {error && <ErrorState>{error}</ErrorState>}
    </div>
    <Disclosure title="Cómo se calcula y sus límites">
      <div className="space-y-2 text-body-sm text-fg-muted">
        <p>Compara lo que comes con cómo cambia tu peso. Gasto = kcal medias registradas − (pendiente de la media de peso de 7 días, en kg/día) × {formatNumber(KCAL_POR_KG)} kcal/kg. Se usan los últimos {formatNumber(DIAS_VENTANA)} días sin contar hoy.</p>
        <p>Requisitos: comidas registradas al menos el {formatNumber(FRACCION_REGISTRO_MIN * 100)} % de los días ({formatNumber(Math.ceil(DIAS_VENTANA * FRACCION_REGISTRO_MIN))} de {formatNumber(DIAS_VENTANA)}) y {formatNumber(PESAJES_SEMANA_MIN)} pesajes en cada semana. La ventana nunca baja de {formatNumber(DIAS_VENTANA_MIN)} días.</p>
        <p>{formatNumber(KCAL_POR_KG)} kcal por kg es solo una aproximación (Hall, 2008). El peso también cambia por agua, sal y digestión, y los registros de comida suelen quedarse algo cortos, así que el resultado es orientativo. Cambia de verdad con cambios de peso reales: si tu peso apenas varía, el gasto observado es sobre todo lo que comes.</p>
      </div>
    </Disclosure>
  </div>

  if (plegado) return <section aria-label="Gasto observado"><Disclosure title="Gasto observado">{contenido}</Disclosure></section>
  return <section className="space-y-stack">
    <SectionHeader variant="section">Gasto observado</SectionHeader>
    <Card>{contenido}</Card>
  </section>
}
