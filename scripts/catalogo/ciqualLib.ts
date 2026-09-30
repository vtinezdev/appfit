// Lógica pura de la tubería CIQUAL (ANSES) → paquete JSON del catálogo.
// Sin acceso a disco ni a red: el CLI (`ciqual.ts`) lee/escribe; aquí solo se transforma.
// Se ejecuta con el type stripping de Node: solo sintaxis borrable e imports con extensión `.ts`.
import type { AlimentoCalidad } from './calidad.ts'

// ───────────────────────── Tipos ─────────────────────────

/** Claves cortas y estables de `nutrientes` (por 100 g). Ausente = desconocido; 0 = conocido. */
export type ClaveNutriente = 'fibra' | 'azucares' | 'sal' | 'agSat'

/** Los 8 nutrientes que cuentan para `completitud`. */
export type ClaveCiqual = 'kcal' | 'prot' | 'carb' | 'grasa' | ClaveNutriente

/** Lo que se lee de `compo.xml`: los 8 del paquete más el alcohol (solo para el control de energía). */
type ClaveLeida = ClaveCiqual | 'alcohol'

export const CLAVES_EXTRA: ClaveNutriente[] = ['fibra', 'azucares', 'sal', 'agSat']
export const CLAVES_BASE = ['kcal', 'prot', 'carb', 'grasa'] as const
const TOTAL_NUTRIENTES = CLAVES_BASE.length + CLAVES_EXTRA.length

export interface Constituyente {
  code: string
  nombreFr: string
}

export interface AlimentoCiqual {
  code: string
  nombreFr: string
  nombreEn: string
  grupoCodigo: string
  /** Subgrupo (4 cifras) y sub-subgrupo (6 cifras; '000000' = sin sub-subgrupo). */
  subgrupoCodigo: string
  subsubgrupoCodigo: string
  /** Categoría AppFit en español (ver `CATEGORIAS_APPFIT`). */
  categoria: string
  /** Va detrás de los demás al buscar (productos de Martinica/Reunión, alimentos infantiles). */
  secundario: boolean
  kcal: number
  prot: number
  carb: number
  grasa: number
  /** Solo los extras conocidos (`fibra`, `azucares`, `sal`, `agSat`). Ausente si no hay ninguno. */
  nutrientes?: Partial<Record<ClaveNutriente, number>>
  /** g de alcohol/100 g. SOLO para el control de energía de `calidad.ts`: no se guarda en el paquete. */
  alcohol?: number
  /** Fracción (0..1) de los 8 nutrientes conocidos. */
  completitud: number
}

export interface ResultadoAlimentos {
  alimentos: AlimentoCiqual[]
  /** Filas descartadas por no tener kcal/prot/carb/grasa conocidos. */
  descartados: number
  /** Códigos de los descartados (para diagnóstico). */
  codigosDescartados: string[]
}

export interface Traduccion {
  nombreEs: string
  alias: string[]
}

/** Campos poco frecuentes de una fila (formato 2). Los indicadores binarios van como `1`. */
export interface ExtraFila {
  alias?: string[]
  marca?: string
  gtin?: string
  /** Valores por 100 ml en lugar de 100 g (solo productos de marca). */
  ml?: 1
  /** No aparece al buscar; el id se conserva para frecuentes, plantillas y entradas antiguas. */
  oculto?: 1
  /** Va detrás de los demás al buscar. */
  secundario?: 1
}

export type Fila = [
  idExterno: string,
  nombre: string,
  nombreOriginal: string,
  categoria: string,
  kcal: number,
  prot: number,
  carb: number,
  grasa: number,
  nutrientes?: Partial<Record<ClaveNutriente, number>>,
  extra?: ExtraFila,
]

export interface Paquete {
  formato: 2
  fuente: string
  version: string
  /** Genéricos (CIQUAL) o productos de marca (Open Food Facts). */
  tipo: 'generico' | 'marca'
  filas: Fila[]
}

export interface EntradaManifest {
  id: string
  version: string
  archivo: string
  filas: number
  licencia: string
  atribucion: string
}

export interface Manifest {
  formato: 1
  fuentes: EntradaManifest[]
}

// ───────────────────────── XML ─────────────────────────

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decodificarEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : todo
    }
    return ENTIDADES[e.toLowerCase()] ?? todo
  })
}

/**
 * Lee un XML plano de CIQUAL (`<TABLE><ALIM>…</ALIM>…</TABLE>`) y devuelve un objeto por cada
 * bloque `<etiqueta>`, con sus hijos hoja como cadenas recortadas y con entidades decodificadas.
 * Un hijo autocerrado (`<min missing=" " />`) se devuelve como cadena vacía. Sin dependencias.
 */
