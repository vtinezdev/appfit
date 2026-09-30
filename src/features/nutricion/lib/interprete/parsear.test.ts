import { describe, expect, it } from 'vitest'
import { parsear, parsearParte } from './parsear'

/** Lo esencial de cada parte, para que el corpus se lea de un vistazo. */
function resumen(texto: string) {
  return parsear(texto).map(({ cantidad, unidad, nombre, consulta }) => ({ cantidad, unidad, nombre, consulta }))
}

describe('parsear: corpus de frases típicas', () => {
  it.each<[string, { cantidad?: number; unidad?: string; nombre: string; consulta: string }[]]>([
    // La frase de referencia
    ['200 g de arroz, 2 huevos y un plátano', [
      { cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' },
      { cantidad: 2, unidad: undefined, nombre: 'huevos', consulta: 'huevo' },
      { cantidad: 1, unidad: undefined, nombre: 'plátano', consulta: 'platano' },
    ]],
    // Unidades pegadas y en palabras (el dictado de iOS escribe «200 gramos»)
    ['200g de pechuga de pollo', [{ cantidad: 200, unidad: 'g', nombre: 'pechuga de pollo', consulta: 'pechuga pollo' }]],
    ['200 gramos de arroz', [{ cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' }]],
    ['150gr de salmón', [{ cantidad: 150, unidad: 'g', nombre: 'salmón', consulta: 'salmon' }]],
    ['1,5 kg de patatas', [{ cantidad: 1.5, unidad: 'kg', nombre: 'patatas', consulta: 'patata' }]],
    ['0.5 kg de ternera', [{ cantidad: 0.5, unidad: 'kg', nombre: 'ternera', consulta: 'ternera' }]],
    ['250 ml de leche', [{ cantidad: 250, unidad: 'ml', nombre: 'leche', consulta: 'leche' }]],
    ['33cl de cerveza', [{ cantidad: 33, unidad: 'cl', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['medio litro de leche', [{ cantidad: 0.5, unidad: 'l', nombre: 'leche', consulta: 'leche' }]],
    ['medio kilo de fresas', [{ cantidad: 0.5, unidad: 'kg', nombre: 'fresas', consulta: 'fresa' }]],
    ['un cuarto de kilo de carne picada', [{ cantidad: 0.25, unidad: 'kg', nombre: 'carne picada', consulta: 'carne picada' }]],
    ['1 kilo y medio de patatas', [{ cantidad: 1.5, unidad: 'kg', nombre: 'patatas', consulta: 'patata' }]],
    // Fracciones
    ['1/2 aguacate', [{ cantidad: 0.5, unidad: undefined, nombre: 'aguacate', consulta: 'aguacate' }]],
    ['½ aguacate', [{ cantidad: 0.5, unidad: undefined, nombre: 'aguacate', consulta: 'aguacate' }]],
    ['medio aguacate', [{ cantidad: 0.5, unidad: undefined, nombre: 'aguacate', consulta: 'aguacate' }]],
    ['media manzana', [{ cantidad: 0.5, unidad: undefined, nombre: 'manzana', consulta: 'manzana' }]],
    ['1 y medio plátanos', [{ cantidad: 1.5, unidad: undefined, nombre: 'plátanos', consulta: 'platano' }]],
    // Números con letras
    ['dos huevos', [{ cantidad: 2, unidad: undefined, nombre: 'huevos', consulta: 'huevo' }]],
    ['tres tostadas', [{ cantidad: 3, unidad: undefined, nombre: 'tostadas', consulta: 'tostada' }]],
    ['doce almendras', [{ cantidad: 12, unidad: undefined, nombre: 'almendras', consulta: 'almendra' }]],
    ['un par de huevos', [{ cantidad: 2, unidad: undefined, nombre: 'huevos', consulta: 'huevo' }]],
    ['media docena de fresas', [{ cantidad: 6, unidad: undefined, nombre: 'fresas', consulta: 'fresa' }]],
    ['una manzana', [{ cantidad: 1, unidad: undefined, nombre: 'manzana', consulta: 'manzana' }]],
    // Medidas caseras
    ['un vaso de leche', [{ cantidad: 1, unidad: 'vaso', nombre: 'leche', consulta: 'leche' }]],
    ['vaso de zumo de naranja', [{ cantidad: 1, unidad: 'vaso', nombre: 'zumo de naranja', consulta: 'zumo naranja' }]],
    ['2 cucharadas de aceite de oliva', [{ cantidad: 2, unidad: 'cucharada', nombre: 'aceite de oliva', consulta: 'aceite oliva' }]],
    ['una cucharadita de azúcar', [{ cantidad: 1, unidad: 'cucharadita', nombre: 'azúcar', consulta: 'azucar' }]],
    ['un par de cucharadas de miel', [{ cantidad: 2, unidad: 'cucharada', nombre: 'miel', consulta: 'miel' }]],
    ['2 rebanadas de pan integral', [{ cantidad: 2, unidad: 'rebanada', nombre: 'pan integral', consulta: 'pan integral' }]],
    ['un puñado de nueces', [{ cantidad: 1, unidad: 'punado', nombre: 'nueces', consulta: 'nuez' }]],
    ['una lata de atún', [{ cantidad: 1, unidad: 'lata', nombre: 'atún', consulta: 'atun' }]],
    ['3 lonchas de jamón', [{ cantidad: 3, unidad: 'loncha', nombre: 'jamón', consulta: 'jamon' }]],
    ['una taza de café con leche', [{ cantidad: 1, unidad: 'taza', nombre: 'café con leche', consulta: 'cafe leche' }]],
    ['un scoop de proteína', [{ cantidad: 1, unidad: 'scoop', nombre: 'proteína', consulta: 'proteina' }]],
    ['un cacito de proteína', [{ cantidad: 1, unidad: 'scoop', nombre: 'proteína', consulta: 'proteina' }]],
    ['un cazo de lentejas', [{ cantidad: 1, unidad: 'cazo', nombre: 'lentejas', consulta: 'lenteja' }]],
    ['2 cucharones de caldo', [{ cantidad: 2, unidad: 'cazo', nombre: 'caldo', consulta: 'caldo' }]],
    ['un bol de cereales', [{ cantidad: 1, unidad: 'bol', nombre: 'cereales', consulta: 'cereal' }]],
    ['un tazón de leche', [{ cantidad: 1, unidad: 'bol', nombre: 'leche', consulta: 'leche' }]],
    ['una ración de patatas', [{ cantidad: 1, unidad: 'racion', nombre: 'patatas', consulta: 'patata' }]],
    ['2 porciones de pizza', [{ cantidad: 2, unidad: 'porcion', nombre: 'pizza', consulta: 'pizza' }]],
    ['un chorrito de aceite', [{ cantidad: 1, unidad: 'chorrito', nombre: 'aceite', consulta: 'aceite' }]],
    ['un plato de lentejas', [{ cantidad: 1, unidad: 'plato', nombre: 'lentejas', consulta: 'lenteja' }]],
    // Medidas que también son alimento: solo delante de «de»
    ['un trozo de queso', [{ cantidad: 1, unidad: 'trozo', nombre: 'queso', consulta: 'queso' }]],
    ['2 pedazos de tortilla', [{ cantidad: 2, unidad: 'trozo', nombre: 'tortilla', consulta: 'tortilla' }]],
    ['un filete de pollo', [{ cantidad: 1, unidad: 'filete', nombre: 'pollo', consulta: 'pollo' }]],
    ['filete empanado', [{ cantidad: undefined, unidad: undefined, nombre: 'filete empanado', consulta: 'filete empanado' }]],
    ['2 bolas de helado', [{ cantidad: 2, unidad: 'bola', nombre: 'helado', consulta: 'helado' }]],
    ['3 onzas de chocolate', [{ cantidad: 3, unidad: 'onza', nombre: 'chocolate', consulta: 'chocolate' }]],
    ['una copa de vino', [{ cantidad: 1, unidad: 'copa', nombre: 'vino', consulta: 'vino' }]],
    ['una caña de cerveza', [{ cantidad: 1, unidad: 'cana', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['un tercio de cerveza', [{ cantidad: 1, unidad: 'tercio', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['un botellín de cerveza', [{ cantidad: 1, unidad: 'botellin', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['una jarra de cerveza', [{ cantidad: 1, unidad: 'jarra', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['un quinto de cerveza', [{ cantidad: 1, unidad: 'quinto', nombre: 'cerveza', consulta: 'cerveza' }]],
    ['una pizca de sal', [{ cantidad: 1, unidad: 'pizca', nombre: 'sal', consulta: 'sal' }]],
    ['una nuez de mantequilla', [{ cantidad: 1, unidad: 'nuez', nombre: 'mantequilla', consulta: 'mantequilla' }]],
    ['una nuez', [{ cantidad: 1, unidad: undefined, nombre: 'nuez', consulta: 'nuez' }]],
    ['2 nueces de macadamia', [{ cantidad: 2, unidad: undefined, nombre: 'nueces de macadamia', consulta: 'nuez macadamia' }]],
    ['una nuez de macadamia', [{ cantidad: 1, unidad: undefined, nombre: 'nuez de macadamia', consulta: 'nuez macadamia' }]],
    ['2 unidades de kiwi', [{ cantidad: 2, unidad: undefined, nombre: 'kiwi', consulta: 'kiwi' }]],
    // Cantidad al final
    ['arroz 200 g', [{ cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' }]],
    ['arroz 200g', [{ cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' }]],
    ['arroz (200 g)', [{ cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' }]],
    ['huevos 2', [{ cantidad: 2, unidad: undefined, nombre: 'huevos', consulta: 'huevo' }]],
    // Un número grande sin unidad son gramos
    ['arroz 200', [{ cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' }]],
    ['150 de pollo', [{ cantidad: 150, unidad: 'g', nombre: 'pollo', consulta: 'pollo' }]],
    // Sin cantidad
    ['arroz', [{ cantidad: undefined, unidad: undefined, nombre: 'arroz', consulta: 'arroz' }]],
    // «con» no separa: es un plato
    ['arroz con pollo', [{ cantidad: undefined, unidad: undefined, nombre: 'arroz con pollo', consulta: 'arroz pollo' }]],
    ['300 g de arroz con pollo', [{ cantidad: 300, unidad: 'g', nombre: 'arroz con pollo', consulta: 'arroz pollo' }]],
  ])('%s', (texto, esperado) => {
    expect(resumen(texto)).toEqual(esperado)
  })
})

describe('parsear: separadores', () => {
  it('coma, punto y coma, «+», salto de línea, punto seguido e «y»', () => {
    expect(parsear('arroz; pollo + tomate\nlechuga. pan y queso e higos').map((p) => p.consulta)).toEqual([
      'arroz', 'pollo', 'tomate', 'lechuga', 'pan', 'queso', 'higo',
    ])
  })

  it('la coma decimal no separa', () => {
    expect(parsear('1,5 kg de patatas, 2 huevos').map((p) => p.cantidad)).toEqual([1.5, 2])
  })

  it('«y medio» no separa', () => {
    expect(parsear('1 kilo y medio de patatas y 2 huevos').map((p) => [p.cantidad, p.consulta])).toEqual([[1.5, 'patata'], [2, 'huevo']])
  })

  it('descarta trozos vacíos o sin alimento', () => {
    expect(parsear(' , 200 g, , arroz,')).toEqual([expect.objectContaining({ consulta: 'arroz' })])
    expect(parsear('')).toEqual([])
    expect(parsear('   ')).toEqual([])
  })

  it('mayúsculas y punto final del dictado', () => {
    expect(resumen('Dos huevos y 200 gramos de arroz.')).toEqual([
      { cantidad: 2, unidad: undefined, nombre: 'huevos', consulta: 'huevo' },
      { cantidad: 200, unidad: 'g', nombre: 'arroz', consulta: 'arroz' },
    ])
  })
})

describe('parsearParte', () => {
  it('conserva el texto original del trozo', () => {
    expect(parsearParte('  2 Huevos ')?.texto).toBe('2 Huevos')
  })

  it('una unidad de peso sin número no se entiende como cantidad', () => {
    const parte = parsearParte('g de arroz')
    expect(parte?.cantidad).toBeUndefined()
    expect(parte?.unidad).toBeUndefined()
  })

  it('una fracción con denominador 0 no es un número', () => {
    expect(parsearParte('1/0 manzana')?.cantidad).toBeUndefined()
  })
})
