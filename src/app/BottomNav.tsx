import { useRef, useState } from 'react'
import Icon from '../shared/components/Icon'
import ListGroup from '../shared/components/ListGroup'
import ListRow from '../shared/components/ListRow'
import Sheet from '../shared/components/Sheet'
import { haptic } from '../shared/design/motion'
import { DESTINOS, EN_MAS, type Tab } from './navegacion'
export type { Tab } from './navegacion'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  /** El «+» central: abre las acciones rápidas. */
  onAcciones: () => void
  accionesAbiertas?: boolean
}

const destino = (key: Tab) => DESTINOS.find((d) => d.key === key)!

/** Barra fija: Inicio · Nutrición · [+] · Entreno · Más. «Más» abre una hoja con Perfil, Referencias y Ajustes. */
export default function BottomNav({ tab, onChange, onAcciones, accionesAbiertas = false }: Props) {
  const [mas, setMas] = useState(false)
  const elegido = useRef<Tab | null>(null)
  const enMas = EN_MAS.includes(tab)

  function pestana(key: Tab) {
    const d = destino(key)
    return <li key={key}>
      <button type="button" className="tab-item app-button" aria-current={tab === key ? 'page' : undefined} onClick={() => { haptic(); onChange(key) }}>
        <Icon name={d.icon} size={22} /><span className="tab-label">{d.label}</span>
      </button>
    </li>
  }

  return (
    <nav aria-label="Navegación principal" className="app-nav safe-bottom z-40 shrink-0 bg-bg">
      <ul className="tab-bar mx-auto grid h-nav max-w-lg grid-cols-5 items-center px-2">
        {pestana('inicio')}
        {pestana('nutricion')}
        <li className="flex justify-center">
          <button type="button" className="tab-plus app-button" aria-label="Registrar" aria-haspopup="dialog" aria-expanded={accionesAbiertas} data-nav-trigger
            onClick={() => { haptic(); onAcciones() }}>
            <Icon name="plus" size={26} />
          </button>
        </li>
        {pestana('gym')}
        <li>
          <button type="button" className="tab-item app-button" aria-current={enMas ? 'page' : undefined} aria-haspopup="dialog" aria-expanded={mas}
            onClick={() => { haptic(); elegido.current = null; setMas(true) }}>
            <Icon name="more" size={22} /><span className="tab-label">Más</span>
          </button>
        </li>
      </ul>
      <Sheet open={mas} onClose={() => setMas(false)} title="Más"
        onExited={() => { const key = elegido.current; elegido.current = null; if (key) onChange(key) }}>
        <ListGroup variante="plana" aria-label="Más secciones">
          {EN_MAS.map((key) => {
            const d = destino(key)
            return <li key={key}><ListRow aria-current={tab === key ? 'page' : undefined} onClick={() => { haptic(); elegido.current = key; setMas(false) }}>
              <span className="flex min-w-0 items-center gap-3"><Icon name={d.icon} size={20} className="text-fg-muted" /><span className="text-body font-semibold text-fg">{d.label}</span></span>
              {tab === key ? <Icon name="check" size={18} label="Sección actual" className="text-accent-strong" /> : <Icon name="chevron-right" size={18} className="text-fg-subtle" />}
            </ListRow></li>
          })}
        </ListGroup>
      </Sheet>
    </nav>
  )
}
