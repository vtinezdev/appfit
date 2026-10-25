import { lazy, Suspense, useState } from 'react'
import { puntosTendencia, type PeriodoTendencia, type PuntoTendencia } from '../lib/tendencias'
import { todayISO, parseISODate } from '../lib/dates'
import { formatNumber } from '../lib/format'
import SegmentedControl from './SegmentedControl'
import Disclosure from './Disclosure'
import { LoadingState } from './StateMessage'

const Grafica = lazy(() => import('./GraficaTendencia'))
const PERIODOS: PeriodoTendencia[] = ['30', '90', 'todo']

/** Gráfica diferida y cifras equivalentes accesibles. Los periodos solo filtran: nunca escriben. */
export default function TendenciaRegistros({ puntos, unidad, titulo, diaria = false, periodos = PERIODOS }: {
  puntos: PuntoTendencia[]; unidad: string; titulo: string; diaria?: boolean; periodos?: PeriodoTendencia[]
}) {
  const [periodo, setPeriodo] = useState<PeriodoTendencia>(periodos[0])
  const datos = puntosTendencia(puntos, periodo, todayISO())
  const diferencia = datos.length > 1 ? datos[datos.length - 1].valor - datos[0].valor : null
  return <section aria-label={`Evolución de ${titulo}`} className="min-w-0 space-y-3">
    <SegmentedControl label={`Periodo de ${titulo}`} valor={periodo} onChange={setPeriodo} opciones={periodos.map(p => ({ valor: p, label: p === 'todo' ? 'Todo' : `${p} días` }))} />
    {!datos.length ? <p className="text-body-sm text-fg-muted">Sin registros en este periodo.</p> : <>
      <p className="text-caption text-fg-muted">{formatNumber(datos.length)} {datos.length === 1 ? 'día registrado' : 'días registrados'}. {diaria ? 'Los días sin registro no cuentan como cero; los huecos interrumpen la línea.' : 'Solo se muestran las mediciones registradas.'}</p>
      <div role="img" aria-label={`${titulo} en ${unidad}. Valores disponibles en «Ver datos de ${titulo}».`}>
        <Suspense fallback={<LoadingState>Cargando gráfica…</LoadingState>}><Grafica puntos={datos} unidad={unidad} diaria={diaria} /></Suspense>
      </div>
      {!diaria && diferencia !== null && <p className="tabular text-body-sm text-fg-muted">Cambio entre el primer y el último registro: {diferencia > 0 ? '+' : ''}{formatNumber(diferencia, 1)} {unidad}.</p>}
      <Disclosure title={`Ver datos de ${titulo}`}>
        <table className="w-full text-left text-body-sm">
          <caption className="sr-only">Registros de {titulo} en el periodo elegido</caption>
          <thead><tr><th scope="col" className="py-2 font-semibold">Fecha</th><th scope="col" className="py-2 text-right font-semibold">{unidad}</th></tr></thead>
          <tbody className="divide-y divide-line">{[...datos].reverse().map(p => <tr key={p.fecha}><th scope="row" className="py-2 font-normal text-fg-muted">{parseISODate(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</th><td className="tabular py-2 text-right text-fg">{formatNumber(p.valor, unidad === 'ml' ? 0 : 1)}</td></tr>)}</tbody>
        </table>
      </Disclosure>
    </>}
  </section>
}
