/**
 * Cliente genérico de Gemini (REST, sin SDK). Solo sabe hacer una llamada que devuelve JSON según un schema
 * y traducir los errores al español. Cada tarea (interpretar comida, leer etiqueta…) define su prompt,
 * su schema y su validación en su propia feature.
 */

export class GeminiError extends Error {}

/** Errores puntuales del servidor (p. ej. 503 «modelo con mucha demanda»): se reintentan con espera creciente. */
const REINTENTABLES = new Set([500, 502, 503, 504])
const ESPERAS_MS = [1000, 3000]

const esperarReal = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface GenerarJsonInput {
  apiKey: string
  modelo: string
  /** Partes del mensaje del usuario: `{ text }` o `{ inlineData: { mimeType, data } }` (audio, imagen…). */
  parts: unknown[]
  schema: unknown
  /** Solo para tests: sustituye la espera real entre reintentos. */
  esperar?: (ms: number) => Promise<void>
}

/** Llama a Gemini y devuelve el JSON de la respuesta ya parseado (sin validar: eso lo hace cada tarea). */
export async function generarJson({ apiKey, modelo, parts, schema, esperar = esperarReal }: GenerarJsonInput): Promise<unknown> {
  if (!apiKey) {
    throw new GeminiError('Falta la API key de Gemini. Añádela en Ajustes.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  })

  async function llamar(): Promise<Response> {
    try {
      return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch {
      throw new GeminiError('Sin conexión a internet. Puedes añadir la comida manualmente sin IA.')
    }
  }

  let res = await llamar()
  for (const ms of ESPERAS_MS) {
    if (!REINTENTABLES.has(res.status)) break
    await esperar(ms)
    res = await llamar()
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new GeminiError('API key inválida o sin permisos. Revísala en Ajustes.')
    }
    if (res.status === 429) {
      throw new GeminiError('Se ha agotado la cuota gratuita de Gemini por ahora. Prueba más tarde.')
    }
    if (REINTENTABLES.has(res.status)) {
      throw new GeminiError('Gemini está saturado ahora mismo. Prueba en unos segundos.')
    }
    const detalle = await res.text().catch(() => '')
    throw new GeminiError(`Error de Gemini (${res.status}). ${detalle.slice(0, 200)}`)
  }

  const json = await res.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new GeminiError('Gemini no ha devuelto contenido interpretable.')
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new GeminiError('La respuesta de Gemini no es JSON válido.')
  }
}
