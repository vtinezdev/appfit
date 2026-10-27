import type { IconName } from '../shared/components/Icon'
import type { Settings } from '../shared/db/types'
import { moduloActivo } from '../shared/lib/modulos'

/** Una sola lista para la rejilla de secciones y el tipo de destino. */
export const DESTINOS = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'recetas', label: 'Recetas', icon: 'recetario' }, // prototipo: también se entra desde la cabecera de Nutrición
  { key: 'gym', label: 'Entreno', icon: 'dumbbell' }, // un solo nombre visible para la sección (título, Inicio y navegación)
  { key: 'social', label: 'Social', icon: 'comentario' }, // solo con cuenta configurada (ADR 040)
  { key: 'perfil', label: 'Perfil', icon: 'user' },
  { key: 'amigos', label: 'Amigos', icon: 'users' }, // dentro de Social; solo con cuenta configurada (ADR 040)
  { key: 'progreso', label: 'Progreso', icon: 'mountain' }, // Semana, Cumbres, Caminos y Vitrina en pestañas (B12, ADR 058)
  { key: 'referencias', label: 'Referencias', icon: 'info' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[]

export type Tab = (typeof DESTINOS)[number]['key']

/** La rejilla de secciones (ADR 043, 058, 060), en orden de lectura. Social solo con cuenta configurada. */
export const EN_SECCIONES: readonly Tab[] = ['inicio', 'perfil', 'nutricion', 'recetas', 'gym', 'progreso', 'social', 'ajustes']

/** Destinos fuera de la rejilla de secciones y la sección desde la que se entra: es la que queda marcada mientras se está en ellos. */
const DENTRO_DE: Partial<Record<Tab, Tab>> = {
  amigos: 'social',
  referencias: 'ajustes',
}

/** La sección de la rejilla de secciones que corresponde a un destino. */
export const seccionDe = (tab: Tab): Tab => DENTRO_DE[tab] ?? tab

/**
 * Destinos de la rejilla de secciones que no se muestran: Social sin cuenta configurada (ADR 040), los módulos apagados (B9, Recetas va con Nutrición) y
 * Progreso con Cumbres, Caminos, Ritmo y Vitrina ocultos en Ajustes.
 * Entreno se queda mientras quede el gimnasio o las actividades.
 */
export function destinosOcultos(s: Pick<Settings, 'modulos' | 'gamificacionVisible'> | undefined, social: boolean): Tab[] {
  const ocultos: Tab[] = []
  if (!social) ocultos.push('social')
  if (!moduloActivo(s, 'nutricion')) ocultos.push('nutricion', 'recetas')
  if (!moduloActivo(s, 'gym') && !moduloActivo(s, 'actividades')) ocultos.push('gym')
  if (s?.gamificacionVisible === false) ocultos.push('progreso')
  return ocultos
}
