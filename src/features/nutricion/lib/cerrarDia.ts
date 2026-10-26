// «Cerrar el día» (B10): propuestas que encajan con lo que falta del día en los cuatro macros. Lógica pura.
import type { Comida, Entry, MealItem } from '../../../shared/db/types'
import { claveRef, refDe } from '../../../shared/db/foodRef'
import { addDays } from '../../../shared/lib/dates'
import { mismaRaiz, tokensConsulta } from '../../../shared/lib/text'
import type { AlimentoElegible } from './alimentos'
import type { ComidaTipica } from './comidasTipicas'
import { macrosPorGramos, sumMacros, type Macros } from './nutrition'

type Macros4 = Pick<Macros, 'kcal' | 'prot' | 'carb' | 'grasa'>

/** Lo que queda del día frente al objetivo. Puede ser negativo (ya te has pasado de ese macro). */
export type Falta = Macros4

/** El botón sale con al menos estas kcal libres y algo de proteína o de carbohidratos pendiente. */
export const KCAL_MINIMAS = 150
export const PROTEINA_MINIMA = 10
export const CARBOHIDRATOS_MINIMOS = 20
/** Margen (g) para no descartar una propuesta por pasarse medio gramo de carbohidratos o de grasa. */
export const MARGEN_G = 5
/** Por debajo de esta parte de su ración, una cantidad ya no es una ración real y no se propone. */
const FRACCION_MINIMA = 0.5
const PASO_G = 5
const MIN_G = 10
/** Ración por defecto de un frecuente sin registros recientes con gramos. */
export const RACION_POR_DEFECTO = 100
/** Ventana para calcular tus raciones habituales y las categorías que registras. */
export const VENTANA_HABITOS_DIAS = 60

/** Con esto o menos por delante, una propuesta puede usarlo todo; con más, la mitad, sin bajar de esta cifra. */
export const KCAL_SIN_LIMITE = 600

export const MAX_TIPICAS = 2
export const MAX_COMBINACIONES = 2
export const MAX_IDEAS = 2
export const MAX_SUELTOS = 2

/** Lo que falta del día frente al objetivo, macro a macro. `null` sin objetivo de kcal. */
export function faltaDelDia(totales: Macros4, objetivo: Macros4 | null | undefined): Falta | null {
  if (!objetivo || !(objetivo.kcal > 0)) return null
  return { kcal: objetivo.kcal - totales.kcal, prot: objetivo.prot - totales.prot, carb: objetivo.carb - totales.carb, grasa: objetivo.grasa - totales.grasa }
}

/** Si tiene sentido proponer algo: quedan kcal y falta proteína o carbohidratos. */
export function hayHueco(falta: Falta | null): falta is Falta {
  return !!falta && falta.kcal >= KCAL_MINIMAS && (falta.prot >= PROTEINA_MINIMA || falta.carb >= CARBOHIDRATOS_MINIMOS)
}

/**
 * Lo que puede ocupar una sola propuesta, para que sea del tamaño de una comida: en la cena (para cerrar el día) o
 * con `KCAL_SIN_LIMITE` kcal o menos, todo lo que queda; si no, la mitad sin bajar de `KCAL_SIN_LIMITE`. Escala
 * igual lo pendiente de cada macro; los excesos se quedan como están.
 */
export function paraUnaPropuesta(falta: Falta, comida: Comida): Falta {
  if (comida === 'cena' || falta.kcal <= KCAL_SIN_LIMITE) return falta
  const factor = Math.max(falta.kcal / 2, KCAL_SIN_LIMITE) / falta.kcal
  const escalar = (v: number) => (v > 0 ? v * factor : v)
  return { kcal: falta.kcal * factor, prot: escalar(falta.prot), carb: escalar(falta.carb), grasa: escalar(falta.grasa) }
}

/** Sin pasarse de kcal y, con margen, de carbohidratos y grasa (lo pendiente; si ya te pasaste, solo el margen). */
export function cabe(aporte: Macros4, falta: Falta): boolean {
  return aporte.kcal <= falta.kcal
    && aporte.carb <= Math.max(0, falta.carb) + MARGEN_G
    && aporte.grasa <= Math.max(0, falta.grasa) + MARGEN_G
}

