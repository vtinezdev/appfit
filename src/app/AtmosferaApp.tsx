import type { Tab } from './navegacion'

/** Una fotografía local por ámbito. Referencias/Ajustes subordinan aún más la imagen a la lectura. */
const AMBIENTES: Record<Tab, 'inicio' | 'nutricion' | 'gym'> = {
  inicio: 'inicio', nutricion: 'nutricion', gym: 'gym', referencias: 'nutricion', ajustes: 'inicio',
}

/** Decoración fuera del flujo: no captura gestos ni contiene texto/datos del producto. */
export default function AtmosferaApp({ tab }: { tab: Tab }) {
  return <div className="app-atmosphere" aria-hidden="true" data-quiet={tab === 'referencias' || tab === 'ajustes'}>
    <img key={AMBIENTES[tab]} src={`/images/atmosferas/${AMBIENTES[tab]}.webp`} alt=""
      width={960} height={1440} decoding="async" fetchPriority={tab === 'inicio' ? 'high' : 'auto'} />
  </div>
}
