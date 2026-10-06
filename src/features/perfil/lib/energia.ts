// Estimación energética del Perfil. Funciones puras, sin redondeos intermedios (kg, cm, años, kcal/día).
// TMB = media de Mifflin-St Jeor (1990) y Harris-Benedict revisada por Roza-Shizgal (1984): criterio de AppFit
// apoyado en dos ecuaciones citadas, no un método publicado. Ver ADR 019 y Referencias › Energía y objetivo.
import type { ActividadPerfil, ObjetivoPerfil, Perfil, SexoPerfil } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { validarPeso } from '../../inicio/lib/peso'
import type { IdFuenteEnergia } from './fuentesEnergia'
import {
  camposPendientes, edadEn, EDAD_AVISO, EDAD_MAX, EDAD_MIN, INTENSIDAD_POR_DEFECTO, validarAltura, type CampoPerfil,
} from './validacionPerfil'

export { INTENSIDADES_KCAL, INTENSIDAD_POR_DEFECTO } from './validacionPerfil'

export type IdEcuacion = 'mifflin' | 'rozaShizgal'
interface Coeficientes { constante: number; kg: number; cm: number; anio: number }
export interface Ecuacion {
  id: IdEcuacion
  nombre: string
  fuente: IdFuenteEnergia
  coeficientes: Record<SexoPerfil, Coeficientes>
}

export const ECUACIONES: Record<IdEcuacion, Ecuacion> = {
  mifflin: {
    id: 'mifflin', nombre: 'Mifflin-St Jeor', fuente: 'mifflin1990',
    coeficientes: {
      hombre: { constante: 5, kg: 10, cm: 6.25, anio: -5 },
      mujer: { constante: -161, kg: 10, cm: 6.25, anio: -5 },
    },
  },
  rozaShizgal: {
    id: 'rozaShizgal', nombre: 'Harris-Benedict revisada (Roza-Shizgal)', fuente: 'rozaShizgal1984',
    coeficientes: {
      hombre: { constante: 88.362, kg: 13.397, cm: 4.799, anio: -5.677 },
      mujer: { constante: 447.593, kg: 9.247, cm: 3.098, anio: -4.33 },
    },
  },
}

/** Cambiar de método en el futuro es tocar solo esta constante. */
export const METODO_TMB = { tipo: 'media', ecuaciones: ['mifflin', 'rozaShizgal'] } as const satisfies { tipo: 'media'; ecuaciones: readonly IdEcuacion[] }

export interface NivelActividad { factor: number; etiqueta: string; descripcion: string; fuente: IdFuenteEnergia }
/** Pregunta «¿Cuánto deporte haces?». Factores atribuidos a McArdle, Katch y Katch (1996): convención, no método validado. */
export const NIVELES_ACTIVIDAD: Record<ActividadPerfil, NivelActividad> = {
  sedentario: { factor: 1.2, etiqueta: 'Sedentario', descripcion: 'Poco o ningún ejercicio', fuente: 'mcArdle1996' },
  ligero: { factor: 1.375, etiqueta: 'Ligero', descripcion: 'Ejercicio ligero o de 1 a 3 días por semana', fuente: 'mcArdle1996' },
  moderado: { factor: 1.55, etiqueta: 'Moderado', descripcion: 'Ejercicio moderado de 3 a 5 días por semana', fuente: 'mcArdle1996' },
  activo: { factor: 1.725, etiqueta: 'Activo', descripcion: 'Ejercicio intenso de 6 a 7 días por semana', fuente: 'mcArdle1996' },
  'muy-activo': { factor: 1.9, etiqueta: 'Muy activo', descripcion: 'Entrenamiento muy intenso diario, trabajo físico pesado o doble sesión', fuente: 'mcArdle1996' },
}

export const ETIQUETAS_OBJETIVO: Record<ObjetivoPerfil, string> = { definicion: 'Definición', mantenimiento: 'Mantenimiento', volumen: 'Volumen' }

/** Suelo de prudencia: nunca por debajo de 800 kcal ni de la TMB estimada (criterio de AppFit). */
export const SUELO_KCAL = 800
export const IMC_BAJO_PESO = 18.5
/** Aproximación clásica; Hall 2008 avisa de que pierde validez con el tiempo. */
export const KCAL_POR_KG = 7700
/** Límite alto de Helms 2014: por encima de este % del peso por semana se avisa (sin bloquear). */
export const RITMO_MAX_PCT_SEMANA = 1
export const REDONDEO_OBJETIVO_KCAL = 10

