import { useState } from 'react'
import Ayuda from '../shared/components/Ayuda'
import { IconButton } from '../shared/components/Button'
import Interruptor from '../shared/components/Interruptor'
import ListGroup from '../shared/components/ListGroup'
import { updateSettings } from '../shared/db/settings'
import type { Settings } from '../shared/db/types'
import * as creatinaRepo from '../features/inicio/data/creatinaRepo'
import { AL_APAGAR, MODULOS, moduloActivo, moverTarjeta, NOMBRE_MODULO, NOMBRE_TARJETA, ordenTarjetas, tarjetaVisible } from '../shared/lib/modulos'

const ERROR = 'No se ha podido guardar el ajuste. Inténtalo de nuevo.'
const AL_APAGAR_CREATINA = 'Al activarla, su tarjeta sale en Inicio; la dosis y la fase de carga se ajustan en Ajustes › Creatina. Apagarla conserva tus tomas.'

/**
 * Ajustes › «Lo que usas» (B9): qué módulos se ven, con lo que pasa al apagarlos, y el orden de las tarjetas de Inicio.
 * Ocultar nunca borra datos. Cada elección se guarda al tocarla.
 */
export default function ModulosAjustes({ settings, onError }: { settings: Settings; onError: (mensaje: string) => void }) {
  const guardar = (patch: Partial<Omit<Settings, 'id'>>) => { updateSettings(patch).catch(() => onError(ERROR)) }
  // El orden se lleva también aquí: dos toques seguidos no esperan a que vuelva la lectura de los ajustes.
  const [orden, setOrden] = useState(() => ordenTarjetas(settings))
  const mover = (t: (typeof orden)[number], delta: -1 | 1) => {
    const siguiente = moverTarjeta(orden, t, delta)
    setOrden(siguiente)
    guardar({ ordenInicio: siguiente })
  }
  // Igual con los módulos: dos cambios seguidos no pisan el primero con una lectura antigua.
  const [modulos, setModulos] = useState(settings.modulos)
  const encender = (m: (typeof MODULOS)[number], activo: boolean) => {
    const siguiente = { ...modulos }
    if (activo) delete siguiente[m]
    else siguiente[m] = false
    const valor = Object.keys(siguiente).length ? siguiente : undefined
    setModulos(valor)
    guardar({ modulos: valor })
  }
  // Creatina no es un módulo de `Settings.modulos`: tiene su propia configuración, que conserva al apagarla.
  const [creatina, setCreatina] = useState(settings.creatina?.activa === true)
  const encenderCreatina = (activa: boolean) => {
    setCreatina(activa)
    creatinaRepo.configurar({ activa }).catch(() => { setCreatina(!activa); onError(ERROR) })
  }
  const actual = { ...settings, modulos, creatina: { ...settings.creatina, activa: creatina } }

  return <div className="space-y-section">
    <section aria-labelledby="modulos" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="modulos" className="text-title text-fg">Módulos</h3>
        <Ayuda titulo="Qué pasa al ocultar un módulo">
          <p>Tus registros siguen en el móvil y en la copia de seguridad: al activarlo vuelve tal cual.</p>
          <ul className="space-y-2">
            {MODULOS.map((m) => <li key={m}><span className="font-semibold text-fg">{NOMBRE_MODULO[m]}.</span> {AL_APAGAR[m]}</li>)}
            <li><span className="font-semibold text-fg">Creatina.</span> {AL_APAGAR_CREATINA}</li>
          </ul>
        </Ayuda>
      </div>
      <ListGroup aria-label="Módulos" pie="Ocultar un módulo no borra nada.">
        {MODULOS.map((m) => <li key={m}>
          <Interruptor label={NOMBRE_MODULO[m]} activo={moduloActivo(actual, m)} onChange={(v) => encender(m, v)} />
        </li>)}
        <li><Interruptor label="Creatina" activo={creatina} onChange={encenderCreatina} /></li>
      </ListGroup>
    </section>

    <section aria-labelledby="ordenar-inicio" className="space-y-2">
      <h3 id="ordenar-inicio" className="text-title text-fg">Ordenar Inicio</h3>
      <ListGroup aria-label="Tarjetas de Inicio" pie="Los avisos y la revisión del lunes van siempre arriba.">
        {orden.map((t, i) => {
          const visible = tarjetaVisible(actual, t)
          return <li key={t} className="flex min-h-touch items-center gap-2 py-1">
            <span className={`min-w-0 flex-1 ${visible ? '' : 'opacity-50'}`}>
              <span className="block break-words text-body-sm font-semibold text-fg">{NOMBRE_TARJETA[t]}</span>
              {!visible && <span className="block text-caption text-fg-muted">Oculta con su módulo</span>}
            </span>
            <IconButton icon="chevron-left" className="rotate-90" variant="ghost" size="sm" label={`Subir ${NOMBRE_TARJETA[t]}`} disabled={i === 0}
              onClick={() => mover(t, -1)} />
            <IconButton icon="chevron-right" className="rotate-90" variant="ghost" size="sm" label={`Bajar ${NOMBRE_TARJETA[t]}`} disabled={i === orden.length - 1}
              onClick={() => mover(t, 1)} />
          </li>
        })}
      </ListGroup>
    </section>
  </div>
}
