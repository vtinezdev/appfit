import { useId, useState } from 'react'
import Icon from '../shared/components/Icon'
import Button from '../shared/components/Button'
import Sheet from '../shared/components/Sheet'
import RuedaNavegacion from './RuedaNavegacion'
import { DESTINOS, type Tab } from './navegacion'
export type { Tab } from './navegacion'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

/** Un único botón con espacio propio; abre una rueda dentro de la capa compartida. */
export default function BottomNav({ tab, onChange }: Props) {
  const [abierto, setAbierto] = useState(false)
  const menuId = useId()
  const contextoId = useId()
  const actual = DESTINOS.find((destino) => destino.key === tab)!
  return (
    <nav aria-label="Navegación principal" className="safe-bottom z-40 shrink-0 bg-bg">
      <div className="mx-auto flex h-nav max-w-lg items-center justify-center px-page">
        <Button variant="secondary" size="lg" className="rounded-pill px-6" aria-label="Menú" aria-haspopup="dialog"
          aria-expanded={abierto} aria-controls={menuId} aria-describedby={contextoId} data-nav-trigger
          onClick={() => setAbierto(true)}>
          <Icon name="menu" size={22} />
          Menú
        </Button>
        <span id={contextoId} className="sr-only">Sección actual: {actual.label}</span>
      </div>
      <Sheet id={menuId} open={abierto} onClose={() => setAbierto(false)} title="Menú">
        <RuedaNavegacion destinos={DESTINOS} actual={tab} onClose={() => setAbierto(false)} onElegir={(destino) => { setAbierto(false); onChange(destino) }} />
      </Sheet>
    </nav>
  )
}
