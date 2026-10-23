import { describe, expect, it } from 'vitest'
import { leerResumen, resumenSemana } from './publicacion'
import { opcionesSemana } from './semana'

const ritmo = (entrenos: number, objetivo: number, hilo = 6) => ({
  actual: { lunes: '2026-10-19', entrenos, plan: { entrenos: objetivo, diasRegistro: 5 } } as never, hiloActual: hilo,
})
const dias = new Set(['2026-10-19', '2026-10-21', '2026-10-25', '2026-10-26'])

describe('opcionesSemana', () => {
  it('la semana con sus siete días, entrenos frente al plan e hilo; sin nada de nutrición', () => {
    const o = opcionesSemana(ritmo(3, 3), dias, '2026-10-19')
    expect(o.semana).toEqual({ estado: 'semana', lunes: '2026-10-19', dias: [true, false, true, false, false, false, true], entrenos: 3, objetivo: 3, hilo: 6 })
    expect(resumenSemana(o.semana!).titulo).toBe('Semana cumplida')
    expect(JSON.stringify(resumenSemana(o.semana!))).not.toMatch(/diasRegistro|kcal|peso/)
  })

  it('«retomando» lleva como mucho los entrenos; «pausa», nada; sin plan de entrenos o con la gamificación oculta, sin la semana', () => {
    expect(opcionesSemana(ritmo(1, 3), dias, '2026-10-19').retomando).toEqual({ estado: 'retomando', lunes: '2026-10-19', entrenos: 1 })
    expect(opcionesSemana(ritmo(0, 3), dias, '2026-10-19').retomando).toEqual({ estado: 'retomando', lunes: '2026-10-19' })
    expect(opcionesSemana(ritmo(0, 3), dias, '2026-10-19').pausa).toEqual({ estado: 'pausa', lunes: '2026-10-19' })
    expect(opcionesSemana(ritmo(0, 0), dias, '2026-10-19').semana).toBeNull()
    expect(opcionesSemana(null, dias, '2026-10-26')).toEqual({ semana: null, retomando: { estado: 'retomando', lunes: '2026-10-26' }, pausa: { estado: 'pausa', lunes: '2026-10-26' } })
  })
})

describe('resumen de una semana', () => {
  it('títulos, cifras acotadas y lectura de lo que publica la app', () => {
    const r = resumenSemana({ estado: 'semana', lunes: '2026-10-19', dias: [true, true], entrenos: 2, objetivo: 3, hilo: 9999 })
    expect(r).toEqual({ v: 1, tipo: 'semana', titulo: '2 de 3 entrenos', lunes: '2026-10-19', estado: 'semana', dias: [true, true, false, false, false, false, false], entrenos: 2, objetivo: 3, hilo: 520 })
    expect(resumenSemana({ estado: 'semana', lunes: '2026-10-19', dias: [], entrenos: 0, objetivo: 1, hilo: 0 }).titulo).toBe('0 de 1 entreno')
    for (const x of [r, resumenSemana({ estado: 'retomando', lunes: '2026-10-19', entrenos: 1 }), resumenSemana({ estado: 'pausa', lunes: '2026-10-19' })]) {
      expect(leerResumen(JSON.parse(JSON.stringify({ ...x, nota: 'Volviendo poco a poco' })))).toEqual({ ...x, nota: 'Volviendo poco a poco' })
    }
    expect(resumenSemana({ estado: 'retomando', lunes: '2026-10-19' }).titulo).toBe('Estoy retomando')
    expect(resumenSemana({ estado: 'pausa', lunes: '2026-10-19' }).titulo).toBe('En pausa')
  })

  it('al leer, descarta lo que no encaja y rehace el título con las cifras', () => {
    const r = resumenSemana({ estado: 'semana', lunes: '2026-10-19', dias: [true], entrenos: 1, objetivo: 3, hilo: 2 })
    expect(leerResumen({ ...r, titulo: 'Semana cumplida' })?.titulo).toBe('1 de 3 entrenos')
    expect(leerResumen({ ...r, dias: [true, false] })).toBeNull()
    expect(leerResumen({ ...r, entrenos: 8 })).toBeNull()
    expect(leerResumen({ ...r, objetivo: 0 })).toBeNull()
    expect(leerResumen({ ...r, lunes: 'lunes' })).toBeNull()
    expect(leerResumen({ ...r, estado: 'fallida' })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'semana', titulo: 'En pausa', lunes: '2026-10-19', estado: 'pausa', hilo: 3 })).toBeNull()
    expect(leerResumen({ v: 1, tipo: 'semana', titulo: 'Estoy retomando', lunes: '2026-10-19', estado: 'retomando', objetivo: 3 })).toBeNull()
  })
})
