import { describe, expect, it } from 'vitest'
import { leerValores, valoresIniciales } from './formulario'

const inicio = new Date(2026, 9, 12, 8, 5).getTime()

describe('formulario de actividad', () => {
  it('parte de una actividad: fecha, hora, duración partida y km con dos decimales', () => {
    const v = valoresIniciales({ tipo: 'correr', inicio, duracionSeg: 3725, distanciaM: 10_234, desnivelM: 80, nombre: 'Río' })
    expect(v).toEqual({ tipo: 'correr', fecha: '2026-10-12', hora: '08:05', horas: 1, minutos: 2, segundos: 5, km: 10.23, desnivel: 80, nombre: 'Río' })
  })

  it('por defecto, una caminata de 45 min que empezó hace una hora', () => {
    const v = valoresIniciales({}, inicio + 3_600_000)
    expect(v).toMatchObject({ tipo: 'caminar', hora: '08:05', horas: 0, minutos: 45, km: undefined })
  })

  it('vuelve a datos conservando los segundos importados', () => {
    const v = valoresIniciales({ inicio, duracionSeg: 3725, distanciaM: 10_234 })
    expect(leerValores({ ...v, nombre: '  ' })).toEqual({ ok: true, datos: { tipo: 'caminar', inicio, duracionSeg: 3725, distanciaM: 10_230 } })
  })

  it('explica lo que falta', () => {
    const v = valoresIniciales({ inicio })
    expect(leerValores({ ...v, km: undefined })).toEqual({ ok: false, error: 'Indica la distancia.' })
    expect(leerValores({ ...v, km: 3, horas: 0, minutos: 0, segundos: 0 })).toEqual({ ok: false, error: 'Indica la duración.' })
    expect(leerValores({ ...v, km: 3, fecha: '' })).toMatchObject({ ok: false })
  })
})