export interface DatosEnergia { sexo: SexoPerfil; edad: number; alturaCm: number; pesoKg: number }

/** Una ecuación de gasto en reposo en kcal/día, sin redondear. */
export function gastoReposo(id: IdEcuacion, d: DatosEnergia): number {
  const c = ECUACIONES[id].coeficientes[d.sexo]
  return c.constante + c.kg * d.pesoKg + c.cm * d.alturaCm + c.anio * d.edad
}

/** Media de las ecuaciones de `METODO_TMB` y cada parcial. */
export function tasaMetabolicaBasal(d: DatosEnergia): { valor: number; parciales: Record<IdEcuacion, number> } {
  const parciales = { mifflin: gastoReposo('mifflin', d), rozaShizgal: gastoReposo('rozaShizgal', d) }
  const valor = METODO_TMB.ecuaciones.reduce((s, id) => s + parciales[id], 0) / METODO_TMB.ecuaciones.length
  return { valor, parciales }
}

/** «10 × 80 + 6,25 × 180 − 5 × 30 + 5 = 1.780» con las cifras de la persona (para «Cómo se ha calculado»). */
export function formulaSustituida(id: IdEcuacion, d: DatosEnergia): string {
  const c = ECUACIONES[id].coeficientes[d.sexo]
  const n = (x: number) => formatNumber(Math.abs(x), 3)
  const signo = (x: number) => (x < 0 ? '−' : '+')
  const primero = `${n(c.constante)}`
  const cabeza = c.constante < 0 ? `−${primero}` : primero
  return `${cabeza} ${signo(c.kg)} ${n(c.kg)} × ${formatNumber(d.pesoKg, 1)} ${signo(c.cm)} ${n(c.cm)} × ${formatNumber(d.alturaCm, 1)} ${signo(c.anio)} ${n(c.anio)} × ${d.edad} = ${formatNumber(gastoReposo(id, d), 1)}`
}

export type TipoAviso = 'suelo' | 'imc-bajo' | 'edad-alta' | 'ritmo-alto'
export interface AvisoEnergia { tipo: TipoAviso; texto: string }

export interface EnergiaOk {
  estado: 'ok'
  datos: DatosEnergia
  edad: number
  imc: number
  tmb: { valor: number; parciales: Record<IdEcuacion, number> }
  actividad: ActividadPerfil
  factor: number
  get: number
  /** Objetivo elegido por la persona; `null` si todavía no lo ha elegido. */
  objetivoElegido: ObjetivoPerfil | null
  /** Objetivo aplicado: difiere del elegido si el IMC bloquea el déficit. */
  objetivoAplicado: ObjetivoPerfil | null
  intensidadKcal: number
  /** kcal/día realmente sumadas (+) o restadas (−) al GET tras suelo e IMC. 0 sin objetivo o en mantenimiento. */
  ajusteKcal: number
  /** kcal/día objetivo sin redondear; `null` sin objetivo elegido. */
  objetivoExacto: number | null
  /** Redondeado a 10 kcal (precisión de presentación); `null` sin objetivo elegido. */
  objetivoKcal: number | null
  ritmo: { kgSemana: number; pctPesoSemana: number } | null
  avisos: AvisoEnergia[]
}
export type ResultadoEnergia =
  | { estado: 'incompleto'; faltan: CampoPerfil[] }
  | { estado: 'no-calculable'; motivo: string }
  | EnergiaOk

export function redondearObjetivo(kcal: number): number {
  return Math.round(kcal / REDONDEO_OBJETIVO_KCAL) * REDONDEO_OBJETIVO_KCAL
}

const NO_CALCULABLE_GENERICO = 'No se puede calcular con estos datos. Revisa la fecha de nacimiento, la altura y el peso.'

