import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon from '../../../shared/components/Icon'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { envioDisponible } from '../../cuenta/mensajes'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import { useBusquedaCatalogo } from '../hooks/useBusquedaCatalogo'
import { elegibleDeFood, type AlimentoElegible } from '../lib/alimentos'
import { ordenarElegibles, type OrdenBusqueda } from '../lib/ordenBusqueda'
import ListaElegibles from './ListaElegibles'
import ProponerAlimentoSheet from './ProponerAlimentoSheet'

interface Props {
  /** Texto del buscador; vacío no muestra nada. */
  busqueda: string
  onElegir: (alimento: AlimentoElegible) => void
  categoria?: FiltroCategoria
  /** Ids de catálogo que el usuario ya ha usado: a igualdad de coincidencia salen primero. */
  frecuentes?: readonly string[]
  /** «Créalo tú» de «¿No está?»: abre la revisión con ese nombre. Sin él, «¿No está?» no sale. */
  onCrear?: (nombre: string) => void
  /** Orden de los resultados (lo elige «Filtrar»); por defecto, relevancia. */
  orden?: OrdenBusqueda
}

const SIN_CATALOGO = 'El catálogo de alimentos aún no se ha descargado: se descarga solo al abrir la app con conexión.'

/** Título pequeño de un grupo de resultados con cuántos hay. */
export function TituloResultados({ texto, n }: { texto: string; n?: number }) {
  return <h3 className="flex items-baseline gap-2 text-rotulo text-fg-muted">{texto}{n !== undefined && <span className="tabular">{formatInt(n)}</span>}</h3>
}

/** Si no está lo que buscas: crearlo tú o proponérselo al creador de AppFit (ADR 061). */
function NoEsta({ busqueda, onCrear, onProponer }: { busqueda: string; onCrear: (nombre: string) => void; onProponer: () => void }) {
  const fila = 'app-button flex min-h-touch w-full items-center gap-3 px-card py-3 text-left enabled:hover:bg-surface-muted'
  return <section aria-labelledby="no-esta" className="space-y-2">
    <h3 id="no-esta" className="text-rotulo text-fg-muted">¿No está «{busqueda.trim()}»?</h3>
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      <li><button type="button" className={fila} onClick={() => onCrear(busqueda.trim())}>
        <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name="pencil" size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-body font-semibold text-fg">Créalo tú</span><span className="block text-caption text-fg-muted">Con los valores de la etiqueta; queda en tus alimentos</span></span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </button></li>
      {envioDisponible && <li><button type="button" className={fila} onClick={onProponer}>
        <span aria-hidden className="icono-pastilla shrink-0 text-accent-strong"><Icon name="enviar" size={20} /></span>
        <span className="min-w-0 flex-1"><span className="block text-body font-semibold text-fg">Propónselo a AppFit</span><span className="block text-caption text-fg-muted">Para añadirlo al catálogo de todos</span></span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </button></li>}
    </ul>
  </section>
}

/**
 * Resultados de buscar un alimento (funciona sin conexión): primero tus alimentos y después el catálogo, cada grupo en
 * su tarjeta, en el orden elegido y, al final, «¿No está?».
 */
export default function ResultadosBusqueda({ busqueda, onElegir, frecuentes, categoria = 'todas', onCrear, orden = 'relevancia' }: Props) {
  const buscando = busqueda.trim() !== ''
  const propios = useLiveQuery(async () => (buscando ? filtrarPorCategoria(await foodsRepo.buscar(busqueda), categoria).map(elegibleDeFood) : undefined), [busqueda, categoria])
  const enCatalogo = useLiveQuery(() => catalogRepo.contar(), [])
  const catalogo = useBusquedaCatalogo(busqueda, undefined, frecuentes, categoria)
  const [proponiendo, setProponiendo] = useState<string | null>(null)

  if (!buscando) return null

  const listo = propios !== undefined && !catalogo.pendiente
  const total = (propios?.length ?? 0) + catalogo.alimentos.length
  const catalogoVacio = enCatalogo === 0

  return (
    <>
      {/* Anuncia el número de resultados mientras se escribe. */}
      <p role="status" className="sr-only">
        {listo ? `${total} resultados` : ''}
      </p>

      {propios && propios.length > 0 && (
        <div className="space-y-2">
          <TituloResultados texto="Tus alimentos" n={propios.length} />
          <ListaElegibles alimentos={ordenarElegibles(propios, orden)} onElegir={onElegir} consulta={busqueda} />
        </div>
      )}

      {catalogo.alimentos.length > 0 && (
        <div className="space-y-2">
          <TituloResultados texto="Catálogo" n={catalogo.alimentos.length} />
          {catalogo.corregida && <p className="text-caption text-fg-subtle">Resultados para «{catalogo.corregida}»</p>}
          <ListaElegibles alimentos={ordenarElegibles(catalogo.alimentos, orden)} onElegir={onElegir} consulta={catalogo.corregida ?? busqueda} />
        </div>
      )}

      {listo && total === 0 && <EmptyState>{catalogoVacio ? `Sin coincidencias en tus alimentos. ${SIN_CATALOGO}` : 'Sin coincidencias.'}</EmptyState>}
      {listo && total > 0 && catalogoVacio && <EmptyState>{SIN_CATALOGO}</EmptyState>}
      {listo && onCrear && <NoEsta busqueda={busqueda} onCrear={onCrear} onProponer={() => setProponiendo(busqueda.trim())} />}
      <ProponerAlimentoSheet nombre={proponiendo} onClose={() => setProponiendo(null)} />
    </>
  )
}