export function parsearRegistros(xml: string, etiqueta: string): Record<string, string>[] {
  const bloque = new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`, 'g')
  const hijo = /<([A-Za-z_][\w.-]*)(?:\s[^>]*)?(?:\/>|>([^<]*)<\/\1>)/g
  const registros: Record<string, string>[] = []
  for (const b of xml.matchAll(bloque)) {
    const reg: Record<string, string> = {}
    for (const h of b[1].matchAll(hijo)) {
      reg[h[1]] = decodificarEntidades(h[2] ?? '').trim()
    }
    registros.push(reg)
  }
  return registros
}

// ───────────────────────── Valores ─────────────────────────

/**
 * Convierte una «teneur» de CIQUAL a número, o `undefined` si es desconocida.
 * Convenciones:
 *  - coma decimal (`12,5`);
 *  - vacío o `-` → desconocido (la clave se omite);
 *  - `traces` → 0;
 *  - `< x` (por debajo del límite de cuantificación) → x / 2, punto medio entre 0 y el límite.
 */
export function parsearValor(texto: string | undefined): number | undefined {
  const t = (texto ?? '').trim().toLowerCase()
  if (t === '' || t === '-') return undefined
  if (t === 'traces' || t === 'trace') return 0
  const menor = t.startsWith('<')
  const n = Number(t.replace(/^<\s*/, '').replace(',', '.'))
  if (!Number.isFinite(n)) return undefined
  return menor ? n / 2 : n
}

/** Redondea a 1 decimal. */
export function redondear1(n: number): number {
  return Math.round(n * 10) / 10
}

// ───────────────────────── Constituyentes ─────────────────────────

/**
 * Cómo se reconoce cada nutriente por su nombre francés en `const.xml` (no por posición ni por
 * código numérico, que podría cambiar entre versiones). Cada patrón debe casar con UNA sola fila.
 */
const PATRONES_CONSTITUYENTE: Record<ClaveLeida, RegExp> = {
  kcal: /^Energie, R[eè]glement UE N° 1169\/2011 \(kcal\/100 ?g\)/i,
  prot: /^Prot[eé]ines, N x facteur de Jones \(g\/100 ?g\)/i,
  carb: /^Glucides \(g\/100 ?g\)/i,
  grasa: /^Lipides \(g\/100 ?g\)/i,
  fibra: /^Fibres alimentaires \(g\/100 ?g\)/i,
  azucares: /^Sucres \(g\/100 ?g\)/i,
  sal: /^Sel chlorure de sodium \(g\/100 ?g\)/i,
  agSat: /^AG satur[eé]s \(g\/100 ?g\)/i,
  // Solo para el control de energía (`calidad.ts`); no se guarda.
  alcohol: /^Alcool \([eé]thanol\) \(g\/100 ?g\)/i,
}

/** Devuelve el `const_code` de cada nutriente. Lanza si alguno no aparece o es ambiguo. */
export function localizarConstituyentes(consts: Constituyente[]): Record<ClaveLeida, string> {
  const res = {} as Record<ClaveLeida, string>
  for (const clave of Object.keys(PATRONES_CONSTITUYENTE) as ClaveLeida[]) {
    const casan = consts.filter((c) => PATRONES_CONSTITUYENTE[clave].test(c.nombreFr))
    if (casan.length !== 1) {
      throw new Error(`Constituyente «${clave}»: ${casan.length} coincidencias por nombre (se esperaba 1)`)
    }
    res[clave] = casan[0].code
  }
  return res
}

// ───────────────────────── Categorías ─────────────────────────

/** Categorías AppFit (las comparten CIQUAL y Open Food Facts). Solo sirven para ordenar y mantener: no hay filtro en la UI. */
export const CATEGORIAS_APPFIT = [
  'Frutas',
  'Verduras y hortalizas',
  'Patatas y tubérculos',
  'Legumbres',
  'Frutos secos y semillas',
  'Cereales, arroz y pasta',
  'Pan y tostadas',
  'Cereales de desayuno y barritas',
  'Galletas, bollería y pasteles',
  'Carnes',
  'Embutidos y fiambres',
  'Pescados',
  'Mariscos',
  'Huevos',
  'Leche y nata',
  'Yogures y postres lácteos',
  'Quesos',
  'Bebidas vegetales',
  'Alternativas vegetales',
  'Aceites y grasas',
  'Salsas y condimentos',
  'Dulces y chocolate',
  'Helados',
  'Bebidas',
  'Bebidas alcohólicas',
  'Snacks salados',
  'Platos preparados',
  'Alimentos infantiles',
  'Otros',
] as const

export type CategoriaAppfit = (typeof CATEGORIAS_APPFIT)[number]

/**
 * Categoría por código de CIQUAL. Gana el más específico: sub-subgrupo (6 cifras) > subgrupo (4) > grupo (2).
 * Los códigos salen de `alim_grp_*.xml`. Un código que no está en las tablas es un fallo (una versión nueva de
 * CIQUAL con grupos nuevos obliga a revisar este mapa).
 */
const POR_SUBSUBGRUPO: Record<string, CategoriaAppfit> = {
  // Verduras (las de Martinica/Reunión son «secundarias», ver SUBSUBGRUPOS_SECUNDARIOS)
  '020101': 'Verduras y hortalizas', '020102': 'Verduras y hortalizas', '020103': 'Verduras y hortalizas',
  '020104': 'Verduras y hortalizas', '020105': 'Verduras y hortalizas',
  // Legumbres
  '020301': 'Legumbres', '020302': 'Legumbres', '020303': 'Legumbres',
  // Frutas
  '020401': 'Frutas', '020402': 'Frutas', '020403': 'Frutas', '020404': 'Frutas', '020405': 'Frutas', '020406': 'Frutas',
  // Cereales y pan
  '030101': 'Cereales, arroz y pasta', '030102': 'Cereales, arroz y pasta',
  '030201': 'Pan y tostadas', '030202': 'Pan y tostadas',
  // Carne cocinada y cruda (las vísceras también son carnes)
  '040101': 'Carnes', '040102': 'Carnes', '040103': 'Carnes', '040104': 'Carnes',
  '040105': 'Carnes', '040106': 'Carnes', '040107': 'Carnes', '040108': 'Carnes',
  '040201': 'Carnes', '040202': 'Carnes', '040203': 'Carnes', '040204': 'Carnes',
  '040205': 'Carnes', '040206': 'Carnes', '040207': 'Carnes', '040208': 'Carnes',
  // Charcutería
  '040301': 'Embutidos y fiambres', '040302': 'Embutidos y fiambres', '040303': 'Embutidos y fiambres',
  '040304': 'Embutidos y fiambres', '040305': 'Embutidos y fiambres', '040306': 'Embutidos y fiambres',
  '040307': 'Platos preparados', // quenelles
  '040308': 'Embutidos y fiambres',
  '040309': 'Alternativas vegetales',
  // Huevos
  '041001': 'Huevos', '041002': 'Huevos', '041003': 'Huevos',
  // Leche
  '050101': 'Leche y nata', '050102': 'Leche y nata', '050103': 'Leche y nata',
  // Yogures y postres
  '050201': 'Yogures y postres lácteos', '050202': 'Yogures y postres lácteos',
  '050203': 'Yogures y postres lácteos', '050204': 'Yogures y postres lácteos',
  '050205': 'Alternativas vegetales',
  // Quesos
  '050301': 'Quesos', '050302': 'Quesos', '050303': 'Quesos', '050304': 'Quesos', '050305': 'Quesos',
  '050306': 'Alternativas vegetales',
  // Bebidas
  '060201': 'Bebidas', '060202': 'Bebidas', '060203': 'Bebidas', '060204': 'Bebidas',
  '060205': 'Bebidas vegetales', '060206': 'Bebidas', '060207': 'Bebidas',
  '060301': 'Bebidas alcohólicas', '060302': 'Bebidas alcohólicas', '060303': 'Bebidas alcohólicas',
  '060304': 'Bebidas alcohólicas',
  // Platos
  '010301': 'Platos preparados', '010302': 'Platos preparados', '010303': 'Platos preparados',
  '010304': 'Platos preparados', '010305': 'Platos preparados', '010306': 'Platos preparados',
  '010307': 'Platos preparados', '010308': 'Platos preparados', '010309': 'Platos preparados',
  // Salsas y hierbas
  '100101': 'Salsas y condimentos', '100102': 'Salsas y condimentos', '100103': 'Salsas y condimentos',
  '100601': 'Salsas y condimentos', '100602': 'Salsas y condimentos',
}

/** Categoría por subgrupo (4 cifras): los que no tienen sub-subgrupos y el valor por defecto de los que sí. */
const POR_SUBGRUPO: Record<string, CategoriaAppfit> = {
  '0101': 'Platos preparados', '0102': 'Platos preparados', '0103': 'Platos preparados',
  '0104': 'Platos preparados', '0105': 'Platos preparados', '0106': 'Platos preparados',
  '0201': 'Verduras y hortalizas', '0202': 'Patatas y tubérculos', '0203': 'Legumbres', '0204': 'Frutas',
  '0205': 'Frutos secos y semillas',
  '0301': 'Cereales, arroz y pasta', '0302': 'Pan y tostadas', '0303': 'Snacks salados',
  '0304': 'Cereales, arroz y pasta', '0305': 'Cereales, arroz y pasta',
  '0401': 'Carnes', '0402': 'Carnes', '0403': 'Embutidos y fiambres', '0404': 'Carnes',
  '0405': 'Pescados', '0406': 'Pescados', '0407': 'Mariscos', '0408': 'Mariscos', '0409': 'Pescados',
  '0410': 'Huevos', '0411': 'Alternativas vegetales',
  '0501': 'Leche y nata', '0502': 'Yogures y postres lácteos', '0503': 'Quesos', '0504': 'Leche y nata',
  '0601': 'Bebidas', '0602': 'Bebidas', '0603': 'Bebidas alcohólicas',
  '0701': 'Dulces y chocolate', '0702': 'Dulces y chocolate', '0703': 'Dulces y chocolate', '0704': 'Dulces y chocolate',
  '0705': 'Galletas, bollería y pasteles', '0706': 'Galletas, bollería y pasteles',
  '0707': 'Cereales de desayuno y barritas', '0708': 'Cereales de desayuno y barritas',
  '0709': 'Galletas, bollería y pasteles',
  '0801': 'Helados', '0802': 'Helados', '0803': 'Helados',
  '0901': 'Aceites y grasas', '0902': 'Aceites y grasas', '0903': 'Aceites y grasas',
  '0904': 'Aceites y grasas', '0905': 'Aceites y grasas',
  '1001': 'Salsas y condimentos', '1002': 'Salsas y condimentos', '1003': 'Salsas y condimentos',
  '1004': 'Salsas y condimentos', '1005': 'Salsas y condimentos', '1006': 'Salsas y condimentos',
  '1007': 'Verduras y hortalizas', // algas
  '1008': 'Otros', // alimentos para usos nutricionales particulares
  '1009': 'Alternativas vegetales', '1010': 'Alternativas vegetales',
  '1101': 'Alimentos infantiles', '1102': 'Alimentos infantiles', '1103': 'Alimentos infantiles',
  '1104': 'Alimentos infantiles',
}

/** Categoría por grupo (2 cifras) para los alimentos sin subgrupo (p. ej. el grupo 08 usa el subgrupo `0000`). */
const POR_GRUPO: Record<string, CategoriaAppfit> = {
  '00': 'Otros', // solo 'Dessert (aliment moyen)': un alimento medio sin grupo real
  '01': 'Platos preparados',
  '08': 'Helados',
  '11': 'Alimentos infantiles',
}

/** Sub-subgrupos «secundarios»: no se ocultan, pero van detrás al buscar (Martinica y Reunión). */
const SUBSUBGRUPOS_SECUNDARIOS = new Set(['020104', '020105', '020405', '020406'])
/** Grupos enteros secundarios: alimentos infantiles. */
const GRUPOS_SECUNDARIOS = new Set(['11'])

const SIN_SUBSUBGRUPO = '000000'
const SIN_SUBGRUPO = '0000'

/** Los códigos que el mapa conoce (para los tests y para comprobar una versión nueva de CIQUAL). */
export function codigosConocidos() {
  return { subsubgrupos: Object.keys(POR_SUBSUBGRUPO), subgrupos: Object.keys(POR_SUBGRUPO), grupos: Object.keys(POR_GRUPO) }
}

/**
 * Categoría AppFit de un alimento de CIQUAL a partir de sus tres códigos de grupo (`alim_grp_code`,
 * `alim_ssgrp_code`, `alim_ssssgrp_code`). Lanza si el código no está en el mapa.
 */
export function categoriaDe(grupo: string, subgrupo: string, subsubgrupo: string): CategoriaAppfit {
  if (subsubgrupo && subsubgrupo !== SIN_SUBSUBGRUPO) {
    const c = POR_SUBSUBGRUPO[subsubgrupo]
    if (!c) throw new Error(`Sub-subgrupo CIQUAL «${subsubgrupo}» sin categoría en POR_SUBSUBGRUPO`)
    return c
  }
  if (subgrupo && subgrupo !== SIN_SUBGRUPO) {
    const c = POR_SUBGRUPO[subgrupo]
    if (!c) throw new Error(`Subgrupo CIQUAL «${subgrupo}» sin categoría en POR_SUBGRUPO`)
    return c
  }
  const c = POR_GRUPO[grupo]
  if (!c) throw new Error(`Grupo CIQUAL «${grupo}» (sin subgrupo) sin categoría en POR_GRUPO`)
  return c
}

export function esSecundario(grupo: string, subsubgrupo: string): boolean {
  return GRUPOS_SECUNDARIOS.has(grupo) || SUBSUBGRUPOS_SECUNDARIOS.has(subsubgrupo)
}

// ───────────────────────── Alimentos ─────────────────────────

export interface EntradaAlimentos {
  /** Registros de `<ALIM>` (alim_code, alim_nom_fr, alim_nom_eng, alim_grp_code, alim_ssgrp_code, alim_ssssgrp_code…). */
  alim: Record<string, string>[]
  /** Registros de `<CONST>` (const_code, const_nom_fr…). */
  consts: Record<string, string>[]
  /** Registros de `<COMPO>` (alim_code, const_code, teneur…). */
  compo: Record<string, string>[]
}

/**
 * Construye los alimentos válidos a partir de las tres tablas de CIQUAL. Descarta (y cuenta) los
 * que no tienen kcal, proteína, glúcidos y lípidos conocidos. Valores redondeados a 1 decimal.
 * Salida ordenada por `code` (numérico si procede). Lanza si un grupo no está en el mapa.
 */
export function construirAlimentos(entrada: EntradaAlimentos): ResultadoAlimentos {
  const codigos = localizarConstituyentes(
    entrada.consts.map((c) => ({ code: c.const_code, nombreFr: c.const_nom_fr })),
  )
  const claveDe = new Map<string, ClaveLeida>()
  for (const [clave, code] of Object.entries(codigos)) claveDe.set(code, clave as ClaveLeida)

  // alim_code → clave → valor (solo constituyentes que nos interesan y con valor conocido).
  const valores = new Map<string, Partial<Record<ClaveLeida, number>>>()
  for (const c of entrada.compo) {
    const clave = claveDe.get(c.const_code)
    if (!clave) continue
    const v = parsearValor(c.teneur)
    if (v === undefined) continue
    let fila = valores.get(c.alim_code)
    if (!fila) valores.set(c.alim_code, (fila = {}))
    fila[clave] = v
  }

  const alimentos: AlimentoCiqual[] = []
  const codigosDescartados: string[] = []
  for (const a of entrada.alim) {
    const v = valores.get(a.alim_code) ?? {}
    if (v.kcal === undefined || v.prot === undefined || v.carb === undefined || v.grasa === undefined) {
      codigosDescartados.push(a.alim_code)
      continue
    }
    const categoria = categoriaDe(a.alim_grp_code, a.alim_ssgrp_code ?? '', a.alim_ssssgrp_code ?? '')
    const nutrientes: Partial<Record<ClaveNutriente, number>> = {}
    for (const k of CLAVES_EXTRA) {
      const x = v[k]
      if (x !== undefined) nutrientes[k] = redondear1(x)
    }
    const extras = Object.keys(nutrientes).length
    const alimento: AlimentoCiqual = {
      code: a.alim_code,
      nombreFr: limpiarNombre(a.alim_nom_fr),
      nombreEn: limpiarNombre(a.alim_nom_eng ?? ''),
      grupoCodigo: a.alim_grp_code,
      subgrupoCodigo: a.alim_ssgrp_code ?? '',
      subsubgrupoCodigo: a.alim_ssssgrp_code ?? '',
      categoria,
      secundario: esSecundario(a.alim_grp_code, a.alim_ssssgrp_code ?? ''),
      kcal: redondear1(v.kcal),
      prot: redondear1(v.prot),
      carb: redondear1(v.carb),
      grasa: redondear1(v.grasa),
      completitud: (CLAVES_BASE.length + extras) / TOTAL_NUTRIENTES,
    }
    if (extras > 0) alimento.nutrientes = nutrientes
    if (v.alcohol !== undefined) alimento.alcohol = v.alcohol
    alimentos.push(alimento)
  }

  alimentos.sort(compararCodigos)
  return { alimentos, descartados: codigosDescartados.length, codigosDescartados }
}

/** Colapsa espacios y saltos de línea sueltos (algún nombre inglés trae un CRLF dentro). */
export function limpiarNombre(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function compararCodigos(a: { code: string }, b: { code: string }): number {
  const na = Number(a.code)
  const nb = Number(b.code)
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  return a.code < b.code ? -1 : a.code > b.code ? 1 : 0
}

/** Versión de CIQUAL (año) a partir del nombre de archivo, p. ej. `alim_2025_11_03.xml` → `2025`. */
export function versionDesdeNombre(archivo: string): string | undefined {
  return /_(\d{4})_\d{2}_\d{2}\.xml$/.exec(archivo)?.[1]
}

// ───────────────────────── CSV ─────────────────────────

/**
 * Parser CSV mínimo (RFC 4180 con separador configurable): comillas dobles, `""` como comilla
 * escapada, separador y saltos de línea dentro de comillas, CRLF/LF, BOM inicial. Las filas
 * totalmente vacías se ignoran.
 */
export function parsearCsv(texto: string, sep = ';'): string[][] {
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false
  const cerrarFila = () => {
    fila.push(campo)
    campo = ''
    if (!(fila.length === 1 && fila[0] === '')) filas.push(fila)
    fila = []
  }
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"'
          i++
        } else entreComillas = false
      } else campo += c
    } else if (c === '"') entreComillas = true
    else if (c === sep) {
      fila.push(campo)
      campo = ''
    } else if (c === '\n') cerrarFila()
    else if (c === '\r') {
      if (t[i + 1] === '\n') i++
      cerrarFila()
    } else campo += c
  }
  if (entreComillas) throw new Error('CSV mal formado: comillas sin cerrar')
  if (campo !== '' || fila.length > 0) cerrarFila()
  return filas
}

function escaparCampo(campo: string, sep: string): string {
  return campo.includes(sep) || /["\r\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo
}

/** Serializa filas a CSV (comillas solo donde hacen falta), con LF y salto final. */
export function escribirCsv(filas: string[][], sep = ';'): string {
  return filas.map((f) => f.map((c) => escaparCampo(c, sep)).join(sep)).join('\n') + '\n'
}

const CABECERA_NOMBRES = ['code', 'nombre_fr', 'nombre_en', 'grupo']

/**
 * CSV de trabajo para traducir: `code;nombre_fr;nombre_en;grupo` (grupo = categoría en español).
 * Los nombres se limpian aquí también: un salto de línea dentro de comillas rompería el «una fila por línea».
 */
export function nombresCsv(alimentos: AlimentoCiqual[]): string {
  return escribirCsv([
    CABECERA_NOMBRES,
    ...alimentos.map((a) => [a.code, limpiarNombre(a.nombreFr), limpiarNombre(a.nombreEn), a.categoria]),
  ])
}

/**
 * Lee `code;nombre_es;alias` (alias opcional, separados por `|`). Localiza columnas por nombre.
 * Lanza si faltan columnas obligatorias o si un código aparece dos veces.
 */
export function parsearTraducciones(csv: string): Map<string, Traduccion> {
  const filas = parsearCsv(csv)
  if (filas.length === 0) throw new Error('traducciones.csv vacío')
  const cab = filas[0].map((c) => c.trim().toLowerCase())
  const iCode = cab.indexOf('code')
  const iNombre = cab.indexOf('nombre_es')
  const iAlias = cab.indexOf('alias')
  if (iCode < 0 || iNombre < 0) throw new Error('traducciones.csv: faltan las columnas «code» y/o «nombre_es»')
  const res = new Map<string, Traduccion>()
  for (const f of filas.slice(1)) {
    const code = (f[iCode] ?? '').trim()
    if (!code) continue
    if (res.has(code)) throw new Error(`traducciones.csv: código duplicado ${code}`)
    const alias = iAlias >= 0 ? (f[iAlias] ?? '').split('|').map((x) => x.trim()).filter(Boolean) : []
    res.set(code, { nombreEs: (f[iNombre] ?? '').trim(), alias })
  }
  return res
}

// ───────────────────────── Paquete ─────────────────────────

export class FaltanTraducciones extends Error {
  codigos: string[]
  constructor(codigos: string[]) {
    super(`Faltan traducciones (${codigos.length}): ${codigos.join(', ')}`)
    this.name = 'FaltanTraducciones'
    this.codigos = codigos
  }
}

/**
 * Lee una lista `code;motivo` (`ocultos.csv`, `retirados.csv`). El motivo es obligatorio: sin motivo
 * escrito, no se oculta ni se retira nada. Lanza si falta una columna, un motivo o un código está repetido.
 */
export function parsearListaMotivos(csv: string, nombre: string): Map<string, string> {
  const filas = parsearCsv(csv)
  const res = new Map<string, string>()
  if (filas.length === 0) return res
  const cab = filas[0].map((c) => c.trim().toLowerCase())
  const iCode = cab.indexOf('code')
  const iMotivo = cab.indexOf('motivo')
  if (iCode < 0 || iMotivo < 0) throw new Error(`${nombre}: faltan las columnas «code» y/o «motivo»`)
  for (const f of filas.slice(1)) {
    const code = (f[iCode] ?? '').trim()
    if (!code) continue
    const motivo = (f[iMotivo] ?? '').trim()
    if (!motivo) throw new Error(`${nombre}: el código ${code} no tiene motivo`)
    if (res.has(code)) throw new Error(`${nombre}: código duplicado ${code}`)
    res.set(code, motivo)
  }
  return res
}

export interface OpcionesPaquete {
  /** Códigos que no aparecen al buscar (`oculto: 1`); se conservan por sus ids. */
  ocultos?: Map<string, string>
}

/**
 * Une alimentos y traducciones en el paquete estático (formato 2). Lanza `FaltanTraducciones` (con la lista
 * de códigos) si algún alimento no tiene `nombre_es`. Las traducciones y los ocultos de códigos inexistentes
 * se ignoran y se devuelven en `sobrantes` / `ocultosSobrantes`.
 *
 * Fila: `[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, extra?]`.
 * `extra` = `{ alias?, secundario?, oculto? }` y solo existe si hace falta; si hay `extra` pero no extras
 * nutricionales, `nutrientes` va como `{}`. `completitud` no se guarda: se deduce de las claves.
 */
export function construirPaquete(
  alimentos: AlimentoCiqual[],
  traducciones: Map<string, Traduccion>,
  version: string,
  opciones: OpcionesPaquete = {},
): { paquete: Paquete; sobrantes: string[]; ocultosSobrantes: string[] } {
  const faltan = alimentos.filter((a) => !traducciones.get(a.code)?.nombreEs).map((a) => a.code)
  if (faltan.length > 0) throw new FaltanTraducciones(faltan)
  const ocultos = opciones.ocultos ?? new Map<string, string>()

  const filas: Fila[] = alimentos.map((a) => {
    const t = traducciones.get(a.code)!
    const fila: Fila = [a.code, t.nombreEs, a.nombreFr, a.categoria, a.kcal, a.prot, a.carb, a.grasa]
    const extra: ExtraFila = {}
    if (t.alias.length > 0) extra.alias = t.alias
    if (a.secundario) extra.secundario = 1
    if (ocultos.has(a.code)) extra.oculto = 1
    if (Object.keys(extra).length > 0) fila.push(a.nutrientes ?? {}, extra)
    else if (a.nutrientes) fila.push(a.nutrientes)
    return fila
  })
  const usados = new Set(alimentos.map((a) => a.code))
  const sobrantes = [...traducciones.keys()].filter((c) => !usados.has(c))
  const ocultosSobrantes = [...ocultos.keys()].filter((c) => !usados.has(c))
  return { paquete: { formato: 2, fuente: 'ciqual', version, tipo: 'generico', filas }, sobrantes, ocultosSobrantes }
}

/**
 * Invariante de ids: todos los `idExterno` del paquete publicado anterior deben seguir en el nuevo, salvo los
 * que figuren en `retirados` (con motivo). Devuelve los que desaparecen sin justificar. Un id que desaparece
 * rompería frecuentes, plantillas y entradas que lo referencian.
 */
export function idsPerdidos(anteriores: string[], nuevos: string[], retirados: Map<string, string>): string[] {
  const hay = new Set(nuevos)
  return anteriores.filter((id) => !hay.has(id) && !retirados.has(id))
}

export const LICENCIA_CIQUAL = 'Licence Ouverte Etalab 2.0'

export function entradaManifest(paquete: Paquete, archivo: string, versionCiqual: string): EntradaManifest {
  return {
    id: 'ciqual',
    version: paquete.version,
    archivo,
    filas: paquete.filas.length,
    licencia: LICENCIA_CIQUAL,
    atribucion:
      `Fuente: ANSES, Table de composition nutritionnelle des aliments Ciqual ${versionCiqual} ` +
      `(https://ciqual.anses.fr), ${LICENCIA_CIQUAL}. Nombres traducidos al español.`,
  }
}

