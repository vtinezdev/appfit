import { GeminiError, generarJson } from '../../../../shared/ai/gemini'

export interface GeminiItem {
  nombre: string
  gramos: number
  kcal100: number
  prot100: number
  carb100: number
  grasa100: number
}

export interface GeminiResult {
  transcripcion?: string
  items: GeminiItem[]
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcripcion: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' },
          gramos: { type: 'NUMBER' },
          kcal100: { type: 'NUMBER' },
          prot100: { type: 'NUMBER' },
          carb100: { type: 'NUMBER' },
          grasa100: { type: 'NUMBER' },
        },
        required: ['nombre', 'gramos', 'kcal100', 'prot100', 'carb100', 'grasa100'],
      },
    },
  },
  required: ['items'],
} as const

export function buildPrompt(alimentosConocidos: string[], hayAudio: boolean): string {
  const listado = alimentosConocidos.length > 0 ? alimentosConocidos.join(', ') : '(ninguno todavía)'
  return `Eres un asistente de nutrición. ${
    hayAudio
      ? 'Transcribe el audio (una persona describiendo en español lo que ha comido) y'
      : 'A partir del texto del usuario,'
  } identifica cada alimento o plato mencionado y estima, para cada uno, los gramos (si no se especifican, usa una ración típica) y los valores nutricionales por cada 100 g: kcal100, prot100 (proteína en g), carb100 (carbohidratos en g), grasa100 (grasa en g).

Alimentos ya conocidos en la base de datos del usuario: ${listado}.
Si un alimento coincide (aunque sea aproximadamente) con uno de la lista anterior, usa exactamente ese mismo nombre y sus valores nutricionales habituales para ese alimento.

Responde solo con el JSON pedido por el esquema. No inventes campos extra. Los números deben ser >= 0.${
    hayAudio ? ' Incluye también la transcripción literal en el campo "transcripcion".' : ''
  }`
}

export function validarResultado(data: unknown): GeminiResult {
  if (typeof data !== 'object' || data === null) {
    throw new GeminiError('Respuesta de Gemini con formato inesperado.')
  }
  const obj = data as Record<string, unknown>
  const items = obj.items
  if (!Array.isArray(items) || items.length === 0) {
    throw new GeminiError('No se ha reconocido ningún alimento. Intenta describirlo con más detalle.')
  }
  const parsed: GeminiItem[] = items.map((raw, i) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new GeminiError(`Elemento ${i + 1} de la respuesta no es válido.`)
    }
    const it = raw as Record<string, unknown>
    const nombre = typeof it.nombre === 'string' ? it.nombre.trim() : ''
    const gramos = Number(it.gramos)
    const kcal100 = Number(it.kcal100)
    const prot100 = Number(it.prot100)
    const carb100 = Number(it.carb100)
    const grasa100 = Number(it.grasa100)
    const numeros = [gramos, kcal100, prot100, carb100, grasa100]
    if (!nombre) throw new GeminiError(`Elemento ${i + 1}: falta el nombre del alimento.`)
    if (numeros.some((n) => !Number.isFinite(n) || n < 0)) {
      throw new GeminiError(`Elemento ${i + 1} (${nombre}): valores numéricos inválidos.`)
    }
    return { nombre, gramos, kcal100, prot100, carb100, grasa100 }
  })
  const transcripcion = typeof obj.transcripcion === 'string' ? obj.transcripcion : undefined
  return { transcripcion, items: parsed }
}

export interface InterpretarComidaInput {
  apiKey: string
  modelo: string
  texto?: string
  audioBase64?: string
  audioMime?: string
  alimentosConocidos: string[]
}

export async function interpretarComida(input: InterpretarComidaInput): Promise<GeminiResult> {
  const { apiKey, modelo, texto, audioBase64, audioMime, alimentosConocidos } = input

  if (!apiKey) {
    throw new GeminiError('Falta la API key de Gemini. Añádela en Ajustes.')
  }
  if (!texto && !audioBase64) {
    throw new GeminiError('No hay texto ni audio que interpretar.')
  }

  const parts: unknown[] = [{ text: buildPrompt(alimentosConocidos, Boolean(audioBase64)) }]
  if (texto) parts.push({ text: `Descripción del usuario: ${texto}` })
  if (audioBase64 && audioMime) parts.push({ inlineData: { mimeType: audioMime, data: audioBase64 } })

  const data = await generarJson({ apiKey, modelo, parts, schema: RESPONSE_SCHEMA })
  return validarResultado(data)
}
