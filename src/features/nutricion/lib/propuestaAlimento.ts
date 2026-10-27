/** Lo que se envía al proponer un alimento que falta en el catálogo («Proponer un alimento», ADR 061). */
export interface PropuestaAlimento {
  nombre: string
  marca: string
  codigo: string
  nota: string
}

export const LIMITES_PROPUESTA = { nombre: 120, marca: 80, nota: 1000 } as const

/** El error que impide enviarla, o `null`. El código de barras es opcional, pero si se pone, de 8 a 14 cifras. */
export function errorPropuesta(p: PropuestaAlimento): string | null {
  if (!p.nombre.trim()) return 'Escribe el nombre del alimento.'
  if (p.nombre.trim().length > LIMITES_PROPUESTA.nombre) return `El nombre, como mucho ${LIMITES_PROPUESTA.nombre} caracteres.`
  if (p.marca.trim().length > LIMITES_PROPUESTA.marca) return `La marca, como mucho ${LIMITES_PROPUESTA.marca} caracteres.`
  if (p.codigo.trim() && !/^\d{8,14}$/.test(p.codigo.trim())) return 'El código de barras son de 8 a 14 cifras, o déjalo vacío.'
  if (p.nota.trim().length > LIMITES_PROPUESTA.nota) return `La nota, como mucho ${LIMITES_PROPUESTA.nota} caracteres.`
  return null
}

/** El texto y los datos del mensaje: lo que la persona ve antes de enviar, sin nada más. */
export function mensajePropuesta(p: PropuestaAlimento): { texto: string; datos: Record<string, string | null> } {
  const limpio = (s: string) => s.trim().replace(/\s+/g, ' ')
  const nombre = limpio(p.nombre)
  const marca = limpio(p.marca)
  const codigo = p.codigo.trim()
  const nota = p.nota.trim()
  const lineas = [`Alimento: ${nombre}`, marca && `Marca: ${marca}`, codigo && `Código de barras: ${codigo}`, nota && `Nota: ${nota}`].filter(Boolean)
  return { texto: lineas.join('\n'), datos: { nombre, marca: marca || null, codigo: codigo || null } }
}