/** Añade o sustituye (por `id`) la entrada de una fuente, conservando las demás. Ordenadas por `id` (manifest determinista). */
export function fusionarManifest(previo: Manifest | undefined, entrada: EntradaManifest): Manifest {
  const otras = (previo?.fuentes ?? []).filter((f) => f.id !== entrada.id)
  return { formato: 1, fuentes: [...otras, entrada].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)) }
}

// ───────────────────────── Casi-duplicados ─────────────────────────

/** Descriptores que no cambian el alimento: «Leche entera UHT» y «Leche entera» son lo mismo para el usuario. */
const DESCRIPTORES_NEUTROS = new Set([
  'promedio',
  'uht',
  'pasterizado',
  'pasterizada',
  'pasteurizado',
  'pasteurizada',
  'envasado',
  'envasada',
])

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'al', 'a', 'o'])

/** Nombre sin descriptores neutros ni orden de palabras, para agrupar candidatos a duplicado. */
export function nombreBase(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9%]+/)
    .filter((w) => w && !DESCRIPTORES_NEUTROS.has(w) && !PALABRAS_VACIAS.has(w))
    .sort() // sin orden: «Pollo, pechuga» y «Pechuga de pollo» son lo mismo
    .join(' ')
}

/** Tolerancia por nutriente para considerar iguales dos valores: max(mínimo absoluto, porcentaje del mayor). */
const TOLERANCIAS: Record<ClaveCiqual, [minimo: number, relativa: number]> = {
  kcal: [3, 0.03],
  prot: [0.3, 0.05],
  carb: [0.3, 0.05],
  grasa: [0.3, 0.05],
  fibra: [0.3, 0.1],
  azucares: [0.3, 0.1],
  sal: [0.05, 0.1],
  agSat: [0.3, 0.1],
}

