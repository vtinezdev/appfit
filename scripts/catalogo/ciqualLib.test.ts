import { describe, expect, it } from 'vitest'
import {
  construirAlimentos,
  construirPaquete,
  decodificarEntidades,
  entradaManifest,
  escribirCsv,
  FaltanTraducciones,
  fusionarManifest,
  limpiarNombre,
  localizarConstituyentes,
  nombresCsv,
  parsearCsv,
  parsearRegistros,
  parsearTraducciones,
  parsearValor,
  redondear1,
  versionDesdeNombre,
  type AlimentoCiqual,
} from './ciqualLib.ts'

const CONSTS = [
  { const_code: '327', const_nom_fr: 'Energie, Règlement UE N° 1169/2011 (kJ/100 g)' },
  { const_code: '328', const_nom_fr: 'Energie, Règlement UE N° 1169/2011 (kcal/100 g)' },
  { const_code: '333', const_nom_fr: 'Energie, N x facteur Jones, avec fibres (kcal/100 g)' },
  { const_code: '10004', const_nom_fr: 'Sel chlorure de sodium (g/100 g)' },
  { const_code: '25000', const_nom_fr: 'Protéines, N x facteur de Jones (g/100 g)' },
  { const_code: '25003', const_nom_fr: 'Protéines, N x 6.25 (g/100 g)' },
  { const_code: '31000', const_nom_fr: 'Glucides (g/100 g)' },
  { const_code: '32000', const_nom_fr: 'Sucres (g/100 g)' },
  { const_code: '34100', const_nom_fr: 'Fibres alimentaires (g/100 g)' },
  { const_code: '40000', const_nom_fr: 'Lipides (g/100 g)' },
  { const_code: '40302', const_nom_fr: 'AG saturés (g/100 g)' },
  { const_code: '40303', const_nom_fr: 'AG monoinsaturés (g/100 g)' },
]

const alim = (code: string, grp = '02') => ({
  alim_code: code,
  alim_nom_fr: `Nom ${code}`,
  alim_nom_eng: `Name ${code}`,
  alim_grp_code: grp,
})
const compo = (alim_code: string, const_code: string, teneur: string) => ({ alim_code, const_code, teneur })

describe('parsearValor', () => {
  it('lee coma decimal y enteros', () => {
    expect(parsearValor('12,5')).toBe(12.5)
    expect(parsearValor(' 274 ')).toBe(274)
    expect(parsearValor('0')).toBe(0)
  })
  it('vacío o «-» es desconocido', () => {
    expect(parsearValor('')).toBeUndefined()
    expect(parsearValor(' - ')).toBeUndefined()
    expect(parsearValor(undefined)).toBeUndefined()
  })
  it('«traces» vale 0', () => {
    expect(parsearValor('traces')).toBe(0)
    expect(parsearValor(' Traces ')).toBe(0)
  })
  it('«< x» vale x / 2 (punto medio bajo el límite de cuantificación)', () => {
    expect(parsearValor('< 0,5')).toBe(0.25)
    expect(parsearValor('<2')).toBe(1)
  })
  it('texto no numérico es desconocido', () => {
    expect(parsearValor('n/d')).toBeUndefined()
  })
})

describe('redondear1', () => {
  it('redondea a 1 decimal', () => {
    expect(redondear1(1.26)).toBe(1.3)
    expect(redondear1(0.04)).toBe(0)
    expect(redondear1(274)).toBe(274)
  })
})

