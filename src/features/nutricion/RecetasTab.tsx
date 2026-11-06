import { useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import EditorReceta from './components/EditorReceta'
import ListaRecetas from './components/ListaRecetas'
import RecetarioAppFit from './components/RecetarioAppFit'
import { useDePago } from '../desbloqueo/DesbloqueoContext'
import AvisoPruebaTerminada from '../desbloqueo/components/AvisoPruebaTerminada'

type Vista = 'tuyas' | 'appfit'
const VISTAS: { valor: Vista; label: string }[] = [{ valor: 'appfit', label: 'Cumbra Fit' }, { valor: 'tuyas', label: 'Tuyas' }]

/** Destino Recetas: en pestañas, tus recetas y el recetario Cumbra Fit (las del catálogo, de solo lectura). */
export default function RecetasTab() {
  const [vista, setVista] = useState<Vista>('tuyas')
  const [creando, setCreando] = useState(false)
  const { proteger } = useDePago()
  const nueva = proteger(() => setCreando(true))

  return (
    <div className="space-y-stack px-page pt-5">
      <PageHeader title="Recetas" action={<IconButton icon="plus" label="Nueva receta" variant="primary" onClick={nueva} />} />
      <AvisoPruebaTerminada seccion="tus recetas y las de Cumbra Fit" />
      <ViewTabs label="Recetas" nivel="principal" opciones={VISTAS} valor={vista} onChange={setVista}>
        <div className="pt-2">
          {vista === 'tuyas'
            ? <ListaRecetas sinBotonNueva vacio={
                <EmptyState icon="recetario" title="Aún no tienes recetas" action={
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={nueva}><Icon name="plus" size={18} />Nueva receta</Button>
                    <Button variant="secondary" onClick={() => setVista('appfit')}>Ver las de Cumbra Fit</Button>
                  </div>
                } />
              } />
            : <RecetarioAppFit />}
        </div>
      </ViewTabs>
      {creando && <EditorReceta onClose={() => setCreando(false)} />}
    </div>
  )
}
