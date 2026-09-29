// Lógica pura de la tubería CIQUAL (ANSES) → paquete JSON del catálogo.
// Sin acceso a disco ni a red: el CLI (`ciqual.ts`) lee/escribe; aquí solo se transforma.
// Se ejecuta con el type stripping de Node: solo sintaxis borrable e imports con extensión `.ts`.

// ───────────────────────── Tipos ─────────────────────────

/** Claves cortas y estables de `nutrientes` (por 100 g). Ausente = desconocido; 0 = conocido. */
export type ClaveNutriente = 'fibra' | 'azucares' | 'sal' | 'agSat'

/** Los 8 nutrientes que cuentan para `completitud`. */
export type ClaveCiqual = 'kcal' | 'prot' | 'carb' | 'grasa' | ClaveNutriente

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
  /** Categoría en español (ver `CATEGORIAS_CIQUAL`). */
  categoria: string
  kcal: number
  prot: number
  carb: number
  grasa: number
  /** Solo los extras conocidos (`fibra`, `azucares`, `sal`, `agSat`). Ausente si no hay ninguno. */
  nutrientes?: Partial<Record<ClaveNutriente, number>>
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
  alias?: string[],
]

export interface Paquete {
  formato: 1
  fuente: 'ciqual'
  version: string
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
const PATRONES_CONSTITUYENTE: Record<ClaveCiqual, RegExp> = {
  kcal: /^Energie, R[eè]glement UE N° 1169\/2011 \(kcal\/100 ?g\)/i,
  prot: /^Prot[eé]ines, N x facteur de Jones \(g\/100 ?g\)/i,
  carb: /^Glucides \(g\/100 ?g\)/i,
  grasa: /^Lipides \(g\/100 ?g\)/i,
  fibra: /^Fibres alimentaires \(g\/100 ?g\)/i,
  azucares: /^Sucres \(g\/100 ?g\)/i,
  sal: /^Sel chlorure de sodium \(g\/100 ?g\)/i,
  agSat: /^AG satur[eé]s \(g\/100 ?g\)/i,
}

/** Devuelve el `const_code` de cada nutriente. Lanza si alguno no aparece o es ambiguo. */
export function localizarConstituyentes(consts: Constituyente[]): Record<ClaveCiqual, string> {
  const res = {} as Record<ClaveCiqual, string>
  for (const clave of Object.keys(PATRONES_CONSTITUYENTE) as ClaveCiqual[]) {
    const casan = consts.filter((c) => PATRONES_CONSTITUYENTE[clave].test(c.nombreFr))
    if (casan.length !== 1) {
      throw new Error(`Constituyente «${clave}»: ${casan.length} coincidencias por nombre (se esperaba 1)`)
    }
    res[clave] = casan[0].code
  }
  return res
}

// ───────────────────────── Grupos ─────────────────────────

/** Grupos principales de CIQUAL (01–11 más «00») (`alim_grp_code`) → categoría en español. */
export const CATEGORIAS_CIQUAL: Record<string, string> = {
  // «00» solo lo usa 'Dessert (aliment moyen)' (2025), un alimento medio sin grupo real.
  '00': 'Otros',
  '01': 'Platos y entrantes',
  '02': 'Frutas, verduras, legumbres y frutos secos',
  '03': 'Cereales y derivados',
  '04': 'Carnes, huevos y pescados',
  '05': 'Lácteos',
  '06': 'Bebidas',
  '07': 'Dulces y azúcares',
  '08': 'Helados y sorbetes',
  '09': 'Grasas y aceites',
  '10': 'Ayudas culinarias e ingredientes',
  '11': 'Alimentos infantiles',
}

// ───────────────────────── Alimentos ─────────────────────────

export interface EntradaAlimentos {
  /** Registros de `<ALIM>` (alim_code, alim_nom_fr, alim_nom_eng, alim_grp_code…). */
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
  const claveDe = new Map<string, ClaveCiqual>()
  for (const [clave, code] of Object.entries(codigos)) claveDe.set(code, clave as ClaveCiqual)

  // alim_code → clave → valor (solo constituyentes que nos interesan y con valor conocido).
  const valores = new Map<string, Partial<Record<ClaveCiqual, number>>>()
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
    const categoria = CATEGORIAS_CIQUAL[a.alim_grp_code]
    if (!categoria) {
      throw new Error(`Grupo CIQUAL «${a.alim_grp_code}» (alimento ${a.alim_code}) sin traducción en CATEGORIAS_CIQUAL`)
    }
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
      categoria,
      kcal: redondear1(v.kcal),
      prot: redondear1(v.prot),
      carb: redondear1(v.carb),
      grasa: redondear1(v.grasa),
      completitud: (CLAVES_BASE.length + extras) / TOTAL_NUTRIENTES,
    }
    if (extras > 0) alimento.nutrientes = nutrientes
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
 * Une alimentos y traducciones en el paquete estático. Lanza `FaltanTraducciones` (con la lista
 * de códigos) si algún alimento no tiene `nombre_es`. Las traducciones de códigos inexistentes se
 * ignoran y se devuelven en `sobrantes`.
 *
 * Fila: `[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, alias?]`.
 * `nutrientes` se omite si no hay extras y tampoco alias; si hay alias pero no extras va como `{}`.
 * `completitud` no se guarda: se deduce (4 básicos + nº de claves de `nutrientes`) / 8.
 */
export function construirPaquete(
  alimentos: AlimentoCiqual[],
  traducciones: Map<string, Traduccion>,
  version: string,
): { paquete: Paquete; sobrantes: string[] } {
  const faltan = alimentos.filter((a) => !traducciones.get(a.code)?.nombreEs).map((a) => a.code)
  if (faltan.length > 0) throw new FaltanTraducciones(faltan)

  const filas: Fila[] = alimentos.map((a) => {
    const t = traducciones.get(a.code)!
    const fila: Fila = [a.code, t.nombreEs, a.nombreFr, a.categoria, a.kcal, a.prot, a.carb, a.grasa]
    if (t.alias.length > 0) fila.push(a.nutrientes ?? {}, t.alias)
    else if (a.nutrientes) fila.push(a.nutrientes)
    return fila
  })
  const usados = new Set(alimentos.map((a) => a.code))
  const sobrantes = [...traducciones.keys()].filter((c) => !usados.has(c))
  return { paquete: { formato: 1, fuente: 'ciqual', version, filas }, sobrantes }
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

/** Añade o sustituye (por `id`) la entrada de una fuente, conservando las demás. */
export function fusionarManifest(previo: Manifest | undefined, entrada: EntradaManifest): Manifest {
  const otras = (previo?.fuentes ?? []).filter((f) => f.id !== entrada.id)
  return { formato: 1, fuentes: [...otras, entrada] }
}
