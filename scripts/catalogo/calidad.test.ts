import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  alimentosDePaquete,
  energiaEsperada,
  formatearInforme,
  normalizar,
  validarAlimento,
  validarConjunto,
  validarPaquetePublicado,
  type AlimentoCalidad,
  type PaqueteCalidad,
} from './calidad.ts'
import { validarCatalogoPublicado } from './validar.ts'

/** Un alimento correcto: 60 kcal = 4·3 + 4·5 + 9·3 + 2·0,5 = 60. */
const ok = (extra: Partial<AlimentoCalidad> = {}): AlimentoCalidad => ({
  id: 'ciqual:1',
  nombre: 'Leche entera',
  kcal: 60,
  prot: 3,
  carb: 5,
  grasa: 3,
  fibra: 0.5,
  ...extra,
})

const reglas = (a: AlimentoCalidad, tipo: 'generico' | 'marca' = 'generico') => {
  const r = validarAlimento(a, tipo)
  return { errores: r.errores.map((h) => h.regla), avisos: r.avisos.map((h) => h.regla) }
}

describe('validarAlimento: errores', () => {
  it('un alimento correcto no da ni errores ni avisos', () => {
    expect(reglas(ok())).toEqual({ errores: [], avisos: [] })
  })
  it('nombre e id vacíos', () => {
    expect(reglas(ok({ nombre: '  ' })).errores).toContain('nombre-vacio')
    expect(reglas(ok({ id: '' })).errores).toContain('id-vacio')
  })
  it('valores no finitos o negativos', () => {
    expect(reglas(ok({ kcal: Number.NaN })).errores).toEqual(['numero-invalido'])
    expect(reglas(ok({ prot: -1 })).errores).toEqual(['numero-invalido'])
    expect(reglas(ok({ sal: Infinity })).errores).toEqual(['numero-invalido'])
  })
  it('kcal por encima de 900', () => {
    expect(reglas(ok({ kcal: 901, grasa: 100, prot: 0, carb: 0 })).errores).toContain('kcal-excesiva')
    expect(reglas(ok({ kcal: 900, grasa: 100, prot: 0, carb: 0, fibra: 0 })).errores).toEqual([])
  })
  it('macro por encima de 100 y suma de macros por encima de 101', () => {
    expect(reglas(ok({ prot: 101 })).errores).toContain('macro-excesivo')
    expect(reglas(ok({ prot: 40, carb: 40, grasa: 22, kcal: 60 })).errores).toContain('macros-suman-mas-de-100')
    expect(reglas(ok({ prot: 40, carb: 40, grasa: 21, kcal: 60 })).errores).not.toContain('macros-suman-mas-de-100')
  })
  it('sal por encima de 100', () => {
    expect(reglas(ok({ sal: 100.5 })).errores).toContain('sal-excesiva')
  })
  it('azúcares por encima de los hidratos (+0,5) y saturadas por encima de la grasa (+0,5)', () => {
    expect(reglas(ok({ azucares: 5.6 })).errores).toContain('azucares-mayor-que-carb')
    expect(reglas(ok({ azucares: 5.5 })).errores).not.toContain('azucares-mayor-que-carb')
    expect(reglas(ok({ agSat: 3.6 })).errores).toContain('agsat-mayor-que-grasa')
    expect(reglas(ok({ agSat: 3.5 })).errores).not.toContain('agsat-mayor-que-grasa')
  })
  it('ml en un genérico es un error; en un producto de marca no', () => {
    expect(reglas(ok({ ml: true }), 'generico').errores).toContain('ml-en-generico')
    expect(reglas(ok({ ml: true, marca: 'X' }), 'marca').errores).toEqual([])
  })
})

describe('validarAlimento: coherencia energética (solo aviso)', () => {
  it('esperado = 4P + 4C + 9G + 2·fibra (+ 7·alcohol)', () => {
    expect(energiaEsperada(ok())).toBe(60)
    expect(energiaEsperada(ok({ alcohol: 4 }))).toBe(88)
  })
  it('avisa si la diferencia supera max(15 kcal, 20 %)', () => {
    expect(reglas(ok({ kcal: 76 })).avisos).toEqual(['energia-incoherente']) // +16 > 15
    expect(reglas(ok({ kcal: 75 })).avisos).toEqual([]) // +15 no supera
    expect(reglas(ok({ kcal: 300, prot: 20, carb: 30, grasa: 10, fibra: 0 })).avisos).toEqual([]) // esperado 290
    expect(reglas(ok({ kcal: 300, prot: 20, carb: 10, grasa: 10, fibra: 0 })).avisos).toEqual(['energia-incoherente']) // 210 vs 300: +90 > 60
  })
  it('el alcohol explica la energía de una cerveza', () => {
    const cerveza = ok({ kcal: 43, prot: 0.4, carb: 3.6, grasa: 0, fibra: 0, alcohol: 3.7 })
    expect(reglas(cerveza).avisos).toEqual([])
    expect(reglas({ ...cerveza, alcohol: undefined }).avisos).toEqual(['energia-incoherente'])
  })
  it('el aviso no cambia los valores (solo informa)', () => {
    const a = ok({ kcal: 200 })
    validarAlimento(a, 'generico')
    expect(a.kcal).toBe(200)
  })
})

