import { describe, expect, it } from 'vitest'
import type { Entry, Food } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import {
  aItemGuardado,
  actualizaAlimentoGuardado,
  decidirGuardado,
  filtrarAlimentos,
  mismosValores,
  NOMBRE_RAPIDA_POR_DEFECTO,
  por100DesdeEntrada,
  rankFrecuentes,
  revisarItems,
  validarKcalRapidas,
  type ItemRevision,
} from './alimentos'

const PLATANO: Food = {
  id: 7, nombre: 'Plátano', nombreNorm: 'platano', kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3, fuente: 'gemini', updatedAt: 0,
}
const VALORES_PLATANO = { kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3 }

describe('mismosValores', () => {
  it('tolera diferencias de redondeo por debajo de 0,05', () => {
    expect(mismosValores(VALORES_PLATANO, { ...VALORES_PLATANO, prot100: 1.13 })).toBe(true)
    expect(mismosValores(VALORES_PLATANO, { ...VALORES_PLATANO, prot100: 1.2 })).toBe(false)
  })
})

describe('por100DesdeEntrada', () => {
  it('reconstruye los valores por 100 g desde el snapshot de la entrada', () => {
    expect(por100DesdeEntrada({ gramos: 200, kcal: 330, prot: 62, carb: 0, grasa: 7.2 })).toEqual({
      kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6,
    })
  })

  it('con 0 gramos devuelve ceros en vez de NaN o Infinity', () => {
    expect(por100DesdeEntrada({ gramos: 0, kcal: 900, prot: 40, carb: 0, grasa: 0 })).toEqual({
      kcal100: 0, prot100: 0, carb100: 0, grasa100: 0,
    })
  })
})

describe('decidirGuardado', () => {
  it('crea si no existe, reutiliza si coincide y actualiza si el usuario cambió los valores', () => {
    expect(decidirGuardado(undefined, VALORES_PLATANO)).toBe('crear')
    expect(decidirGuardado(PLATANO, VALORES_PLATANO)).toBe('reutilizar')
    expect(decidirGuardado(PLATANO, { ...VALORES_PLATANO, kcal100: 95 })).toBe('actualizar')
  })
})

describe('revisarItems', () => {
  it('usa el nombre y los valores locales si el alimento ya existe, y recuerda su origen', () => {
    const [item] = revisarItems([{ nombre: 'platano', gramos: 120, kcal100: 95, prot100: 1, carb100: 23, grasa100: 0.2 }], new Map([['platano', PLATANO]]))
    expect(item).toEqual({
      nombre: 'Plátano', gramos: 120, ...VALORES_PLATANO,
      origen: { fuente: 'gemini', valores: VALORES_PLATANO, nombreNorm: 'platano', guardado: true },
    })
  })

  it('los alimentos nuevos tienen origen gemini y no guardado', () => {
    const [item] = revisarItems([{ nombre: 'Kiwi', gramos: 80, kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5 }], new Map())
    expect(item.origen).toEqual({ fuente: 'gemini', valores: { kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5 }, nombreNorm: 'kiwi', guardado: false })
  })
})

describe('aItemGuardado y actualizaAlimentoGuardado', () => {
  const [local] = revisarItems([{ nombre: 'Plátano', gramos: 120, ...VALORES_PLATANO }], new Map([['platano', PLATANO]]))
  const [nuevo] = revisarItems([{ nombre: 'Kiwi', gramos: 80, kcal100: 61, prot100: 1.1, carb100: 15, grasa100: 0.5 }], new Map())

  it('sin cambios conserva la procedencia original', () => {
    expect(aItemGuardado(nuevo).fuenteSiNuevo).toBe('gemini')
    expect(aItemGuardado(local).fuenteSiNuevo).toBe('gemini')
    expect(actualizaAlimentoGuardado(local)).toBe(false)
  })

  it('si el usuario cambia los valores, lo nuevo es manual y se avisa si afecta a un alimento guardado', () => {
    const editadoNuevo: ItemRevision = { ...nuevo, kcal100: 70 }
    const editadoLocal: ItemRevision = { ...local, kcal100: 95 }
    expect(aItemGuardado(editadoNuevo).fuenteSiNuevo).toBe('manual')
    expect(actualizaAlimentoGuardado(editadoNuevo)).toBe(false)
    expect(actualizaAlimentoGuardado(editadoLocal)).toBe(true)
  })

  it('si el usuario renombra un alimento guardado, ya no se avisa (será otro alimento)', () => {
    expect(actualizaAlimentoGuardado({ ...local, nombre: 'Plátano macho', kcal100: 120 })).toBe(false)
  })

  it('quita los espacios sobrantes del nombre', () => {
    expect(aItemGuardado({ ...nuevo, nombre: '  Kiwi  ' }).nombre).toBe('Kiwi')
  })
})