describe('XML', () => {
  it('decodifica entidades', () => {
    expect(decodificarEntidades('Jus d&apos;orange &amp; &lt; &#233;&#xE9;')).toBe("Jus d'orange & < éé")
  })
  it('parsea registros con hijos hoja, autocerrados y espacios', () => {
    const xml = `<?xml version="1.0"?><TABLE>
      <ALIM><alim_code> 1000 </alim_code><alim_nom_fr> Jus d&apos;ananas </alim_nom_fr><alim_nom_sci missing=" " /></ALIM>
      <ALIM><alim_code> 1001 </alim_code><alim_nom_fr> Gin </alim_nom_fr></ALIM>
      <OTRO><alim_code> 9 </alim_code></OTRO>
    </TABLE>`
    expect(parsearRegistros(xml, 'ALIM')).toEqual([
      { alim_code: '1000', alim_nom_fr: "Jus d'ananas", alim_nom_sci: '' },
      { alim_code: '1001', alim_nom_fr: 'Gin' },
    ])
  })
  it('decodifica «&lt; 0,5» de las teneurs', () => {
    const [r] = parsearRegistros('<COMPO><teneur> &lt; 0,5 </teneur></COMPO>', 'COMPO')
    expect(parsearValor(r.teneur)).toBe(0.25)
  })
})

describe('localizarConstituyentes', () => {
  it('busca por nombre, no por posición, y no confunde variantes', () => {
    const cods = localizarConstituyentes(
      [...CONSTS].reverse().map((c) => ({ code: c.const_code, nombreFr: c.const_nom_fr })),
    )
    expect(cods).toEqual({
      kcal: '328',
      prot: '25000',
      carb: '31000',
      grasa: '40000',
      fibra: '34100',
      azucares: '32000',
      sal: '10004',
      agSat: '40302',
    })
  })
  it('falla si falta uno', () => {
    const sin = CONSTS.filter((c) => c.const_code !== '34100').map((c) => ({
      code: c.const_code,
      nombreFr: c.const_nom_fr,
    }))
    expect(() => localizarConstituyentes(sin)).toThrow(/fibra/)
  })
})

describe('limpiarNombre', () => {
  it('colapsa espacios y saltos de línea', () => {
    expect(limpiarNombre(' a\r\n  b ')).toBe('a b')
  })
})

describe('construirAlimentos', () => {
  const base = (code: string) => [
    compo(code, '328', '52'),
    compo(code, '25000', '0,9'),
    compo(code, '31000', '11,04'),
    compo(code, '40000', '< 0,5'),
  ]

  it('construye un alimento completo, con extras y valores redondeados', () => {
    const r = construirAlimentos({
      alim: [alim('1', '04')],
      consts: CONSTS,
      compo: [
        ...base('1'),
        compo('1', '34100', '1,26'),
        compo('1', '32000', '9'),
        compo('1', '10004', 'traces'),
        compo('1', '40302', '0,04'),
      ],
    })
    expect(r.descartados).toBe(0)
    expect(r.alimentos).toEqual([
      {
        code: '1',
        nombreFr: 'Nom 1',
        nombreEn: 'Name 1',
        grupoCodigo: '04',
        categoria: 'Carnes, huevos y pescados',
        kcal: 52,
        prot: 0.9,
        carb: 11,
        grasa: 0.3, // 0,25 redondeado
        nutrientes: { fibra: 1.3, azucares: 9, sal: 0, agSat: 0 },
        completitud: 1,
      },
    ])
  })

  it('sin extras: no hay `nutrientes` y la completitud es 4/8', () => {
    const [a] = construirAlimentos({ alim: [alim('2')], consts: CONSTS, compo: base('2') }).alimentos
    expect(a.nutrientes).toBeUndefined()
    expect(a.completitud).toBe(0.5)
  })

  it('un extra desconocido («-») no aparece; 0 sí', () => {
    const [a] = construirAlimentos({
      alim: [alim('3')],
      consts: CONSTS,
      compo: [...base('3'), compo('3', '34100', '-'), compo('3', '32000', '0')],
    }).alimentos
    expect(a.nutrientes).toEqual({ azucares: 0 })
    expect(a.completitud).toBe(5 / 8)
  })

  it('descarta y cuenta los que no tienen kcal/prot/carb/grasa', () => {
    const r = construirAlimentos({
      alim: [alim('1'), alim('2'), alim('3'), alim('4')],
      consts: CONSTS,
      compo: [
        ...base('1'),
        ...base('2').filter((c) => c.const_code !== '328'), // sin kcal
        compo('2', '333', '50'), // la energía de Jones NO sustituye a la del Reglamento
        ...base('3').map((c) => (c.const_code === '31000' ? compo('3', '31000', '-') : c)),
        // '4' no tiene composición
      ],
    })
    expect(r.alimentos.map((a) => a.code)).toEqual(['1'])
    expect(r.descartados).toBe(3)
    expect(r.codigosDescartados).toEqual(['2', '3', '4'])
  })

  it('ordena por código numérico', () => {
    const r = construirAlimentos({
      alim: [alim('10'), alim('9')],
      consts: CONSTS,
      compo: [...base('10'), ...base('9')],
    })
    expect(r.alimentos.map((a) => a.code)).toEqual(['9', '10'])
  })

  it('falla con un grupo desconocido', () => {
    expect(() =>
      construirAlimentos({ alim: [alim('1', '99')], consts: CONSTS, compo: base('1') }),
    ).toThrow(/99/)
  })
})

