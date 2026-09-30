// Formato del paquete estático del catálogo (`public/catalogo/`) y su conversión a `CatalogFood`.
// Lógica pura: validar lo descargado (nunca se importa un JSON sin comprobar) y transformarlo.
// Los tipos duplican los de `scripts/catalogo/ciqualLib.ts` a propósito: la app no importa de `scripts/`.
//
// Formato 2 (el manifest sigue en formato 1). Se rechaza el formato 1: los paquetes se republicaron todos.
// Un cliente con la app antigua (Service Worker sin actualizar) rechazará un paquete de formato 2 y lo
// reintentará en el siguiente arranque, cuando `autoUpdate` ya haya instalado la app nueva.
import { catalogId, normalizarGtin } from '../../../../shared/db/foodRef'
import type { CatalogFood } from '../../../../shared/db/types'
import { normalizeName, tokenizar } from '../../../../shared/lib/text'

export type ClaveNutriente = 'fibra' | 'azucares' | 'sal' | 'agSat'

const CLAVES_NUTRIENTE: readonly ClaveNutriente[] = ['fibra', 'azucares', 'sal', 'agSat']
/** Nutrientes que cuentan para `completitud`: los 4 básicos más los 4 extras. */
const TOTAL_NUTRIENTES = 8
const BASICOS = 4

/**
 * Campos poco frecuentes de una fila. `ml`, `oculto` y `secundario` son indicadores: cuando existen valen `1`.
 * En productos de marca el GTIN es el `idExterno`, así que `gtin` solo hace falta si difiere.
 */
export interface ExtraFila {
  alias?: string[]
  marca?: string
  gtin?: string
  /** Valores por 100 ml en lugar de 100 g (solo productos de marca). */
  ml?: 1
  /** No aparece al buscar (`tok` vacío); sigue existiendo por su id para frecuentes, plantillas y entradas. */
  oculto?: 1
  /** Va detrás de los demás al buscar. */
  secundario?: 1
}

export type TipoPaquete = 'generico' | 'marca'

/** `[idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes?, extra?]`, valores por 100 g (o 100 ml con `extra.ml`). */
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
  tipo: TipoPaquete
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

// ───────────────────────── Validación ─────────────────────────

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function texto(x: unknown, donde: string, permitirVacio = false): string {
  if (typeof x !== 'string' || (!permitirVacio && x.trim() === '')) {
    throw new Error(`${donde}: se esperaba un texto${permitirVacio ? '' : ' no vacío'}`)
  }
  return x
}

function numero(x: unknown, donde: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) {
    throw new Error(`${donde}: se esperaba un número finito y no negativo`)
  }
  return x
}

function comprobarFormato(x: Record<string, unknown>, que: string, esperado: number): void {
  if (x.formato !== esperado) {
    throw new Error(`${que}: formato ${JSON.stringify(x.formato)} no soportado (se esperaba ${esperado})`)
  }
}

function indicador(x: unknown, donde: string): 1 {
  if (x !== 1) throw new Error(`${donde}: se esperaba 1`)
  return 1
}

/** Valida el objeto `extra` de una fila. Las claves que no conoce se ignoran (compatibilidad hacia delante). */
function validarExtra(x: unknown, tipo: TipoPaquete, dondeId: string): ExtraFila {
  if (!esObjeto(x)) throw new Error(`${dondeId}, extra: se esperaba un objeto`)
  const extra: ExtraFila = {}
  if (x.alias !== undefined) {
    if (!Array.isArray(x.alias)) throw new Error(`${dondeId}, alias: se esperaba una lista`)
    extra.alias = x.alias.map((a: unknown, j) => texto(a, `${dondeId}, alias ${j + 1}`))
  }
  if (x.marca !== undefined) extra.marca = texto(x.marca, `${dondeId}, marca`)
  if (x.gtin !== undefined) extra.gtin = texto(x.gtin, `${dondeId}, gtin`)
  if (x.ml !== undefined) {
    if (tipo === 'generico') throw new Error(`${dondeId}: un alimento genérico no puede ir por 100 ml`)
    extra.ml = indicador(x.ml, `${dondeId}, ml`)
  }
  if (x.oculto !== undefined) extra.oculto = indicador(x.oculto, `${dondeId}, oculto`)
  if (x.secundario !== undefined) extra.secundario = indicador(x.secundario, `${dondeId}, secundario`)
  return extra
}

/** Valida el `manifest.json`. Lanza un `Error` con el motivo si no cumple el formato 1. */
export function validarManifest(datos: unknown): Manifest {
  if (!esObjeto(datos)) throw new Error('Manifest: no es un objeto')
  comprobarFormato(datos, 'Manifest', 1)
  if (!Array.isArray(datos.fuentes)) throw new Error('Manifest: falta la lista «fuentes»')
  const ids = new Set<string>()
  const fuentes = datos.fuentes.map((f: unknown, i): EntradaManifest => {
    const donde = `Manifest, fuente ${i + 1}`
    if (!esObjeto(f)) throw new Error(`${donde}: no es un objeto`)
    const id = texto(f.id, `${donde}, id`)
    if (ids.has(id)) throw new Error(`${donde}: fuente «${id}» repetida`)
    ids.add(id)
    const archivo = texto(f.archivo, `${donde}, archivo`)
    // Solo un nombre de archivo dentro de /catalogo/: nada de rutas ni de otros orígenes.
    if (!/^[\w.-]+$/.test(archivo) || archivo.startsWith('.')) throw new Error(`${donde}: archivo «${archivo}» no válido`)
    const filas = numero(f.filas, `${donde}, filas`)
    if (!Number.isInteger(filas)) throw new Error(`${donde}, filas: se esperaba un entero`)
    return {
      id,
      version: texto(f.version, `${donde}, version`),
      archivo,
      filas,
      licencia: texto(f.licencia, `${donde}, licencia`),
      atribucion: texto(f.atribucion, `${donde}, atribucion`),
    }
  })
  return { formato: 1, fuentes }
}

