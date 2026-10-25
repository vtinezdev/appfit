import FiltroCategoriaBusqueda from './FiltroCategoriaBusqueda'
import { filtrarPorCategoria, type FiltroCategoria } from '../lib/repartoCategorias'
import { useState } from 'react'
import { SearchInput } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import Sheet from '../../../shared/components/Sheet'
import type { AlimentoElegible, ItemRevision } from '../lib/alimentos'
import ListaElegibles from './ListaElegibles'
import ResultadosBusqueda from './ResultadosBusqueda'

interface Props {
  /** El ítem que se cambia; `null` cierra el sheet. */
  item: ItemRevision | null
  onElegir: (alimento: AlimentoElegible) => void
  onClose: () => void
}

/** «Cambiar» un alimento de la revisión: otras opciones que encajaban y un buscador en tus alimentos y el catálogo. */
export default function CambiarAlimentoSheet({ item, onElegir, onClose }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<FiltroCategoria>('todas')
  const alternativas = filtrarPorCategoria(item?.origen.alternativas ?? [], categoria)

  function cerrar() {
    setBusqueda('')
    setCategoria('todas')
    onClose()
  }

  return (
    <Sheet open={item !== null} onClose={cerrar} title="Cambiar alimento">
      <div className="space-y-3">
        <SearchInput
          aria-label="Buscar otro alimento"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar otro alimento…"
        />
        <FiltroCategoriaBusqueda valor={categoria} onChange={setCategoria} />
        {busqueda.trim() === '' && alternativas.length > 0 && (
          <div className="space-y-1">
            <SectionHeader variant="section">Otras opciones</SectionHeader>
            <ListaElegibles
              alimentos={alternativas}
              onElegir={(a) => {
                setBusqueda('')
                onElegir(a)
              }}
            />
          </div>
        )}
        <ResultadosBusqueda categoria={categoria}
          busqueda={busqueda}
          onElegir={(a) => {
            setBusqueda('')
            onElegir(a)
          }}
        />
      </div>
    </Sheet>
  )
}
