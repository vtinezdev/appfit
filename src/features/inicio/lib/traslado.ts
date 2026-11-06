// Aviso de cambio de dirección (despliegue.md § Preparación para Google Play, 3.1): al pasar de
// `appfit.vtinez-dev.workers.dev` a `cumbrafit.app`, los registros se quedan en la dirección vieja (IndexedDB va ligada al
// origen). La dirección nueva llega en el build (`VITE_DIRECCION_NUEVA`); el mismo build sirve las dos, así que el aviso
// sale solo donde el origen no es el nuevo. Sin la variable, nunca.
import type { EstadoCuenta } from '../../cuenta/copiaNube'
import { cuentaEnUso } from '../../cuenta/lib/estado'

export interface DireccionNueva {
  /** `https://cumbrafit.app` */
  origen: string
  /** `cumbrafit.app`, para los textos. */
  host: string
}

/** La dirección nueva configurada, solo si es una URL https válida (o http en local, para probar). */
export function direccionNueva(valor: string | undefined): DireccionNueva | null {
  if (!valor?.trim()) return null
  try {
    const url = new URL(valor.trim())
    const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    return { origen: url.origin, host: url.host }
  } catch {
    return null
  }
}

/** Si hay que avisar en este origen: hay dirección nueva y no es esta. */
export function hayQueTrasladar(origenActual: string, nueva: DireccionNueva | null): nueva is DireccionNueva {
  return nueva !== null && origenActual !== nueva.origen
}

/**
 * Cómo se lleva cada persona sus registros: con la cuenta y la copia al día, entrando en la nueva; con la cuenta pero la
 * copia pendiente o con algo que resolver, primero eso; sin cuenta (o sin copia), exportando e importando.
 */
export type CaminoTraslado = 'cuenta-al-dia' | 'cuenta-revisar' | 'copia'

export function caminoTraslado(conCuenta: boolean, estado: EstadoCuenta): CaminoTraslado {
  if (!conCuenta || !cuentaEnUso(estado)) return 'copia'
  return estado.fase === 'al-dia' ? 'cuenta-al-dia' : 'cuenta-revisar'
}

export function textoTraslado(camino: CaminoTraslado, host: string): string {
  switch (camino) {
    case 'cuenta-al-dia': return `Tu copia en la nube está al día. Abre ${host} y entra con tu cuenta: tus registros se traerán solos.`
    case 'cuenta-revisar': return `Antes de cambiar, deja al día tu copia en la nube. Después abre ${host} y entra con tu cuenta.`
    case 'copia': return `Tus registros están guardados en esta dirección y no pasan solos. Exporta una copia, abre ${host} e impórtala en Ajustes › Copias de seguridad.`
  }
}
