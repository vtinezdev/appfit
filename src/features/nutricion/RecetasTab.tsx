import { useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import EditorReceta from './components/EditorReceta'
import ListaRecetas from './components/ListaRecetas'
import RecetarioAppFit from './components/RecetarioAppFit'

type Vista = 'tuyas' | 'appfit'
const VISTAS: { valor: Vista; label: string }[] = [{ valor: 'tuyas', label: 'Tuyas' }, { valor: 'appfit', label: 'AppFit' }]

/** Destino Recetas: en pestañas, tus recetas y el recetario AppFit (las del catálogo, de solo lectura). */
export default function RecetasTab() {
  const [vista, setVista] = useState<Vista>('tuyas')
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-stack px-page pt-5">
      <PageHeader title="Recetas" action={<IconButton icon="plus" label="Nueva receta" variant="primary" onClick={() => setCreando(true)} />} />
      <ViewTabs label="Recetas" nivel="principal" opciones={VISTAS} valor={vista} onChange={setVista}>
        <div className="pt-2">
          {vista === 'tuyas'
            ? <ListaRecetas sinBotonNueva vacio={
                <EmptyState icon="recetario" title="Aún no tienes recetas" action={
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setCreando(true)}><Icon name="plus" size={18} />Nueva receta</Button>
                    <Button variant="secondary" onClick={() => setVista('appfit')}>Ver las de AppFit</Button>
                  </div>
                }>Guarda tus platos y regístralos por raciones.</EmptyState>
              } />
            : <RecetarioAppFit />}
        </div>
      </ViewTabs>
      {creando && <EditorReceta onClose={() => setCreando(false)} />}
    </div>
  )
}
