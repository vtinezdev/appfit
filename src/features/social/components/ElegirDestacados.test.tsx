import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Resumen } from '../lib/publicacion'
import ElegirDestacados from './ElegirDestacados'

const logro = (id: string, titulo: string) => ({ id, resumen: { v: 1, tipo: 'logro', titulo, logroId: 'entrenos', grupo: 'entreno', nivel: null, descripcion: '' } as Resumen })
const nada = async () => {}

describe('elegir logros destacados', () => {
  it('el formulario enseña solo los tres huecos: los elegidos con su medalla y el resto libres', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => logro(String(i), `Logro ${i}`))
    const html = renderToStaticMarkup(<ElegirDestacados logros={muchos} destacados={[muchos[4]]} onChange={() => {}} hayMas={false} onCargarMas={nada} />)
    expect(html).toContain('Logro 4')
    expect(html).not.toContain('Logro 5') // el resto, en la hoja
    expect(html.match(/>Libre</g)).toHaveLength(2)
    expect(html).toContain('<svg')
    expect(html).toContain('Cambiar logros destacados')
  })

  it('sin elegidos invita a elegir; sin logros publicados explica cómo conseguirlos', () => {
    expect(renderToStaticMarkup(<ElegirDestacados logros={[logro('a', 'A')]} destacados={[]} onChange={() => {}} hayMas={false} onCargarMas={nada} />)).toContain('Elegir logros destacados')
    const vacio = renderToStaticMarkup(<ElegirDestacados logros={[]} destacados={[]} onChange={() => {}} hayMas={false} onCargarMas={nada} />)
    expect(vacio).toContain('Comparte un logro de tu Vitrina')
    expect(vacio).not.toContain('Elegir logros destacados')
  })
})
