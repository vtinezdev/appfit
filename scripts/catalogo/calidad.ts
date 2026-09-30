// Validador de calidad común a todas las fuentes del catálogo (CIQUAL, Open Food Facts…).
// Puro: sin disco ni red. Se ejecuta con el type stripping de Node (solo sintaxis borrable, imports con `.ts`).
//
// Dos niveles:
//  - ERRORES: el dato es imposible o el paquete está mal formado. Bloquean la construcción.
//  - AVISOS: el dato es sospechoso (p. ej. la energía no cuadra con los macros). Van al informe.
//    Política: en CIQUAL un aviso NUNCA cambia el valor oficial; en OFF (datos colaborativos) un aviso
//    excluye el producto.

export type ClaveExtra = 'fibra' | 'azucares' | 'sal' | 'agSat'

/** Un alimento en la forma mínima que necesita el validador (valores por 100 g / 100 ml). */
export interface AlimentoCalidad {
  id: string
  nombre: string
  marca?: string
  kcal: number
  prot: number
  carb: number
  grasa: number
  fibra?: number
  azucares?: number
  sal?: number
  agSat?: number
  /** g de alcohol por 100 g/ml. Solo sirve para el control de energía; no se guarda en el paquete. */
  alcohol?: number
  /** Valores por 100 ml en lugar de 100 g. Solo válido en productos de marca. */
  ml?: boolean
}

export type TipoFuente = 'generico' | 'marca'

export interface Hallazgo {
  id: string
  nombre: string
  regla: string
  detalle: string
}

export interface ResultadoCalidad {
  errores: Hallazgo[]
  avisos: Hallazgo[]
}

/** Umbrales del control de energía: aviso si |kcal − esperado| > max(UMBRAL_KCAL, UMBRAL_REL · kcal). */
export const UMBRAL_KCAL = 15
export const UMBRAL_REL = 0.2
export const KCAL_MAX = 900

/** Minúsculas, sin tildes y sin espacios sobrantes. Replica `normalizeName` de la app (los scripts no importan de src). */
export function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

/** kcal esperadas por Atwater con los factores del Reglamento UE 1169/2011: 4P + 4C + 9G + 2·fibra (+ 7·alcohol). */
export function energiaEsperada(a: AlimentoCalidad): number {
  return 4 * a.prot + 4 * a.carb + 9 * a.grasa + 2 * (a.fibra ?? 0) + 7 * (a.alcohol ?? 0)
}

function hallazgo(a: AlimentoCalidad, regla: string, detalle: string): Hallazgo {
  return { id: a.id, nombre: a.nombre, regla, detalle }
}

