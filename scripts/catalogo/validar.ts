// Valida todos los paquetes publicados en `public/catalogo/`. Uso: npm run catalogo:validar
// Sale con código 1 si hay errores. Los avisos de CIQUAL no fallan: van a `informes/ciqual.txt`.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validarPaquetePublicado, type PaqueteCalidad } from './calidad.ts'

const CATALOGO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'catalogo')

interface FuenteManifest {
  id: string
  archivo: string
  version: string
  filas: number
}

export function validarCatalogoPublicado(carpeta = CATALOGO): { linea: string; errores: number }[] {
  const manifest = JSON.parse(readFileSync(join(carpeta, 'manifest.json'), 'utf8')) as { fuentes: FuenteManifest[] }
  return manifest.fuentes.map((f) => {
    const ruta = join(carpeta, f.archivo)
    if (!existsSync(ruta)) return { linea: `${f.id}: falta el archivo ${f.archivo}`, errores: 1 }
    const paquete = JSON.parse(readFileSync(ruta, 'utf8')) as PaqueteCalidad
    const problemas: string[] = []
    if (paquete.formato !== 2) problemas.push(`formato ${paquete.formato} (se esperaba 2)`)
    if (paquete.fuente !== f.id) problemas.push(`fuente «${paquete.fuente}» distinta de la del manifest «${f.id}»`)
    if (paquete.version !== f.version) problemas.push(`versión «${paquete.version}» distinta de la del manifest «${f.version}»`)
    if (paquete.filas.length !== f.filas) problemas.push(`${paquete.filas.length} filas, el manifest dice ${f.filas}`)
    const r = validarPaquetePublicado(paquete)
    for (const h of [...r.errores, ...r.avisos].slice(0, 20)) problemas.push(`${h.id} ${h.nombre} [${h.regla}] ${h.detalle}`)
    const errores = problemas.length
    const cabecera = `${f.id} ${paquete.version}: ${paquete.filas.length} alimentos, ${errores === 0 ? 'OK' : `${errores} problemas`}`
    return { linea: [cabecera, ...problemas.map((p) => `  ${p}`)].join('\n'), errores }
  })
}

// Solo se ejecuta como CLI (los tests importan `validarCatalogoPublicado` sin lanzar nada).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const resultados = validarCatalogoPublicado()
  for (const r of resultados) console.log(r.linea)
  if (resultados.some((r) => r.errores > 0)) process.exit(1)
}
