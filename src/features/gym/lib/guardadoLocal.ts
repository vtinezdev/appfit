/** Cola por registro: una escritura antigua nunca pisa el reintento de una nueva. Solo vive en memoria. */
export class GuardadoLocal {
  private colas = new Map<string, Promise<unknown>>()
  private fallos = new Map<string, () => Promise<unknown>>()
  private versiones = new Map<string, number>()
  private oyentes = new Set<() => void>()
  private pendientes = 0
  private resumen = { pendientes: 0, errores: 0 }

  estado = () => this.resumen
  suscribir = (fn: () => void) => { this.oyentes.add(fn); return () => { this.oyentes.delete(fn) } }
  private emitir() {
    this.resumen = { pendientes: this.pendientes, errores: this.fallos.size }
    this.oyentes.forEach(fn => fn())
  }

  guardar<T>(clave: string, escribir: () => Promise<T>): Promise<T> {
    const version = (this.versiones.get(clave) ?? 0) + 1
    this.versiones.set(clave, version)
    this.fallos.delete(clave)
    this.pendientes++
    this.emitir()
    const operacion = (this.colas.get(clave) ?? Promise.resolve()).catch(() => undefined).then(escribir)
    this.colas.set(clave, operacion)
    return operacion.then(valor => {
      this.terminada(clave, version)
      return valor
    }, error => {
      if (this.versiones.get(clave) === version) this.fallos.set(clave, escribir)
      this.terminada(clave, version)
      throw error
    })
  }

  private terminada(clave: string, version: number) {
    this.pendientes--
    if (this.versiones.get(clave) === version) this.colas.delete(clave)
    this.emitir()
  }

  olvidar(clave: string) {
    this.fallos.delete(clave)
    this.emitir()
  }

  async esperar() {
    await Promise.all(this.colas.values())
    if (this.fallos.size) throw new Error('Hay cambios sin guardar.')
  }

  async reintentar() {
    await Promise.allSettled([...this.fallos].map(([clave, escribir]) => this.guardar(clave, escribir)))
  }
}
