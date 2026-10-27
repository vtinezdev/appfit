import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useLiveQuery } from 'dexie-react-hooks'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import * as catalogRepo from '../data/catalogRepo'
import * as foodsRepo from '../data/foodsRepo'
import * as recetasRepo from '../data/recetasRepo'
import { useBusquedaCatalogo } from '../hooks/useBusquedaCatalogo'
import { elegibleDeFood, type AlimentoElegible } from '../lib/alimentos'
import { marcarRecetasPropias } from '../lib/recetas'
import ListaElegibles from './ListaElegibles'

interface Props {
  /** Texto del buscador; vacío no muestra nada. */
  busqueda: string
  onElegir: (alimento: AlimentoElegible) => void
  /** Ids de catálogo que el usuario ya ha usado: a igualdad de coincidencia salen primero. */
  categoria?: FiltroCategoria
  frecuentes?: readonly string[]
}

const SIN_CATALOGO = 'El catálogo de alimentos aún no se ha descargado: se descarga solo al abrir la app con conexión.'

/** Resultados de buscar un alimento (funciona sin conexión): las recetas (tuyas y del catálogo), tus alimentos y los del catálogo. */
export default function ResultadosBusqueda({ busqueda, onElegir, frecuentes, categoria = 'todas' }: Props) {
  const buscando = busqueda.trim() !== ''
  const propios = useLiveQuery(async () => {
    if (!buscando) return undefined
    const foods = filtrarPorCategoria(await foodsRepo.buscar(busqueda), categoria)
    return marcarRecetasPropias(foods.map(elegibleDeFood), await recetasRepo.porAlimentos(foods.map((f) => f.id)))
  }, [busqueda, categoria])
  const enCatalogo = useLiveQuery(() => catalogRepo.contar(), [])
  const catalogo = useBusquedaCatalogo(busqueda, undefined, frecuentes, categoria)

  if (!buscando) return null

  // Recetas (tuyas primero) en su propio grupo, para que no se confundan con los alimentos sueltos.
  const recetas = [...(propios ?? []), ...catalogo.alimentos].filter((a) => a.receta)
  const alimentosPropios = propios?.filter((a) => !a.receta) ?? []
  const alimentosCatalogo = catalogo.alimentos.filter((a) => !a.receta)
  const listo = propios !== undefined && !catalogo.pendiente
  const total = (propios?.length ?? 0) + catalogo.alimentos.length
  const catalogoVacio = enCatalogo === 0

  return (
    <>
      {/* Anuncia el número de resultados mientras se escribe. */}
      <p role="status" className="sr-only">
        {listo ? `${total} resultados` : ''}
      </p>

      {catalogo.corregida && catalogo.alimentos.length > 0 && <p className="text-caption text-fg-subtle">Resultados del catálogo para «{catalogo.corregida}»</p>}

      {recetas.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Recetas</SectionHeader>
          <ListaElegibles alimentos={recetas} onElegir={onElegir} />
        </div>
      )}

      {alimentosPropios.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Tus alimentos</SectionHeader>
          <ListaElegibles alimentos={alimentosPropios} onElegir={onElegir} />
        </div>
      )}

      {alimentosCatalogo.length > 0 && (
        <div className="space-y-1">
          <SectionHeader variant="section">Alimentos del catálogo</SectionHeader>
          <ListaElegibles alimentos={alimentosCatalogo} onElegir={onElegir} />
        </div>
      )}

      {listo && total === 0 && <EmptyState>{catalogoVacio ? `Sin coincidencias en tus alimentos. ${SIN_CATALOGO}` : 'Sin coincidencias.'}</EmptyState>}
      {listo && total > 0 && catalogoVacio && <EmptyState>{SIN_CATALOGO}</EmptyState>}
    </>
  )
}
