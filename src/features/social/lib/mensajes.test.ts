import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MENSAJES_SOCIAL, mensajeSocial } from './mensajes'

describe('mensajes del servidor', () => {
  it('traduce las claves conocidas y deja pasar las demás', () => {
    expect(mensajeSocial('alias_ocupado')).toMatch(/ya lo usa otra persona/)
    expect(mensajeSocial('constructor')).toBeNull()
    expect(mensajeSocial(undefined)).toBeNull()
  })

  it('cada error que lanza el SQL tiene su mensaje', () => {
    const sql = readFileSync('supabase/migrations/0003_social.sql', 'utf8')
    const claves = new Set([...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]))
    // Solo saltan si la app envía algo que nunca envía: basta el mensaje genérico.
    for (const interna of ['lista_no_valida', 'tipo_no_valido']) claves.delete(interna)
    expect([...claves].filter((c) => !(c in MENSAJES_SOCIAL))).toEqual([])
  })
})