function uso(foodId: number | undefined, fecha: string, comida: Entry['comida'], createdAt = 0, extra: Partial<Entry> = {}): Entry {
  return { id: 0, fecha, comida, foodId, nombre: 'x', gramos: 100, kcal: 0, prot: 0, carb: 0, grasa: 0, createdAt, ...extra }
}

describe('rankFrecuentes (A3)', () => {
  it('pesa más los usos en la misma comida', () => {
    // El 1 se usa 2 veces en la comida; el 2, una vez en la cena → para la cena gana el 2 (3 puntos contra 2).
    const entries = [uso(1, '2026-09-27', 'comida'), uso(1, '2026-09-28', 'comida'), uso(2, '2026-09-28', 'cena')]
    expect(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' })).toEqual([2, 1])
    expect(rankFrecuentes(entries, { comida: 'comida', hoy: '2026-09-28' })).toEqual([1, 2])
  })

  it('ignora lo que queda fuera de la ventana, lo futuro y las entradas rápidas o sin alimento', () => {
    const entries = [
      uso(1, '2026-07-01', 'cena'),
      uso(2, '2026-09-29', 'cena'),
      uso(undefined, '2026-09-28', 'cena'),
      uso(3, '2026-09-28', 'cena', 0, { rapida: true }),
      uso(4, '2026-08-01', 'cena'),
    ]
    expect(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' })).toEqual([4])
    expect(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28', dias: 30 })).toEqual([])
  })

  it('en caso de empate gana el usado más recientemente', () => {
    const entries = [uso(1, '2026-09-28', 'cena', 100), uso(2, '2026-09-28', 'cena', 200)]
    expect(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' })).toEqual([2, 1])
  })
})

describe('filtrarAlimentos (A3)', () => {
  const food = (id: number, nombre: string): Food => ({ ...PLATANO, id, nombre, nombreNorm: normalizeName(nombre) })
  const foods = [food(1, 'Plátano'), food(2, 'Pan de plátano'), food(3, 'Pechuga de pollo'), food(4, 'Pollo asado')]

  it('ignora tildes y mayúsculas', () => {
    expect(filtrarAlimentos(foods, 'PLATANO').map((f) => f.id)).toEqual([1, 2])
  })

  it('exige todas las palabras en cualquier orden', () => {
    expect(filtrarAlimentos(foods, 'pollo pechuga').map((f) => f.id)).toEqual([3])
  })

  it('pone primero los que empiezan por la búsqueda', () => {
    expect(filtrarAlimentos(foods, 'pollo').map((f) => f.id)).toEqual([4, 3])
  })

  it('una búsqueda vacía no devuelve nada', () => {
    expect(filtrarAlimentos(foods, '   ')).toEqual([])
  })
})

describe('validarKcalRapidas (A5)', () => {
  const BASE = { nombre: 'Pizza fuera', kcal: 900, prot: 40, carb: 0, grasa: 0 }

  it('acepta kcal y devuelve los datos tal cual si todo es válido', () => {
    expect(validarKcalRapidas(BASE)).toEqual(BASE)
  })

  it('sin nombre, usa el valor por defecto', () => {
    expect(validarKcalRapidas({ ...BASE, nombre: '  ' })?.nombre).toBe(NOMBRE_RAPIDA_POR_DEFECTO)
  })

  it('quita los espacios sobrantes del nombre', () => {
    expect(validarKcalRapidas({ ...BASE, nombre: '  Pizza fuera  ' })?.nombre).toBe('Pizza fuera')
  })

  it('las kcal son obligatorias: 0, negativas o no numéricas son inválidas', () => {
    expect(validarKcalRapidas({ ...BASE, kcal: 0 })).toBeNull()
    expect(validarKcalRapidas({ ...BASE, kcal: -100 })).toBeNull()
    expect(validarKcalRapidas({ ...BASE, kcal: NaN })).toBeNull()
  })

  it('prot/carb/grasa son opcionales (0 por defecto) pero no pueden ser negativas', () => {
    expect(validarKcalRapidas({ ...BASE, prot: 0, carb: 0, grasa: 0 })).not.toBeNull()
    expect(validarKcalRapidas({ ...BASE, carb: -1 })).toBeNull()
  })
})