/** Valida un paquete de una fuente (formato 2). Lanza un `Error` que nombra la fila que falla. */
export function validarPaquete(datos: unknown): Paquete {
  if (!esObjeto(datos)) throw new Error('Paquete: no es un objeto')
  comprobarFormato(datos, 'Paquete', 2)
  const fuente = texto(datos.fuente, 'Paquete, fuente')
  if (datos.tipo !== 'generico' && datos.tipo !== 'marca') throw new Error('Paquete, tipo: se esperaba «generico» o «marca»')
  const tipo: TipoPaquete = datos.tipo
  const version = texto(datos.version, 'Paquete, version')
  if (!Array.isArray(datos.filas)) throw new Error('Paquete: falta la lista «filas»')

  const vistos = new Set<string>()
  const filas = datos.filas.map((f: unknown, i): Fila => {
    const donde = `Paquete, fila ${i + 1}`
    if (!Array.isArray(f) || f.length < 8 || f.length > 10) throw new Error(`${donde}: debe tener entre 8 y 10 campos`)
    const idExterno = texto(f[0], `${donde}, idExterno`)
    if (vistos.has(idExterno)) throw new Error(`${donde}: idExterno «${idExterno}» repetido`)
    vistos.add(idExterno)
    const dondeId = `${donde} («${idExterno}»)`
    const fila: Fila = [
      idExterno,
      texto(f[1], `${dondeId}, nombre`),
      texto(f[2], `${dondeId}, nombreOriginal`, true),
      texto(f[3], `${dondeId}, categoria`, true),
      numero(f[4], `${dondeId}, kcal`),
      numero(f[5], `${dondeId}, prot`),
      numero(f[6], `${dondeId}, carb`),
      numero(f[7], `${dondeId}, grasa`),
    ]
    if (f[8] !== undefined) {
      if (!esObjeto(f[8])) throw new Error(`${dondeId}, nutrientes: se esperaba un objeto`)
      const nutrientes: Partial<Record<ClaveNutriente, number>> = {}
      for (const [clave, valor] of Object.entries(f[8])) {
        if (!(CLAVES_NUTRIENTE as readonly string[]).includes(clave)) {
          throw new Error(`${dondeId}, nutrientes: clave «${clave}» desconocida`)
        }
        nutrientes[clave as ClaveNutriente] = numero(valor, `${dondeId}, nutrientes.${clave}`)
      }
      fila.push(nutrientes)
    }
    if (f[9] !== undefined) {
      if (fila.length === 8) throw new Error(`${dondeId}: hay «extra» pero falta «nutrientes» (debe ir como {})`)
      fila.push(validarExtra(f[9], tipo, dondeId))
    }
    return fila
  })
  return { formato: 2, fuente, version, tipo, filas }
}

// ───────────────────────── Conversión ─────────────────────────

/**
 * Convierte un paquete validado en filas de `catalogFoods`.
 * - `tok` (índice de búsqueda) sale del nombre, los alias y la marca (no del nombre original en otro idioma);
 *   una fila `oculto` lleva `tok: []`: no se encuentra al buscar, pero `obtener`/`porIds` la resuelven.
 * - `nutrientes` solo existe si hay claves; `completitud` se deduce de las claves (4 básicos + extras) / 8.
 * - En productos de marca el GTIN es el `idExterno` salvo que la fila traiga otro.
 */
export function aCatalogFoods(paquete: Paquete, importadoAt: number): CatalogFood[] {
  return paquete.filas.map(([idExterno, nombre, nombreOriginal, categoria, kcal, prot, carb, grasa, nutrientes, extra]) => {
    const extras = nutrientes ? Object.keys(nutrientes).length : 0
    const food: CatalogFood = {
      id: catalogId(paquete.fuente, idExterno),
      fuente: paquete.fuente,
      idExterno,
      nombre,
      nombreNorm: normalizeName(nombre),
      tok: extra?.oculto ? [] : tokenizar([nombre, ...(extra?.alias ?? []), extra?.marca ?? ''].join(' ')),
      tipo: paquete.tipo,
      kcal100: kcal,
      prot100: prot,
      carb100: carb,
      grasa100: grasa,
      completitud: (BASICOS + extras) / TOTAL_NUTRIENTES,
      version: paquete.version,
      importadoAt,
    }
    if (nombreOriginal) food.nombreOriginal = nombreOriginal
    if (categoria) food.categoria = categoria
    if (extras > 0) food.nutrientes = { ...nutrientes }
    if (extra?.alias && extra.alias.length > 0) food.alias = extra.alias
    if (extra?.marca) food.marca = extra.marca
    const gtin = extra?.gtin ? normalizarGtin(extra.gtin) : paquete.tipo === 'marca' ? normalizarGtin(idExterno) : undefined
    if (gtin) food.gtin = gtin
    if (extra?.ml) food.ml = true
    if (extra?.secundario) food.secundario = true
    return food
  })
}
