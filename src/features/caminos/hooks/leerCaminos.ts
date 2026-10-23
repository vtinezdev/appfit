// Lecturas de Caminos (solo lectura: se usan dentro del lector compartido, `experiencia/hooks/useProgreso`). Los km salen de las actividades terminadas y de los pasos.
import { getSettings } from '../../../shared/db/settings'
import type { Actividad, ConfigCaminos, DiaPasos, RutaPropia } from '../../../shared/db/types'
import * as actividadesRepo from '../../actividades/data/actividadesRepo'
import * as pasosRepo from '../data/pasosRepo'
import * as rutasPropiasRepo from '../data/rutasPropiasRepo'
import { calcularCaminos, type ResultadoCaminos } from '../lib/caminos'
import { aportesDePasos, zancadaDe, type AportePasos, type Zancada } from '../lib/pasos'
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
    /** Días con pasos apuntados (todos, también los anteriores al inicio) y lo que da cada uno. */
    pasos: DiaPasos[]
    aportes: AportePasos[]
    zancada: Zancada
    /** La que se usaría sin zancada propia (por la altura o la de por defecto). */
    zancadaEstimada: Zancada
  }

/** Caminos hasta `hoy`. Oculto con la gamificación (Ajustes), no lee nada más. */
export async function leerCaminos(hoy: string): Promise<EstadoCaminos> {
  const settings = await getSettings()
  if (settings.gamificacionVisible === false) return { visible: false }
  const [actividades, propias, pasos] = await Promise.all([actividadesRepo.terminadas(), rutasPropiasRepo.listar(), pasosRepo.todos()])
  const rutasPropias = propias.map(aRuta)
  const zancada = zancadaDe(settings.zancadaCm, settings.perfil)
  const aportes = aportesDePasos(pasos, actividades, zancada.cm)
  return {
    visible: true, caminos: calcularCaminos(actividades, settings.caminos, hoy, rutasPropias, aportes), config: settings.caminos, actividades, propias, rutasPropias,
    pasos, aportes, zancada, zancadaEstimada: zancadaDe(undefined, settings.perfil),
  }
}
