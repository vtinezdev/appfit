import type { NutrientesAdicionales } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { resumenNutrientes } from '../lib/nutrientes'
import ProgressBar from '../../../shared/components/ProgressBar'
import Disclosure from '../../../shared/components/Disclosure'
import { energiaDeReferencia, FUENTES_REFERENCIAS, referenciasNutrientes } from '../lib/referenciasNutrientes'

interface Props {
  entries: { nutrientes?: NutrientesAdicionales }[]
  titulo?: string
  /** Solo el diario compara con referencias DIARIAS; la revisión de un alimento no. */
  objetivoKcal?: number
}

/** Valores adicionales con cobertura explícita para no ocultar los datos desconocidos. */
export default function NutrientesDetalle({ entries, titulo = 'Nutrientes adicionales', objetivoKcal }: Props) {
  const resumen = resumenNutrientes(entries)
  const incompleto = resumen.some((n) => n.conocidos < n.total)
  const referencias = objetivoKcal === undefined ? undefined : referenciasNutrientes(objetivoKcal)
  const energia = energiaDeReferencia(objetivoKcal ?? 0)
  const textoReferencia = (clave: keyof NutrientesAdicionales) => {
    const gramos = referencias?.[clave].gramos ?? 0
    if (clave === 'fibra') return `Mín. ${formatNumber(gramos, 1)} g · sin máximo indicado`
    if (clave === 'azucares') return `Referencia ${formatNumber(gramos, 1)} g · totales`
    if (clave === 'sal') return `Límite < ${formatNumber(gramos, 1)} g · sin mínimo indicado`
    return `Máx. ${formatNumber(gramos, 1)} g · 10% de ${formatInt(energia)} kcal`
  }
  return (
    <section aria-label={titulo} className="space-y-2 border-t border-line pt-3">
      <h3 className="text-label font-semibold text-fg-muted">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-3">
        {resumen.map(({ clave, label, valor, conocidos, total }) => (
          <div key={clave} className="min-w-0 space-y-1">
            <dt className="text-label text-fg-muted">{label}</dt>
            <dd className="space-y-1">
              <span className="tabular block break-words text-body font-semibold text-fg">{valor === undefined ? 'Sin datos' : `${formatNumber(valor, 3)} g`}</span>
              {conocidos > 0 && conocidos < total && (
                <span className="mt-1 block text-caption font-normal text-fg-muted">Parcial · {formatInt(conocidos)} de {formatInt(total)} alimentos</span>
              )}
              {referencias && (
                <>
                  {valor !== undefined ? <ProgressBar value={valor} goal={referencias[clave].gramos} label={`${label}: consumo diario conocido`}
                    valueText={`${formatNumber(valor, 3)} g${conocidos < total ? ', suma parcial' : ''}. ${textoReferencia(clave)}.`} /> :
                    <div aria-hidden className="h-1.5 rounded-sm bg-surface-muted" />}
                  <p className="text-caption text-fg-muted">{textoReferencia(clave)}</p>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {incompleto && <p className="text-caption text-fg-muted">Solo se suman los valores conocidos. Los alimentos sin datos no cuentan como cero.</p>}
      {referencias && <Disclosure title="Referencias diarias y fuentes">
        <div className="space-y-3 text-body-sm text-fg-muted">
          <p>Referencias generales para adultos. La marca de cada barra indica un mínimo, un límite o un valor de referencia, según el nutriente; superar una referencia no equivale siempre a superar un límite.</p>
          <p>Fibra: al menos 25 g al día. Sal: menos de 5 g. Grasas saturadas: como máximo el 10% de la energía; aquí se calcula con {formatInt(energia)} kcal, a 9 kcal por gramo.</p>
          <p>Azúcares: se registran los totales. Los 90 g son una referencia europea de etiquetado para 2.000 kcal, no un máximo recomendado. La OMS recomienda menos del 10% de energía en azúcares libres (idealmente menos del 5%); los datos disponibles no permiten separarlos de los totales.</p>
          <div className="flex flex-wrap gap-x-4">
            <a className="inline-flex min-h-touch items-center font-semibold text-accent-strong underline" href={FUENTES_REFERENCIAS.oms} target="_blank" rel="noopener noreferrer">OMS: alimentación</a>
            <a className="inline-flex min-h-touch items-center font-semibold text-accent-strong underline" href={FUENTES_REFERENCIAS.sal} target="_blank" rel="noopener noreferrer">OMS: sal</a>
            <a className="inline-flex min-h-touch items-center font-semibold text-accent-strong underline" href={FUENTES_REFERENCIAS.ue} target="_blank" rel="noopener noreferrer">UE: anexo XIII</a>
          </div>
        </div>
      </Disclosure>}
    </section>
  )
}