/**
 * Cuánto hueco deja una propuesta (menos es mejor): la parte de proteína, carbohidratos y grasa que seguiría
 * faltando, con la proteína el doble de importante. Los macros ya cubiertos no cuentan.
 */
export function huecoRestante(aporte: Macros4, falta: Falta): number {
  const parte = (f: number, a: number) => (f > 0 ? Math.max(0, f - a) / f : 0)
  return 2 * parte(falta.prot, aporte.prot) + parte(falta.carb, aporte.carb) + parte(falta.grasa, aporte.grasa)
}

/** Ración habitual de cada alimento (`claveRef`): la mediana de los gramos registrados, redondeada a 5 g. */
export function racionesHabituales(entries: readonly Entry[], { hoy, dias = VENTANA_HABITOS_DIAS }: { hoy: string; dias?: number }): Map<string, number> {
  const desde = addDays(hoy, -(dias - 1))
  const gramos = new Map<string, number[]>()
  for (const e of entries) {
    if (e.rapida || e.fecha < desde || e.fecha > hoy || !(e.gramos > 0)) continue
    let ref
    try {
      ref = refDe(e)
    } catch {
      continue
    }
    if (!ref) continue
    const clave = claveRef(ref)
    gramos.set(clave, [...(gramos.get(clave) ?? []), e.gramos])
  }
  const raciones = new Map<string, number>()
  for (const [clave, lista] of gramos) {
    const orden = [...lista].sort((a, b) => a - b)
    const mitad = Math.floor(orden.length / 2)
    const mediana = orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2
    raciones.set(clave, Math.max(MIN_G, Math.round(mediana / PASO_G) * PASO_G))
  }
  return raciones
}

/** Un alimento con la ración que se propone: la habitual para tus frecuentes, la de la lista para las ideas. */
export interface ConRacion {
  alimento: AlimentoElegible
  racion: number
}

export interface PropuestaItem {
  alimento: AlimentoElegible
  gramos: number
}

export type Propuesta =
  | { tipo: 'tipica'; clave: string; tipica: ComidaTipica; aporte: Macros4 }
  | { tipo: 'combinacion' | 'idea' | 'suelto'; clave: string; items: PropuestaItem[]; aporte: Macros4 }

export interface Propuestas {
  /** Estables: tus comidas típicas y combinaciones de tus frecuentes. */
  fijas: Propuesta[]
  /** Ordenadas de mejor a peor; se enseñan por tandas con «Sugerir otras». */
  ideas: Propuesta[]
  sueltos: Propuesta[]
}

function aporteDeItems(items: readonly PropuestaItem[]): Macros4 {
  return sumMacros(items.map((i) => macrosPorGramos(i.alimento, i.gramos)))
}

/**
 * Las raciones de los alimentos reducidas con un mismo factor (a múltiplos de 5 g) hasta que caben, sin bajar de
 * media ración. `null` si ni así caben.
 */
function ajustar(alimentos: readonly ConRacion[], falta: Falta): PropuestaItem[] | null {
  for (let factor = 1; factor >= FRACCION_MINIMA - 1e-9; factor -= 0.1) {
    const items = alimentos.map(({ alimento, racion }) => ({ alimento, gramos: Math.floor((racion * factor) / PASO_G) * PASO_G }))
    if (items.some((i) => i.gramos < MIN_G)) return null
    if (cabe(aporteDeItems(items), falta)) return items
  }
  return null
}

function claveDe(items: readonly PropuestaItem[]): string {
  return items.map((i) => claveRef(i.alimento.ref)).sort().join('+')
}