function esNumeroValido(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

/** Reglas que solo miran un alimento. */
export function validarAlimento(a: AlimentoCalidad, tipo: TipoFuente): ResultadoCalidad {
  const errores: Hallazgo[] = []
  const avisos: Hallazgo[] = []
  const err = (regla: string, detalle: string) => errores.push(hallazgo(a, regla, detalle))

  if (typeof a.id !== 'string' || a.id.trim() === '') err('id-vacio', 'id vacío')
  if (typeof a.nombre !== 'string' || a.nombre.trim() === '') err('nombre-vacio', 'nombre vacío')

  const valores: [string, unknown][] = [
    ['kcal', a.kcal],
    ['prot', a.prot],
    ['carb', a.carb],
    ['grasa', a.grasa],
  ]
  for (const k of ['fibra', 'azucares', 'sal', 'agSat', 'alcohol'] as const) {
    if (a[k] !== undefined) valores.push([k, a[k]])
  }
  let numerosOk = true
  for (const [k, v] of valores) {
    if (!esNumeroValido(v)) {
      numerosOk = false
      err('numero-invalido', `${k} = ${String(v)} (no es un número finito y no negativo)`)
    }
  }
  if (!numerosOk) return { errores, avisos }

  if (a.kcal > KCAL_MAX) err('kcal-excesiva', `${a.kcal} kcal/100 g (máximo físico ${KCAL_MAX})`)
  for (const k of ['prot', 'carb', 'grasa'] as const) {
    if (a[k] > 100) err('macro-excesivo', `${k} = ${a[k]} g/100 g`)
  }
  const suma = a.prot + a.carb + a.grasa
  if (suma > 101) err('macros-suman-mas-de-100', `prot + carb + grasa = ${suma.toFixed(1)} g/100 g`)
  if (a.sal !== undefined && a.sal > 100) err('sal-excesiva', `sal = ${a.sal} g/100 g`)
  if (a.azucares !== undefined && a.azucares > a.carb + 0.5) {
    err('azucares-mayor-que-carb', `azúcares ${a.azucares} > hidratos ${a.carb}`)
  }
  if (a.agSat !== undefined && a.agSat > a.grasa + 0.5) {
    err('agsat-mayor-que-grasa', `grasa saturada ${a.agSat} > grasa ${a.grasa}`)
  }
  if (a.fibra !== undefined && a.fibra > 100) err('fibra-excesiva', `fibra = ${a.fibra} g/100 g`)
  if (a.ml && tipo === 'generico') err('ml-en-generico', 'los alimentos genéricos van por 100 g, no por 100 ml')

  const esperada = energiaEsperada(a)
  const diferencia = a.kcal - esperada
  if (Math.abs(diferencia) > Math.max(UMBRAL_KCAL, UMBRAL_REL * a.kcal)) {
    avisos.push(
      hallazgo(
        a,
        'energia-incoherente',
        `${a.kcal} kcal declaradas frente a ${esperada.toFixed(0)} esperadas (4P+4C+9G+2fibra${a.alcohol ? '+7alcohol' : ''}); diferencia ${diferencia > 0 ? '+' : ''}${diferencia.toFixed(0)}`,
      ),
    )
  }
  return { errores, avisos }
}

function mismosValores(a: AlimentoCalidad, b: AlimentoCalidad): boolean {
  return (
    a.kcal === b.kcal &&
    a.prot === b.prot &&
    a.carb === b.carb &&
    a.grasa === b.grasa &&
    a.fibra === b.fibra &&
    a.azucares === b.azucares &&
    a.sal === b.sal &&
    a.agSat === b.agSat
  )
}

/**
 * Valida una fuente entera: cada alimento (`validarAlimento`) más las reglas de conjunto:
 * ids repetidos y mismo nombre normalizado (y misma marca) repetido, con valores distintos o idénticos.
 */
export function validarConjunto(alimentos: AlimentoCalidad[], tipo: TipoFuente): ResultadoCalidad {
  const errores: Hallazgo[] = []
  const avisos: Hallazgo[] = []
  const ids = new Map<string, AlimentoCalidad>()
  const nombres = new Map<string, AlimentoCalidad>()
  for (const a of alimentos) {
    const r = validarAlimento(a, tipo)
    errores.push(...r.errores)
    avisos.push(...r.avisos)
    if (ids.has(a.id)) errores.push(hallazgo(a, 'id-repetido', `el id «${a.id}» aparece más de una vez`))
    ids.set(a.id, a)
    if (typeof a.nombre !== 'string' || a.nombre.trim() === '') continue
    const clave = `${normalizar(a.nombre)}|${normalizar(a.marca ?? '')}`
    const previo = nombres.get(clave)
    if (previo) {
      errores.push(
        hallazgo(
          a,
          mismosValores(previo, a) ? 'nombre-repetido-mismos-valores' : 'nombre-repetido-valores-distintos',
          `mismo nombre que ${previo.id}${a.marca ? ` (marca ${a.marca})` : ''}`,
        ),
      )
    } else nombres.set(clave, a)
  }
  return { errores, avisos }
}

// ───────────────────────── Paquetes publicados ─────────────────────────

/** Fila de un paquete de formato 2 (ver `ciqualLib.ts`), en la forma mínima que se necesita aquí. */
export type FilaPaquete = [
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  Partial<Record<ClaveExtra, number>>?,
  { alias?: string[]; marca?: string; gtin?: string; ml?: 1; oculto?: 1; secundario?: 1 }?,
]

export interface PaqueteCalidad {
  formato: number
  fuente: string
  version: string
  tipo: TipoFuente
  filas: FilaPaquete[]
}

/** Convierte las filas de un paquete a `AlimentoCalidad` (sin alcohol: ese dato no se publica). */
export function alimentosDePaquete(p: PaqueteCalidad): AlimentoCalidad[] {
  return p.filas.map((f) => {
    const extra = f[9] ?? {}
    const n = f[8] ?? {}
    const a: AlimentoCalidad = { id: `${p.fuente}:${f[0]}`, nombre: f[1], kcal: f[4], prot: f[5], carb: f[6], grasa: f[7] }
    if (extra.marca) a.marca = extra.marca
    if (extra.ml) a.ml = true
    for (const k of ['fibra', 'azucares', 'sal', 'agSat'] as const) if (n[k] !== undefined) a[k] = n[k]
    return a
  })
}

/**
 * Valida un paquete publicado. El paquete no lleva el alcohol (solo sirve para el control de energía al
 * construir), así que aquí el aviso de energía se ignora en las bebidas alcohólicas; en CIQUAL se ignora
 * siempre porque sus avisos son esperables (edulcorantes, polioles, ácidos orgánicos) y ya van al informe.
 * En productos de marca (OFF) los avisos ya excluyeron el producto al construir: aquí deben ser cero.
 */
export function validarPaquetePublicado(p: PaqueteCalidad): ResultadoCalidad {
  const r = validarConjunto(alimentosDePaquete(p), p.tipo)
  if (p.tipo === 'generico') return { errores: r.errores, avisos: r.avisos.filter((h) => h.regla !== 'energia-incoherente') }
  const alcoholicos = new Set(p.filas.filter((f) => f[3] === 'Bebidas alcohólicas').map((f) => `${p.fuente}:${f[0]}`))
  return { errores: r.errores, avisos: r.avisos.filter((h) => !(h.regla === 'energia-incoherente' && alcoholicos.has(h.id))) }
}

// ───────────────────────── Informe ─────────────────────────

export interface DatosInforme {
  fuente: string
  version: string
  /** Alimentos que se publican. */
  total: number
  /** Líneas de contexto (descartados, ocultos, excluidos por motivo…). */
  resumen: string[]
  errores: Hallazgo[]
  avisos: Hallazgo[]
  /** Alimentos publicados que no traen cada nutriente extra. */
  faltantes?: Record<string, number>
}

/** Texto del informe versionado en `scripts/catalogo/informes/<fuente>.txt`. Determinista (sin fecha). */
export function formatearInforme(d: DatosInforme): string {
  const porRegla = (hs: Hallazgo[]) => {
    const m = new Map<string, number>()
    for (const h of hs) m.set(h.regla, (m.get(h.regla) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1]).map(([r, n]) => `  ${r}: ${n}`)
  }
  const linea = (h: Hallazgo) => `  ${h.id}\t${h.nombre}\t[${h.regla}] ${h.detalle}`
  const out: string[] = [`Informe de calidad · ${d.fuente} ${d.version}`, `Alimentos publicados: ${d.total}`, ...d.resumen]
  if (d.faltantes) {
    out.push('', 'Nutrientes extra ausentes (alimentos sin el dato):')
    for (const [k, n] of Object.entries(d.faltantes)) out.push(`  ${k}: ${n}`)
  }
  out.push('', `ERRORES: ${d.errores.length}`, ...porRegla(d.errores), ...d.errores.map(linea))
  out.push('', `AVISOS: ${d.avisos.length}`, ...porRegla(d.avisos), ...d.avisos.map(linea))
  return out.join('\n') + '\n'
}
