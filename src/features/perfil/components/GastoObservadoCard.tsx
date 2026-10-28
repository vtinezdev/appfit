import { useState, type ReactNode } from 'react'
import Ayuda from '../../../shared/components/Ayuda'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import Interruptor from '../../../shared/components/Interruptor'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
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

/** Un mínimo con su cifra y su barra; `children` sustituye a la barra cuando hace falta otra forma. */
function Requisito({ titulo, valor, meta, children }: { titulo: string; valor: number; meta: number; children?: ReactNode }) {
  const cumplido = valor >= meta
  return <div className="space-y-2">
    <p className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="flex min-w-0 items-center gap-2 text-body-sm font-semibold text-fg">
        {cumplido && <Icon name="check" size={16} className="shrink-0 text-accent-strong" />}<span className="min-w-0 break-words">{titulo}</span>
      </span>
      <span className="tabular text-body-sm text-fg">{formatNumber(valor)} de {formatNumber(meta)}</span>
    </p>
    {children ?? <ProgressBar value={Math.min(valor, meta)} goal={meta} colorClass="bg-fg" label={titulo} valueText={`${formatNumber(valor)} de ${formatNumber(meta)}`} />}
  </div>
}

/**
 * Los dos mínimos por separado, con las cifras de los registros reales: días con comidas (barra) y semanas con pesajes
 * (un tramo por semana, lleno si tiene sus pesajes, con el día en que empieza debajo).
 */
