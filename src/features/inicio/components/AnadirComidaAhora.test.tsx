import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnadirComidaAhora from './AnadirComidaAhora'
import TarjetaEnergia from './TarjetaEnergia'

const a = (hora: number) => renderToStaticMarkup(<AnadirComidaAhora onAnadir={() => {}} ahora={new Date(2026, 9, 23, hora, 0)} />)

describe('AnadirComidaAhora', () => {
  it('nombra la comida según la hora', () => {
    expect(a(8)).toContain('Añadir desayuno')
    expect(a(14)).toContain('Añadir comida')
    expect(a(17)).toContain('Añadir snack')
    expect(a(21)).toContain('Añadir cena')
  })

  it('va al pie de la tarjeta de energía, como hermano de su botón y no dentro', () => {
    const html = renderToStaticMarkup(<TarjetaEnergia totales={{ kcal: 0, prot: 0, carb: 0, grasa: 0 }} objetivos={{ kcal: 2000, prot: 150, carb: 200, grasa: 70 }}
      onAbrir={() => {}} pie={<AnadirComidaAhora onAnadir={() => {}} ahora={new Date(2026, 9, 23, 8, 0)} />} />)
    expect(html.match(/<button/g)).toHaveLength(2)
    expect(html.indexOf('</button>')).toBeLessThan(html.indexOf('Añadir desayuno'))
    expect(html).not.toContain('bg-accent')
  })
})