describe('CSV', () => {
  it('parsea comillas, separador y comillas escapadas dentro de comillas', () => {
    expect(parsearCsv('a;"b;c";"d ""e"""\n1;2;3\n')).toEqual([
      ['a', 'b;c', 'd "e"'],
      ['1', '2', '3'],
    ])
  })
  it('soporta CRLF, BOM, saltos dentro de comillas y campos vacíos', () => {
    expect(parsearCsv('﻿a;b;c\r\nx;;"l1\nl2"\r\n\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['x', '', 'l1\nl2'],
    ])
  })
  it('falla con comillas sin cerrar', () => {
    expect(() => parsearCsv('a;"b')).toThrow(/comillas/)
  })
  it('escribir y parsear son inversos', () => {
    const filas = [['x', 'a;b', 'c"d', 'e\nf', '']]
    expect(escribirCsv(filas)).toBe('x;"a;b";"c""d";"e\nf";\n')
    expect(parsearCsv(escribirCsv(filas))).toEqual(filas)
  })
})

const A = (code: string, extra: Partial<AlimentoCiqual> = {}): AlimentoCiqual => ({
  code,
  nombreFr: `Fr ${code}`,
  nombreEn: `En ${code}`,
  grupoCodigo: '05',
  categoria: 'Lácteos',
  kcal: 60,
  prot: 3,
  carb: 5,
  grasa: 3,
  completitud: 0.5,
  ...extra,
})

describe('nombresCsv', () => {
  it('los nombres con saltos de línea salen en una sola línea física', () => {
    const csv = nombresCsv([A('1', { nombreFr: 'Pain', nombreEn: 'Bread,\r\n  white' })])
    expect(csv).toBe('code;nombre_fr;nombre_en;grupo\n1;Pain;Bread, white;Lácteos\n')
  })
  it('genera code;nombre_fr;nombre_en;grupo con comillas donde hacen falta', () => {
    const csv = nombresCsv([A('1', { nombreFr: 'Pain; blanc', nombreEn: 'Bread "white"' })])
    expect(csv).toBe('code;nombre_fr;nombre_en;grupo\n1;"Pain; blanc";"Bread ""white""";Lácteos\n')
  })
})

describe('parsearTraducciones', () => {
  it('lee nombre y alias (opcionales, separados por |), por nombre de columna', () => {
    const t = parsearTraducciones('nombre_es;code;alias\n"Leche; entera";1;leche|"vaca"\nPan;2;\nAgua;3;  \n')
    expect(t.get('1')).toEqual({ nombreEs: 'Leche; entera', alias: ['leche', 'vaca'] })
    expect(t.get('2')).toEqual({ nombreEs: 'Pan', alias: [] })
    expect(t.get('3')?.alias).toEqual([])
  })
  it('la columna alias es opcional', () => {
    expect(parsearTraducciones('code;nombre_es\n1;Pan\n').get('1')).toEqual({ nombreEs: 'Pan', alias: [] })
  })
  it('falla sin columnas obligatorias o con códigos repetidos', () => {
    expect(() => parsearTraducciones('code;otro\n1;x\n')).toThrow(/nombre_es/)
    expect(() => parsearTraducciones('code;nombre_es\n1;a\n1;b\n')).toThrow(/duplicado/)
  })
})

