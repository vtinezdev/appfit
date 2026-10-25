import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { EstadoVitrina } from '../../vitrina/hooks/useVitrina'
import type { Logro } from '../../vitrina/lib/logros'
import type { ResumenLogro } from '../lib/publicacion'
import ElegirDestacados from './ElegirDestacados'

const medalla = (logroId: string, titulo: string) => ({ v: 1, tipo: 'logro', titulo, logroId, grupo: 'entreno', nivel: null, descripcion: 'Requisito' }) as ResumenLogro
const local = (id: string, nombre: string, hecho: boolean) => ({ id, nombre, grupo: 'entreno', descripcion: 'Requisito', niveles: [], veces: hecho ? [{ fecha: '2026-10-01' }] : [] }) as unknown as Logro
const vitrina = (logros: Logro[]) => ({ visible: true, vitrina: { logros } }) as unknown as EstadoVitrina

describe('elegir logros destacados', () => {
  it('el formulario enseña solo los tres huecos: los elegidos con su medalla y el resto libres', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => local(`l${i}`, `Logro ${i}`, true))
    const html = renderToStaticMarkup(<ElegirDestacados vitrina={vitrina(muchos)} destacados={[medalla('l4', 'Logro 4')]} onChange={() => {}} />)
    expect(html).toContain('Logro 4')
    expect(html).not.toContain('Logro 5') // el resto, en la hoja
    expect(html.match(/>Libre</g)).toHaveLength(2)
    expect(html).toContain('<svg')
    expect(html).toContain('Cambiar logros destacados')
  })

  it('basta con haber desbloqueado un logro, sin publicarlo; sin ninguno lo explica', () => {
    expect(renderToStaticMarkup(<ElegirDestacados vitrina={vitrina([local('a', 'A', true)])} destacados={[]} onChange={() => {}} />)).toContain('Elegir logros destacados')
    const vacio = renderToStaticMarkup(<ElegirDestacados vitrina={vitrina([local('a', 'A', false)])} destacados={[]} onChange={() => {}} />)
    expect(vacio).toContain('Consigue un logro de tu Vitrina')
    expect(vacio).not.toContain('Elegir logros destacados')
  })

  it('con Vitrina oculta lo dice, pero deja ver y cambiar lo ya destacado', () => {
    const oculta = { visible: false } as EstadoVitrina
    expect(renderToStaticMarkup(<ElegirDestacados vitrina={oculta} destacados={[]} onChange={() => {}} />)).toContain('Vitrina está oculta en Ajustes')
    const conElegidos = renderToStaticMarkup(<ElegirDestacados vitrina={oculta} destacados={[medalla('entrenos', 'Entrenos')]} onChange={() => {}} />)
    expect(conElegidos).toContain('Entrenos')
    expect(conElegidos).toContain('Cambiar logros destacados')
  })
})
