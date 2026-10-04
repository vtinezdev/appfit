import { textoReferencia, TIPOS_REFERENCIA, type ReferenciaNutricional } from '../../../shared/lib/referenciasNutricionales'

/** Misma explicación para el detalle contextual y la sección global. */
export default function ReferenciaNutrienteContenido({ referencia }: { referencia: ReferenciaNutricional }) {
  return <div className="space-y-4 text-body-sm text-fg-muted">
    <dl className="space-y-1">
      <dt className="text-label font-semibold">Referencia diaria</dt>
      <dd className="tabular break-words text-heading font-bold text-fg">{textoReferencia(referencia)}</dd>
      <dd>{TIPOS_REFERENCIA[referencia.tipo]}</dd>
    </dl>
    <section className="space-y-2">
      <h3 className="text-body-sm font-semibold text-fg">Criterio utilizado</h3>
      <p>{referencia.descripcion}</p>
      {referencia.particularidades.map(texto => <p key={texto}>{texto}</p>)}
    </section>
    <section className="space-y-1">
      <h3 className="text-body-sm font-semibold text-fg">Fuente</h3>
      {referencia.fuente.url ? <a className="inline-flex min-h-touch items-center break-words font-semibold text-accent-strong underline" href={referencia.fuente.url} target="_blank" rel="noopener noreferrer">{referencia.fuente.nombre}</a> : <p>{referencia.fuente.nombre}</p>}
    </section>
  </div>
}
