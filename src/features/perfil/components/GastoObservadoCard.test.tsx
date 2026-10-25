import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addDays } from '../../../shared/lib/dates'
import type { Perfil } from '../../../shared/db/types'
import { calcularEnergia } from '../lib/energia'
import { calcularGastoObservado } from '../lib/gastoObservado'
import GastoObservadoCard from './GastoObservadoCard'

const HOY = '2026-10-29'
const INICIO = addDays(HOY, -28)
const PERFIL: Perfil = { sexo: 'hombre', fechaNacimiento: '1996-10-06', alturaCm: 180, actividad: 'moderado', objetivo: 'mantenimiento' }

function html(kcalDias: number, pesos: number[], plegado = false, perfil: Perfil = PERFIL) {
  const kcalPorDia = new Map(Array.from({ length: kcalDias }, (_, i) => [addDays(INICIO, i), 2200] as const))
  const observado = calcularGastoObservado({ hoy: HOY, kcalPorDia, pesos: pesos.map((i) => ({ fecha: addDays(INICIO, i), kg: 75 })) })
  return renderToStaticMarkup(<GastoObservadoCard perfil={perfil} energia={calcularEnergia(perfil, 75, HOY)} observado={observado} hoy={HOY} plegado={plegado} />)
}

describe('requisitos del gasto observado', () => {
  it('muestra por separado los días con comidas y las semanas con pesajes, con sus cifras', () => {
    const h = html(18, [0, 3, 8, 21, 23, 25])
    expect(h).toContain('Días con comidas')
    expect(h).toContain('18 de 23')
    expect(h).toContain('Al menos 23 de los últimos 28 días, sin contar hoy.')
    expect(h).toContain('Semanas con pesajes')
    expect(h).toContain('2 de 4')
    expect(h).toContain('aria-label="Pesajes por semana"')
    expect(h.match(/<li /g)).toHaveLength(4)
    expect(h).toContain('0 de 2')
    expect(h).not.toContain('kcal/día')
  })
  it('la explicación y sus límites quedan en el desplegable; se conserva el selector', () => {
    const h = html(0, [])
    expect(h).toContain('Cómo se calcula y sus límites')
    expect(h).toContain('Hall, 2008')
    expect(h).toContain('Usar el observado')
  })
  it('con los mínimos cumplidos se ve el resultado y no los requisitos', () => {
    const pesos = Array.from({ length: 12 }, (_, i) => i * 2 + 1)
    const h = html(28, pesos)
    expect(h).toContain('kcal/día')
    expect(h).not.toContain('Días con comidas')
  })
  it('plegado: un desplegable cerrado con el título', () => {
    const h = html(10, [], true, {})
    expect(h).toContain('aria-expanded="false"')
    expect(h).toContain('Gasto observado')
    expect(h).toContain('hidden=""')
  })
})
