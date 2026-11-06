// Bienvenida de una instalación nueva (ADR 066): qué pasos se enseñan, qué sistemas se explican y qué se guarda al
// terminar. La pantalla (`Bienvenida.tsx`) solo compone; los ajustes de cada paso son los mismos de Ajustes y Perfil.
import type { IconName } from '../shared/components/Icon'
import type { Settings } from '../shared/db/types'
import { VERSION_TEXTOS_LEGALES } from '../shared/lib/legal'
import { moduloActivo } from '../shared/lib/modulos'

export type PasoBienvenida = 'entrada' | 'modulos' | 'perfil' | 'semana'

export const TITULO_PASO: Record<PasoBienvenida, string> = {
  entrada: 'Te damos la bienvenida',
  modulos: 'Lo que vas a usar',
  perfil: 'Tu objetivo diario',
  semana: 'Cumbres, Ritmo y Liga',
}

/** Los pasos, en orden. El perfil solo sirve para el objetivo de comidas: sin Nutrición no se pide. */
export function pasosBienvenida(s: Pick<Settings, 'modulos'>): PasoBienvenida[] {
  return ['entrada', 'modulos', ...(moduloActivo(s, 'nutricion') ? ['perfil' as const] : []), 'semana']
}

export interface SistemaExplicado {
  nombre: string
  icon: IconName
  texto: string
}

/** Una frase por sistema. La Liga va por ejercicio del gimnasio: sin Gimnasio no se explica. */
export function sistemasExplicados(s: Pick<Settings, 'modulos'>): SistemaExplicado[] {
  return [
    { nombre: 'Cumbres', icon: 'mountain', texto: 'Lo que haces se convierte en metros: entrenos, récords, actividades y días registrados te suben por montañas reales, una tras otra.' },
    { nombre: 'Ritmo', icon: 'calendar', texto: 'Cuenta las semanas en que cumples tu plan. El descanso entra en él y puedes pausarlo en vacaciones o si te lesionas.' },
    ...(moduloActivo(s, 'gym') ? [{ nombre: 'Liga', icon: 'trophy' as const, texto: 'Cada ejercicio tiene su liga: cuanto más tiempo seguido lo haces, más sube.' }] : []),
  ]
}

/** Lo que se guarda al terminar o saltar la bienvenida: ya no se enseña y quedan aceptados estos textos legales. */
export const AL_TERMINAR: Pick<Settings, 'bienvenidaPendiente' | 'textosLegalesAceptados'> = {
  bienvenidaPendiente: undefined,
  textosLegalesAceptados: VERSION_TEXTOS_LEGALES,
}
