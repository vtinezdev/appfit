/** Un reintento conserva el id; cambiar el contenido o la audiencia constituye otro envío explícito. */
export function crearIdDeEnvio(generar: () => string = () => crypto.randomUUID()): (datos: unknown) => string {
  let firma: string | undefined
  let id: string | undefined
  return (datos) => {
    const siguiente = JSON.stringify(datos)
    if (id === undefined || siguiente !== firma) { id = generar(); firma = siguiente }
    return id
  }
}
