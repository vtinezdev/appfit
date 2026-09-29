// CLI de la tubería CIQUAL. Uso (desde la raíz del repo):
//   npm run catalogo:ciqual -- extraer
//   npm run catalogo:ciqual -- construir [--traducciones <ruta>] [--sufijo es1]
// Ver scripts/catalogo/README.md. La lógica está en `ciqualLib.ts`; aquí solo hay E/S.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  construirAlimentos,
  construirPaquete,
  entradaManifest,
  FaltanTraducciones,
  fusionarManifest,
  nombresCsv,
  parsearRegistros,
  parsearTraducciones,
  versionDesdeNombre,
  type Manifest,
} from './ciqualLib.ts'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAW = join(AQUI, 'raw')
const NOMBRES = join(AQUI, 'ciqual', 'nombres.csv')
const TRADUCCIONES = join(AQUI, 'ciqual', 'traducciones.csv')
const SALIDA = resolve(AQUI, '..', '..', 'public', 'catalogo')

function fallar(msg: string): never {
  console.error(msg)
  process.exit(1)
}

/** Último archivo `<prefijo>_AAAA_MM_DD.xml` de `raw/` (el nombre ordena por fecha). */
function archivoRaw(prefijo: string): string {
  const patron = new RegExp(`^${prefijo}_\\d{4}_\\d{2}_\\d{2}\\.xml$`)
  const candidatos = existsSync(RAW) ? readdirSync(RAW).filter((f) => patron.test(f)).sort() : []
  if (candidatos.length === 0) fallar(`Falta ${prefijo}_AAAA_MM_DD.xml en ${RAW} (ver README.md)`)
  return candidatos[candidatos.length - 1]
}

function cargar() {
  const alim = archivoRaw('alim')
  const version = versionDesdeNombre(alim)
  if (!version) fallar(`No se pudo deducir la versión de ${alim}`)
  const leer = (prefijo: string, etiqueta: string) =>
    parsearRegistros(readFileSync(join(RAW, archivoRaw(prefijo)), 'utf8'), etiqueta)
  const resultado = construirAlimentos({
    alim: leer('alim', 'ALIM'),
    consts: leer('const', 'CONST'),
    compo: leer('compo', 'COMPO'),
  })
  console.log(
    `CIQUAL ${version} (${alim}): ${resultado.alimentos.length} alimentos válidos, ` +
      `${resultado.descartados} descartados`,
  )
  return { ...resultado, version }
}

function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (!v || v.startsWith('--')) fallar(`${nombre} necesita un valor`)
  return v
}

const [orden, ...args] = process.argv.slice(2)

if (orden === 'extraer') {
  const { alimentos } = cargar()
  mkdirSync(dirname(NOMBRES), { recursive: true })
  writeFileSync(NOMBRES, nombresCsv(alimentos), 'utf8')
  console.log(`Escrito ${NOMBRES}`)
} else if (orden === 'construir') {
  const rutaTrad = resolve(opcion(args, '--traducciones') ?? TRADUCCIONES)
  const sufijo = opcion(args, '--sufijo') ?? 'es1'
  if (!existsSync(rutaTrad)) fallar(`No existe ${rutaTrad}`)
  const { alimentos, version: versionCiqual } = cargar()
  const traducciones = parsearTraducciones(readFileSync(rutaTrad, 'utf8'))
  const version = `${versionCiqual}-${sufijo}`
  let resultado
  try {
    resultado = construirPaquete(alimentos, traducciones, version)
  } catch (e) {
    if (e instanceof FaltanTraducciones) fallar(e.message)
    throw e
  }
  if (resultado.sobrantes.length > 0) {
    console.warn(`Aviso: ${resultado.sobrantes.length} traducciones de códigos inexistentes (ignoradas)`)
  }
  const archivo = `ciqual-${version}.json`
  mkdirSync(SALIDA, { recursive: true })
  writeFileSync(join(SALIDA, archivo), JSON.stringify(resultado.paquete), 'utf8')

  const rutaManifest = join(SALIDA, 'manifest.json')
  const previo = existsSync(rutaManifest)
    ? (JSON.parse(readFileSync(rutaManifest, 'utf8')) as Manifest)
    : undefined
  const manifest = fusionarManifest(previo, entradaManifest(resultado.paquete, archivo, versionCiqual))
  writeFileSync(rutaManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Escrito ${join(SALIDA, archivo)} (${resultado.paquete.filas.length} filas) y manifest.json`)
} else {
  fallar('Uso: npm run catalogo:ciqual -- <extraer|construir> [--traducciones <ruta>] [--sufijo es1]')
}
