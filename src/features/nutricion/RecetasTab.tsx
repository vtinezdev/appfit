import PageHeader from '../../shared/components/PageHeader'
import ListaRecetas from './components/ListaRecetas'

/** Destino Recetas (prototipo): la misma lista que Alimentos › Recetas, con su ficha de lectura. */
export default function RecetasTab() {
  return (
    <div className="space-y-3 px-page pt-5">
      <PageHeader title="Recetas" overline="Lo que aportan y cómo se preparan" />
      <ListaRecetas />
    </div>
  )
}