/** true si los nutrientes básicos son iguales dentro de tolerancia y los extras (cuando ambos los tienen) también. */
export function valoresParecidos(a: AlimentoCiqual, b: AlimentoCiqual): boolean {
  for (const k of Object.keys(TOLERANCIAS) as ClaveCiqual[]) {
    const x = (CLAVES_BASE as readonly string[]).includes(k) ? (a as never as Record<string, number>)[k] : a.nutrientes?.[k as ClaveNutriente]
    const y = (CLAVES_BASE as readonly string[]).includes(k) ? (b as never as Record<string, number>)[k] : b.nutrientes?.[k as ClaveNutriente]
    if (x === undefined || y === undefined) continue
    const [minimo, relativa] = TOLERANCIAS[k]
    if (Math.abs(x - y) > Math.max(minimo, relativa * Math.max(x, y))) return false
  }
  return true
}

export interface GrupoDuplicados {
  /** Nombre base compartido. */
  base: string
  /** Códigos de los alimentos del grupo (al menos 2), por orden de código. */
  codigos: string[]
}

/**
 * Grupos de casi-duplicados: mismo nombre base (sin descriptores neutros) y valores dentro de tolerancia
 * (componentes conexos). NUNCA fusiona estados distintos ni variantes: «crudo» y «cocido», o «entera» y
 * «desnatada», dan nombres base distintos, y aunque no, sus valores no coincidirían. Es un informe de revisión
 * para curar `ocultos.csv`; no oculta nada por sí solo.
 */
