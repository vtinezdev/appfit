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
const version = process.argv[2] ?? '2026-10-26'
const recetas = JSON.parse(leer(join(datos, 'recetas.json'))) as Receta[]
const directos = leerDirectos(leer(join(datos, 'directos.csv')))
const referencias = JSON.parse(leer(join(datos, 'referencias-tradicionales.json'))) as { referencias: { estado: string }[] }
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
    `Objetivo previo: 500 adicionales. Ampliación actual por categorías y alimentos cotidianos, según petición de 2026-10-25. Añadidos frente al lote inicial de 45: ${r.paquete.filas.length - 45}; pendientes: ${Math.max(0, 545 - r.paquete.filas.length)}.`,
    `Referencias RAG localizadas: ${referencias.referencias.length}; NO cuentan como filas publicadas.`,
    'Alcance pendiente: objetivo NO alcanzado; referencias individuales y rendimientos deben revisarse antes de incorporar más platos.',
    'Fuentes directas: USDA SR Legacy April 2018 (CC0) y UK CoFID 2021 (Open Government Licence v3.0). No se transforma sodio en sal. CIQUAL es3 sigue pendiente del XML compo completo.',
    ...['USDA', 'CoFID', 'AppFit'].map(fuente => `${fuente}: ${directos.filter(d => d.fuente === fuente && !r.excluidos.includes(d.fila[0])).length} directos aceptados`),
    'Reparto por categoría: ' + [...new Set(r.paquete.filas.map(f => f[3]))].map(c => `${c}: ${r.paquete.filas.filter(f => f[3] === c).length}`).join('; '),
    'Referencias culinarias: 25 recetas iniciales con cita general pendiente de contraste individual, 2 mezclas crudas con balance íntegro y 34 referencias individuales leídas de RAG/RTVE. Los pesos finales de las recetas cocinadas son objetivos AppFit, no mediciones experimentales.',
    'Preparaciones: 12 directos adicionales, 4 USDA y 8 CoFID. Rebozado/enharinado/empanado, piel y aceite identificados. Métodos ya existentes en CIQUAL no se duplican. Alias de pollo/pavo empanados pendientes en CSV (es3). Sin fuente específica para freidora de aire.',
    'Lote cotidiano: 39 valores directos CoFID 2021, sin formular recetas nuevas de AppFit. 40 candidatos revisados: macedonia descartada por cobertura CIQUAL 13134; alias pendiente en CSV. Las 117 filas anteriores permanecen intactas.',
    'Lote vegetal y ensaladas: 32 directos nuevos (31 CoFID y 1 USDA). Semillas de edamame sin vaina, rellenos/aliños/frutos secos explícitos. Sin nuevos cálculos AppFit. Las 156 filas anteriores permanecen intactas.',
    'Lote pescado/aves y clásicos: 20 directos CoFID y 4 recetas AppFit con referencia individual (croquetas serrano/pollo, bravas y pulpo a feira). Pesos finales de formulación, no pesadas experimentales. Las 188 filas anteriores permanecen intactas.',
    'Lote de salsas, guisos y repostería: 29 directos CoFID, sin cálculos nuevos AppFit. Bechamel/yogur caseros, Saboya, éclair, baba y coq au vin ya cubiertos se descartan; solo una salsa de tomate CoFID. Las 212 filas anteriores permanecen intactas.',
    'Lote de pizzas: 14 directos (13 USDA y 1 CoFID). Hawaiana y variantes de masa/cobertura identificadas, sin marcas ni nuevos rendimientos AppFit. Restauración rápida estadounidense se identifica como tal. Las 241 filas anteriores permanecen intactas; ver auditoria-ciqual.txt para los descartes.',
    'Lote variado: 30 directos CoFID (10 frutas, 6 panes, 7 verduras/guarniciones, 3 mar/pescado, 2 crepes sin relleno y 2 mezclas de cacahuetes). Pan de ajo y salmón en costra pendientes de confirmar el estado final, registrados sin fuente. Sin rendimientos nuevos AppFit ni alias nuevos CIQUAL. Las 255 filas anteriores permanecen intactas; descartes en auditoria-ciqual.txt.',
    'Lote manual de típicos españoles (2026-10-26): 110 recetas AppFit calculadas desde CIQUAL (legumbres, arroces, huevos, carnes, pescados, ensaladas, bocadillos, salsas, dulces y bebidas), sin referencia individual. Admiten conservas, envasados y fiambres como ingredientes y cualquier categoría AppFit. Avisos energéticos de bebidas con alcohol esperados (CIQUAL no guarda el alcohol). Las 285 filas anteriores permanecen intactas.',
    'Segunda tanda manual (2026-10-26): 129 recetas AppFit más (cuchara, arroces y pasta, huevos, carnes, pescados, tapas y bocadillos, verduras, salsas, postres y bebidas). Caballa al horno descartada por cubrirla CIQUAL 26019. Las 395 filas anteriores permanecen intactas.',
    'Tercera tanda manual (2026-10-26): 75 recetas AppFit (31 básicos a la española y 44 platos regionales, dulces y bebidas).',
    'Alimentos sueltos AppFit (2026-10-26): valores típicos estimados a partir de etiquetado de productos y webs nutricionales, NO fuente oficial; URL consultadas en directos.csv. Embutidos, cortes ibéricos, quesos españoles, panes, aperitivos y horchata.',
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
    licencia: 'Licence Ouverte Etalab 2.0 (CIQUAL); CC0 (USDA); Open Government Licence v3.0 (CoFID); MIT (formulaciones y valores de referencia AppFit)',
    atribucion: 'Nutrientes calculados a partir de ANSES, Table Ciqual 2025 (https://ciqual.anses.fr), Licence Ouverte Etalab 2.0. Valores directos: USDA FoodData Central, SR Legacy April 2018, CC0 (https://fdc.nal.usda.gov). Contiene información del sector público del Reino Unido bajo Open Government Licence v3.0: Public Health England, McCance and Widdowson’s Composition of Foods Integrated Dataset 2021 (https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid). Formulaciones y rendimientos de diseño: AppFit. Alimentos sueltos marcados como AppFit: valores típicos estimados por AppFit a partir de etiquetado de productos y webs nutricionales (no fuente oficial; URL en scripts/catalogo/tipicos/directos.csv). Referencias culinarias en scripts/catalogo/tipicos/recetas.json.',
  }]
  writeFileSync(join(salida, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  for (const f of readdirSync(salida)) if (/^tipicos-.*\.json$/.test(f) && f !== archivo) unlinkSync(join(salida, f))
  console.log(`${r.paquete.filas.length} filas; informe: ${informe}`)
} catch (error) {
  writeFileSync(informe, `CONSTRUCCIÓN BLOQUEADA\n${String(error)}\n`)
  throw error
}
