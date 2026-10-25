import { describe, expect, it, vi } from 'vitest'
import { crearGestorActualizaciones } from './gestorActualizaciones'
import { leerVersion, textoActualizacion } from './version'

const version = { id: 'actual', fecha: '2026-10-16T10:00:00Z' }
function escenario() {
  const puertos = {
    versionInstalada: version.id, enLinea: vi.fn(() => true),
    leerRemota: vi.fn(async () => version), preparar: vi.fn(async () => {}),
    aplicar: vi.fn(async () => {}), recargar: vi.fn(), ahora: () => 1234,
  }
  return { puertos, gestor: crearGestorActualizaciones(puertos) }
}

describe('estado de la versión abierta', () => {
  it('solo anuncia que está al día tras consultar una versión válida que coincida', async () => {
    const { gestor, puertos } = escenario()
    expect(gestor.getEstado().fase).toBe('sin-comprobar')
    await gestor.comprobar()
    expect(gestor.getEstado()).toMatchObject({ fase: 'al-dia', hayActualizacion: false, comprobadaEn: 1234 })
    expect(puertos.preparar).toHaveBeenCalledOnce()
    expect(puertos.recargar).not.toHaveBeenCalled()
  })

  it('detecta otra build por su identidad, también si se vuelve a una versión anterior', async () => {
    const { gestor, puertos } = escenario()
    puertos.leerRemota.mockResolvedValue({ id: 'anterior', fecha: '2026-10-15T10:00:00Z' })
    await gestor.comprobar()
    expect(gestor.getEstado().fase).toBe('disponible')
    expect(puertos.recargar).not.toHaveBeenCalled()
    await gestor.actualizar()
    expect(puertos.aplicar).toHaveBeenCalledOnce()
    expect(puertos.recargar).toHaveBeenCalledOnce()
  })

  it('sin conexión no afirma estar al día ni cambia la fecha de la comprobación anterior', async () => {
    const { gestor, puertos } = escenario()
    await gestor.comprobar()
    puertos.enLinea.mockReturnValue(false)
    await gestor.comprobar()
    expect(gestor.getEstado()).toMatchObject({ fase: 'sin-conexion', comprobadaEn: 1234 })
    expect(puertos.leerRemota).toHaveBeenCalledOnce()
    expect(textoActualizacion(gestor.getEstado())).not.toContain('al día')
  })

  it('si se pierde la conexión durante la petición tampoco muestra al día', async () => {
    const { gestor, puertos } = escenario()
    puertos.leerRemota.mockImplementation(async () => { puertos.enLinea.mockReturnValue(false); return version })
    await gestor.comprobar()
    expect(gestor.getEstado()).toMatchObject({ fase: 'sin-conexion', comprobadaEn: null })
  })

  it('un fallo de red conserva una actualización conocida y deja reintentar', async () => {
    const { gestor, puertos } = escenario()
    puertos.leerRemota.mockResolvedValue({ ...version, id: 'nueva' })
    await gestor.comprobar()
    puertos.leerRemota.mockRejectedValueOnce(new Error('Red'))
    await gestor.comprobar()
    expect(gestor.getEstado()).toMatchObject({ fase: 'error', hayActualizacion: true })
    expect(textoActualizacion(gestor.getEstado())).toBe('Actualización pendiente')
    await gestor.comprobar()
    expect(gestor.getEstado().fase).toBe('disponible')
  })

  it('una descarga fallida no recarga ni borra el estado pendiente', async () => {
    const { gestor, puertos } = escenario()
    puertos.leerRemota.mockResolvedValue({ ...version, id: 'nueva' })
    await gestor.comprobar()
    puertos.aplicar.mockRejectedValueOnce(new Error('No se ha descargado'))
    await gestor.actualizar()
    expect(gestor.getEstado()).toMatchObject({ fase: 'disponible', hayActualizacion: true })
    expect(gestor.getEstado().error).toBeTruthy()
    expect(puertos.recargar).not.toHaveBeenCalled()
    await gestor.actualizar()
    expect(puertos.recargar).toHaveBeenCalledOnce()
  })

  it('comprobaciones y pulsaciones simultáneas no duplican peticiones ni recargas', async () => {
    const { gestor, puertos } = escenario()
    puertos.leerRemota.mockResolvedValue({ ...version, id: 'nueva' })
    await Promise.all([gestor.comprobar(), gestor.comprobar()])
    expect(puertos.leerRemota).toHaveBeenCalledOnce()
    await Promise.all([gestor.actualizar(), gestor.actualizar()])
    expect(puertos.aplicar).toHaveBeenCalledOnce()
    expect(puertos.recargar).toHaveBeenCalledOnce()
  })

  it('no recarga si no hay actualización y no consulta producción en desarrollo', async () => {
    const { gestor, puertos } = escenario()
    await gestor.actualizar()
    const desarrollo = crearGestorActualizaciones({ ...puertos, desarrollo: true })
    await desarrollo.comprobar()
    await desarrollo.actualizar()
    expect(desarrollo.getEstado().fase).toBe('desarrollo')
    expect(puertos.leerRemota).not.toHaveBeenCalled()
    expect(puertos.recargar).not.toHaveBeenCalled()
  })
})

describe('metadatos remotos', () => {
  it('acepta la versión publicada y rechaza respuestas incompletas o de otra forma', () => {
    expect(leerVersion(version)).toEqual(version)
    for (const valor of [null, '<html>AppFit</html>', {}, { ...version, id: '' }, { ...version, fecha: 'ayer' }]) {
      expect(() => leerVersion(valor)).toThrow()
    }
  })
})
