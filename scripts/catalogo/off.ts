// CLI de la tubería Open Food Facts (selección España). Uso (desde la raíz del repo):
//   npm run catalogo:off [-- --max 3000] [-- --min-escaneos 5] [-- --volcado scripts/catalogo/raw/off-products-AAAA-MM-DD.csv.gz]
// Lee el volcado CSV oficial en streaming (zlib + readline, sin dependencias). Ver scripts/catalogo/README.md.
// La lógica está en `offLib.ts` y `calidad.ts`; aquí solo hay E/S.
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'
import { formatearInforme, validarPaquetePublicado, type Hallazgo, type PaqueteCalidad } from './calidad.ts'
import { fusionarManifest, type Manifest } from './ciqualLib.ts'
import {
  construirPaqueteOff,
  entradaManifestOff,
  indicesDeCabecera,
  procesarLinea,
  seleccionarProductos,
  versionDeVolcado,
  type ProductoOffNormalizado,
} from './offLib.ts'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAW = join(AQUI, 'raw')
const INFORMES = join(AQUI, 'informes')
const SALIDA = resolve(AQUI, '..', '..', 'public', 'catalogo')
const MAX_POR_DEFECTO = 3000
/** Productos con menos escaneos casi siempre son fichas incompletas o de prueba. */
const MIN_ESCANEOS_POR_DEFECTO = 5

function fallar(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (!v || v.startsWith('--')) fallar(`${nombre} necesita un valor`)
  return v
}

/** Último `off-products-AAAA-MM-DD.csv.gz` de `raw/`. */
function volcadoPorDefecto(): string {
  const candidatos = existsSync(RAW) ? readdirSync(RAW).filter((f) => versionDeVolcado(f)).sort() : []
  if (candidatos.length === 0) fallar(`Falta off-products-AAAA-MM-DD.csv.gz en ${RAW} (ver README.md)`)
  return join(RAW, candidatos[candidatos.length - 1])
}

const args = process.argv.slice(2)
const max = Number(opcion(args, '--max') ?? MAX_POR_DEFECTO)
if (!Number.isInteger(max) || max <= 0) fallar('--max debe ser un entero positivo')
const minEscaneos = Number(opcion(args, '--min-escaneos') ?? MIN_ESCANEOS_POR_DEFECTO)
if (!Number.isInteger(minEscaneos) || minEscaneos < 0) fallar('--min-escaneos debe ser un entero no negativo')
const ruta = resolve(opcion(args, '--volcado') ?? volcadoPorDefecto())
const nombreVolcado = ruta.split(/[\\/]/).pop() ?? ''
const version = versionDeVolcado(nombreVolcado)
if (!version) fallar(`El nombre del volcado debe ser off-products-AAAA-MM-DD.csv.gz (recibido «${nombreVolcado}»)`)
if (!existsSync(ruta)) fallar(`No existe ${ruta}`)

const inicio = Date.now()
const candidatos: ProductoOffNormalizado[] = []
const exclusiones = new Map<string, number>()
const ejemplosCalidad: Hallazgo[] = []
let lineas = 0
let deEspana = 0

const lector = createInterface({ input: createReadStream(ruta).pipe(createGunzip()), crlfDelay: Infinity })
let indices: ReturnType<typeof indicesDeCabecera> | undefined
for await (const linea of lector) {
  if (!indices) {
    indices = indicesDeCabecera(linea.split('\t'))
    continue
  }
  lineas++
  const r = procesarLinea(linea, indices, { hallazgos: ejemplosCalidad.length < 200 ? ejemplosCalidad : undefined })
  if (r === undefined) continue
  deEspana++
  if ('ok' in r) candidatos.push(r.ok)
  else {
    const motivo = r.excluido
    exclusiones.set(motivo, (exclusiones.get(motivo) ?? 0) + 1)
  }
}
console.log(`Leídas ${lineas} líneas; ${deEspana} de España; ${candidatos.length} pasan los filtros`)

const { elegidos, duplicados } = seleccionarProductos(candidatos, max, minEscaneos)
const paquete = construirPaqueteOff(elegidos, version)
const archivo = `offes-${version}.json`

// Calidad del paquete resultante (debe ser 0 errores y 0 avisos: ya se filtró producto a producto).
const calidad = validarPaquetePublicado(paquete as PaqueteCalidad)
if (calidad.errores.length > 0 || calidad.avisos.length > 0) {
  for (const h of [...calidad.errores, ...calidad.avisos].slice(0, 30)) console.error(`  ${h.id}\t${h.nombre}\t[${h.regla}] ${h.detalle}`)
  fallar(`El paquete resultante tiene ${calidad.errores.length} errores y ${calidad.avisos.length} avisos: no se escribe.`)
}

mkdirSync(SALIDA, { recursive: true })
writeFileSync(join(SALIDA, archivo), JSON.stringify(paquete), 'utf8')
for (const f of readdirSync(SALIDA)) {
  if (/^offes-.+\.json$/.test(f) && f !== archivo) {
    unlinkSync(join(SALIDA, f))
    console.log(`Retirado ${f}`)
  }
}
const rutaManifest = join(SALIDA, 'manifest.json')
const previo = existsSync(rutaManifest) ? (JSON.parse(readFileSync(rutaManifest, 'utf8')) as Manifest) : undefined
writeFileSync(
  rutaManifest,
  JSON.stringify(fusionarManifest(previo, entradaManifestOff(paquete, archivo)), null, 2) + '\n',
  'utf8',
)

// Informe versionado.
mkdirSync(INFORMES, { recursive: true })
const porCategoria = new Map<string, number>()
for (const f of paquete.filas) porCategoria.set(f[3], (porCategoria.get(f[3]) ?? 0) + 1)
const ordenar = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k}: ${n}`)
writeFileSync(
  join(INFORMES, 'offes.txt'),
  formatearInforme({
    fuente: 'offes',
    version,
    total: paquete.filas.length,
    resumen: [
      `Volcado: ${nombreVolcado} (${lineas} productos; ${deEspana} con «en:spain»)`,
      `Pasan todos los filtros: ${candidatos.length}; duplicados descartados al elegir: ${duplicados}; máximo (--max): ${max}; mínimo de escaneos (--min-escaneos): ${minEscaneos}`,
      `Con valores por 100 ml: ${paquete.filas.filter((f) => f[9]?.ml).length}`,
      'Excluidos de España por motivo:',
      ...ordenar(exclusiones),
      'Publicados por categoría:',
      ...ordenar(porCategoria),
    ],
    errores: calidad.errores,
    // Ejemplos de productos excluidos por calidad (política de OFF: un aviso excluye el producto).
    avisos: ejemplosCalidad,
  }),
  'utf8',
)
console.log(
  `Escrito ${join(SALIDA, archivo)}: ${paquete.filas.length} productos (${((Date.now() - inicio) / 1000).toFixed(0)} s); informe en informes/offes.txt`,
)
