import { useLiveQuery } from 'dexie-react-hooks'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import { useBusquedaCatalogo } from '../hooks/useBusquedaCatalogo'
import { elegibleDeFood, type AlimentoElegible } from '../lib/alimentos'
import ListaElegibles from './ListaElegibles'

interface Props {
  /** Texto del buscador; vacío no muestra nada. */
  busqueda: string
  onElegir: (alimento: AlimentoElegible) => void
  /** Ids de catálogo que el usuario ya ha usado: a igualdad de coincidencia salen primero. */
  frecuentes?: readonly string[]
}

const SIN_CATALOGO = 'El catálogo de alimentos aún no se ha descargado: se descarga solo al abrir la app con conexión.'

/** Resultados de buscar un alimento (funciona sin conexión): primero tus alimentos y después el catálogo. */
export default function ResultadosBusqueda({ busqueda, onElegir, frecuentes }: Props) {
  const buscando = busqueda.trim() !== ''
  const propios = useLiveQuery(async () => (buscando ? (await foodsRepo.buscar(busqueda)).map(elegibleDeFood) : undefined), [busqueda])
  const enCatalogo = useLiveQuery(() => catalogRepo.contar(), [])
  const catalogo = useBusquedaCatalogo(busqueda, undefined, frecuentes)

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
        <div className="space-y-1">
          <SectionHeader variant="section">Tus alimentos</SectionHeader>
          <ListaElegibles alimentos={propios} onElegir={onElegir} />
        </div>
      )}

      {catalogo.alimentos.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Catálogo</SectionHeader>
          {catalogo.corregida && <p className="text-caption text-fg-subtle">Resultados para «{catalogo.corregida}»</p>}
          <ListaElegibles alimentos={catalogo.alimentos} onElegir={onElegir} />
        </div>
      )}

      {listo && total === 0 && <EmptyState>{catalogoVacio ? `Sin coincidencias en tus alimentos. ${SIN_CATALOGO}` : 'Sin coincidencias.'}</EmptyState>}
      {listo && total > 0 && catalogoVacio && <EmptyState>{SIN_CATALOGO}</EmptyState>}
    </>
  )
}
