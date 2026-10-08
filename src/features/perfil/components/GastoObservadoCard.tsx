import { useState } from 'react'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Perfil } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import * as perfilRepo from '../data/perfilRepo'
import { actualizarObjetivoHoy } from '../data/objetivosDiaRepo'
import { KCAL_POR_KG, formatSigned, type ResultadoEnergia } from '../lib/energia'
import { DIAS_VENTANA, DIAS_VENTANA_MIN, PESAJES_SEMANA_MIN, type GastoObservado } from '../lib/gastoObservado'

interface Props {
  perfil: Perfil
  energia: ResultadoEnergia
  observado: GastoObservado
  hoy: string
}

/** Gasto observado junto al estimado, con su estado de datos y la opción de usarlo como gasto diario (desactivada por defecto). */
export default function GastoObservadoCard({ perfil, energia, observado, hoy }: Props) {
  const [error, setError] = useState<string | null>(null)
  const usando = perfil.usarGastoObservado === true
  const estimado = energia.estado === 'ok' ? energia.getEstimado : null

  async function cambiar(usar: boolean) {
    setError(null)
    try {
      await perfilRepo.guardarPerfil({ usarGastoObservado: usar })
      void actualizarObjetivoHoy(hoy, 'perfil')
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
    }
  }

  return <section className="space-y-stack">
    <SectionHeader variant="section">Gasto observado</SectionHeader>
    <Card className="space-y-stack">
      {observado.estado === 'ok' ? <>
        <div className="grid grid-cols-2 gap-3">
          <Metric size="title" label="Observado" valor={formatNumber(observado.gasto)} unidad="kcal/día" caption={`${formatSigned(observado.kgSemana * 1000)} g de peso por semana`} />
          {estimado !== null && <Metric size="title" label="Estimado" valor={formatNumber(Math.round(estimado))} unidad="kcal/día" caption="Ecuaciones" />}
        </div>
        <p className="tabular text-body-sm text-fg-muted">Con {formatNumber(observado.kcalMedia)} kcal de media en {formatNumber(observado.diasRegistrados)} de los últimos {formatNumber(observado.dias)} días y {formatNumber(observado.pesajes)} pesajes.</p>
      </> : <>
        <p className="text-body-sm text-fg-muted">Todavía no hay datos suficientes para calcularlo. Compara lo que comes con cómo cambia tu peso durante al menos {formatNumber(DIAS_VENTANA_MIN)} días, con casi todos los días registrados y {formatNumber(PESAJES_SEMANA_MIN)} pesajes por semana.</p>
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-fg-muted">{observado.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
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
          <p>Gasto = kcal medias registradas − (pendiente de la media de peso de 7 días, en kg/día) × {formatNumber(KCAL_POR_KG)} kcal/kg. Se usan los últimos {formatNumber(DIAS_VENTANA)} días sin contar hoy.</p>
          <p>{formatNumber(KCAL_POR_KG)} kcal por kg es solo una aproximación (Hall, 2008). El peso también cambia por agua, sal y digestión, y los registros de comida suelen quedarse algo cortos, así que el resultado es orientativo. Cambia de verdad con cambios de peso reales: si tu peso apenas varía, el gasto observado es sobre todo lo que comes.</p>
        </div>
      </Disclosure>
    </Card>
  </section>
}
