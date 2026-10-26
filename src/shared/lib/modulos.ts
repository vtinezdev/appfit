// Módulos activables (B9): qué partes de la app usa cada persona y el orden de las tarjetas de Inicio. Funciones puras.
// Ocultar un módulo nunca borra datos: solo lo quita de las secciones, de Inicio y de lo que se deriva al leer.
import type { Settings } from '../db/types'

export type Modulo = 'nutricion' | 'gym' | 'actividades' | 'agua' | 'pasos' | 'peso'

export const MODULOS: readonly Modulo[] = ['nutricion', 'gym', 'actividades', 'agua', 'pasos', 'peso']

export const NOMBRE_MODULO: Record<Modulo, string> = {
  nutricion: 'Nutrición', gym: 'Gimnasio', actividades: 'Actividades', agua: 'Agua', pasos: 'Pasos', peso: 'Peso',
}

/** Lo que pasa al apagarlo, para el interruptor de Ajustes. */
export const AL_APAGAR: Record<Modulo, string> = {
  nutricion: 'Si lo ocultas, sale de las secciones y de Inicio, y Cumbres, Ritmo y Vitrina cuentan solo el entreno.',
  gym: 'Si lo ocultas, Entreno queda solo con Actividades (o sale de las secciones si también las ocultas) y el último entreno deja Inicio.',
  actividades: 'Si las ocultas, Entreno queda solo con el gimnasio y Caminos deja Inicio.',
  agua: 'Si lo ocultas, la tarjeta del agua deja Inicio.',
  pasos: 'Si lo ocultas, la tarjeta de los pasos deja Inicio. Los ya apuntados siguen avanzando Caminos, donde también se apuntan.',
  peso: 'Si lo ocultas, la tarjeta del peso deja Inicio.',
}

/** ¿Está activo? Ausente = activo: nadie pierde nada al actualizar. */
export const moduloActivo = (s: Pick<Settings, 'modulos'> | undefined, m: Modulo): boolean => s?.modulos?.[m] !== false

/** La nutrición cuenta en la gamificación si el módulo está activo y el ajuste «Con nutrición» no está quitado. */
export const conNutricionEfectiva = (s: Pick<Settings, 'modulos' | 'gamificacionConNutricion'>): boolean =>
  moduloActivo(s, 'nutricion') && s.gamificacionConNutricion !== false

/** Tarjetas de Inicio que se pueden ordenar. Peso, agua y pasos van juntas (agua y pasos, lado a lado). */
export type TarjetaInicio = 'energia' | 'progreso' | 'registros' | 'creatina' | 'entreno'

export const TARJETAS_INICIO: readonly TarjetaInicio[] = ['energia', 'progreso', 'registros', 'creatina', 'entreno']

export const NOMBRE_TARJETA: Record<TarjetaInicio, string> = {
  energia: 'Energía y comidas', progreso: 'Cumbres, Caminos, Ritmo y Vitrina', registros: 'Peso, agua y pasos', creatina: 'Creatina', entreno: 'Último entreno',
}

/** El orden guardado, sin ids desconocidos ni repetidos y con las tarjetas que falten al final, en su orden por defecto. */
export function ordenTarjetas(s: Pick<Settings, 'ordenInicio'> | undefined): TarjetaInicio[] {
  const validas = new Set<string>(TARJETAS_INICIO)
  const guardado = [...new Set(s?.ordenInicio ?? [])].filter((t): t is TarjetaInicio => validas.has(t))
  return [...guardado, ...TARJETAS_INICIO.filter((t) => !guardado.includes(t))]
}

/** ¿Se ve la tarjeta con estos módulos? Registros, mientras quede peso, agua o pasos; Creatina, solo activada. */
export function tarjetaVisible(s: Pick<Settings, 'modulos' | 'creatina'> | undefined, t: TarjetaInicio): boolean {
  if (t === 'creatina') return s?.creatina?.activa === true
  if (t === 'energia') return moduloActivo(s, 'nutricion')
  if (t === 'entreno') return moduloActivo(s, 'gym')
  if (t === 'registros') return moduloActivo(s, 'peso') || moduloActivo(s, 'agua') || moduloActivo(s, 'pasos')
  return true
}

/** Tarjetas de Inicio en su orden, solo las visibles. */
export const tarjetasInicio = (s: Pick<Settings, 'modulos' | 'ordenInicio' | 'creatina'> | undefined): TarjetaInicio[] =>
  ordenTarjetas(s).filter((t) => tarjetaVisible(s, t))

/** Mueve una tarjeta un puesto arriba (−1) o abajo (+1) en el orden completo; devuelve el orden nuevo para guardar. */
export function moverTarjeta(orden: readonly TarjetaInicio[], t: TarjetaInicio, delta: -1 | 1): TarjetaInicio[] {
  const i = orden.indexOf(t)
  const j = i + delta
  if (i < 0 || j < 0 || j >= orden.length) return [...orden]
  const r = [...orden]
  ;[r[i], r[j]] = [r[j], r[i]]
  return r
}
