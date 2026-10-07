// Validación y saneado de los datos del perfil. Funciones puras; los rangos son controles de plausibilidad
// de entrada (criterio de AppFit), no afirmaciones clínicas.
import type { ActividadPerfil, IntensidadKcal, ObjetivoPerfil, Perfil, SexoPerfil } from '../../../shared/db/types'
import { parseISODate, toISODate } from '../../../shared/lib/dates'
import { round1 } from '../../../shared/lib/format'
import { validarPeso } from '../../inicio/lib/peso'
import { validarProteinaPorKg } from './proteina'

export const SEXOS: readonly SexoPerfil[] = ['hombre', 'mujer']
export const ACTIVIDADES: readonly ActividadPerfil[] = ['sedentario', 'ligero', 'moderado', 'activo', 'muy-activo']
export const OBJETIVOS: readonly ObjetivoPerfil[] = ['definicion', 'mantenimiento', 'volumen']
export const INTENSIDADES_KCAL: readonly IntensidadKcal[] = [200, 300, 400, 500, 600]
/** Punto medio del rango: se usa al elegir un objetivo por primera vez. */
export const INTENSIDAD_POR_DEFECTO: IntensidadKcal = 400

export const ALTURA_MIN = 120
export const ALTURA_MAX = 230
export const EDAD_MIN = 18
export const EDAD_MAX = 100
/** Por encima, la muestra de Mifflin-St Jeor (19–78 años) no cubre a la persona: se calcula con aviso. */
export const EDAD_AVISO = 78

export type CampoPerfil = 'sexo' | 'fechaNacimiento' | 'alturaCm' | 'peso' | 'actividad' | 'objetivo'
export const ETIQUETAS_CAMPO: Record<CampoPerfil, string> = {
  sexo: 'sexo', fechaNacimiento: 'fecha de nacimiento', alturaCm: 'altura', peso: 'peso', actividad: 'actividad', objetivo: 'objetivo',
}

/** `true` si es una fecha YYYY-MM-DD que existe en el calendario. */
export function esFechaISO(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  return toISODate(parseISODate(valor)) === valor
}

/** Años cumplidos de `fechaNacimiento` a `hoy` (YYYY-MM-DD); `null` si alguna fecha no es válida. Puede ser negativo si es futura. */
export function edadEn(fechaNacimiento: string, hoy: string): number | null {
  if (!esFechaISO(fechaNacimiento) || !esFechaISO(hoy)) return null
  let edad = Number(hoy.slice(0, 4)) - Number(fechaNacimiento.slice(0, 4))
  if (hoy.slice(5) < fechaNacimiento.slice(5)) edad -= 1
  return edad
}

export type ResultadoFecha = { ok: true; edad: number; aviso?: string } | { ok: false; error: string }

export function validarFechaNacimiento(fecha: string, hoy: string): ResultadoFecha {
  if (!esFechaISO(fecha)) return { ok: false, error: 'Introduce una fecha válida.' }
  if (fecha > hoy) return { ok: false, error: 'La fecha de nacimiento no puede ser futura.' }
  const edad = edadEn(fecha, hoy)!
  if (edad < EDAD_MIN) return { ok: false, error: 'Las ecuaciones de AppFit son para adultos de 18 años o más.' }
  if (edad > EDAD_MAX) return { ok: false, error: `Introduce una edad de ${EDAD_MAX} años o menos.` }
  if (edad > EDAD_AVISO) return { ok: true, edad, aviso: `A partir de ${EDAD_AVISO} años la estimación queda fuera de la muestra de las ecuaciones.` }
  return { ok: true, edad }
}

/** Altura válida (finita, 120–230 cm) redondeada a 1 decimal; `null` si no lo es. Centímetros, no metros. */
export function validarAltura(cm: number): number | null {
  if (!Number.isFinite(cm)) return null
  const r = round1(cm)
  return r >= ALTURA_MIN && r <= ALTURA_MAX ? r : null
}

function enLista<T extends string | number>(lista: readonly T[], valor: unknown): T | undefined {
  return lista.find((v) => v === valor)
}

/**
 * Descarta los campos inválidos de un perfil guardado o importado (nunca escribe). Cualquier cosa que no sea
 * un objeto da un perfil vacío. La edad (18–100) no se valida aquí: depende de la fecha de hoy.
 */
export function normalizarPerfil(crudo: unknown): Perfil {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return {}
  const c = crudo as Record<string, unknown>
  const perfil: Perfil = {}
  const sexo = enLista(SEXOS, c.sexo)
  if (sexo) perfil.sexo = sexo
  if (esFechaISO(c.fechaNacimiento)) perfil.fechaNacimiento = c.fechaNacimiento
  if (typeof c.alturaCm === 'number') {
    const altura = validarAltura(c.alturaCm)
    if (altura !== null) perfil.alturaCm = altura
  }
  const actividad = enLista(ACTIVIDADES, c.actividad)
  if (actividad) perfil.actividad = actividad
  const objetivo = enLista(OBJETIVOS, c.objetivo)
  if (objetivo) perfil.objetivo = objetivo
  const intensidad = enLista(INTENSIDADES_KCAL, c.intensidadKcal)
  if (intensidad) perfil.intensidadKcal = intensidad
  if (typeof c.proteinaPorKgActiva === 'boolean') perfil.proteinaPorKgActiva = c.proteinaPorKgActiva
  if (typeof c.usarGastoObservado === 'boolean') perfil.usarGastoObservado = c.usarGastoObservado
  if (typeof c.proteinaPorKg === 'number') {
    const g = validarProteinaPorKg(c.proteinaPorKg)
    if (g !== null) perfil.proteinaPorKg = g
  }
  return perfil
}

export function perfilVacio(perfil: Perfil | undefined): boolean {
  return Object.keys(normalizarPerfil(perfil)).length === 0
}

/** Lo que falta para poder estimar el gasto, en el orden de la pantalla. El objetivo no hace falta para el gasto. */
export function camposPendientes(perfil: Perfil, pesoKg: number | null | undefined): CampoPerfil[] {
  const faltan: CampoPerfil[] = []
  if (!perfil.sexo) faltan.push('sexo')
  if (!perfil.fechaNacimiento) faltan.push('fechaNacimiento')
  if (perfil.alturaCm === undefined) faltan.push('alturaCm')
  if (pesoKg === null || pesoKg === undefined || validarPeso(pesoKg) === null) faltan.push('peso')
  if (!perfil.actividad) faltan.push('actividad')
  return faltan
}

/** «altura y actividad», «sexo, altura y peso». */
export function listaCampos(campos: CampoPerfil[]): string {
  const t = campos.map((c) => ETIQUETAS_CAMPO[c])
  return t.length <= 1 ? t.join('') : `${t.slice(0, -1).join(', ')} y ${t[t.length - 1]}`
}
