import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomNav, { type Tab } from './BottomNav'
import InicioTab from '../features/inicio/InicioTab'
import type { SeccionEntreno } from '../features/gym/GymTab'
import type { SeccionAjustes } from './seccionesAjustes'
import { retornoDeReferencias, type OrigenReferencias } from './volver'
import TrasladarDatos from './TrasladarDatos'
import AtmosferaApp from './AtmosferaApp'
import { LoadingState } from '../shared/components/StateMessage'
import type { NutrienteId } from '../shared/lib/referenciasNutricionales'
import type { Comida } from '../shared/db/types'
import type { AreaReferencias } from '../features/referencias/lib/contenidoReferencias'
import type { DestinoProgreso } from '../features/inicio/components/AccesoProgreso'
import * as workoutsRepo from '../features/gym/data/workoutsRepo'
import EntrenoMinimizado from '../features/gym/components/EntrenoMinimizado'
import { socialDisponible } from '../features/social/servicio'
import { useHoy } from '../shared/hooks/useHoy'
import { getSettings } from '../shared/db/settings'
import { destinosOcultos } from './navegacion'
import { vistaDeTesela, type VistaProgreso } from '../features/progreso/lib/vistas'

const NutricionTab = lazy(() => import('../features/nutricion/NutricionTab'))
const GymTab = lazy(() => import('../features/gym/GymTab'))
const Ajustes = lazy(() => import('./Ajustes'))
const ReferenciasTab = lazy(() => import('../features/referencias/ReferenciasTab'))
const PerfilTab = lazy(() => import('../features/perfil/PerfilTab'))
const ProgresoTab = lazy(() => import('../features/progreso/ProgresoTab'))
const AmigosTab = lazy(() => import('../features/social/AmigosTab'))
const SocialTab = lazy(() => import('../features/social/SocialTab'))