describe('construirPaquete', () => {
  const trad = (o: Record<string, [string, string[]]>) =>
    new Map(Object.entries(o).map(([k, [nombreEs, alias]]) => [k, { nombreEs, alias }]))

  it('construye filas con nutrientes y alias opcionales', () => {
    const { paquete, sobrantes } = construirPaquete(
      [A('1'), A('2', { nutrientes: { fibra: 1 } }), A('3'), A('4', { nutrientes: { sal: 0.5 } })],
      trad({
        '1': ['Leche', []],
        '2': ['Yogur', []],
        '3': ['Queso', ['formatge']], // alias sin nutrientes → `{}`
        '4': ['Nata', ['crema']],
        '99': ['Sobra', []],
      }),
      '2025-es1',
    )
    expect(paquete).toEqual({
      formato: 1,
      fuente: 'ciqual',
      version: '2025-es1',
      filas: [
        ['1', 'Leche', 'Fr 1', 'Lácteos', 60, 3, 5, 3],
        ['2', 'Yogur', 'Fr 2', 'Lácteos', 60, 3, 5, 3, { fibra: 1 }],
        ['3', 'Queso', 'Fr 3', 'Lácteos', 60, 3, 5, 3, {}, ['formatge']],
        ['4', 'Nata', 'Fr 4', 'Lácteos', 60, 3, 5, 3, { sal: 0.5 }, ['crema']],
      ],
    })
    expect(sobrantes).toEqual(['99'])
  })

  it('falla con la lista de códigos sin traducción (ausentes o con nombre vacío)', () => {
    try {
      construirPaquete([A('1'), A('2'), A('3')], trad({ '1': ['Leche', []], '3': ['', []] }), 'v')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(FaltanTraducciones)
      expect((e as FaltanTraducciones).codigos).toEqual(['2', '3'])
      expect((e as Error).message).toContain('2, 3')
    }
  })
})

describe('manifest', () => {
  it('describe la fuente con atribución ANSES y versión', () => {
    const paquete = { formato: 1 as const, fuente: 'ciqual' as const, version: '2025-es1', filas: [] }
    const e = entradaManifest(paquete, 'ciqual-2025-es1.json', '2025')
    expect(e).toMatchObject({ id: 'ciqual', version: '2025-es1', archivo: 'ciqual-2025-es1.json', filas: 0 })
    expect(e.atribucion).toContain('ANSES')
    expect(e.atribucion).toContain('Ciqual 2025')
    expect(e.atribucion).toContain('traducidos al español')
  })
  it('fusiona sustituyendo la misma fuente y conservando las demás', () => {
    const e = (id: string, version: string) => ({ id, version, archivo: 'a', filas: 1, licencia: 'l', atribucion: 'x' })
    const m = fusionarManifest({ formato: 1, fuentes: [e('ciqual', 'v1'), e('otra', 'v9')] }, e('ciqual', 'v2'))
    expect(m.fuentes.map((f) => `${f.id}:${f.version}`)).toEqual(['otra:v9', 'ciqual:v2'])
    expect(fusionarManifest(undefined, e('ciqual', 'v1')).fuentes).toHaveLength(1)
  })
})

describe('versionDesdeNombre', () => {
  it('extrae el año', () => {
    expect(versionDesdeNombre('alim_2025_11_03.xml')).toBe('2025')
    expect(versionDesdeNombre('otra.xml')).toBeUndefined()
  })
})
