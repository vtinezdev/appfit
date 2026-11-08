import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FalloAplicacion from './FalloAplicacion'

describe('FalloAplicacion', () => {
  it.each([
    ['fallo de pantalla', <FalloAplicacion />],
    ['fallo de almacenamiento', <FalloAplicacion almacenamiento onReintentar={() => undefined} />],
  ])('%s: ofrece exportar la copia sin pasar por Ajustes', (_, elemento) => {
    const html = renderToStaticMarkup(elemento)
    expect(html).toContain('Exportar una copia de seguridad')
    expect(html).toContain('Recargar Cumbra Fit')
  })

  it('exportar desde el fallo solo lee: no anota la exportación ni toca ajustes', () => {
    const fuente = readFileSync('src/app/FalloAplicacion.tsx', 'utf8')
    expect(fuente).not.toMatch(/updateSettings|importarBackup|borrarTodosLosDatos|db\./)
  })
})