/** Útil para cerrar el día: deja al menos un 20 % menos de hueco que no comer nada. */
function aporta(aporte: Macros4, falta: Falta): boolean {
  return huecoRestante(aporte, falta) <= huecoRestante({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, falta) * 0.8
}

function candidata(tipo: 'combinacion' | 'idea' | 'suelto', alimentos: readonly ConRacion[], falta: Falta): Propuesta | null {
  const items = ajustar(alimentos, falta)
  if (!items) return null
  const aporte = aporteDeItems(items)
  return aporta(aporte, falta) ? { tipo, clave: `${tipo}:${claveDe(items)}`, items, aporte } : null
}

/**
 * Una idea que ya tienes entre tus frecuentes con otro nombre: misma categoría y su palabra principal (la primera)
 * aparece en el nombre del frecuente («Pollo, pechuga a la plancha» y tu «Pechuga de pollo»).
 */
function repiteFrecuente(idea: AlimentoElegible, frecuentes: readonly ConRacion[]): boolean {
  const [principal] = tokensConsulta(idea.nombre)
  return !!principal && frecuentes.some((f) => f.alimento.categoria === idea.categoria && tokensConsulta(f.alimento.nombre).some((w) => mismaRaiz(w, principal)))
}

/** Dos alimentos combinan si son de categorías distintas (pollo con arroz, no pollo con pavo). */
function combinan(a: AlimentoElegible, b: AlimentoElegible): boolean {
  return !a.categoria || !b.categoria || a.categoria !== b.categoria
}

function porHueco(falta: Falta) {
  return (a: Propuesta, b: Propuesta) => huecoRestante(a.aporte, falta) - huecoRestante(b.aporte, falta)
}

/** Aporte de una comida típica tal cual se guardó. */
function aporteDeTipica(items: readonly MealItem[]): Macros4 {
  return sumMacros(items.map((i) => ({ kcal: i.kcal, prot: i.prot, carb: i.carb, grasa: i.grasa })))
}

/**
 * Todas las propuestas para lo que falta, ya ordenadas por el hueco que dejan:
 * - típicas que caben tal cual (como mucho `MAX_TIPICAS`) y combinaciones de dos frecuentes (`MAX_COMBINACIONES`);
 * - ideas: alimentos de la lista que no sueles registrar (ni con otro nombre), cada uno solo o con el frecuente que
 *   mejor encaja;
 * - sueltos: tus frecuentes solos, con tu ración habitual como tope.
 * Cada propuesta se mide contra lo que puede ocupar (`paraUnaPropuesta`). Nada si no hay hueco en el día (`hayHueco`).
 */
export function proponer({ falta: delDia, comida, tipicas, frecuentes, ideas }: {
  falta: Falta | null
  comida: Comida
  tipicas: readonly ComidaTipica[]
  frecuentes: readonly ConRacion[]
  ideas: readonly ConRacion[]
}): Propuestas {
  if (!hayHueco(delDia)) return { fijas: [], ideas: [], sueltos: [] }
  const falta = paraUnaPropuesta(delDia, comida)
  const orden = porHueco(falta)
  const validas = (ps: (Propuesta | null)[]) => ps.filter((p): p is Propuesta => p !== null).sort(orden)

  const conTipicas: Propuesta[] = tipicas
    .map((tipica): Propuesta => ({ tipo: 'tipica', clave: `tipica:${tipica.clave}`, tipica, aporte: aporteDeTipica(tipica.items) }))
    .filter((p) => cabe(p.aporte, falta) && aporta(p.aporte, falta))
    .sort(orden)
    .slice(0, MAX_TIPICAS)

  const pares: (Propuesta | null)[] = []
  for (let i = 0; i < frecuentes.length; i++) {
    for (let j = i + 1; j < frecuentes.length; j++) {
      if (combinan(frecuentes[i].alimento, frecuentes[j].alimento)) pares.push(candidata('combinacion', [frecuentes[i], frecuentes[j]], falta))
    }
  }
  const combinaciones = validas(pares).slice(0, MAX_COMBINACIONES)

  const usados = new Set(frecuentes.map((f) => claveRef(f.alimento.ref)))
  const nuevas = ideas.filter((idea) => !usados.has(claveRef(idea.alimento.ref)) && !repiteFrecuente(idea.alimento, frecuentes))
  // Cada idea una sola vez, sola o con el frecuente que mejor encaja: así cada tanda trae alimentos distintos.
  const conIdeas = nuevas.map((idea) => validas([
    candidata('idea', [idea], falta),
    ...frecuentes.filter((f) => combinan(idea.alimento, f.alimento)).map((f) => candidata('idea', [idea, f], falta)),
  ])[0] ?? null)

  return {
    fijas: [...conTipicas, ...combinaciones],
    ideas: validas(conIdeas),
    sueltos: validas(frecuentes.map((f) => candidata('suelto', [f], falta))),
  }
}

/** Las ideas de las categorías que la persona registra (sin categoría, ninguna). */
export function ideasPara(ideas: readonly ConRacion[], categorias: ReadonlySet<string>): ConRacion[] {
  return ideas.filter((i) => i.alimento.categoria !== undefined && categorias.has(i.alimento.categoria))
}

/** La tanda `vuelta` de una lista ordenada, de `n` en `n`; al acabarse vuelve a empezar. */
export function tanda<T>(lista: readonly T[], n: number, vuelta: number): T[] {
  if (lista.length <= n) return [...lista]
  const paginas = Math.ceil(lista.length / n)
  const inicio = (vuelta % paginas) * n
  return lista.slice(inicio, inicio + n)
}

/** Si «Sugerir otras» puede enseñar algo distinto. */
export function hayMasTandas(p: Propuestas): boolean {
  return p.ideas.length > MAX_IDEAS || p.sueltos.length > MAX_SUELTOS
}

/**
 * Básicos del catálogo para «Otras ideas», con una ración normal. Selección curada por id (como `PREFERIDOS`);
 * solo se proponen los de categorías que la persona ya registra y los que no están entre sus frecuentes.
 */
export const IDEAS: readonly { id: string; gramos: number }[] = [
  // Proteína
  { id: 'ciqual:36018', gramos: 150 }, // Pollo, pechuga sin piel a la plancha
  { id: 'ciqual:36306', gramos: 150 }, // Pavo, escalopa a la plancha
  { id: 'ciqual:26039', gramos: 60 }, // Atún al natural, escurrido (una lata)
  { id: 'ciqual:22010', gramos: 120 }, // Huevo duro (dos)
  { id: 'ciqual:28964', gramos: 60 }, // Pechuga de pavo en lonchas
  { id: 'ciqual:10086', gramos: 125 }, // Gambas o langostinos cocidos
  { id: 'ciqual:20904', gramos: 125 }, // Tofu natural
  { id: 'ciqual:20360', gramos: 200 }, // Lenteja hervida
  { id: 'ciqual:20532', gramos: 150 }, // Garbanzo en conserva
  // Lácteos
  { id: 'ciqual:19644', gramos: 200 }, // Queso blanco 0 % (queso fresco batido)
  { id: 'ciqual:19724', gramos: 150 }, // Especialidad láctea rica en proteínas (tipo skyr)
  { id: 'ciqual:19594', gramos: 125 }, // Yogur natural 0 %
  { id: 'ciqual:19041', gramos: 250 }, // Leche semidesnatada (un vaso)
  { id: 'ciqual:19590', gramos: 60 }, // Mozzarella
  // Carbohidratos
  { id: 'ciqual:9104', gramos: 150 }, // Arroz blanco cocido
  { id: 'ciqual:9811', gramos: 180 }, // Pasta cocida
  { id: 'ciqual:4003', gramos: 200 }, // Patata hervida
  { id: 'ciqual:7001', gramos: 60 }, // Pan blanco
  { id: 'ciqual:7110', gramos: 60 }, // Pan integral
  { id: 'ciqual:32140', gramos: 40 }, // Copos de avena
  { id: 'ciqual:13005', gramos: 120 }, // Plátano
  { id: 'ciqual:13039', gramos: 150 }, // Manzana
  // Grasas
  { id: 'ciqual:15041', gramos: 25 }, // Almendra
  { id: 'ciqual:15005', gramos: 25 }, // Nuez
  { id: 'ciqual:13004', gramos: 70 }, // Aguacate (medio)
  { id: 'ciqual:17270', gramos: 10 }, // Aceite de oliva virgen extra (una cucharada)
]
