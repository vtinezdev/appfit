import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import ListaRecetas from './components/ListaRecetas'
import RecetarioAppFit from './components/RecetarioAppFit'

/** Destino Recetas: tus recetas arriba y, debajo, el recetario AppFit (las del catálogo, de solo lectura). */
export default function RecetasTab() {
  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title="Recetas" overline="Lo que aportan y cómo se preparan" />
      <section aria-label="Tus recetas" className="space-y-stack">
        <SectionHeader variant="section">Tus recetas</SectionHeader>
        <ListaRecetas />
      </section>
      <section aria-label="Recetario AppFit" className="space-y-stack">
        <SectionHeader variant="section">Recetario AppFit</SectionHeader>
        <RecetarioAppFit />
      </section>
    </div>
  )
}
