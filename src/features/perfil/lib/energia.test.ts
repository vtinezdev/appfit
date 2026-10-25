import { describe, expect, it } from 'vitest'
import type { Perfil } from '../../../shared/db/types'
import {
  calcularEnergia, ECUACIONES, formulaSustituida, gastoReposo, INTENSIDADES_KCAL, METODO_TMB, NIVELES_ACTIVIDAD, tasaMetabolicaBasal,
  type DatosEnergia, type EnergiaOk,
} from './energia'

const HOY = '2026-10-06'
const HOMBRE: DatosEnergia = { sexo: 'hombre', edad: 30, alturaCm: 180, pesoKg: 80 }
const MUJER: DatosEnergia = { sexo: 'mujer', edad: 30, alturaCm: 165, pesoKg: 60 }

function perfil(extra: Partial<Perfil> = {}): Perfil {
  return { sexo: 'hombre', fechaNacimiento: '1996-10-06', alturaCm: 180, actividad: 'moderado', objetivo: 'mantenimiento', ...extra }
}
function ok(p: Perfil, kg: number): EnergiaOk {
  const r = calcularEnergia(p, kg, HOY)
  if (r.estado !== 'ok') throw new Error(`esperaba ok, fue ${r.estado}`)
  return r
}

describe('ecuaciones de gasto en reposo', () => {
  it('Mifflin-St Jeor hombre 80 kg/180 cm/30 a = 1.780 y mujer 60 kg/165 cm/30 a = 1.320,25', () => {
    expect(gastoReposo('mifflin', HOMBRE)).toBeCloseTo(1780, 9)
    expect(gastoReposo('mifflin', MUJER)).toBeCloseTo(1320.25, 9)
  })
  it('Roza-Shizgal hombre = 1.853,632 y mujer = 1.383,683', () => {
    expect(gastoReposo('rozaShizgal', HOMBRE)).toBeCloseTo(1853.632, 9)
    expect(gastoReposo('rozaShizgal', MUJER)).toBeCloseTo(1383.683, 9)
  })
  it('la TMB es la media de las dos ecuaciones y conserva los parciales', () => {
    expect(METODO_TMB.ecuaciones).toEqual(['mifflin', 'rozaShizgal'])
    const h = tasaMetabolicaBasal(HOMBRE)
    expect(h.valor).toBeCloseTo(1816.816, 9)
    expect(h.parciales.mifflin).toBeCloseTo(1780, 9)
    expect(tasaMetabolicaBasal(MUJER).valor).toBeCloseTo(1351.9665, 9)
  })
  it('más peso, más altura o menos edad dan más TMB (monotonía)', () => {
    const base = tasaMetabolicaBasal(HOMBRE).valor
    expect(tasaMetabolicaBasal({ ...HOMBRE, pesoKg: 81 }).valor).toBeGreaterThan(base)
    expect(tasaMetabolicaBasal({ ...HOMBRE, alturaCm: 181 }).valor).toBeGreaterThan(base)
    expect(tasaMetabolicaBasal({ ...HOMBRE, edad: 31 }).valor).toBeLessThan(base)
  })
  it('la fórmula sustituida enseña las cifras y el resultado', () => {
    expect(formulaSustituida('mifflin', HOMBRE)).toBe('5 + 10 × 80 + 6,25 × 180 − 5 × 30 = 1.780')
    expect(formulaSustituida('mifflin', MUJER)).toBe('−161 + 10 × 60 + 6,25 × 165 − 5 × 30 = 1.320,3')
    expect(ECUACIONES.rozaShizgal.coeficientes.mujer.anio).toBe(-4.33)
  })
})

