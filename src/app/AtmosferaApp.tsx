import { useSyncExternalStore } from 'react'
import type { Tab } from './navegacion'
import { getResolvedTheme, subscribeTheme } from '../shared/design/theme'

/** Una fotografía local por ámbito. Referencias/Ajustes subordinan aún más la imagen a la lectura. */
const AMBIENTES: Record<Tab, 'inicio' | 'nutricion' | 'gym'> = {
  inicio: 'inicio', nutricion: 'nutricion', gym: 'gym', perfil: 'inicio', referencias: 'nutricion', ajustes: 'inicio',
}

/** Decoración fuera del flujo: no captura gestos ni contiene texto/datos del producto. */
export default function AtmosferaApp({ tab }: { tab: Tab }) {
  const theme = useSyncExternalStore(subscribeTheme, getResolvedTheme, getResolvedTheme)
  const scene = `${AMBIENTES[tab]}${theme === 'light' ? '-claro' : ''}`
  return <div className="app-atmosphere mx-auto max-w-lg" aria-hidden="true" data-scene={AMBIENTES[tab]} data-quiet={tab === 'referencias' || tab === 'ajustes'}>
    <img key={scene} src={`/images/atmosferas/${scene}.webp`} alt=""
      width={960} height={1440} decoding="async" fetchPriority={tab === 'inicio' ? 'high' : 'auto'} />
  </div>
}
