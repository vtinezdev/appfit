// Valida tipicos/preparaciones.json y escribe el listado legible en informes/preparaciones.md.
// Uso: npm run catalogo:preparaciones
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { informePreparaciones, validarPreparaciones, type Preparacion } from './preparacionesLib.ts'
import type { Receta } from './tipicosLib.ts'
const aqui = dirname(fileURLToPath(import.meta.url))
const catalogo = resolve(aqui, '../../public/catalogo')
const leer = <T>(ruta: string) => JSON.parse(readFileSync(ruta, 'utf8')) as T
const manifest = leer<{ fuentes: { id: string; archivo: string }[] }>(join(catalogo, 'manifest.json'))
const ciqual = leer<{ filas: Parameters<typeof informePreparaciones>[2] }>(join(catalogo, manifest.fuentes.find(f => f.id === 'ciqual')!.archivo))
const recetas = leer<Receta[]>(join(aqui, 'tipicos/recetas.json'))
const preparaciones = leer<Preparacion[]>(join(aqui, 'tipicos/preparaciones.json'))
const errores = validarPreparaciones(preparaciones, recetas)
if (errores.length) { console.error(errores.join('\n')); process.exit(1) }
const salida = join(aqui, 'informes/preparaciones.md')
writeFileSync(salida, informePreparaciones(preparaciones, recetas, ciqual.filas, 'Preparaciones de las recetas de típicos'))
console.log(`${preparaciones.length} preparaciones; listado: ${salida}`)
