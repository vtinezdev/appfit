import type { IconName } from '../shared/components/Icon'
import type { Objetivos, Settings } from '../shared/db/types'
import type { FondoPref, ThemePref } from '../shared/design/theme'
import { formatDiaMes } from '../shared/lib/dates'
import { formatInt } from '../shared/lib/format'
import { formatAgua } from '../features/inicio/lib/agua'

/** Ajustes es un índice: cada sección abre su propia vista. */
export type SeccionAjustes = 'objetivos' | 'agua' | 'creatina' | 'entreno' | 'gamificacion' | 'apariencia' | 'instalacion' | 'cuenta' | 'copias' | 'catalogo' | 'borrar'

export const SECCIONES_AJUSTES: Record<SeccionAjustes, { nombre: string; icon: IconName }> = {
  objetivos: { nombre: 'Objetivos diarios', icon: 'flag' },
  agua: { nombre: 'Agua', icon: 'droplet' },
  creatina: { nombre: 'Creatina', icon: 'zap' },
  entreno: { nombre: 'Entreno', icon: 'dumbbell' },
  gamificacion: { nombre: 'Cumbres, Caminos, Ritmo y Vitrina', icon: 'mountain' },
  apariencia: { nombre: 'Apariencia', icon: 'moon' },
  instalacion: { nombre: 'Primeros pasos', icon: 'sparkles' },
  cuenta: { nombre: 'Cuenta', icon: 'user' },
  copias: { nombre: 'Copias de seguridad', icon: 'download' },
  catalogo: { nombre: 'Catálogo de alimentos', icon: 'utensils' },
  borrar: { nombre: 'Borrar registros', icon: 'trash' },
}

/** Bloques del índice, por tema. «Borrar registros» va aparte, al final. */
export const GRUPOS_AJUSTES: { nombre: string; secciones: SeccionAjustes[] }[] = [
  { nombre: 'Tú', secciones: ['objetivos', 'agua', 'creatina'] },
  { nombre: 'Entreno', secciones: ['entreno', 'gamificacion'] },
  { nombre: 'App', secciones: ['apariencia', 'instalacion'] },
  { nombre: 'Tus datos', secciones: ['cuenta', 'copias', 'catalogo'] },
]

export const OPCIONES_TEMA: { valor: ThemePref; label: string }[] = [{ valor: 'system', label: 'Sistema' }, { valor: 'light', label: 'Claro' }, { valor: 'dark', label: 'Oscuro' }]
export const OPCIONES_FONDO: { valor: FondoPref; label: string }[] = [{ valor: 'curvas', label: 'Curvas' }, { valor: 'puntos', label: 'Puntos' }, { valor: 'foto', label: 'Foto' }, { valor: 'liso', label: 'Liso' }]

export interface DatosResumen {
  settings: Settings
  objetivos: Objetivos
  /** Objetivo de agua efectivo (ml) o `null` sin objetivo. */
  aguaMl: number | null
  tema: ThemePref
  fondo: FondoPref
  /** Entrenos del plan de esta semana. */
  entrenosPlan: number
}

const etiqueta = <T extends string>(opciones: { valor: T; label: string }[], valor: T) => opciones.find(o => o.valor === valor)?.label ?? ''

/**
 * El valor actual de cada sección, para la fila del índice: se ve cómo está sin entrar. La cuenta pinta su propio estado
 * (vive en la feature `cuenta`), así que aquí no tiene resumen.
 */
export function resumenAjustes(seccion: SeccionAjustes, d: DatosResumen): string {
  const s = d.settings
  switch (seccion) {
    case 'objetivos': return `${formatInt(d.objetivos.kcal)} kcal · ${formatInt(d.objetivos.prot)} g de proteína`
    case 'agua': return d.aguaMl === null ? 'Sin objetivo' : `${formatAgua(d.aguaMl)} al día`
    case 'creatina': return s.creatina?.activa ? 'Activada' : 'Desactivada'
    case 'entreno': return `${s.sonidoDescanso === false ? 'Sin sonido' : 'Con sonido'} · ${s.rirAlCompletar === false ? 'Sin preguntar el RIR' : 'Pregunta el RIR'}`
    case 'gamificacion':
      if (s.gamificacionVisible === false) return 'Ocultos'
      return `${s.gamificacionConNutricion === false ? 'Solo entreno' : 'Con nutrición'} · ${formatInt(d.entrenosPlan)} ${d.entrenosPlan === 1 ? 'entreno' : 'entrenos'} por semana`
    case 'apariencia': return `${etiqueta(OPCIONES_TEMA, d.tema)} · Fondo ${etiqueta(OPCIONES_FONDO, d.fondo).toLowerCase()}`
    case 'instalacion': return 'Instalar la app, trasladar registros y pistas'
    case 'cuenta': return ''
    case 'copias': return s.ultimaExportacion === undefined ? 'Aún sin copia exportada' : `Última: ${formatDiaMes(s.ultimaExportacion)}`
    case 'catalogo': return 'Fuentes, licencias y actualización'
    case 'borrar': return 'Todo lo guardado en este móvil'
  }
}
