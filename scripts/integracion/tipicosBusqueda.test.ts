import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
import * as catalogRepo from '../../src/features/nutricion/data/catalogRepo.ts'
import { aCatalogFoods, validarManifest, validarPaquete } from '../../src/features/nutricion/lib/catalogo/paquete.ts'
import { crearSincronizador, type ResultadoSincronizacion } from '../../src/features/nutricion/lib/catalogo/sincronizar.ts'
import { buscarCatalogo } from '../../src/features/nutricion/hooks/buscarCatalogo.ts'

const leer = (archivo: string): unknown => JSON.parse(readFileSync(`public/catalogo/${archivo}`, 'utf8'))
const manifest = validarManifest(leer('manifest.json'))
const entrada = manifest.fuentes.find(f => f.id === 'tipicos')!
const paquete = validarPaquete(leer(entrada.archivo))
const sincronizar = crearSincronizador({
  fetchJson: async url => leer(url.replace('/catalogo/', '')),
  fuentesInstaladas: catalogRepo.fuentes,
  importarFuente: catalogRepo.importarFuente,
  ahora: () => 2,
})
let resultado: ResultadoSincronizacion
beforeAll(async () => {
  // Un dispositivo que ya descargó un lote anterior con la misma versión de fecha.
  await catalogRepo.importarFuente({ ...entrada, filas: 1, importadoAt: 1 }, aCatalogFoods({ ...paquete, filas: paquete.filas.slice(0, 1) }, 1))
  resultado = await sincronizar()
}, 120000)
afterAll(() => catalogRepo.borrarCatalogo())

it('actualiza el lote del mismo día y no vuelve a descargarlo una vez completo', async () => {
  expect(resultado.actualizadas).toContainEqual({ id: 'tipicos', version: entrada.version, filas: paquete.filas.length })
  expect((await catalogRepo.fuentes()).find(f => f.id === 'tipicos')?.filas).toBe(paquete.filas.length)
  expect((await sincronizar()).actualizadas).toEqual([])
})

it.each([
  ['pizza hawaiana', 'pizza-jamon-pina-envasada-cocinada'],
  ['croquetas de jamón serrano', 'croquetas-jamon-serrano-caseras'],
  ['patatas bravas', 'patatas-bravas-caseras'],
  ['tortilla de patatas sin cebolla', 'tortilla-patatas-sin-cebolla'],
  ['lombarda con manzana', 'lombarda-manzana-cocinada'],
  ['pan con germen de trigo', 'pan-germen-trigo'],
  ['nigiri de atún', 'nigiri-atun'],
  ['calamar rebozado horneado', 'calamar-rebozado-horneado'],
  ['pera deshidratada', 'pera-deshidratada'],
])('«%s» aparece en los 15 resultados que muestra Nutrición', async (consulta, slug) => {
  const r = await buscarCatalogo(consulta)
  expect(r.foods.slice(0, 15).map(f => f.id)).toContain(`tipicos:${slug}`)
})
