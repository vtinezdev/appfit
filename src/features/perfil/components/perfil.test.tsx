import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Perfil, Peso } from '../../../shared/db/types'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { calcularEnergia } from '../lib/energia'
import DatosPerfil from './DatosPerfil'
import ResultadoEnergia from './ResultadoEnergia'

const HOY = '2026-10-06'
const noop = () => {}
const COMPLETO: Perfil = { sexo: 'hombre', fechaNacimiento: '1996-10-06', alturaCm: 180, actividad: 'moderado', objetivo: 'definicion', intensidadKcal: 400 }
const PESO: Peso = { id: 1, fecha: '2026-10-05', kg: 80, createdAt: 1 }

function resultado(perfil: Perfil, kg: number | null) {
  return renderToStaticMarkup(<ResultadoEnergia perfil={perfil} energia={calcularEnergia(perfil, kg, HOY)} onElegirObjetivo={noop} onVerMetodo={noop} />)
}
function datos(perfil: Perfil, peso?: Peso) {
  return renderToStaticMarkup(<DatosPerfil perfil={perfil} peso={peso} hoy={HOY} onEditar={noop} onBorrar={noop} />)
}

describe('resultado de energía por estados', () => {
  it('perfil vacío: estado vacío sin cifras', () => {
    const html = resultado({}, null)
    expect(html).toContain('Completa tus datos para estimar tu energía diaria')
    expect(html).not.toContain('kcal/día')
  })
  it('incompleto: lista lo que falta', () => {
    const html = resultado({ ...COMPLETO, alturaCm: undefined, actividad: undefined }, 80)
    expect(html).toContain('Faltan: altura y actividad.')
    expect(html).not.toContain('kcal/día')
  })
  it('sin pesaje pide el peso', () => {
    expect(resultado(COMPLETO, null)).toContain('Faltan: peso.')
  })
  it('completo sin objetivo: gasto diario y «Elige tu objetivo»', () => {
    const html = resultado({ ...COMPLETO, objetivo: undefined }, 80)
    expect(html).toContain('Gasto diario estimado')
    expect(html).toContain('Elige tu objetivo')
  })
  it('completo: objetivo, cadena de 3 filas, aviso fijo y método', () => {
    const html = resultado(COMPLETO, 80)
    expect(html).toContain('2.420')
    expect(html).toContain('Gasto en reposo (media de 2 ecuaciones)')
    expect(html).toContain('× 1,55 · moderado')
    expect(html).toContain('−400')
    expect(html).toContain('Estimación orientativa, no una prescripción médica')
    expect(html).toContain('Cómo se ha calculado')
    expect(html).toContain('Ver método y fuentes')
  })
  it('IMC bajo con definición: mantenimiento con aviso', () => {
    const html = resultado(COMPLETO, 55)
    expect(html).toContain('Mantenimiento (déficit no disponible)')
    expect(html).toContain('IMC es inferior a 18,5')
  })
  it('menor de edad: no calculable', () => {
    expect(resultado({ ...COMPLETO, fechaNacimiento: '2015-01-01' }, 80)).toContain('adultos de 18 años')
  })
  it('cifras grandes no rompen el render', () => {
    expect(resultado({ ...COMPLETO, alturaCm: 230, objetivo: 'volumen', intensidadKcal: 600 }, 300)).toContain('kcal/día')
  })
})

describe('datos del perfil', () => {
  it('vacío: filas con «Añadir»/«Registrar»/«Elegir» y sin borrar', () => {
    const html = datos({})
    expect(html).toContain('Añadir')
    expect(html).toContain('Registrar')
    expect(html).toContain('Elegir')
    expect(html).not.toContain('Borrar datos del perfil')
  })
  it('completo: muestra edad, altura, peso con fecha, actividad y objetivo con intensidad', () => {
    const html = datos(COMPLETO, PESO)
    expect(html).toContain('30 años')
    expect(html).toContain('180 cm')
    expect(html).toContain('80 kg')
    expect(html).toContain('Moderado')
    expect(html).toContain('Definición · −400 kcal')
    expect(html).toContain('Borrar datos del perfil')
    expect(html).not.toContain('1996-10-06')
  })
})

describe('SegmentedControl vertical', () => {
  const opciones = [{ valor: 'a', label: 'Uno', descripcion: 'Primera' }, { valor: 'b', label: 'Dos', descripcion: 'Segunda' }]
  it('radiogroup con descripciones y una sola parada de teclado', () => {
    const html = renderToStaticMarkup(<SegmentedControl label="Nivel" variante="vertical" opciones={opciones} valor="b" onChange={noop} />)
    expect(html).toContain('role="radiogroup"')
    expect(html.match(/role="radio"/g)).toHaveLength(2)
    expect(html).toContain('Primera')
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
  })
  it('sin selección: ninguno marcado y el primero entra en el orden de tabulación', () => {
    const html = renderToStaticMarkup(<SegmentedControl label="Nivel" variante="vertical" opciones={opciones} valor={null} onChange={noop} />)
    expect(html).not.toContain('aria-checked="true"')
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
  })
})