describe('gasto diario y objetivo', () => {
  it('GET = TMB × factor para los cinco niveles', () => {
    const esperado = { sedentario: 2180.1792, ligero: 2498.1220, moderado: 2816.0648, activo: 3134.0076, 'muy-activo': 3451.9504 }
    for (const [nivel, kcal] of Object.entries(esperado)) {
      const r = ok(perfil({ actividad: nivel as keyof typeof esperado }), 80)
      expect(r.factor).toBe(NIVELES_ACTIVIDAD[nivel as keyof typeof esperado].factor)
      expect(r.get).toBeCloseTo(kcal, 3)
    }
  })
  it('definición y volumen restan y suman exactamente la intensidad (200 y 600 en los extremos)', () => {
    const get = ok(perfil(), 80).get
    for (const i of INTENSIDADES_KCAL) {
      expect(ok(perfil({ objetivo: 'definicion', intensidadKcal: i }), 80).objetivoExacto).toBeCloseTo(get - i, 9)
      expect(ok(perfil({ objetivo: 'volumen', intensidadKcal: i }), 80).objetivoExacto).toBeCloseTo(get + i, 9)
    }
    expect(ok(perfil({ objetivo: 'definicion', intensidadKcal: 200 }), 80).ajusteKcal).toBeCloseTo(-200, 9)
    expect(ok(perfil({ objetivo: 'volumen', intensidadKcal: 600 }), 80).ajusteKcal).toBeCloseTo(600, 9)
  })
  it('sin intensidad guardada se usa 400; en mantenimiento se ignora', () => {
    const get = ok(perfil(), 80).get
    expect(ok(perfil({ objetivo: 'definicion' }), 80).objetivoExacto).toBeCloseTo(get - 400, 9)
    const m = ok(perfil({ objetivo: 'mantenimiento', intensidadKcal: 600 }), 80)
    expect(m.objetivoExacto).toBeCloseTo(get, 9)
    expect(m.ajusteKcal).toBe(0)
    expect(m.ritmo).toBeNull()
  })
  it('redondea a 10 kcal solo el objetivo, no el GET', () => {
    const r = ok(perfil(), 80)
    expect(r.objetivoKcal).toBe(2820)
    expect(r.get).toBeCloseTo(2816.0648, 3)
  })
  it('sin objetivo muestra TMB y GET pero ningún objetivo', () => {
    const r = ok(perfil({ objetivo: undefined }), 80)
    expect(r.objetivoKcal).toBeNull()
    expect(r.objetivoExacto).toBeNull()
    expect(r.get).toBeGreaterThan(0)
  })
  it('ritmo aproximado: kcal × 7 / 7.700 y su % del peso; aviso por encima del 1 % semanal en definición', () => {
    const suave = ok(perfil({ objetivo: 'definicion', intensidadKcal: 400 }), 80)
    expect(suave.ritmo!.kgSemana).toBeCloseTo(-400 * 7 / 7700, 9)
    expect(suave.ritmo!.pctPesoSemana).toBeCloseTo(-0.4545, 3)
    expect(suave.avisos.some((a) => a.tipo === 'ritmo-alto')).toBe(false)
    const fuerte = ok(perfil({ sexo: 'mujer', alturaCm: 150, objetivo: 'definicion', intensidadKcal: 600 }), 50)
    expect(Math.abs(fuerte.ritmo!.pctPesoSemana)).toBeGreaterThan(1)
    expect(fuerte.avisos.some((a) => a.tipo === 'ritmo-alto')).toBe(true)
    expect(fuerte.objetivoExacto).not.toBeNull()
  })
  it('el aviso de ritmo no aparece en volumen', () => {
    expect(ok(perfil({ objetivo: 'volumen', intensidadKcal: 600 }), 40).avisos.some((a) => a.tipo === 'ritmo-alto')).toBe(false)
  })
})

