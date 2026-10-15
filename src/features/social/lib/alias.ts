/**
 * Alias, nombre y código de invitación de la parte social (ADR 040). Las mismas reglas que comprueba el servidor
 * (`supabase/migrations/0003_social.sql`), para avisar antes de enviar.
 */

export const ALIAS_MIN = 3
export const ALIAS_MAX = 20
export const NOMBRE_MAX = 40

const ALIAS = /^[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$/
const CODIGO = /^[0-9a-f]{4}-?[0-9a-f]{4}$/i

/** Como lo guarda el servidor: sin espacios, en minúsculas y sin la «@» que se suele escribir delante. */
export function normalizarAlias(texto: string): string {
  return texto.trim().replace(/^@/, '').toLowerCase()
}

/** Mensaje si el alias no vale; `null` si vale. */
export function validarAlias(texto: string): string | null {
  const alias = normalizarAlias(texto)
  if (alias.length < ALIAS_MIN || alias.length > ALIAS_MAX) return `El alias tiene que tener de ${ALIAS_MIN} a ${ALIAS_MAX} caracteres.`
  if (!ALIAS.test(alias)) return 'Usa solo letras sin tildes, números, punto o guion bajo, sin empezar ni acabar en punto.'
  return null
}

/** El nombre es opcional: espacios de más fuera; vacío, `null`. */
export function limpiarNombre(texto: string): string | null {
  const nombre = texto.trim().replace(/\s+/g, ' ')
  return nombre === '' ? null : nombre
}

export function validarNombre(texto: string): string | null {
  const nombre = limpiarNombre(texto)
  return nombre !== null && nombre.length > NOMBRE_MAX ? `El nombre puede tener como mucho ${NOMBRE_MAX} caracteres.` : null
}

/** Lo que se escribe en «Alias o código»: un código de invitación (con o sin guion) o un alias. */
export function esCodigo(texto: string): boolean {
  return CODIGO.test(texto.trim())
}

/** Qué se busca: el código tal cual (el servidor lo normaliza) o el alias normalizado. Vacío, `null`. */
export function textoBusqueda(texto: string): string | null {
  const limpio = texto.trim()
  if (limpio === '') return null
  return esCodigo(limpio) ? limpio : normalizarAlias(limpio)
}
