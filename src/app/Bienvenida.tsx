import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../shared/components/Button'
import EnlacesLegales from '../shared/components/EnlacesLegales'
import Icon from '../shared/components/Icon'
import ListGroup from '../shared/components/ListGroup'
import { MarcaLogotipo } from '../shared/components/Marca'
import ModalPage from '../shared/components/ModalPage'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import { getSettings, updateSettings } from '../shared/db/settings'
import { EDAD_MINIMA } from '../shared/lib/legal'
import GamificacionAjustes from '../features/ritmo/components/GamificacionAjustes'
import ModulosAjustes from './ModulosAjustes'
import { AL_TERMINAR, pasosBienvenida, sistemasExplicados, TITULO_PASO } from './bienvenida'

const PerfilTab = lazy(() => import('../features/perfil/PerfilTab'))

const PROMESAS = [
  { icon: 'utensils', texto: 'Comidas, entrenos, actividades, peso y medidas, en una sola app.' },
  { icon: 'escudo', texto: 'Tus registros se quedan en tu móvil. Sin anuncios y sin cuenta obligatoria.' },
  { icon: 'zap', texto: 'Funciona sin conexión, también en el gimnasio.' },
] as const

/**
 * Bienvenida de una instalación nueva (ADR 066), por pasos: entrada con la edad y los textos legales, lo que vas a usar,
 * tu perfil para el objetivo diario y la semana con Cumbres, Ritmo y Liga. Cada paso usa los ajustes de siempre (se
 * guardan al tocarlos) y, salvo el primero, se puede pasar con «Ahora no». «Volver» lleva al paso anterior.
 */
export default function Bienvenida() {
  const settings = useLiveQuery(() => getSettings(), [])
  const [i, setI] = useState(0)
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terminando, setTerminando] = useState(false)
  if (!settings) return null

  const pasos = pasosBienvenida(settings)
  const paso = pasos[Math.min(i, pasos.length - 1)]
  const ultimo = i >= pasos.length - 1

  function siguiente() {
    setError(null)
    if (paso === 'entrada' && !acepto) {
      setError(`Confirma que tienes ${EDAD_MINIMA} años o más y aceptas las condiciones de uso y la política de privacidad.`)
      return
    }
    if (!ultimo) { setI(i + 1); return }
    setTerminando(true)
    updateSettings(AL_TERMINAR).catch(() => { setTerminando(false); setError('No se ha podido guardar. Inténtalo de nuevo.') })
  }
  /** «Volver» y Atrás: al paso anterior; en el primero no se sale (hay que aceptar o no usar la app). */
  function antesDeCerrar() {
    setError(null)
    if (i > 0) setI(i - 1)
    return false
  }

  const pie = <div className="space-y-2">
    {error && <ErrorState>{error}</ErrorState>}
    <Button variant="primary" block loading={terminando} onClick={siguiente}>
      {paso === 'entrada' ? 'Empezar' : ultimo ? 'Empezar a usar Cumbra Fit' : 'Continuar'}
    </Button>
    {paso === 'perfil' && <Button variant="ghost" block disabled={terminando} onClick={() => { setError(null); setI(i + 1) }}>Ahora no</Button>}
  </div>

  return (
    <ModalPage title={TITULO_PASO[paso]} busy={terminando || i === 0}
      onClose={() => undefined} onBeforeClose={antesDeCerrar} footer={pie}>
      <div className="space-y-section" data-paso-bienvenida={paso}>
        <p className="text-caption text-fg-muted">Paso {i + 1} de {pasos.length}</p>

        {paso === 'entrada' && <>
          <MarcaLogotipo alto={40} />
          <ul className="space-y-3">
            {PROMESAS.map((p) => <li key={p.icon} className="flex items-start gap-3 text-body text-fg">
              <Icon name={p.icon} size={20} className="mt-0.5 shrink-0 text-accent-strong" />{p.texto}
            </li>)}
          </ul>
          <div className="space-y-1">
            <label className="flex min-h-touch items-center gap-3 text-body-sm text-fg">
              <input type="checkbox" checked={acepto} onChange={(e) => { setAcepto(e.target.checked); setError(null) }} className="h-5 w-5 shrink-0 accent-accent" />
              Tengo {EDAD_MINIMA} años o más y acepto las condiciones de uso y la política de privacidad
            </label>
            <EnlacesLegales paginas={['condiciones', 'privacidad']} />
          </div>
        </>}

        {paso === 'modulos' && <>
          <p className="text-body-sm text-fg-muted">Oculta lo que no vayas a usar. Puedes cambiarlo cuando quieras en Ajustes › Lo que usas.</p>
          <ModulosAjustes settings={settings} onError={setError} conOrden={false} />
        </>}

        {paso === 'perfil' && <>
          <p className="text-body-sm text-fg-muted">Con tu sexo, edad, altura, peso, actividad y objetivo, Cumbra Fit calcula cuántas calorías y proteína te tocan al día. Se quedan en tu móvil. Si lo dejas para luego, contará lo que comes sin compararlo con ningún objetivo.</p>
          <Suspense fallback={<LoadingState />}><PerfilTab enBienvenida /></Suspense>
        </>}

        {paso === 'semana' && <>
          <ListGroup aria-label="Cómo se sigue tu progreso">
            {sistemasExplicados(settings).map((s) => <li key={s.nombre} className="flex items-start gap-3 py-3">
              <Icon name={s.icon} size={20} className="mt-0.5 shrink-0 text-fg-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-fg">{s.nombre}</span>
                <span className="block text-body-sm text-fg-muted">{s.texto}</span>
              </span>
            </li>)}
          </ListGroup>
          <GamificacionAjustes settings={settings} onError={setError} />
        </>}
      </div>
    </ModalPage>
  )
}
