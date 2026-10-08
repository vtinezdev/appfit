import type { IconName } from '../shared/components/Icon'

/** Una sola lista para el botón, la rueda y el tipo de destino. */
export const DESTINOS = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'gym', label: 'Entreno', icon: 'dumbbell' }, // un solo nombre visible para la sección (título, Inicio y menú)
  { key: 'perfil', label: 'Perfil', icon: 'user' },
  { key: 'referencias', label: 'Referencias', icon: 'info' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[]

export type Tab = (typeof DESTINOS)[number]['key']
