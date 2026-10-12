// Lecturas de Caminos (solo lectura: se usan en useLiveQuery). Los km salen de las actividades terminadas.
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import type { Actividad, ConfigCaminos, RutaPropia } from '../../../shared/db/types'
import * as actividadesRepo from '../../actividades/data/actividadesRepo'
import * as rutasPropiasRepo from '../data/rutasPropiasRepo'
import { calcularCaminos, type ResultadoCaminos } from '../lib/caminos'
import type { Ruta } from '../lib/rutas'
import { aRuta } from '../lib/rutasPropias'

export type EstadoCaminos =
  | { visible: false }
  | {
    visible: true
    /** `null` hasta elegir la primera ruta. */
    caminos: ResultadoCaminos | null
    config: ConfigCaminos | undefined
    actividades: Actividad[]
    /** Rutas propias, tal cual y como `Ruta` del motor. */
    propias: RutaPropia[]
    rutasPropias: Ruta[]
  }

/** Caminos hasta `hoy`. Oculto con la gamificación (Ajustes), no lee nada más. */
export async function leerCaminos(hoy: string): Promise<EstadoCaminos> {
  const settings = await getSettings()
  if (settings.gamificacionVisible === false) return { visible: false }
  const [actividades, propias] = await Promise.all([actividadesRepo.terminadas(), rutasPropiasRepo.listar()])
  const rutasPropias = propias.map(aRuta)
  return { visible: true, caminos: calcularCaminos(actividades, settings.caminos, hoy, rutasPropias), config: settings.caminos, actividades, propias, rutasPropias }
}

/** `undefined` mientras carga. */
export function useCaminos(hoy: string): EstadoCaminos | undefined {
  return useLiveQuery(() => leerCaminos(hoy), [hoy])
}
