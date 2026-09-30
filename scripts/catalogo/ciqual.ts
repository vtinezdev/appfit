// CLI de la tubería CIQUAL. Uso (desde la raíz del repo):
//   npm run catalogo:ciqual -- extraer
//   npm run catalogo:ciqual -- construir [--traducciones <ruta>] [--sufijo es2] [--previo <paquete.json>]
// Ver scripts/catalogo/README.md. La lógica está en `ciqualLib.ts` y `calidad.ts`; aquí solo hay E/S.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatearInforme, validarConjunto } from './calidad.ts'
import {
  aAlimentosCalidad,
  construirAlimentos,
  construirPaquete,
  entradaManifest,
  FaltanTraducciones,
  fusionarManifest,
  gruposCasiDuplicados,
  idsPerdidos,
  nombresCsv,
  parsearListaMotivos,
  parsearRegistros,
  parsearTraducciones,
  versionDesdeNombre,
  type Manifest,
  type Paquete,
} from './ciqualLib.ts'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAW = join(AQUI, 'raw')
const CIQUAL = join(AQUI, 'ciqual')
const NOMBRES = join(CIQUAL, 'nombres.csv')
const TRADUCCIONES = join(CIQUAL, 'traducciones.csv')
const OCULTOS = join(CIQUAL, 'ocultos.csv')
const RETIRADOS = join(CIQUAL, 'retirados.csv')
const INFORMES = join(AQUI, 'informes')
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

/** Paquete `ciqual-*.json` publicado más reciente que no sea `excluir` (el invariante de ids se comprueba contra él). */
function paquetePrevio(excluir: string): string | undefined {
  if (!existsSync(SALIDA)) return undefined
  const candidatos = readdirSync(SALIDA)
    .filter((f) => /^ciqual-.+\.json$/.test(f) && f !== excluir)
    .sort()
  return candidatos.length > 0 ? join(SALIDA, candidatos[candidatos.length - 1]) : undefined
}

function leerLista(ruta: string, nombre: string) {
  return existsSync(ruta) ? parsearListaMotivos(readFileSync(ruta, 'utf8'), nombre) : new Map<string, string>()
}

const [orden, ...args] = process.argv.slice(2)

