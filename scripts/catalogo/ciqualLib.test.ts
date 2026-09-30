import { describe, expect, it } from 'vitest'
import {
  aAlimentosCalidad,
  CATEGORIAS_APPFIT,
  categoriaDe,
  codigosConocidos,
  construirAlimentos,
  construirPaquete,
  decodificarEntidades,
  entradaManifest,
  escribirCsv,
  FaltanTraducciones,
  fusionarManifest,
  gruposCasiDuplicados,
  idsPerdidos,
  limpiarNombre,
  localizarConstituyentes,
  nombreBase,
  nombresCsv,
  parsearCsv,
  parsearListaMotivos,
  parsearRegistros,
  parsearTraducciones,
  parsearValor,
  redondear1,
  valoresParecidos,
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
  { const_code: '20000', const_nom_fr: 'Alcool (éthanol) (g/100 g)' },
]

const alim = (code: string, grp = '02', ssgrp = '0204', sssgrp = '000000') => ({
  alim_code: code,
  alim_nom_fr: `Nom ${code}`,
  alim_nom_eng: `Name ${code}`,
  alim_grp_code: grp,
  alim_ssgrp_code: ssgrp,
  alim_ssssgrp_code: sssgrp,
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
      alcohol: '20000',
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
      alim: [alim('1', '04', '0402', '040201')],
      consts: CONSTS,
      compo: [
        ...base('1'),
        compo('1', '20000', '2,5'),
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
        subgrupoCodigo: '0402',
        subsubgrupoCodigo: '040201',
        categoria: 'Carnes',
        secundario: false,
        kcal: 52,
        prot: 0.9,
        carb: 11,
        grasa: 0.3, // 0,25 redondeado
        nutrientes: { fibra: 1.3, azucares: 9, sal: 0, agSat: 0 },
        alcohol: 2.5, // solo para el control de energía; no se publica
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

  it('falla con un grupo, subgrupo o sub-subgrupo desconocido', () => {
    expect(() =>
      construirAlimentos({ alim: [alim('1', '99', '0000', '000000')], consts: CONSTS, compo: base('1') }),
    ).toThrow(/99/)
    expect(() =>
      construirAlimentos({ alim: [alim('1', '02', '0299', '000000')], consts: CONSTS, compo: base('1') }),
    ).toThrow(/0299/)
    expect(() =>
      construirAlimentos({ alim: [alim('1', '02', '0201', '029999')], consts: CONSTS, compo: base('1') }),
    ).toThrow(/029999/)
  })

  it('los productos de Martinica/Reunión y los infantiles son secundarios', () => {
    const r = construirAlimentos({
      alim: [alim('1', '02', '0201', '020104'), alim('2', '11', '1101', '000000'), alim('3', '02', '0204', '020401')],
      consts: CONSTS,
      compo: [...base('1'), ...base('2'), ...base('3')],
    })
    expect(r.alimentos.map((a) => [a.code, a.secundario, a.categoria])).toEqual([
      ['1', true, 'Verduras y hortalizas'],
      ['2', true, 'Alimentos infantiles'],
      ['3', false, 'Frutas'],
    ])
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
  subgrupoCodigo: '0501',
  subsubgrupoCodigo: '050101',
  secundario: false,
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

describe('construirPaquete (formato 2)', () => {
  const trad = (o: Record<string, [string, string[]]>) =>
    new Map(Object.entries(o).map(([k, [nombreEs, alias]]) => [k, { nombreEs, alias }]))

  it('construye filas con nutrientes y extra (alias, secundario, oculto) opcionales', () => {
    const { paquete, sobrantes, ocultosSobrantes } = construirPaquete(
      [A('1'), A('2', { nutrientes: { fibra: 1 } }), A('3'), A('4', { nutrientes: { sal: 0.5 } }), A('5', { secundario: true }), A('6')],
      trad({
        '1': ['Leche', []],
        '2': ['Yogur', []],
        '3': ['Queso', ['formatge']], // alias sin nutrientes → `{}`
        '4': ['Nata', ['crema']],
        '5': ['Ñame', []],
        '6': ['Leche UHT', []],
        '99': ['Sobra', []],
      }),
      '2025-es2',
      { ocultos: new Map([['6', 'igual que la leche'], ['77', 'no existe']]) },
    )
    expect(paquete).toEqual({
      formato: 2,
      fuente: 'ciqual',
      version: '2025-es2',
      tipo: 'generico',
      filas: [
        ['1', 'Leche', 'Fr 1', 'Lácteos', 60, 3, 5, 3],
        ['2', 'Yogur', 'Fr 2', 'Lácteos', 60, 3, 5, 3, { fibra: 1 }],
        ['3', 'Queso', 'Fr 3', 'Lácteos', 60, 3, 5, 3, {}, { alias: ['formatge'] }],
        ['4', 'Nata', 'Fr 4', 'Lácteos', 60, 3, 5, 3, { sal: 0.5 }, { alias: ['crema'] }],
        ['5', 'Ñame', 'Fr 5', 'Lácteos', 60, 3, 5, 3, {}, { secundario: 1 }],
        ['6', 'Leche UHT', 'Fr 6', 'Lácteos', 60, 3, 5, 3, {}, { oculto: 1 }],
      ],
    })
    expect(sobrantes).toEqual(['99'])
    expect(ocultosSobrantes).toEqual(['77'])
  })

  it('un oculto conserva su fila y su id (no se borra nada)', () => {
    const { paquete } = construirPaquete([A('1'), A('2')], trad({ '1': ['A', []], '2': ['B', []] }), 'v', {
      ocultos: new Map([['2', 'motivo']]),
    })
    expect(paquete.filas.map((f) => f[0])).toEqual(['1', '2'])
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

describe('parsearListaMotivos (ocultos.csv y retirados.csv)', () => {
  it('lee code;motivo', () => {
    const m = parsearListaMotivos('code;motivo\n19023;"igual, pero UHT"\n19041;igual\n', 'ocultos.csv')
    expect(m.get('19023')).toBe('igual, pero UHT')
    expect(m.size).toBe(2)
  })
  it('un código sin motivo, repetido o sin columnas es un fallo', () => {
    expect(() => parsearListaMotivos('code;motivo\n1;\n', 'x.csv')).toThrow(/no tiene motivo/)
    expect(() => parsearListaMotivos('code;motivo\n1;a\n1;b\n', 'x.csv')).toThrow(/duplicado/)
    expect(() => parsearListaMotivos('code\n1\n', 'x.csv')).toThrow(/motivo/)
  })
  it('vacío = sin entradas', () => {
    expect(parsearListaMotivos('', 'x.csv').size).toBe(0)
  })
})

describe('invariante de ids', () => {
  it('detecta los ids que desaparecen salvo los retirados con motivo', () => {
    const retirados = new Map([['3', 'duplicado exacto de 2']])
    expect(idsPerdidos(['1', '2', '3', '4'], ['1', '2', '5'], retirados)).toEqual(['4'])
    expect(idsPerdidos(['1', '2'], ['1', '2', '3'], new Map())).toEqual([])
  })
})

describe('categorías AppFit', () => {
  const GRUPOS_CIQUAL_2025 = [
  '00/0000/000000 01/0101/000000 01/0102/000000 01/0103/010301 01/0103/010302 01/0103/010303',
  '01/0103/010304 01/0103/010305 01/0103/010306 01/0103/010307 01/0103/010308 01/0103/010309',
  '01/0104/000000 01/0105/000000 01/0106/000000 02/0201/020101 02/0201/020102 02/0201/020103',
  '02/0201/020104 02/0201/020105 02/0202/000000 02/0203/020301 02/0203/020302 02/0203/020303',
  '02/0204/020401 02/0204/020402 02/0204/020403 02/0204/020404 02/0204/020405 02/0204/020406',
  '02/0205/000000 03/0301/030101 03/0301/030102 03/0302/030201 03/0302/030202 03/0303/000000',
  '03/0304/000000 03/0305/000000 04/0401/000000 04/0401/040101 04/0401/040102 04/0401/040103',
  '04/0401/040104 04/0401/040105 04/0401/040106 04/0401/040107 04/0401/040108 04/0402/040201',
  '04/0402/040202 04/0402/040203 04/0402/040204 04/0402/040205 04/0402/040206 04/0402/040207',
  '04/0402/040208 04/0403/000000 04/0403/040301 04/0403/040302 04/0403/040303 04/0403/040304',
  '04/0403/040305 04/0403/040306 04/0403/040307 04/0403/040308 04/0403/040309 04/0404/000000',
  '04/0405/000000 04/0406/000000 04/0407/000000 04/0408/000000 04/0409/000000 04/0410/041001',
  '04/0410/041002 04/0410/041003 05/0501/050101 05/0501/050102 05/0501/050103 05/0502/050201',
  '05/0502/050202 05/0502/050203 05/0502/050204 05/0502/050205 05/0503/000000 05/0503/050301',
  '05/0503/050302 05/0503/050303 05/0503/050304 05/0503/050305 05/0503/050306 05/0504/000000',
  '06/0601/000000 06/0602/060201 06/0602/060202 06/0602/060203 06/0602/060204 06/0602/060205',
  '06/0602/060206 06/0602/060207 06/0603/060301 06/0603/060302 06/0603/060303 06/0603/060304',
  '07/0701/000000 07/0702/000000 07/0703/000000 07/0704/000000 07/0705/000000 07/0706/000000',
  '07/0707/000000 07/0708/000000 07/0709/000000 08/0000/000000 08/0801/000000 08/0802/000000',
  '08/0803/000000 09/0901/000000 09/0902/000000 09/0903/000000 09/0904/000000 09/0905/000000',
  '10/1001/000000 10/1001/100101 10/1001/100102 10/1001/100103 10/1002/000000 10/1003/000000',
  '10/1004/000000 10/1005/000000 10/1006/100601 10/1006/100602 10/1007/000000 10/1008/000000',
  '10/1009/000000 10/1010/000000 11/1101/000000 11/1102/000000 11/1103/000000 11/1104/000000',
  ]
    .join(' ')
    .split(' ')
    .map((t) => t.split('/'))

  it('cubre los 138 grupos que usa CIQUAL 2025 (y solo devuelve categorías declaradas)', () => {
    expect(GRUPOS_CIQUAL_2025).toHaveLength(138)
    for (const [g, ss, sss] of GRUPOS_CIQUAL_2025) {
      const c = categoriaDe(g, ss, sss)
      expect(CATEGORIAS_APPFIT, `${g}/${ss}/${sss}`).toContain(c)
    }
  })
  it('todas las categorías que declara el mapa son de la lista y no se repiten', () => {
    expect(new Set(CATEGORIAS_APPFIT).size).toBe(CATEGORIAS_APPFIT.length)
    const { subsubgrupos, subgrupos, grupos } = codigosConocidos()
    for (const c of subsubgrupos) expect(c).toMatch(/^\d{6}$/)
    for (const c of subgrupos) expect(c).toMatch(/^\d{4}$/)
    for (const c of grupos) expect(c).toMatch(/^\d{2}$/)
    // Cada categoría de la lista la usa algún grupo de CIQUAL (las mismas categorías sirven a Open Food Facts).
    const usadas = new Set(GRUPOS_CIQUAL_2025.map(([g, ss, sss]) => categoriaDe(g, ss, sss)))
    expect(CATEGORIAS_APPFIT.filter((c) => !usadas.has(c))).toEqual([])
  })
  it('gana el más específico y un código desconocido es un fallo', () => {
    expect(categoriaDe('04', '0403', '040309')).toBe('Alternativas vegetales') // frente a «Embutidos y fiambres»
    expect(categoriaDe('04', '0403', '040301')).toBe('Embutidos y fiambres')
    expect(categoriaDe('06', '0602', '060205')).toBe('Bebidas vegetales')
    expect(categoriaDe('08', '0000', '000000')).toBe('Helados')
    expect(() => categoriaDe('02', '0299', '000000')).toThrow(/0299/)
    expect(() => categoriaDe('99', '0000', '000000')).toThrow(/99/)
  })
})

describe('casi-duplicados', () => {
  const L = (code: string, kcal: number, extra: Partial<AlimentoCiqual> = {}) => A(code, { kcal, ...extra })
  const nombres = (o: Record<string, string>) => new Map(Object.entries(o))

  it('nombreBase quita descriptores neutros y no depende del orden ni de tildes', () => {
    expect(nombreBase('Leche entera (promedio)')).toBe(nombreBase('Leche entera, UHT'))
    expect(nombreBase('Pechuga de pollo')).toBe(nombreBase('Pollo, pechuga'))
    expect(nombreBase('Leche entera')).not.toBe(nombreBase('Leche desnatada'))
    expect(nombreBase('Jamón cocido, envasado')).toBe(nombreBase('Jamón cocido'))
  })
  it('agrupa solo con el mismo nombre base y valores dentro de tolerancia', () => {
    const grupos = gruposCasiDuplicados(
      [L('1', 64), L('2', 64.6), L('3', 47.5), L('4', 200, { prot: 30 })],
      nombres({ '1': 'Leche entera (promedio)', '2': 'Leche entera, UHT', '3': 'Leche semidesnatada (promedio)', '4': 'Leche entera, pasterizada' }),
    )
    expect(grupos).toEqual([{ base: 'entera leche', codigos: ['1', '2'] }])
  })
  it('nunca junta estados distintos aunque los valores coincidan: crudo ≠ cocido, entera ≠ desnatada', () => {
    const grupos = gruposCasiDuplicados(
      [L('1', 100), L('2', 100), L('3', 100), L('4', 100)],
      nombres({ '1': 'Arroz, crudo', '2': 'Arroz, cocido', '3': 'Leche entera', '4': 'Leche desnatada' }),
    )
    expect(grupos).toEqual([])
  })
  it('valoresParecidos compara los básicos y los extras solo si ambos los tienen', () => {
    expect(valoresParecidos(L('1', 100, { nutrientes: { sal: 1 } }), L('2', 101))).toBe(true)
    expect(valoresParecidos(L('1', 100, { nutrientes: { sal: 1 } }), L('2', 101, { nutrientes: { sal: 1.5 } }))).toBe(false)
    expect(valoresParecidos(L('1', 100), L('2', 120))).toBe(false)
  })
})

describe('aAlimentosCalidad', () => {
  it('usa el nombre en español, los extras y el alcohol (solo para calidad)', () => {
    const [c] = aAlimentosCalidad([A('1', { nutrientes: { fibra: 2 }, alcohol: 5 })], new Map([['1', { nombreEs: 'Cerveza', alias: [] }]]))
    expect(c).toMatchObject({ id: 'ciqual:1', nombre: 'Cerveza', fibra: 2, alcohol: 5, kcal: 60 })
  })
})

describe('manifest', () => {
  it('describe la fuente con atribución ANSES y versión', () => {
    const paquete = { formato: 2 as const, fuente: 'ciqual', version: '2025-es2', tipo: 'generico' as const, filas: [] }
    const e = entradaManifest(paquete, 'ciqual-2025-es2.json', '2025')
    expect(e).toMatchObject({ id: 'ciqual', version: '2025-es2', archivo: 'ciqual-2025-es2.json', filas: 0 })
    expect(e.atribucion).toContain('ANSES')
    expect(e.atribucion).toContain('Ciqual 2025')
    expect(e.atribucion).toContain('traducidos al español')
  })
  it('fusiona sustituyendo la misma fuente y conservando las demás', () => {
    const e = (id: string, version: string) => ({ id, version, archivo: 'a', filas: 1, licencia: 'l', atribucion: 'x' })
    const m = fusionarManifest({ formato: 1, fuentes: [e('ciqual', 'v1'), e('otra', 'v9')] }, e('ciqual', 'v2'))
    expect(m.fuentes.map((f) => `${f.id}:${f.version}`)).toEqual(['ciqual:v2', 'otra:v9']) // ordenadas por id
    expect(fusionarManifest(undefined, e('ciqual', 'v1')).fuentes).toHaveLength(1)
  })
})

describe('versionDesdeNombre', () => {
  it('extrae el año', () => {
    expect(versionDesdeNombre('alim_2025_11_03.xml')).toBe('2025')
    expect(versionDesdeNombre('otra.xml')).toBeUndefined()
  })
})