export default function App() {
  // Actualiza también las pantallas derivadas de la fecha al volver después de medianoche.
  useHoy()
  const [anadirAmigo, setAnadirAmigo] = useState(false)
  const [tab, setTab] = useState<Tab>('inicio')
  const [seccionAjustes, setSeccionAjustes] = useState<SeccionAjustes | undefined>(undefined)
  const [seccionEntreno, setSeccionEntreno] = useState<SeccionEntreno | undefined>(undefined)
  const [referenciaInicial, setReferenciaInicial] = useState<NutrienteId | undefined>(undefined)
  /** Comida con la que Nutrición abre Añadir comida (el «Añadir …» de Inicio). */
  const [anadirInicial, setAnadirInicial] = useState<Comida | undefined>(undefined)
  const [areaReferencias, setAreaReferencias] = useState<AreaReferencias | undefined>(undefined)
  /** De dónde se abrió Referencias, para su «Volver». */
  const [origenReferencias, setOrigenReferencias] = useState<OrigenReferencias>('ajustes')
  /** Lo que recupera el foco tras un «Volver» (la tesela de Inicio o la fila Referencias de Ajustes). */
  const [focoVuelta, setFocoVuelta] = useState<DestinoProgreso | 'referencias' | undefined>(undefined)
  /** Progreso (B12): la pestaña con la que se abre y, si se entró por una tesela de Inicio, cuál (para «‹ Inicio» y el foco). */
  const [vistaProgreso, setVistaProgreso] = useState<VistaProgreso | undefined>(undefined)
  const [teselaOrigen, setTeselaOrigen] = useState<DestinoProgreso | undefined>(undefined)
  const scrollRef = useRef<HTMLElement>(null)
  const entrenoActivo = useLiveQuery(() => workoutsRepo.activo(), [])
  /** Si el entreno en curso ocupa Entreno. Salir de la pantalla lo minimiza; la barra sobre la navegación lo vuelve a abrir. */
  const [entrenoAbierto, setEntrenoAbierto] = useState(false)
  const settings = useLiveQuery(() => getSettings(), [])
  // Sin proyecto de Supabase no hay cuenta, y sin cuenta no hay Social (ni Amigos, que se abre desde Social). Los módulos
  // apagados en Ajustes (B9) tampoco salen.
  const ocultos: Tab[] = destinosOcultos(settings, socialDisponible)
  const entrenoMinimizado = entrenoActivo && !(tab === 'gym' && entrenoAbierto) ? entrenoActivo : undefined

  function navegar(siguiente: Tab) {
    setSeccionAjustes(undefined)
    setReferenciaInicial(undefined)
    setAnadirInicial(undefined)
    setAreaReferencias(undefined)
    setSeccionEntreno(undefined)
    setEntrenoAbierto(false)
    setFocoVuelta(undefined)
    setVistaProgreso(undefined)
    setTeselaOrigen(undefined)
    setTab(siguiente)
    scrollRef.current?.scrollTo({ top: 0 })
  }
  function abrirAmigos(anadir = false) {
    navegar('amigos')
    setAnadirAmigo(anadir)
  }
  function irAEntreno(seccion?: SeccionEntreno) {
    navegar('gym')
    setSeccionEntreno(seccion)
  }
  /** Entreno con su sesión en curso a la vista (si no hay, la pestaña de siempre). */
  function abrirEntreno() {
    irAEntreno()
    setEntrenoAbierto(true)
  }
  function irAAjustes(seccion?: SeccionAjustes) {
    navegar('ajustes')
    setSeccionAjustes(seccion)
  }
  function abrirReferencias(origen: OrigenReferencias) {
    navegar('referencias')
    setOrigenReferencias(origen)
  }
  /** Una tesela de Inicio abre Progreso en su pestaña, con «‹ Inicio». */
  function abrirProgreso(desde: DestinoProgreso) {
    navegar('progreso')
    setVistaProgreso(vistaDeTesela(desde))
    setTeselaOrigen(desde)
  }
  /** «‹ Inicio» de Progreso: vuelve con el foco en la tesela por la que se entró. */
  function volverAInicio(desde: DestinoProgreso) {
    navegar('inicio')
    setFocoVuelta(desde)
  }
  const retornoReferencias = retornoDeReferencias(origenReferencias)
  function volverDeReferencias() {
    navegar(retornoReferencias.tab)
    if (retornoReferencias.enfocarFila) setFocoVuelta('referencias')
  }

  return (
    <div data-app-shell data-mini-entreno={entrenoMinimizado ? '' : undefined} className="app-shell fixed inset-x-0 flex h-app flex-col bg-bg">
      {/* El fondo vive fuera del contenedor con scroll: queda quieto mientras el contenido se desplaza. */}
      <div className="relative isolate min-h-0 flex-1">
      <AtmosferaApp tab={tab} />
      <main ref={scrollRef} className="safe-top safe-inline h-full overflow-y-auto overscroll-contain">
        <div key={tab} data-atmosphere={tab} className="app-view app-content mx-auto w-full">
        {tab === 'inicio' && <InicioTab onIrANutricion={() => navegar('nutricion')} onAnadirComida={c => { navegar('nutricion'); setAnadirInicial(c) }} onIrAGym={abrirEntreno} onIrAProgreso={abrirProgreso} enfocarProgreso={focoVuelta === 'referencias' ? undefined : focoVuelta} onExportarCopia={() => irAAjustes('copias')} onRevisarCuenta={() => irAAjustes('cuenta')} onIrAAmigos={() => abrirAmigos()} onIrASocial={() => navegar('social')} onRevisarActualizaciones={() => irAAjustes('actualizaciones')}
          ayudaInicial={<TrasladarDatos onVerInstrucciones={() => irAAjustes('instalacion')} />} />}
        {tab === 'nutricion' && <Suspense fallback={<LoadingState />}><NutricionTab anadirInicial={anadirInicial} onVerReferencia={id => { abrirReferencias('nutricion'); setReferenciaInicial(id) }} /></Suspense>}
        {tab === 'gym' && <Suspense fallback={<LoadingState />}><GymTab seccionInicial={seccionEntreno} entrenoAbierto={entrenoAbierto} onAbrirEntreno={() => setEntrenoAbierto(true)} onMinimizarEntreno={() => setEntrenoAbierto(false)} /></Suspense>}
        {tab === 'perfil' && <Suspense fallback={<LoadingState />}><PerfilTab onVerMetodo={() => { abrirReferencias('perfil'); setAreaReferencias('energia') }} /></Suspense>}
        {tab === 'progreso' && <Suspense fallback={<LoadingState />}><ProgresoTab key={`${vistaProgreso ?? 'semana'}-${teselaOrigen ?? ''}`} vistaInicial={vistaProgreso} onIrAAjustes={() => irAAjustes('gamificacion')} onIrAActividades={() => irAEntreno('actividades')} onVolver={teselaOrigen ? () => volverAInicio(teselaOrigen) : undefined} /></Suspense>}
        {tab === 'social' && <Suspense fallback={<LoadingState />}><SocialTab onIrAAmigos={abrirAmigos} onIrAGym={abrirEntreno} onIrACuenta={() => irAAjustes('cuenta')} /></Suspense>}
        {tab === 'amigos' && <Suspense fallback={<LoadingState />}><AmigosTab anadirInicial={anadirAmigo} onIrACuenta={() => irAAjustes('cuenta')} onVolver={() => navegar('social')} /></Suspense>}
        {tab === 'ajustes' && <Suspense fallback={<LoadingState />}><Ajustes seccionInicial={seccionAjustes} onIrAPerfil={() => navegar('perfil')} onIrAReferencias={() => abrirReferencias('ajustes')} enfocarReferencias={focoVuelta === 'referencias'} /></Suspense>}
        {tab === 'referencias' && <Suspense fallback={<LoadingState />}><ReferenciasTab nutrienteInicial={referenciaInicial} areaInicial={areaReferencias} salida={{ etiqueta: retornoReferencias.etiqueta, onVolver: volverDeReferencias }} /></Suspense>}
        </div>
      </main>
      </div>
      <BottomNav tab={tab} onChange={navegar} ocultos={ocultos}
        encima={entrenoMinimizado && <EntrenoMinimizado key={entrenoMinimizado.id} workout={entrenoMinimizado} onAbrir={abrirEntreno} />} />
    </div>
  )
}