if (orden === 'extraer') {
  const { alimentos } = cargar()
  mkdirSync(dirname(NOMBRES), { recursive: true })
  writeFileSync(NOMBRES, nombresCsv(alimentos), 'utf8')
  console.log(`Escrito ${NOMBRES}`)
} else if (orden === 'construir') {
  const rutaTrad = resolve(opcion(args, '--traducciones') ?? TRADUCCIONES)
  const sufijo = opcion(args, '--sufijo') ?? 'es2'
  if (!existsSync(rutaTrad)) fallar(`No existe ${rutaTrad}`)
  const { alimentos, version: versionCiqual, descartados } = cargar()
  const traducciones = parsearTraducciones(readFileSync(rutaTrad, 'utf8'))
  const ocultos = leerLista(OCULTOS, 'ocultos.csv')
  const retirados = leerLista(RETIRADOS, 'retirados.csv')
  const version = `${versionCiqual}-${sufijo}`
  const archivo = `ciqual-${version}.json`

  let resultado
  try {
    resultado = construirPaquete(alimentos, traducciones, version, { ocultos })
  } catch (e) {
    if (e instanceof FaltanTraducciones) fallar(e.message)
    throw e
  }
  if (resultado.sobrantes.length > 0) {
    console.warn(`Aviso: ${resultado.sobrantes.length} traducciones de códigos inexistentes (ignoradas)`)
  }
  if (resultado.ocultosSobrantes.length > 0) {
    fallar(`ocultos.csv tiene códigos que no existen: ${resultado.ocultosSobrantes.join(', ')}`)
  }

  // 1. Calidad: los errores bloquean; los avisos van al informe (los valores oficiales no se tocan).
  const calidad = validarConjunto(aAlimentosCalidad(alimentos, traducciones), 'generico')
  mkdirSync(INFORMES, { recursive: true })
  const faltantes: Record<string, number> = {}
  for (const k of ['fibra', 'azucares', 'sal', 'agSat'] as const) {
    faltantes[k] = alimentos.filter((a) => a.nutrientes?.[k] === undefined).length
  }
  writeFileSync(
    join(INFORMES, 'ciqual.txt'),
    formatearInforme({
      fuente: 'ciqual',
      version,
      total: alimentos.length,
      resumen: [
        `Descartados por no tener kcal, proteína, hidratos o grasa: ${descartados}`,
        `Ocultos (no se buscan; id conservado): ${ocultos.size}`,
        `Alias: ${[...traducciones.values()].filter((t) => t.alias.length > 0).length} alimentos con alias`,
        `Secundarios (detrás al buscar): ${alimentos.filter((a) => a.secundario).length}`,
      ],
      errores: calidad.errores,
      avisos: calidad.avisos,
      faltantes,
    }),
    'utf8',
  )
  console.log(`Calidad: ${calidad.errores.length} errores, ${calidad.avisos.length} avisos (informes/ciqual.txt)`)

  // 2. Casi-duplicados, para revisar y curar `ciqual/ocultos.csv`.
  const nombres = new Map([...traducciones].map(([c, t]) => [c, t.nombreEs]))
  const porCodigo = new Map(alimentos.map((a) => [a.code, a]))
  const grupos = gruposCasiDuplicados(alimentos, nombres)
  const lineas = [
    `Casi-duplicados de CIQUAL ${version}: ${grupos.length} grupos`,
    'Mismo nombre base (sin descriptores neutros) y 8 nutrientes dentro de tolerancia. Solo informativo: se cura a mano en ciqual/ocultos.csv.',
    '(marca «*» = ya oculto)',
    '',
  ]
  for (const g of grupos) {
    lineas.push(g.base)
    for (const c of g.codigos) {
      const a = porCodigo.get(c)!
      lineas.push(
        `  ${ocultos.has(c) ? '*' : ' '} ${c}\t${nombres.get(c)}\t${a.kcal} kcal · P ${a.prot} · C ${a.carb} · G ${a.grasa} · ${a.completitud.toFixed(2)}`,
      )
    }
  }
  writeFileSync(join(INFORMES, 'ciqual-duplicados.txt'), lineas.join('\n') + '\n', 'utf8')
  console.log(`Casi-duplicados: ${grupos.length} grupos (informes/ciqual-duplicados.txt)`)

  if (calidad.errores.length > 0) {
    for (const h of calidad.errores.slice(0, 40)) console.error(`  ${h.id}\t${h.nombre}\t[${h.regla}] ${h.detalle}`)
    fallar(`Hay ${calidad.errores.length} errores de calidad: no se escribe el paquete.`)
  }

  // 3. Invariante de ids frente al paquete publicado anterior.
  const rutaPrevio = opcion(args, '--previo') ?? paquetePrevio(archivo)
  if (rutaPrevio) {
    const previo = JSON.parse(readFileSync(rutaPrevio, 'utf8')) as { filas: string[][] }
    const perdidos = idsPerdidos(
      previo.filas.map((f) => f[0]),
      resultado.paquete.filas.map((f) => f[0]),
      retirados,
    )
    if (perdidos.length > 0) {
      fallar(
        `Desaparecen ${perdidos.length} ids del paquete anterior (${rutaPrevio}) sin figurar en ciqual/retirados.csv: ` +
          perdidos.slice(0, 20).join(', '),
      )
    }
    console.log(`Invariante de ids: OK frente a ${rutaPrevio}`)
  } else console.log('Invariante de ids: no hay paquete anterior con el que comparar')

  // 4. Escribir el paquete y el manifest; retirar los paquetes de CIQUAL anteriores.
  mkdirSync(SALIDA, { recursive: true })
  writeFileSync(join(SALIDA, archivo), JSON.stringify(resultado.paquete satisfies Paquete), 'utf8')
  for (const f of readdirSync(SALIDA)) {
    if (/^ciqual-.+\.json$/.test(f) && f !== archivo) {
      unlinkSync(join(SALIDA, f))
      console.log(`Retirado ${f}`)
    }
  }
  const rutaManifest = join(SALIDA, 'manifest.json')
  const previo = existsSync(rutaManifest) ? (JSON.parse(readFileSync(rutaManifest, 'utf8')) as Manifest) : undefined
  const manifest = fusionarManifest(previo, entradaManifest(resultado.paquete, archivo, versionCiqual))
  writeFileSync(rutaManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Escrito ${join(SALIDA, archivo)} (${resultado.paquete.filas.length} filas) y manifest.json`)
} else {
  fallar('Uso: npm run catalogo:ciqual -- <extraer|construir> [--traducciones <ruta>] [--sufijo es2] [--previo <paquete.json>]')
}
