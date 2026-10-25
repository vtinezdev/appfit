import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
import * as catalogRepo from '../../src/features/nutricion/data/catalogRepo.ts'
import { aCatalogFoods, validarManifest, validarPaquete } from '../../src/features/nutricion/lib/catalogo/paquete.ts'
import { buscarCatalogo } from '../../src/features/nutricion/hooks/buscarCatalogo.ts'
const leer = (nombre: string): unknown => JSON.parse(readFileSync(`public/catalogo/${nombre}`, 'utf8'))
const alimentos = validarManifest(leer('manifest.json')).fuentes.flatMap(f => aCatalogFoods(validarPaquete(leer(f.archivo)), 0))
beforeAll(() => catalogRepo.guardarLote(alimentos))
afterAll(() => catalogRepo.borrarCatalogo())
it('conserva el básico con piel y permite pedir expresamente el rebozado', async () => {
  const normal = await buscarCatalogo('pechuga de pollo con piel')
  expect(normal.foods[0]?.id).toMatch(/^ciqual:/)
  expect(normal.foods[0]?.nombre).not.toMatch(/rebozad|enharinad|empanad/i)
  const rebozada = await buscarCatalogo('pechuga de pollo rebozada')
  expect(rebozada.foods[0]?.id).toBe('tipicos:pollo-pechuga-piel-rebozada-frita')
})
