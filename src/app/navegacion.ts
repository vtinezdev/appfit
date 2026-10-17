import type { IconName } from '../shared/components/Icon'

/** Una sola lista para la media luna y el tipo de destino. */
export const DESTINOS = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'gym', label: 'Entreno', icon: 'dumbbell' }, // un solo nombre visible para la sección (título, Inicio y navegación)
  { key: 'social', label: 'Social', icon: 'comentario' }, // solo con cuenta configurada (ADR 040)
  { key: 'perfil', label: 'Perfil', icon: 'user' },
  { key: 'amigos', label: 'Amigos', icon: 'users' }, // dentro de Social; solo con cuenta configurada (ADR 040)
  { key: 'cumbres', label: 'Cumbres', icon: 'mountain' },
  { key: 'caminos', label: 'Caminos', icon: 'route' },
  { key: 'ritmo', label: 'Ritmo', icon: 'calendar' },
  { key: 'vitrina', label: 'Vitrina', icon: 'trophy' },
  { key: 'referencias', label: 'Referencias', icon: 'info' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[]

export type Tab = (typeof DESTINOS)[number]['key']

/** La media luna de secciones (ADR 043), de izquierda a derecha. Social solo con cuenta configurada. */
export const EN_ARCO: readonly Tab[] = ['inicio', 'social', 'nutricion', 'gym', 'perfil', 'ajustes']

/** Destinos fuera de la media luna y la sección desde la que se entra: es la que queda marcada mientras se está en ellos. */
const DENTRO_DE: Partial<Record<Tab, Tab>> = {
  amigos: 'social',
  referencias: 'ajustes',
  cumbres: 'inicio',
  caminos: 'inicio',
  ritmo: 'inicio',
  vitrina: 'inicio',
}

/** La sección de la media luna que corresponde a un destino. */
export const seccionDe = (tab: Tab): Tab => DENTRO_DE[tab] ?? tab