/** Estimación completa a fecha `hoy` (YYYY-MM-DD) con el último peso conocido. No lee ni escribe nada. */
export function calcularEnergia(perfil: Perfil, pesoKg: number | null | undefined, hoy: string): ResultadoEnergia {
  const faltan = camposPendientes(perfil, pesoKg)
  if (faltan.length > 0) return { estado: 'incompleto', faltan }
  const edad = edadEn(perfil.fechaNacimiento!, hoy)
  const peso = validarPeso(pesoKg!)
  const altura = validarAltura(perfil.alturaCm!)
  if (edad === null || peso === null || altura === null) return { estado: 'no-calculable', motivo: NO_CALCULABLE_GENERICO }
  if (edad < EDAD_MIN) return { estado: 'no-calculable', motivo: `Las ecuaciones de AppFit son para adultos de ${EDAD_MIN} años o más.` }
  if (edad > EDAD_MAX) return { estado: 'no-calculable', motivo: `Revisa la fecha de nacimiento: la edad supera los ${EDAD_MAX} años.` }

  const datos: DatosEnergia = { sexo: perfil.sexo!, edad, alturaCm: altura, pesoKg: peso }
  const tmb = tasaMetabolicaBasal(datos)
  const factor = NIVELES_ACTIVIDAD[perfil.actividad!].factor
  const get = tmb.valor * factor
  const imc = peso / ((altura / 100) ** 2)
  if (![tmb.valor, get, imc].every((x) => Number.isFinite(x) && x > 0)) return { estado: 'no-calculable', motivo: NO_CALCULABLE_GENERICO }

  const avisos: AvisoEnergia[] = []
  if (edad > EDAD_AVISO) avisos.push({ tipo: 'edad-alta', texto: `Con más de ${EDAD_AVISO} años estás fuera de la muestra de las dos ecuaciones: tómalo como una referencia aún más aproximada.` })

  const elegido = perfil.objetivo ?? null
  const intensidadKcal = perfil.intensidadKcal ?? INTENSIDAD_POR_DEFECTO
  let aplicado: ObjetivoPerfil | null = elegido
  if (elegido === 'definicion' && imc < IMC_BAJO_PESO) {
    aplicado = 'mantenimiento'
    avisos.push({ tipo: 'imc-bajo', texto: 'Tu IMC es inferior a 18,5 (bajo peso según la OMS): AppFit no calcula déficit y te muestra el mantenimiento.' })
  }

  let objetivoExacto: number | null = null
  let ajusteKcal = 0
  if (aplicado !== null) {
    const pedido = aplicado === 'definicion' ? -intensidadKcal : aplicado === 'volumen' ? intensidadKcal : 0
    const suelo = Math.max(tmb.valor, SUELO_KCAL)
    objetivoExacto = Math.max(get + pedido, suelo)
    ajusteKcal = objetivoExacto - get
    if (get + pedido < suelo) avisos.push({ tipo: 'suelo', texto: `Limitado por el suelo de prudencia de AppFit (${formatNumber(suelo)} kcal: el mayor entre tu gasto en reposo y ${formatNumber(SUELO_KCAL)}).` })
  }

  let ritmo: EnergiaOk['ritmo'] = null
  if (aplicado !== null && Math.abs(ajusteKcal) > 1e-9) {
    const kgSemana = (ajusteKcal * 7) / KCAL_POR_KG
    const pctPesoSemana = (kgSemana / peso) * 100
    ritmo = { kgSemana, pctPesoSemana }
    if (aplicado === 'definicion' && Math.abs(pctPesoSemana) > RITMO_MAX_PCT_SEMANA) {
      avisos.push({ tipo: 'ritmo-alto', texto: `Ritmo aproximado de ${formatNumber(Math.abs(pctPesoSemana), 1)} % del peso por semana: por encima del 1 % se pierde músculo con más facilidad. Considera una intensidad menor.` })
    }
  }

  return {
    estado: 'ok', datos, edad, imc, tmb, actividad: perfil.actividad!, factor, get,
    objetivoElegido: elegido, objetivoAplicado: aplicado, intensidadKcal, ajusteKcal,
    objetivoExacto, objetivoKcal: objetivoExacto === null ? null : redondearObjetivo(objetivoExacto), ritmo, avisos,
  }
}

/** «+400», «−400» (signo menos tipográfico) o «0». */
export function formatSigned(n: number): string {
  const r = Math.round(n)
  if (r === 0) return '0'
  return `${r > 0 ? '+' : '−'}${formatNumber(Math.abs(r))}`
}

export const AVISO_ORIENTATIVO = 'Estimación orientativa, no una prescripción médica'
