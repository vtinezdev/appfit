import { describe, expect, it } from 'vitest'
import { iniciales, mismaRaiz, normalizeName, singular, tokenizar, tokensConsulta } from './text'

describe('normalizeName', () => {
  it('quita espacios sobrantes, mayúsculas y tildes', () => {
    expect(normalizeName('  Plátano de Canarias ')).toBe('platano de canarias')
    expect(normalizeName('PIÑA')).toBe('pina')
  })
  it('convierte la ñ en n (solo para comparar y buscar; el nombre mostrado no se normaliza)', () => {
    expect(normalizeName('Ñoquis')).toBe('noquis')
    expect(normalizeName('ñandú')).toBe('nandu')
  })
  it('es idempotente', () => {
    expect(normalizeName(normalizeName(' Ñoquis Café '))).toBe(normalizeName(' Ñoquis Café '))
  })
})

describe('tokenizar', () => {
  it('normaliza, separa y no repite', () => {
    expect(tokenizar('Pechuga de Pollo, a la plancha (pollo)')).toEqual(['pechuga', 'de', 'pollo', 'a', 'la', 'plancha'])
    expect(tokenizar('  ')).toEqual([])
    expect(tokenizar('Ñoquis Café')).toEqual(['noquis', 'cafe']) // como normalizeName, la ñ pasa a n
    expect(tokenizar('Straße  Smørrebrød 100%')).toEqual(['straße', 'smørrebrød', '100']) // sin tildes que quitar, no se pierde nada
  })
})

describe('tokensConsulta', () => {
  it('quita las palabras vacías pero no «sin»', () => {
    expect(tokensConsulta('Pechuga de pollo a la plancha')).toEqual(['pechuga', 'pollo', 'plancha'])
    expect(tokensConsulta('yogur sin azúcar')).toEqual(['yogur', 'sin', 'azucar'])
  })
  it('si solo hay palabras vacías, las conserva', () => {
    expect(tokensConsulta('con')).toEqual(['con'])
    expect(tokensConsulta('')).toEqual([])
  })
})

describe('singular', () => {
  it('reduce los plurales habituales a una raíz que es prefijo del singular', () => {
    expect(singular('lentejas')).toBe('lenteja')
    expect(singular('huevos')).toBe('huevo')
    expect(singular('limones')).toBe('limon')
    expect(singular('nueces')).toBe('nuez')
    expect('tomate'.startsWith(singular('tomates'))).toBe(true)
  })
  it('deja igual lo que no es plural y no acorta por debajo de 3 letras', () => {
    expect(singular('arroz')).toBe('arroz')
    expect(singular('gas')).toBe('gas')
    expect(singular('tres')).toBe('tres')
  })
  it('tokensConsulta pasa a singular y no repite', () => {
    expect(tokensConsulta('huevos y huevo')).toEqual(['huevo'])
  })
})

describe('mismaRaiz', () => {
  it('iguala la raíz aproximada de singular con la palabra completa', () => {
    expect(mismaRaiz(singular('tomates'), 'tomate')).toBe(true)
    expect(mismaRaiz('tomate', 'tomat')).toBe(true)
    expect(mismaRaiz('huevo', 'huevo')).toBe(true)
  })
  it('no confunde palabras distintas ni raíces demasiado cortas', () => {
    expect(mismaRaiz('pan', 'panceta')).toBe(false)
    expect(mismaRaiz('pera', 'perla')).toBe(false)
    expect(mismaRaiz('te', 'tea')).toBe(false)
  })
})

describe('iniciales', () => {
  it('toma la inicial de las dos primeras palabras de un nombre', () => {
    expect(iniciales('Laura Gómez')).toBe('LG')
    expect(iniciales('María Fernández de la Torre Ruiz')).toBe('MF')
    expect(iniciales('Madrugadores de Valencia')).toBe('MV')
    expect(iniciales('De la Torre')).toBe('TO')
  })
  it('separa alias por punto, guion o guion bajo y quita la arroba', () => {
    expect(iniciales('@pablo_gym')).toBe('PG')
    expect(iniciales('lucia.run')).toBe('LR')
    expect(iniciales('jon')).toBe('JO')
    expect(iniciales('jon_92')).toBe('J9')
  })
  it('conserva letras con tilde, eñe y otros alfabetos y nunca queda vacío', () => {
    expect(iniciales('ñandú')).toBe('ÑA')
    expect(iniciales('Ωmega fit')).toBe('ΩF')
    expect(iniciales('¡¡ !!')).toBe('?')
  })
})
