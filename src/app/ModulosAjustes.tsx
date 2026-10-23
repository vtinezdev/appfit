import { useState } from 'react'
import { IconButton } from '../shared/components/Button'
import ListGroup from '../shared/components/ListGroup'
import NotaAmpliable from '../shared/components/NotaAmpliable'
import SegmentedControl from '../shared/components/SegmentedControl'
import { updateSettings } from '../shared/db/settings'
import type { Settings } from '../shared/db/types'
import { AL_APAGAR, MODULOS, moduloActivo, moverTarjeta, NOMBRE_MODULO, NOMBRE_TARJETA, ordenTarjetas, tarjetaVisible } from '../shared/lib/modulos'

const ERROR = 'No se ha podido guardar el ajuste. Inténtalo de nuevo.'

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
  const actual = { ...settings, modulos }
  const encender = (m: (typeof MODULOS)[number], activo: boolean) => {
    const siguiente = { ...modulos }
    if (activo) delete siguiente[m]
    else siguiente[m] = false
    const valor = Object.keys(siguiente).length ? siguiente : undefined
    setModulos(valor)
    guardar({ modulos: valor })
  }

  return <div className="space-y-section">
    <section aria-label="Módulos" className="space-y-stack">
      <NotaAmpliable resumen="Ocultar un módulo no borra nada: vuelve tal cual al activarlo."><p>Tus registros siguen en el móvil y en la copia de seguridad.</p></NotaAmpliable>
      {MODULOS.map((m) => {
        const activo = moduloActivo(actual, m)
        return <div key={m} className="space-y-1">
          <SegmentedControl label={NOMBRE_MODULO[m]} valor={activo ? 'si' : 'no'} onChange={(v) => encender(m, v === 'si')}
            opciones={[{ valor: 'si', label: `Usar ${NOMBRE_MODULO[m].toLowerCase()}` }, { valor: 'no', label: 'Ocultar' }]} />
          <p className="break-words text-caption text-fg-muted">{AL_APAGAR[m]}</p>
        </div>
      })}
    </section>

    <section aria-labelledby="ordenar-inicio" className="space-y-2">
      <h3 id="ordenar-inicio" className="text-title text-fg">Ordenar Inicio</h3>
      <ListGroup variante="plana" aria-label="Tarjetas de Inicio">
        {orden.map((t, i) => {
          const visible = tarjetaVisible(actual, t)
          return <li key={t} className="flex min-h-touch items-center gap-2 py-1">
            <span className="min-w-0 flex-1">
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
      <p className="text-caption text-fg-muted">Los avisos y la revisión del lunes siguen arriba.</p>
    </section>
  </div>
}
