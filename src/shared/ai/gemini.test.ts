import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiError, generarJson } from './gemini'

const BASE = { apiKey: 'clave-test', modelo: 'gemini-test', parts: [{ text: 'hola' }], schema: {} }

function respuesta(status: number, body: unknown): Response {
  const texto = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(texto, { status })
}

function ok(json: unknown): Response {
  return respuesta(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generarJson', () => {
  it('sin API key falla antes de llamar a la red', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(generarJson({ ...BASE, apiKey: '' })).rejects.toThrow(/API key/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('devuelve el JSON parseado de la respuesta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ items: [1, 2] })))
    await expect(generarJson(BASE)).resolves.toEqual({ items: [1, 2] })
  })

  it('traduce los errores HTTP y de red a mensajes en español', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(403, 'forbidden')))
    await expect(generarJson(BASE)).rejects.toThrow(/API key inválida/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(429, 'quota')))
    await expect(generarJson(BASE)).rejects.toThrow(/cuota/)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(generarJson(BASE)).rejects.toThrow(/Sin conexión/)
  })

  it('rechaza una respuesta sin contenido o que no es JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { candidates: [] })))
    await expect(generarJson(BASE)).rejects.toThrow(GeminiError)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { candidates: [{ content: { parts: [{ text: 'no json' }] } }] })))
    await expect(generarJson(BASE)).rejects.toThrow(/no es JSON/)
  })
})

describe('generarJson: reintentos (P10)', () => {
  it('un 503 puntual se reintenta y la segunda llamada funciona', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respuesta(503, 'overloaded')).mockResolvedValueOnce(ok({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const esperar = vi.fn().mockResolvedValue(undefined)
    await expect(generarJson({ ...BASE, esperar })).resolves.toEqual({ items: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(esperar).toHaveBeenCalledWith(1000)
  })

  it('tras tres 503 seguidos da un error claro (2 reintentos con espera creciente)', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(respuesta(503, 'overloaded')))
    vi.stubGlobal('fetch', fetchMock)
    const esperar = vi.fn().mockResolvedValue(undefined)
    await expect(generarJson({ ...BASE, esperar })).rejects.toThrow(/saturado/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(esperar.mock.calls).toEqual([[1000], [3000]])
  })

  it('un 429 (cuota) no se reintenta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(429, 'quota'))
    vi.stubGlobal('fetch', fetchMock)
    const esperar = vi.fn().mockResolvedValue(undefined)
    await expect(generarJson({ ...BASE, esperar })).rejects.toThrow(/cuota/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(esperar).not.toHaveBeenCalled()
  })
})