function Requisitos({ observado }: { observado: GastoObservado }) {
  const semanas = observado.semanas
  return <div className="space-y-stack">
    <Requisito titulo="Días con comidas" valor={observado.diasRegistrados} meta={observado.diasMin} />
    <Requisito titulo="Semanas con pesajes" valor={semanasCumplidas(observado)} meta={semanas.length}>
      <ul aria-label="Pesajes por semana" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${semanas.length}, minmax(0, 1fr))` }}>
        {semanas.map((s) => {
          const ok = s.pesajes >= PESAJES_SEMANA_MIN
          return <li key={s.desde} className="min-w-0 space-y-1">
            <span aria-hidden className={`block h-2 rounded-pill ${ok ? 'bg-fg' : 'bg-surface-muted'}`} />
            <span className="tabular block break-words text-caption text-fg-muted">{diaMes(s.desde)}</span>
            <span className="sr-only">al {diaMes(s.hasta)}: {formatNumber(s.pesajes)} de {formatNumber(PESAJES_SEMANA_MIN)} pesajes{ok ? ', cumplida' : ''}</span>
          </li>
        })}
      </ul>
    </Requisito>
  </div>
}

/** Un término de la cuenta del gasto observado: qué es en grande y de dónde sale en pequeño. */
function Termino({ titulo, detalle }: { titulo: string; detalle: string }) {
  return <span className="block rounded-md bg-surface-muted px-3 py-2">
    <span className="block text-body-sm font-semibold text-fg">{titulo}</span>
    <span className="block text-caption text-fg-muted">{detalle}</span>
  </span>
}

/**
 * Cómo se calcula, sus mínimos y sus límites, tras la «i» del título: la cuenta en tres recuadros (lo que comes, menos
 * lo que cambia tu peso, es tu gasto), lo que necesita con iconos y lo que hay que tener en cuenta.
 */
function ComoSeCalcula({ observado }: { observado: GastoObservado }) {
  const signo = (t: string) => <span aria-hidden className="block text-center text-title text-fg-muted">{t}</span>
  return <Ayuda titulo="Gasto observado">
    <p>Compara lo que comes con cómo cambia tu peso en los últimos {formatNumber(DIAS_VENTANA)} días, sin contar hoy.</p>
    <div className="space-y-1" aria-label="La cuenta" role="group">
      <Termino titulo="Lo que comes" detalle="Las kcal medias de los días con comidas registradas" />
      {signo('−')}<span className="sr-only">menos</span>
      <Termino titulo="Lo que cambia tu peso" detalle={`Cuánto sube o baja tu media de 7 días, a ${formatNumber(KCAL_POR_KG)} kcal por kg`} />
      {signo('=')}<span className="sr-only">igual a</span>
      <span className="block rounded-md bg-fg px-3 py-2 text-bg">
        <span className="block text-body-sm font-semibold">Tu gasto observado</span>
        <span className="block text-caption">Lo que gastas de verdad al día, según tus registros</span>
      </span>
    </div>
    <div className="space-y-2">
      <p className="text-rotulo text-fg-muted">Qué necesita</p>
      <ul className="space-y-2">
        <li className="flex items-start gap-3"><span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg"><Icon name="utensils" size={18} /></span>
          <span className="min-w-0"><span className="block font-semibold text-fg">Comidas el {formatNumber(FRACCION_REGISTRO_MIN * 100)} % de los días</span><span className="tabular block text-caption">{formatNumber(observado.diasMin)} de los últimos {formatNumber(observado.dias)}</span></span></li>
        <li className="flex items-start gap-3"><span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg"><Icon name="scale" size={18} /></span>
          <span className="min-w-0"><span className="block font-semibold text-fg">{formatNumber(PESAJES_SEMANA_MIN)} pesajes cada semana</span><span className="tabular block text-caption">En las {formatNumber(observado.semanas.length)} semanas; la ventana nunca baja de {formatNumber(DIAS_VENTANA_MIN)} días</span></span></li>
      </ul>
    </div>
    <div className="space-y-2">
      <p className="text-rotulo text-fg-muted">Ten en cuenta</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{formatNumber(KCAL_POR_KG)} kcal por kg es una aproximación (Hall, 2008).</li>
        <li>El peso también cambia por agua, sal y digestión.</li>
        <li>Los registros de comida suelen quedarse algo cortos.</li>
        <li>Si tu peso apenas varía, el resultado es sobre todo lo que comes.</li>
      </ul>
    </div>
  </Ayuda>
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

  const detalleUso = !usando ? 'Ahora tu objetivo parte del gasto estimado.'
    : observado.estado !== 'ok' ? 'Mientras falten datos se sigue usando el estimado.'
    : 'Tu objetivo diario parte del gasto observado.'
  // Estimado y observado lado a lado: el observado, con su cifra o con «—» mientras faltan datos.
  const contenido = <div className="space-y-stack">
    <div className="grid grid-cols-2 gap-3">
      {estimado !== null && <Metric size="title" label="Estimado" valor={formatNumber(Math.round(estimado))} unidad="kcal/día" caption="Con las ecuaciones" />}
      {observado.estado === 'ok'
        ? <Metric size="title" label="Observado" valor={formatNumber(observado.gasto)} unidad="kcal/día" caption={`${formatSigned(observado.kgSemana * 1000)} g de peso por semana`} />
        : <Metric size="title" label="Observado" valor="—" caption="Faltan datos" />}
    </div>
    {observado.estado === 'ok'
      ? <p className="tabular text-body-sm text-fg-muted">Con {formatNumber(observado.kcalMedia)} kcal de media en {formatNumber(observado.diasRegistrados)} de los últimos {formatNumber(observado.dias)} días y {formatNumber(observado.pesajes)} pesajes.</p>
      : <div className="space-y-stack border-t border-line pt-3">
          <Requisitos observado={observado} />
          {requisitosCumplidos && observado.motivos.map((m) => <p key={m} className="text-body-sm text-fg-muted">{m}</p>)}
        </div>}
    <div className="border-t border-line">
      <Interruptor label="Usar el gasto observado" detalle={detalleUso} activo={usando} onChange={(v) => void cambiar(v)} />
      {error && <ErrorState>{error}</ErrorState>}
    </div>
  </div>

  if (plegado) return <section aria-label="Gasto observado"><Disclosure title="Gasto observado">
    <div className="space-y-stack"><div className="flex justify-end"><ComoSeCalcula observado={observado} /></div>{contenido}</div>
  </Disclosure></section>
  return <section className="space-y-stack">
    <SectionHeader variant="section" action={<ComoSeCalcula observado={observado} />}>Gasto observado</SectionHeader>
    <Card>{contenido}</Card>
  </section>
}
