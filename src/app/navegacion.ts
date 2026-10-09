import type { IconName } from '../shared/components/Icon'

/** Una sola lista para la barra, la hoja «Más» y el tipo de destino. */
export const DESTINOS = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'gym', label: 'Entreno', icon: 'dumbbell' }, // un solo nombre visible para la sección (título, Inicio y barra)
  { key: 'perfil', label: 'Perfil', icon: 'user' },
  { key: 'referencias', label: 'Referencias', icon: 'info' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[]

export type Tab = (typeof DESTINOS)[number]['key']

/** Destinos que no tienen pestaña propia: se abren desde «Más». */
export const EN_MAS: readonly Tab[] = ['perfil', 'referencias', 'ajustes']
