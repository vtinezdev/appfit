import { describe, expect, it } from 'vitest'
import { avisoCuenta, cuentaEnUso, haceCuanto, lineaEstado } from './estado'

const ahora = new Date(2026, 9, 13, 18, 30).getTime()

describe('haceCuanto', () => {
  it('dice el momento de forma cercana', () => {
    expect(haceCuanto(ahora - 20_000, ahora)).toBe('ahora mismo')
    expect(haceCuanto(ahora - 5 * 60_000, ahora)).toBe('hace 5 min')
    expect(haceCuanto(new Date(2026, 9, 13, 8, 5).getTime(), ahora)).toBe('hoy a las 08:05')
    expect(haceCuanto(new Date(2026, 9, 3, 8, 21).getTime(), ahora)).toBe('3 oct · 08:21')
  })
})

describe('lineaEstado', () => {
  it('al día con la última copia', () => {
    expect(lineaEstado({ fase: 'al-dia', ultimaCopia: ahora - 3 * 60_000 }, ahora)).toEqual({ texto: 'Copia guardada hace 3 min.', tono: 'normal' })
  })

  it('sin conexión avisa y el error se enseña tal cual', () => {
    expect(lineaEstado({ fase: 'sin-conexion' }, ahora).tono).toBe('aviso')
    expect(lineaEstado({ fase: 'error', error: 'Falló.' }, ahora)).toEqual({ texto: 'Falló.', tono: 'error' })
  })
})

describe('cuentaEnUso', () => {
  it('con el dispositivo vinculado o la sesión caducada', () => {
    expect(cuentaEnUso({ fase: 'al-dia' })).toBe(true)
    expect(cuentaEnUso({ fase: 'conflicto' })).toBe(true)
    expect(cuentaEnUso({ fase: 'sin-sesion', error: 'Tu sesión ha caducado.' })).toBe(true)
    expect(cuentaEnUso({ fase: 'sin-sesion' })).toBe(false)
    expect(cuentaEnUso({ fase: 'sin-vincular' })).toBe(false)
    expect(cuentaEnUso({ fase: 'cargando' })).toBe(false)
  })
})

describe('avisoCuenta', () => {
  it('conflicto y sesión caducada no se pueden posponer', () => {
    expect(avisoCuenta({ fase: 'conflicto' }, false, ahora)).toEqual({ titulo: 'Elige qué copia se queda', posponible: false })
    expect(avisoCuenta({ fase: 'sin-sesion', error: 'x' }, false, ahora)?.posponible).toBe(false)
    expect(avisoCuenta({ fase: 'perdida' }, false, ahora)?.titulo).toBe('Vuelve a entrar en tu cuenta')
  })

  it('días sin copia en la nube, como el recordatorio de exportar', () => {
    const ultimaCopia = ahora - 15 * 86_400_000
    expect(avisoCuenta({ fase: 'error', ultimaCopia }, true, ahora)).toEqual({ titulo: '15 días sin copia', posponible: true })
    expect(avisoCuenta({ fase: 'al-dia', ultimaCopia: ahora }, false, ahora)).toBeNull()
  })
})