describe('límites de prudencia', () => {
  const pequena: Perfil = { sexo: 'mujer', fechaNacimiento: '1996-10-06', alturaCm: 150, actividad: 'sedentario', objetivo: 'definicion', intensidadKcal: 600 }
  it('el suelo es max(TMB, 800 kcal) y se indica cuando actúa', () => {
    const r = ok(pequena, 45)
    expect(r.objetivoExacto).toBeCloseTo(Math.max(r.tmb.valor, 800), 9)
    expect(r.objetivoExacto!).toBeGreaterThan(r.get - 600)
    expect(r.avisos.some((a) => a.tipo === 'suelo')).toBe(true)
    expect(r.ajusteKcal).toBeGreaterThan(-600)
  })
  it('sin necesidad de suelo no hay aviso', () => {
    expect(ok(perfil({ objetivo: 'definicion' }), 80).avisos.some((a) => a.tipo === 'suelo')).toBe(false)
  })
  it('IMC < 18,5 bloquea el déficit y devuelve mantenimiento con aviso', () => {
    const r = ok(perfil({ objetivo: 'definicion', intensidadKcal: 500 }), 55) // 55 / 1,8² = 16,98
    expect(r.imc).toBeLessThan(18.5)
    expect(r.objetivoElegido).toBe('definicion')
    expect(r.objetivoAplicado).toBe('mantenimiento')
    expect(r.objetivoExacto).toBeCloseTo(r.get, 9)
    expect(r.avisos.some((a) => a.tipo === 'imc-bajo')).toBe(true)
  })
  it('IMC bajo no impide el volumen', () => {
    const r = ok(perfil({ objetivo: 'volumen', intensidadKcal: 300 }), 55)
    expect(r.objetivoAplicado).toBe('volumen')
    expect(r.objetivoExacto).toBeCloseTo(r.get + 300, 9)
  })
  it('menores de 18 años no son calculables; el día del cumpleaños 18 sí', () => {
    const joven = calcularEnergia(perfil({ fechaNacimiento: '2008-10-07' }), 70, HOY)
    expect(joven.estado).toBe('no-calculable')
    expect(calcularEnergia(perfil({ fechaNacimiento: '2008-10-06' }), 70, HOY).estado).toBe('ok')
  })
  it('más de 78 años se calcula con aviso; más de 100 no es calculable', () => {
    expect(ok(perfil({ fechaNacimiento: '1940-01-01' }), 70).avisos.some((a) => a.tipo === 'edad-alta')).toBe(true)
    expect(ok(perfil({ fechaNacimiento: '1996-01-01' }), 70).avisos.some((a) => a.tipo === 'edad-alta')).toBe(false)
    expect(calcularEnergia(perfil({ fechaNacimiento: '1920-01-01' }), 70, HOY).estado).toBe('no-calculable')
  })
  it('perfil incompleto lista lo que falta, en orden, sin cifras', () => {
    expect(calcularEnergia({}, null, HOY)).toEqual({ estado: 'incompleto', faltan: ['sexo', 'fechaNacimiento', 'alturaCm', 'peso', 'actividad'] })
    expect(calcularEnergia(perfil({ alturaCm: undefined, actividad: undefined }), 80, HOY)).toEqual({ estado: 'incompleto', faltan: ['alturaCm', 'actividad'] })
    expect(calcularEnergia(perfil(), null, HOY)).toEqual({ estado: 'incompleto', faltan: ['peso'] })
  })
  it('la altura va en cm: 1,8 se rechaza por rango y 180 no equivale a 1,8', () => {
    expect(calcularEnergia(perfil({ alturaCm: 1.8 }), 80, HOY).estado).toBe('no-calculable')
    expect(ok(perfil({ alturaCm: 180 }), 80).tmb.valor).not.toBeCloseTo(ok(perfil({ alturaCm: 190 }), 80).tmb.valor, 0)
  })
  it('datos no finitos no producen resultado', () => {
    expect(calcularEnergia(perfil({ alturaCm: NaN }), 80, HOY).estado).toBe('no-calculable')
    expect(calcularEnergia(perfil(), Infinity, HOY).estado).toBe('incompleto')
  })
  it('cifras grandes (300 kg, 230 cm) siguen siendo finitas', () => {
    const r = ok(perfil({ alturaCm: 230, objetivo: 'volumen', intensidadKcal: 600 }), 300)
    expect(Number.isFinite(r.objetivoKcal!)).toBe(true)
  })
})

describe('gasto observado', () => {
  it('solo sustituye al estimado si está activado y hay un valor; el estimado se conserva siempre', () => {
    const base = ok(perfil({ objetivo: 'definicion', intensidadKcal: 400 }), 80)
    const sin = calcularEnergia(perfil({ objetivo: 'definicion', intensidadKcal: 400, usarGastoObservado: false }), 80, HOY, 3000) as EnergiaOk
    expect(sin.origenGet).toBe('estimado')
    expect(sin.get).toBe(base.get)
    const con = calcularEnergia(perfil({ objetivo: 'definicion', intensidadKcal: 400, usarGastoObservado: true }), 80, HOY, 3000) as EnergiaOk
    expect(con).toMatchObject({ origenGet: 'observado', get: 3000, getEstimado: base.get })
    expect(con.objetivoKcal).toBe(2600)
    const sinDatos = calcularEnergia(perfil({ usarGastoObservado: true }), 80, HOY, null) as EnergiaOk
    expect(sinDatos.origenGet).toBe('estimado')
  })
})
