import { useState, type ReactNode } from 'react'
import Icon from '../shared/components/Icon'
import { haptic } from '../shared/design/motion'
import ArcoSecciones from './ArcoSecciones'
import { DESTINOS, EN_ARCO, seccionDe, type Tab } from './navegacion'
export type { Tab } from './navegacion'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  /** Destinos que no se muestran (Social sin cuenta configurada). */
  ocultos?: readonly Tab[]
  /** Lo que flota pegado encima del botón (el entreno minimizado). */
  encima?: ReactNode
}

const destino = (key: Tab) => DESTINOS.find((d) => d.key === key)!

/**
 * Navegación (ADR 043): un botón redondo flotante abajo al centro abre la media luna con Inicio · Perfil · Nutrición · Entreno · Social · Ajustes
 * (Social solo con cuenta configurada). El resto de destinos se abre desde su sección, que queda marcada (`seccionDe`).
 */
export default function BottomNav({ tab, onChange, ocultos = [], encima }: Props) {
  const [arco, setArco] = useState(false)
  const actual = seccionDe(tab)
  const enArco = EN_ARCO.filter((key) => !ocultos.includes(key)).map((key) => ({ ...destino(key), actual: actual === key }))

  return (
    <nav aria-label="Navegación principal" className="app-nav">
      {encima && <div className="app-content mx-auto">{encima}</div>}
      <button type="button" className="nav-boton app-button" aria-label="Secciones" aria-haspopup="dialog" aria-expanded={arco} data-nav-trigger
        onClick={() => { haptic(); setArco(true) }}>
        <Icon name="secciones" size={24} />
      </button>
      {/* Se navega en cuanto se elige, mientras la media luna se recoge. */}
      <ArcoSecciones open={arco} destinos={enArco} onElegir={(key) => { haptic(); onChange(key) }} onClose={() => setArco(false)} />
    </nav>
  )
}
