// CLI de los lugares de España (rutas propias de Caminos). Uso (desde la raíz del repo):
//   npm run lugares:construir
// Lee scripts/lugares/raw/ES.txt (descargado a mano de https://download.geonames.org/export/dump/ES.zip) y escribe
// public/lugares/espana.json. Ver scripts/lugares/README.md; la lógica está en `lugaresLib.ts`.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lugaresDeGeonames } from './lugaresLib.ts'

const AQUI = dirname(fileURLToPath(import.meta.url))
const ENTRADA = join(AQUI, 'raw', 'ES.txt')
const SALIDA = join(AQUI, '..', '..', 'public', 'lugares', 'espana.json')

const version = new Date().toISOString().slice(0, 10)
const paquete = lugaresDeGeonames(readFileSync(ENTRADA, 'utf8'), version)
writeFileSync(SALIDA, `${JSON.stringify(paquete)}\n`)
console.log(`${paquete.lugares.length} lugares en ${paquete.provincias.length} provincias → ${SALIDA}`)
