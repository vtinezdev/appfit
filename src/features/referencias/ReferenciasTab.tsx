import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../shared/db/settings'
import { IDS_NUTRIENTES, referenciaNutricional, textoReferencia, type NutrienteId } from '../../shared/lib/referenciasNutricionales'
import PageHeader from '../../shared/components/PageHeader'
import { IconButton } from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import ListGroup from '../../shared/components/ListGroup'
import ListRow from '../../shared/components/ListRow'
import Disclosure from '../../shared/components/Disclosure'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import ReferenciaNutrienteContenido from './components/ReferenciaNutrienteContenido'
import { AREAS_REFERENCIAS, FUENTES_CATALOGO, GRUPOS_ALIMENTARIOS, RECOMENDACIONES_ALIMENTARIAS, SOBRE_LOS_DATOS, type AreaReferencias } from './lib/contenidoReferencias'
import { formatNumber } from '../../shared/lib/format'

export default function ReferenciasTab({ nutrienteInicial }: { nutrienteInicial?: NutrienteId }) {
  const [area, setArea] = useState<AreaReferencias | null>(nutrienteInicial ? 'objetivos' : null)
  const [abierto, setAbierto] = useState<NutrienteId | null>(nutrienteInicial ?? null)
  const settings = useLiveQuery(getSettings, [])
  const focoInicial = useRef(false)
  const indexRef = useRef<HTMLDivElement>(null)
  const referenciasRef = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const [enfocarTitulo, setEnfocarTitulo] = useState(false)

  useEffect(() => {
    if (!settings || !nutrienteInicial || focoInicial.current) return
    const button = referenciasRef.current?.querySelector<HTMLButtonElement>(`[data-referencia="${nutrienteInicial}"] button`)
    if (button) { button.focus({ preventScroll: true }); button.scrollIntoView({ block: 'start', behavior: 'instant' }); focoInicial.current = true }
  }, [settings, nutrienteInicial])
  useEffect(() => {
    if (enfocarTitulo) { tituloRef.current?.focus({ preventScroll: true }); tituloRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); setEnfocarTitulo(false) }
  }, [area, enfocarTitulo])

  function volver() {
    const anterior = area
    setArea(null)
    requestAnimationFrame(() => indexRef.current?.querySelector<HTMLButtonElement>(`[data-area="${anterior}"]`)?.focus())
  }
  const nombre = AREAS_REFERENCIAS.find(a => a.id === area)?.nombre
  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Referencias" overline="Criterios y procedencia de los datos." />
    {!area ? <div ref={indexRef}>
      <ListGroup aria-label="Áreas de referencias">
        {AREAS_REFERENCIAS.map(a => <li key={a.id}><ListRow data-area={a.id} onClick={() => { setArea(a.id); setEnfocarTitulo(true) }}>
          <span className="min-w-0 space-y-1"><span className="block break-words text-title font-semibold">{a.nombre}</span><span className="block text-body-sm text-fg-muted">{a.resumen}</span></span>
          <Icon name="chevron-right" size={20} className="text-fg-muted" />
        </ListRow></li>)}
      </ListGroup>
    </div> : <>
      <div className="flex items-start gap-2">
        <IconButton icon="arrow-left" label="Volver a Referencias" variant="ghost" onClick={volver} />
        <h2 ref={tituloRef} tabIndex={-1} className="min-w-0 break-words text-heading font-bold text-fg outline-none">{nombre}</h2>
      </div>
      {area === 'catalogo' && <div className="space-y-section text-body-sm text-fg-muted">
        <p>Calorías, proteínas, hidratos y grasas proceden de los valores disponibles en estas fuentes. Fibra, azúcares, sal y grasas saturadas pueden faltar en algunos alimentos.</p>
        {FUENTES_CATALOGO.map(f => <section key={f.id} className="space-y-2 border-t border-line pt-4">
          <h3 className="text-title font-semibold text-fg">{f.nombre}</h3><p>{f.descripcion}</p><p>{f.licencia}</p>
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center font-semibold text-accent-strong underline">Consultar {f.nombre}</a>
        </section>)}
        <p>Las cifras describen el alimento de la fuente, no una medición de tu plato. Variedad, preparación y etiquetado pueden cambiar los valores reales.</p>
      </div>}
      {area === 'objetivos' && <div ref={referenciasRef} className="space-y-3">
        <p className="text-body-sm text-fg-muted">Calorías y macros son tus objetivos editables. Los demás nutrientes usan referencias generales para adultos; consulta el criterio de cada uno.</p>
        {!settings ? <LoadingState /> : IDS_NUTRIENTES.map(id => {
          const referencia = referenciaNutricional(id, settings.objetivos)
          return <div key={id} data-referencia={id}><Disclosure title={`${referencia.nombre} · ${textoReferencia(referencia)}`} open={abierto === id} onChange={open => setAbierto(open ? id : null)}>
            <ReferenciaNutrienteContenido referencia={referencia} />
          </Disclosure></div>
        })}
      </div>}
      {area === 'alimentarias' && (RECOMENDACIONES_ALIMENTARIAS.length === 0 ? <EmptyState icon="utensils" title="Recomendaciones aún no definidas">Todavía no hay referencias por grupos de alimentos. Se mostrarán aquí cuando sus criterios y fuentes estén definidos.</EmptyState> :
        <div className="space-y-section">{RECOMENDACIONES_ALIMENTARIAS.map(r => <section key={r.grupo} className="space-y-2">
          <h3 className="text-title font-semibold text-fg">{GRUPOS_ALIMENTARIOS.find(g => g.id === r.grupo)?.nombre}</h3>
          <p className="text-body font-semibold text-fg">{r.minimo !== undefined && formatNumber(r.minimo, 1)}{r.minimo !== undefined && r.maximo !== undefined && '–'}{r.maximo !== undefined && formatNumber(r.maximo, 1)} {r.unidad}/{r.periodo === 'dia' ? 'día' : 'semana'}</p>
          <p className="text-body-sm text-fg-muted">{r.descripcion}</p><p className="text-body-sm text-fg-muted">Fuente: {r.fuente.nombre}</p>
        </section>)}</div>)}
      {area === 'datos' && <div className="space-y-section">{SOBRE_LOS_DATOS.map(d => <section key={d.titulo} className="space-y-2"><h3 className="text-title font-semibold text-fg">{d.titulo}</h3><p className="text-body-sm text-fg-muted">{d.texto}</p></section>)}</div>}
    </>}
  </div>
}
