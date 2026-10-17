import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** La tubería debe poder ejecutarse en un checkout sin los originales de IA ignorados por Git. */
describe('regeneración offline de miniaturas', () => {
  it('conserva ilustraciones y fotos existentes; solo borra archivos ajenos al catálogo', async () => {
    const root = mkdtempSync(join(tmpdir(), 'appfit-imagenes-'))
    const scripts = join(root, 'scripts/ejercicios')
    const lib = join(root, 'src/features/gym/lib')
    const images = join(root, 'public/ejercicios')
    try {
      for (const dir of [scripts, lib, images]) mkdirSync(dir, { recursive: true })
      symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'dir')
      writeFileSync(join(root, 'package.json'), '{"type":"module"}')
      copyFileSync('scripts/ejercicios/imagenes.ts', join(scripts, 'imagenes.ts'))
      writeFileSync(join(scripts, 'mapa-muscular.md'), '# Mapa')
      const slugs = ['ilustrada', 'fotografiada', 'conservada', 'pendiente']
      writeFileSync(join(lib, 'catalogoEjercicios.ts'), slugs.map(s => `  '${s}|${s}|corporal',`).join('\n'))
      writeFileSync(join(scripts, 'mapeo.json'), JSON.stringify({ ilustrada: 'NoDebeDescargarse', fotografiada: 'Tampoco', conservada: null, pendiente: null }))
      writeFileSync(join(scripts, 'ilustraciones.json'), JSON.stringify({ lotes: [slugs.map(s => [s, 'pose', 'core'])] }))
      writeFileSync(join(scripts, 'ilustraciones-convertidas.json'), '["ilustrada"]')
      // Se copian bytes reales y se comprueba que el proceso no los sustituye ni modifica.
      const webp = readFileSync('public/ejercicios/dominadas.webp')
      for (const slug of [...slugs.slice(0, 3), 'huerfana']) writeFileSync(join(images, `${slug}.webp`), webp)
      for (let pass = 0; pass < 3; pass++) {
        // Forzar sin equivalentes tampoco permite eliminar miniaturas conservadas.
        if (pass === 2) writeFileSync(join(scripts, 'mapeo.json'), JSON.stringify(Object.fromEntries(slugs.map(s => [s, null]))))
        await promisify(execFile)(process.execPath, [join(scripts, 'imagenes.ts'), ...(pass === 2 ? ['--forzar'] : [])], { cwd: root, timeout: 10_000 })
        for (const slug of slugs.slice(0, 3)) expect(readFileSync(join(images, `${slug}.webp`))).toEqual(webp)
        expect(existsSync(join(images, 'huerfana.webp'))).toBe(false)
        expect(existsSync(join(images, 'pendiente.webp'))).toBe(false)
        expect(JSON.parse(readFileSync(join(scripts, 'ilustraciones-convertidas.json'), 'utf8'))).toEqual(['ilustrada'])
        const listado = readFileSync(join(lib, 'ejerciciosConImagen.ts'), 'utf8')
        for (const slug of slugs.slice(0, 3)) expect(listado).toContain(`'${slug}'`)
        expect(listado).not.toContain("'pendiente'")
      }
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
