// E/S de típicos. Lee siempre la versión de CIQUAL anunciada en el manifest.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { construir, duplicados, leerDirectos, type Receta } from './tipicosLib.ts'
import type { PaqueteCalidad } from './calidad.ts'
const aqui = dirname(fileURLToPath(import.meta.url))
const salida = resolve(aqui, '../../public/catalogo')
const datos = join(aqui, 'tipicos')
const leer = (ruta: string) => readFileSync(ruta, 'utf8')
const manifest = JSON.parse(leer(join(salida, 'manifest.json')))
const ciqual = JSON.parse(leer(join(salida, manifest.fuentes.find((f: { id: string }) => f.id === 'ciqual').archivo))) as PaqueteCalidad
const off = JSON.parse(leer(join(salida, manifest.fuentes.find((f: { id: string }) => f.id === 'offes').archivo))) as PaqueteCalidad
const version = process.argv[2] ?? '2026-10-24'
const recetas = JSON.parse(leer(join(datos, 'recetas.json'))) as Receta[]
const directos = leerDirectos(leer(join(datos, 'directos.csv')))
const informe = join(aqui, 'informes/tipicos.txt')
mkdirSync(dirname(informe), { recursive: true })
try {
  const r = construir(directos, recetas, ciqual, version)
  const coincidencias = [ciqual, off].flatMap(p => duplicados(r.paquete.filas, p.filas).map(d => `${p.fuente}: ${d.id} → ${d.otro} ${d.nombre} (${d.exacto ? 'exacto' : 'casi'})`))
  const sinFuente = JSON.parse(leer(join(datos, 'sin-fuente.json'))) as string[]
  writeFileSync(informe, [
    `Típicos ${version} · CIQUAL ${ciqual.version}`,
    `Vía 1: ver auditoria-ciqual.txt. Alias en CSV pendientes de reconstruir es3 (XML compo incompleto).`,
    `Vía 2 (directos): ${r.directos}; excluidos por energía: ${r.excluidos.join(', ') || 'ninguno'}`,
    `Vía 3 (recetas): ${r.recetas}; total: ${r.paquete.filas.length}`,
    'Alcance pendiente: objetivo 300–500 NO alcanzado; no se rellenan huecos con equivalentes dudosos.',
    'USDA SR Legacy April 2018 descargado de fdc.nal.usda.gov (CC0). XML CIQUAL compo no descargado completo dentro del plazo; no se publica es3.',
    'Revisar Víctor: formulaciones AppFit y pesos finales de diseño (no pesadas experimentales).',
    'Sin factores de rendimiento/retención USDA. Se conserva la suma de nutrientes de los ingredientes.',
    '', 'AVISOS calidad.ts:', ...r.avisos, '', 'DUPLICADOS CIQUAL / OFF (solo informativos salvo exactos CIQUAL):', ...coincidencias,
    '', 'SIN FUENTE (no publicados; pendiente de verificar fuente o receta completa):', ...sinFuente.map(n => `sin fuente: ${n}`), '',
  ].join('\n'))
  const archivo = `tipicos-${version}.json`
  // Conserva todos los ids ya publicados: nunca reasignar un slug a otra preparación.
  const previo = manifest.fuentes.find((f: { id: string }) => f.id === 'tipicos')
  if (previo) {
    const ids = new Set(r.paquete.filas.map(f => f[0]))
    const anterior = JSON.parse(leer(join(salida, previo.archivo))) as PaqueteCalidad
    if (anterior.filas.some(f => !ids.has(f[0]))) throw new Error('Desaparecen ids de típicos ya publicados')
  }
  writeFileSync(join(salida, archivo), JSON.stringify(r.paquete))
  manifest.fuentes = [...manifest.fuentes.filter((f: { id: string }) => f.id !== 'tipicos'), {
    id: 'tipicos', version, archivo, filas: r.paquete.filas.length,
    licencia: 'Licence Ouverte Etalab 2.0 (CIQUAL); CC0 (USDA); MIT (formulaciones AppFit)',
    atribucion: 'Nutrientes calculados a partir de ANSES, Table Ciqual 2025 (https://ciqual.anses.fr), Licence Ouverte Etalab 2.0. Valores directos: USDA FoodData Central, SR Legacy April 2018, CC0 (https://fdc.nal.usda.gov). Formulaciones y rendimientos de diseño: AppFit. Referencias culinarias en scripts/catalogo/tipicos/recetas.json.',
  }]
  writeFileSync(join(salida, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  for (const f of readdirSync(salida)) if (/^tipicos-.*\.json$/.test(f) && f !== archivo) unlinkSync(join(salida, f))
  console.log(`${r.paquete.filas.length} filas; informe: ${informe}`)
} catch (error) {
  writeFileSync(informe, `CONSTRUCCIÓN BLOQUEADA\n${String(error)}\n`)
  throw error
}
