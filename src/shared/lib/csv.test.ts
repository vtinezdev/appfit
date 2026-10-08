import { describe, expect, it } from 'vitest'
import type { Entry, Exercise, SetEntry, Workout } from '../db/types'
import { BOM, celdaCsv, csvAgua, csvComidas, csvMedidas, csvPesos, csvSeries, numeroCsv, serializarCsv } from './csv'

describe('celdaCsv', () => {
  it('usa coma decimal en números y deja vacío lo ausente', () => {
    expect(numeroCsv(1.5)).toBe('1,5')
    expect(celdaCsv(72.4)).toBe('72,4')
    expect(celdaCsv(0)).toBe('0')
    expect(celdaCsv(undefined)).toBe('')
    expect(celdaCsv(NaN)).toBe('')
  })
  it('entrecomilla texto con ; comillas o saltos de línea', () => {
    expect(celdaCsv('arroz; cocido')).toBe('"arroz; cocido"')
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(celdaCsv('a\nb')).toBe('"a\nb"')
    expect(celdaCsv('Pollo, pechuga')).toBe('Pollo, pechuga')
  })
  it('neutraliza fórmulas en texto', () => {
    expect(celdaCsv('=SUMA(A1)')).toBe("'=SUMA(A1)")
    expect(celdaCsv('-algo')).toBe("'-algo")
    expect(celdaCsv('@usuario')).toBe("'@usuario")
    // un número negativo sí es un número
    expect(celdaCsv(-3)).toBe('-3')
  })
})

describe('serializarCsv', () => {
  it('lleva BOM, cabecera y CRLF', () => {
    const csv = serializarCsv(['a', 'b'], [[1, 'x'], [2.5, undefined]])
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv.slice(1)).toBe('a;b\r\n1;x\r\n2,5;\r\n')
  })
})

describe('csv por tabla', () => {
  it('comidas: ordenadas, con extras opcionales y marca de kcal rápidas', () => {
    const e = (id: number, over: Partial<Entry>): Entry => ({ id, fecha: '2026-10-07', comida: 'cena', nombre: 'X', gramos: 100, kcal: 120.5, prot: 10, carb: 5, grasa: 2, createdAt: id, ...over })
    const csv = csvComidas([e(2, { fecha: '2026-10-08', nombre: 'Pollo; asado' }), e(1, { nutrientes: { fibra: 1.5 } }), e(3, { rapida: true, gramos: 0, nombre: 'Comida fuera' })])
    const lineas = csv.slice(1).split('\r\n')
    expect(lineas[0]).toBe('fecha;comida;alimento;gramos;kcal;proteina_g;hidratos_g;grasa_g;fibra_g;azucares_g;sal_g;grasas_saturadas_g;plato;kcal_rapidas')
    expect(lineas[1]).toBe('2026-10-07;cena;X;100;120,5;10;5;2;1,5;;;;;')
    expect(lineas[2]).toContain('Comida fuera')
    expect(lineas[2].endsWith(';sí')).toBe(true)
    expect(lineas[3]).toContain('"Pollo; asado"')
  })
  it('pesos, agua y medidas por fecha', () => {
    expect(csvPesos([{ id: 2, fecha: '2026-10-02', kg: 71.5, createdAt: 1 }, { id: 1, fecha: '2026-10-01', kg: 72, createdAt: 1 }]).slice(1)).toBe('fecha;peso_kg\r\n2026-10-01;72\r\n2026-10-02;71,5\r\n')
    expect(csvAgua([{ id: 1, fecha: '2026-10-01', ml: 1500 }]).slice(1)).toBe('fecha;ml\r\n2026-10-01;1500\r\n')
    expect(csvMedidas([{ id: 1, fecha: '2026-10-01', cintura: 82.5, grasaPct: 18 }]).slice(1)).toBe('fecha;cintura_cm;cadera_cm;pecho_cm;brazo_cm;muslo_cm;grasa_pct\r\n2026-10-01;82,5;;;;;18\r\n')
  })
  it('series: fecha del entreno, ejercicio, tipo, reps, peso y RIR', () => {
    const w: Workout = { id: 1, inicio: new Date(2026, 9, 7, 18, 0).getTime(), fin: new Date(2026, 9, 7, 19, 0).getTime() }
    const ex: Exercise = { id: 5, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho' }
    const s = (id: number, over: Partial<SetEntry>): SetEntry => ({ id, workoutId: 1, exerciseId: 5, orden: id - 1, reps: 8, peso: 62.5, createdAt: id, ...over })
    const csv = csvSeries([s(2, { tipo: 'calentamiento', peso: 20 }), s(1, { rir: 2 }), s(3, { workoutId: 99 })], [w], [ex])
    expect(csv.slice(1)).toBe('fecha;ejercicio;serie;tipo;reps;peso_kg;rir;modo_carga;peso_corporal_kg;nota_ejercicio;ejecucion;kg_unilateral;agarre_json;solo_negativas;excentrica_seg;lados_json;bajadas_json;realizada\r\n2026-10-07;Press banca;1;efectiva;8;62,5;2;externa;;;bilateral;;;;;;;desconocida\r\n2026-10-07;Press banca;2;calentamiento;8;20;;externa;;;bilateral;;;;;;;desconocida\r\n')
  })
})
