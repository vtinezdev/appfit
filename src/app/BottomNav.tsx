import { useState, type ReactNode } from 'react'
import Icon from '../shared/components/Icon'
import { haptic } from '../shared/design/motion'
import RejillaSecciones from './RejillaSecciones'
import { DESTINOS, EN_SECCIONES, seccionDe, type Tab } from './navegacion'
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
 * Navegación (ADR 043, 060): un botón redondo flotante abajo al centro abre la rejilla con Inicio · Perfil · Nutrición · Entreno · Progreso ·
 * Social · Ajustes (Social solo con cuenta configurada). El resto de destinos se abre desde su sección, que queda marcada (`seccionDe`).
 */
export default function BottomNav({ tab, onChange, ocultos = [], encima }: Props) {
  const [abierta, setAbierta] = useState(false)
  const actual = seccionDe(tab)
  const secciones = EN_SECCIONES.filter((key) => !ocultos.includes(key)).map((key) => ({ ...destino(key), actual: actual === key }))

  return (
    <nav aria-label="Navegación principal" className="app-nav">
      {encima && <div className="app-content mx-auto">{encima}</div>}
      <button type="button" className="nav-boton app-button" aria-label="Secciones" aria-haspopup="dialog" aria-expanded={abierta} data-nav-trigger
        onClick={() => { haptic(); setAbierta(true) }}>
        <Icon name="secciones" size={24} />
      </button>
      {/* Se navega en cuanto se elige, mientras la rejilla se recoge. */}
      <RejillaSecciones open={abierta} destinos={secciones} onElegir={(key) => { haptic(); onChange(key) }} onClose={() => setAbierta(false)} />
    </nav>
  )
}