export function gruposCasiDuplicados(alimentos: AlimentoCiqual[], nombres: Map<string, string>): GrupoDuplicados[] {
  const porBase = new Map<string, AlimentoCiqual[]>()
  for (const a of alimentos) {
    const base = nombreBase(nombres.get(a.code) ?? a.nombreFr)
    if (!base) continue
    const lista = porBase.get(base)
    if (lista) lista.push(a)
    else porBase.set(base, [a])
  }
  const grupos: GrupoDuplicados[] = []
  for (const [base, lista] of porBase) {
    if (lista.length < 2) continue
    // Componentes conexos con «parecidos».
    const padre = lista.map((_, i) => i)
    const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])))
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        if (valoresParecidos(lista[i], lista[j])) padre[raiz(i)] = raiz(j)
      }
    }
    const comp = new Map<number, string[]>()
    lista.forEach((a, i) => {
      const r = raiz(i)
      const l = comp.get(r)
      if (l) l.push(a.code)
      else comp.set(r, [a.code])
    })
    for (const codigos of comp.values()) if (codigos.length > 1) grupos.push({ base, codigos })
  }
  return grupos.sort((a, b) => a.base.localeCompare(b.base))
}

/** Adapta los alimentos de CIQUAL (con su traducción) al validador de calidad. */
export function aAlimentosCalidad(alimentos: AlimentoCiqual[], traducciones: Map<string, Traduccion>): AlimentoCalidad[] {
  return alimentos.map((a) => {
    const c: AlimentoCalidad = {
      id: `ciqual:${a.code}`,
      nombre: traducciones.get(a.code)?.nombreEs ?? a.nombreFr,
      kcal: a.kcal,
      prot: a.prot,
      carb: a.carb,
      grasa: a.grasa,
    }
    for (const k of CLAVES_EXTRA) if (a.nutrientes?.[k] !== undefined) c[k] = a.nutrientes[k]
    if (a.alcohol !== undefined) c.alcohol = a.alcohol
    return c
  })
}
