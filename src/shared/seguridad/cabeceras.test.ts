/// <reference types="node" />
// Guardián de las cabeceras de seguridad (public/_headers, docs/seguridad.md): que un cambio no abra la política de
// contenido sin querer. El recorrido de navegador `scripts/ui/validar-seguridad.cjs` comprueba que la app funciona con ella.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = join(__dirname, '../../..')
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8')

function cabeceras(): Record<string, string> {
  const res: Record<string, string> = {}
  for (const linea of leer('public/_headers').split('\n')) {
    const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(linea)
    if (m) res[m[1].toLowerCase()] = m[2].trim()
  }
  return res
}

function csp(): Map<string, string[]> {
  return new Map(cabeceras()['content-security-policy'].split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]))
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : [p]
  })
}

describe('cabeceras de seguridad', () => {
  it('están todas las que endurecen la app', () => {
    expect(Object.keys(cabeceras())).toEqual(expect.arrayContaining([
      'content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy',
      'cross-origin-opener-policy', 'permissions-policy',
    ]))
    expect(cabeceras()['x-content-type-options']).toBe('nosniff')
    expect(cabeceras()['x-frame-options']).toBe('DENY')
  })

  it('la CSP solo ejecuta scripts del propio origen (y WebAssembly), sin eval ni scripts en línea', () => {
    const p = csp()
    expect(p.get('default-src')).toEqual(["'self'"])
    expect(p.get('script-src')).toEqual(["'self'", "'wasm-unsafe-eval'"])
    expect(p.get('object-src')).toEqual(["'none'"])
    expect(p.get('frame-ancestors')).toEqual(["'none'"])
    expect(p.get('base-uri')).toEqual(["'self'"])
  })

  it('la red fuera del origen se limita a Open Food Facts y Supabase', () => {
    const permitidos = csp().get('connect-src')!
    expect(permitidos).toEqual(["'self'", 'https://world.openfoodfacts.org', 'https://*.supabase.co', 'wss://*.supabase.co'])
    // Cada origen https que el código consulta con fetch tiene que estar permitido (si no, fallaría en producción).
    const codigo = archivos(join(raiz, 'src')).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n')
    const consultados = new Set([...codigo.matchAll(/fetch\(\s*`(https:\/\/[^/`$]+)/g)].map((m) => m[1]))
    const urlsFetch = [...codigo.matchAll(/const url = `(https:\/\/[^/`$]+)/g)].map((m) => m[1])
    expect(urlsFetch).toContain('https://world.openfoodfacts.org') // el patrón sigue encontrando la consulta del escáner
    for (const o of [...consultados, ...urlsFetch]) expect(permitidos).toContain(o)
    // La URL de Supabase de la plantilla encaja con el comodín.
    expect(leer('.env.example')).toMatch(/^VITE_SUPABASE_URL=https:\/\/[^/]+\.supabase\.co$/m)
  })

  it('el index.html no tiene scripts en línea (la CSP los bloquearía)', () => {
    const scripts = [...leer('index.html').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    expect(scripts.length).toBeGreaterThan(0)
    for (const [, atributos, cuerpo] of scripts) {
      expect(atributos).toMatch(/\bsrc=/)
      expect(cuerpo.trim()).toBe('')
    }
  })

  it('los permisos del navegador: cámara (escáner) y ubicación (actividades) solo para la app; micrófono y el resto, nadie', () => {
    const permisos = cabeceras()['permissions-policy']
    expect(permisos).toContain('camera=(self)')
    expect(permisos).toContain('geolocation=(self)')
    expect(permisos).toContain('microphone=()')
    expect(permisos).toContain('payment=()')
  })
})
