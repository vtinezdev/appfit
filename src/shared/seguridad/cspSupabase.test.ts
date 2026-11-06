/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cabecerasConSupabase } from './cspSupabase'

const headers = readFileSync(join(__dirname, '../../../public/_headers'), 'utf8')
const connectSrc = (t: string) => /connect-src ([^;]+);/.exec(t)![1].split(' ')

describe('connect-src con el proyecto de Supabase exacto', () => {
  it('cambia el comodín por el proyecto de la build', () => {
    const t = cabecerasConSupabase(headers, 'https://abcdefghijklmnop.supabase.co')
    expect(connectSrc(t)).toEqual(["'self'", 'https://world.openfoodfacts.org', 'https://abcdefghijklmnop.supabase.co', 'wss://abcdefghijklmnop.supabase.co'])
    expect(t).not.toContain('*.supabase.co')
    // El resto del archivo no cambia.
    expect(t.replace(/abcdefghijklmnop/g, '*')).toBe(headers)
  })

  it('sin URL, con un Supabase falso o con algo que no es un proyecto, deja la política como está', () => {
    for (const url of [undefined, '', 'http://127.0.0.1:54329', 'https://evil.com/x.supabase.co', 'https://a.supabase.co.evil.com', 'https://a.b.supabase.co']) {
      expect(cabecerasConSupabase(headers, url)).toBe(headers)
    }
  })
})
