/**
 * Cifrado de la copia en la nube, todo con Web Crypto (sin dependencias). El servidor solo ve datos ilegibles.
 *
 * - Una clave de datos (DEK, AES-GCM de 256 bits) aleatoria por cuenta cifra la copia.
 * - La contraseña y la clave de recuperación no cifran los datos: derivan (PBKDF2-SHA256) una clave que **envuelve**
 *   la DEK. En la nube se guardan las dos envolturas (`ClavesNube`); cambiar la contraseña solo vuelve a envolver.
 * - Copia: texto → gzip → AES-GCM con IV aleatorio → `"1.<iv>.<datos>"` en base64. El «1» es la versión del formato.
 */

/** Iteraciones de PBKDF2 (recomendación de OWASP para SHA-256). Se guardan en cada envoltura. */
export const ITERACIONES = 600_000
export const CONTRASENA_MIN = 8

const VERSION_COPIA = '1'
const ALFABETO_CODIGO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford: sin I, L, O ni U
const LONGITUD_CODIGO = 20 // 100 bits

export interface ClaveEnvuelta {
  sal: string
  iteraciones: number
  iv: string
  dek: string
}

/** Lo que se guarda en la columna `claves` de la nube. */
export interface ClavesNube {
  v: 1
  contrasena: ClaveEnvuelta
  recuperacion: ClaveEnvuelta
}

/** La contraseña o la clave de recuperación no abren la copia. */
export class SecretoIncorrectoError extends Error {
  constructor() {
    super('La contraseña no es correcta.')
  }
}

export class CopiaIlegibleError extends Error {
  constructor() {
    super('La copia de la nube no se puede leer con esta clave.')
  }
}

const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export function aBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const bin = atob(texto)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Null si vale; si no, el motivo para enseñarlo junto al campo. */
export function validarContrasena(contrasena: string, repetida?: string): string | null {
  if (contrasena.length < CONTRASENA_MIN) return `Usa al menos ${CONTRASENA_MIN} caracteres.`
  if (repetida !== undefined && contrasena !== repetida) return 'Las dos contraseñas no coinciden.'
  return null
}

/** Código de recuperación legible: 20 caracteres en grupos de 4 (`7K2M-…`), 100 bits de azar. */
export function generarCodigoRecuperacion(): string {
  const bytes = aleatorio(LONGITUD_CODIGO)
  const chars = Array.from(bytes, (b) => ALFABETO_CODIGO[b % 32])
  return chars.join('').match(/.{4}/g)!.join('-')
}

/** Acepta el código como lo escriba la persona: minúsculas, espacios o guiones, y O/I/L confundidas con 0/1. */
export function normalizarCodigo(texto: string): string {
  const limpio = texto.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  return limpio.match(/.{1,4}/g)?.join('-') ?? ''
}

async function claveDeSecreto(secreto: string, sal: Uint8Array<ArrayBuffer>, iteraciones: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

/** DEK nueva, extraíble para poder envolverla. */
export function generarClaveDatos(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function envolver(dek: CryptoKey, secreto: string, iteraciones = ITERACIONES): Promise<ClaveEnvuelta> {
  const sal = aleatorio(16)
  const iv = aleatorio(12)
  const kek = await claveDeSecreto(secreto, sal, iteraciones)
  const envuelta = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv })
  return { sal: aBase64(sal), iteraciones, iv: aBase64(iv), dek: aBase64(new Uint8Array(envuelta)) }
}

/** Recupera la DEK. `extraible` solo hace falta para volver a envolverla (cambiar la contraseña). */
export async function desenvolver(envuelta: ClaveEnvuelta, secreto: string, extraible = false): Promise<CryptoKey> {
  const kek = await claveDeSecreto(secreto, deBase64(envuelta.sal), envuelta.iteraciones)
  try {
    return await crypto.subtle.unwrapKey('raw', deBase64(envuelta.dek), kek, { name: 'AES-GCM', iv: deBase64(envuelta.iv) },
      { name: 'AES-GCM', length: 256 }, extraible, ['encrypt', 'decrypt'])
  } catch {
    throw new SecretoIncorrectoError()
  }
}

/** Claves de una cuenta nueva: la DEK, sus dos envolturas y el código de recuperación que se enseña una vez. */
export async function crearClaves(contrasena: string, iteraciones = ITERACIONES): Promise<{ dek: CryptoKey; claves: ClavesNube; codigo: string }> {
  const dek = await generarClaveDatos()
  const codigo = generarCodigoRecuperacion()
  const [envContrasena, envRecuperacion] = await Promise.all([envolver(dek, contrasena, iteraciones), envolver(dek, codigo, iteraciones)])
  return { dek, claves: { v: 1, contrasena: envContrasena, recuperacion: envRecuperacion }, codigo }
}

/** Copia de la DEK que no se puede exportar: es la que se guarda en el dispositivo. */
export async function sinExportar(dek: CryptoKey): Promise<CryptoKey> {
  if (!dek.extractable) return dek
  const raw = await crypto.subtle.exportKey('raw', dek)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function transformar(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const salida = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(salida).arrayBuffer())
}

export async function cifrarCopia(texto: string, dek: CryptoKey): Promise<string> {
  const comprimido = await transformar(new TextEncoder().encode(texto), new CompressionStream('gzip'))
  const iv = aleatorio(12)
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, comprimido)
  return `${VERSION_COPIA}.${aBase64(iv)}.${aBase64(new Uint8Array(cifrado))}`
}

export async function descifrarCopia(copia: string, dek: CryptoKey): Promise<string> {
  const [version, iv, datos] = copia.split('.')
  if (version !== VERSION_COPIA || !iv || !datos) throw new CopiaIlegibleError()
  let comprimido: ArrayBuffer
  try {
    comprimido = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, dek, deBase64(datos))
  } catch {
    throw new CopiaIlegibleError()
  }
  return new TextDecoder().decode(await transformar(new Uint8Array(comprimido), new DecompressionStream('gzip')))
}
