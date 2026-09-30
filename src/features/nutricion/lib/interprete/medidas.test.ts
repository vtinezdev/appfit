import { describe, expect, it } from 'vitest'
import { catalogoMedidas, elegirMedida, gramosDeMedida, medidaAmbigua, preguntaMedida, textoOpcionMedida, textoValoresMedida } from './medidas'
import { parsearParte } from './parsear'
import { racionDe } from './raciones'

function medida(texto: string) {
  const parte = parsearParte(texto)!
  return medidaAmbigua(parte, racionDe(parte.consulta))
}

describe('medidaAmbigua', () => {
  it.each([
    ['una cucharadita de azúcar', 1, 'cucharadita', [5, 8, 10, 12]],
    ['una cucharada de miel', 1, 'cucharada', [10, 15, 20, 25]],
    ['un par de cucharadas de aceite de oliva', 2, 'cucharada', [10, 15, 20, 25]],
    ['2 cdas de crema de cacahuete', 2, 'cucharada', [10, 15, 20, 25]],
    ['media cucharadita de sal', 0.5, 'cucharadita', [5, 8, 10, 12]],
    ['un chorrito de aceite', 1, 'chorrito', [5, 10, 15, 20]],
    ['un puñado de nueces', 1, 'punado', [20, 30, 40, 50]],
    ['cucharada de cacao', 1, 'cucharada', [10, 15, 20, 25]],
    ['un vaso de leche', 1, 'vaso', [150, 200, 250, 300]],
    ['una taza de café', 1, 'taza', [150, 200, 250, 300]],
    ['un bol de cereales', 1, 'bol', [200, 300, 400, 500]],
    ['un plato de lentejas', 1, 'plato', [200, 250, 300, 400]],
    ['una ración de patatas', 1, 'racion', [100, 150, 200, 250]],
    ['una porción de pizza', 1, 'porcion', [60, 80, 100, 150]],
    ['2 rebanadas de pan', 2, 'rebanada', [20, 30, 40, 60]],
    ['un scoop de proteína', 1, 'scoop', [25, 30, 35, 40]],
    ['un cazo de lentejas', 1, 'cazo', [100, 150, 200, 250]],
    ['un trozo de queso', 1, 'trozo', [25, 50, 100, 150]],
    ['2 filetes de pollo', 2, 'filete', [100, 150, 200, 250]],
    ['una bola de helado', 1, 'bola', [40, 60, 80]],
    ['2 onzas de chocolate', 2, 'onza', [5, 7, 10]],
    ['una nuez de mantequilla', 1, 'nuez', [5, 10, 15]],
    ['una copa de vino', 1, 'copa', [100, 150, 200]],
  ])('%s → %d × %s', (texto, cantidad, unidad, opciones) => {
    expect(medida(texto)).toEqual({ cantidad, unidad, opciones })
  })

  it.each(['200 g de arroz', '2 huevos', 'una lata de atún', '3 lonchas de jamón', 'una caña de cerveza', 'un tercio de cerveza', 'una pizca de sal', 'arroz'])('%s no es ambigua', (texto) => {
    expect(medida(texto)).toBeUndefined()
  })

  it('si el alimento concreta la medida, no se pregunta', () => {
    expect(medidaAmbigua({ cantidad: 1, unidad: 'cucharada' }, { medidas: { cucharada: 14 } })).toBeUndefined()
    expect(medidaAmbigua({ cantidad: 1, unidad: 'cucharada' }, { medidas: { lata: 80 } })).toBeDefined()
  })

  it('cada medida lleva su copia de las opciones', () => {
    const a = medida('una cucharada de miel')!
    a.opciones.push(99)
    expect(medida('una cucharada de miel')!.opciones).toEqual([10, 15, 20, 25])
  })
})

describe('gramos de la medida elegida', () => {
  it('multiplica por la cantidad, redondea y nunca baja de 1 g', () => {
    expect(gramosDeMedida({ cantidad: 2 }, 15)).toBe(30)
    expect(gramosDeMedida({ cantidad: 0.5 }, 5)).toBe(3)
    expect(gramosDeMedida({ cantidad: 0.1 }, 5)).toBe(1)
  })

  it('elegir guarda la opción y da los gramos del ítem', () => {
    const m = medida('un par de cucharadas de aceite')!
    expect(elegirMedida(m, 10)).toEqual({ medida: { ...m, elegida: 10 }, gramos: 20 })
    expect(m.elegida).toBeUndefined()
  })
})

describe('catalogoMedidas', () => {
  const catalogo = catalogoMedidas()
  const de = (unidad: string) => catalogo.find((m) => m.unidad === unidad)!
  const ORDEN = ['pregunta', 'fija', 'exacta']

  it('están todas, primero las que se preguntan, luego las fijas y al final peso y volumen', () => {
    const tipos = catalogo.map((m) => ORDEN.indexOf(m.tipo))
    expect(tipos).toEqual([...tipos].sort((a, b) => a - b))
    expect(de('cucharada')).toMatchObject({ tipo: 'pregunta', opciones: [10, 15, 20, 25], formas: ['cucharada', 'cucharadas', 'cda', 'cdas'] })
    expect(de('tercio')).toMatchObject({ tipo: 'fija', gramos: 330 })
    expect(de('kg')).toMatchObject({ tipo: 'exacta', gramos: 1000 })
  })

  it('las formas se muestran con tildes', () => {
    expect(de('punado').formas[0]).toBe('puñado')
    expect(de('botellin').formas[0]).toBe('botellín')
  })

  it('incluye los pesos propios de algunos alimentos y cuándo cuenta como medida', () => {
    expect(de('lata').porAlimento).toEqual(expect.arrayContaining([{ alimento: 'atún', gramos: 60 }, { alimento: 'cerveza', gramos: 330 }]))
    expect(de('filete').condicion).toBe('Solo delante de «de»')
    expect(de('nuez').condicion).toBe('Solo delante de «de mantequilla» o «de margarina»')
    expect(de('vaso').condicion).toBeUndefined()
  })
})

describe('textos', () => {
  it('pregunta por una unidad', () => {
    expect(preguntaMedida({ unidad: 'cucharadita' })).toBe('¿Cuánto es una cucharadita?')
    expect(preguntaMedida({ unidad: 'punado' })).toBe('¿Cuánto es un puñado?')
  })

  it('los valores de la lista: todas las opciones o el peso fijo', () => {
    expect(textoValoresMedida({ opciones: [10, 15, 20, 25] })).toBe('10 · 15 · 20 · 25 g')
    expect(textoValoresMedida({ gramos: 1000 })).toBe('1.000 g')
  })

  it('la opción muestra el total si hay más de una unidad', () => {
    expect(textoOpcionMedida({ cantidad: 1 }, 5)).toBe('5 g')
    expect(textoOpcionMedida({ cantidad: 2 }, 15)).toBe('15 g × 2 = 30 g')
    expect(textoOpcionMedida({ cantidad: 0.5 }, 5)).toBe('5 g × 0,5 = 3 g')
  })
})