describe('validarConjunto', () => {
  it('detecta ids repetidos', () => {
    const r = validarConjunto([ok(), ok({ nombre: 'Otra cosa' })], 'generico')
    expect(r.errores.map((h) => h.regla)).toContain('id-repetido')
  })
  it('mismo nombre normalizado: valores distintos o iguales, ambos son error (mayúsculas y tildes no cuentan)', () => {
    const distintos = validarConjunto([ok(), ok({ id: 'ciqual:2', nombre: 'LECHE  entera', kcal: 61 })], 'generico')
    expect(distintos.errores.map((h) => h.regla)).toEqual(['nombre-repetido-valores-distintos'])
    const iguales = validarConjunto([ok(), ok({ id: 'ciqual:2', nombre: 'leche entera' })], 'generico')
    expect(iguales.errores.map((h) => h.regla)).toEqual(['nombre-repetido-mismos-valores'])
    const tildes = validarConjunto([ok({ nombre: 'Plátano' }), ok({ id: 'ciqual:2', nombre: 'Platano' })], 'generico')
    expect(tildes.errores).toHaveLength(1)
  })
  it('el mismo nombre con marcas distintas no es un duplicado', () => {
    const r = validarConjunto(
      [ok({ id: 'offes:1', marca: 'Hacendado' }), ok({ id: 'offes:2', marca: 'Dia' })],
      'marca',
    )
    expect(r.errores).toEqual([])
    const igualMarca = validarConjunto([ok({ id: 'offes:1', marca: 'Dia' }), ok({ id: 'offes:2', marca: 'DIA' })], 'marca')
    expect(igualMarca.errores).toHaveLength(1)
  })
  it('acumula los hallazgos de cada alimento', () => {
    const r = validarConjunto([ok({ kcal: 999 }), ok({ id: 'ciqual:2', nombre: 'B', sal: 200 })], 'generico')
    expect(r.errores.map((h) => h.id)).toEqual(expect.arrayContaining(['ciqual:1', 'ciqual:2']))
  })
})

describe('normalizar', () => {
  it('minúsculas, sin tildes y sin espacios sobrantes', () => {
    expect(normalizar('  ÁRBOL   de  Ñu ')).toBe('arbol de nu')
  })
})

describe('formatearInforme', () => {
  it('lista errores y avisos con su regla, sin fecha (determinista)', () => {
    const txt = formatearInforme({
      fuente: 'ciqual',
      version: 'v',
      total: 2,
      resumen: ['Ocultos: 1'],
      errores: [],
      avisos: [{ id: 'ciqual:1', nombre: 'Leche', regla: 'energia-incoherente', detalle: 'x' }],
      faltantes: { fibra: 3 },
    })
    expect(txt).toContain('Alimentos publicados: 2')
    expect(txt).toContain('ERRORES: 0')
    expect(txt).toContain('AVISOS: 1')
    expect(txt).toContain('ciqual:1\tLeche\t[energia-incoherente] x')
    expect(txt).toContain('fibra: 3')
  })
})

// ───────────────────────── Paquetes publicados ─────────────────────────

const leerPublicado = (archivo: string) =>
  JSON.parse(readFileSync(new URL(`../../public/catalogo/${archivo}`, import.meta.url), 'utf8')) as PaqueteCalidad

describe('paquetes publicados en public/catalogo', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../public/catalogo/manifest.json', import.meta.url), 'utf8')) as {
    fuentes: { id: string; archivo: string }[]
  }

  it('hay al menos CIQUAL y la selección de OFF España', () => {
    expect(manifest.fuentes.map((f) => f.id).sort()).toEqual(['ciqual', 'offes'])
  })

  for (const fuente of ['ciqual', 'offes']) {
    describe(fuente, () => {
      const p = leerPublicado(manifest.fuentes.find((f) => f.id === fuente)!.archivo)

      it('formato 2, sin errores de calidad', () => {
        expect(p.formato).toBe(2)
        expect(validarPaquetePublicado(p).errores).toEqual([])
      })
      it('ids únicos y ningún nombre repetido (mismo nombre + marca)', () => {
        const ids = p.filas.map((f) => f[0])
        expect(new Set(ids).size).toBe(ids.length)
        const claves = alimentosDePaquete(p).map((a) => `${normalizar(a.nombre)}|${normalizar(a.marca ?? '')}`)
        expect(new Set(claves).size).toBe(claves.length)
      })
      it('valores válidos: sin negativos, sin nombres vacíos y con categoría', () => {
        for (const f of p.filas) {
          expect(f[1].trim(), f[0]).not.toBe('')
          expect(f[3], f[0]).not.toBe('')
          for (const n of [f[4], f[5], f[6], f[7]]) expect(n >= 0 && Number.isFinite(n), f[0]).toBe(true)
        }
      })
    })
  }

  it('el paquete de marca no trae avisos (los avisos excluyen el producto al construir)', () => {
    const p = leerPublicado(manifest.fuentes.find((f) => f.id === 'offes')!.archivo)
    expect(validarPaquetePublicado(p).avisos).toEqual([])
  })

  it('validarCatalogoPublicado (el CLI de `npm run catalogo:validar`) da 0 problemas', () => {
    const r = validarCatalogoPublicado()
    expect(r.filter((x) => x.errores > 0).map((x) => x.linea)).toEqual([])
    expect(r).toHaveLength(2)
  })
})
