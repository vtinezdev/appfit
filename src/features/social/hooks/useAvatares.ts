import { useEffect, useState } from 'react'
import type { Avatar } from '../lib/avatar'
import { cargarSocial } from '../servicio'

/**
 * Avatares (catálogo o logro elegido) de las personas que se ven en pantalla, pedidos de una vez por lista y recordados mientras
 * la app está abierta. La clave lleva la comunidad: lo visible desde un grupo no se mezcla con lo de seguidores. `null`
 * = sin avatar visible (monograma). Si falla la lectura, monograma: no merece un error en pantalla.
 */
const recordados = new Map<string, Avatar | null>()
const pedidos = new Set<string>()
const oyentes = new Set<() => void>()
const clave = (alias: string, comunidad?: string) => `${comunidad ?? ''}|${alias}`

/** Tras cambiar el propio avatar: lo que está en pantalla se vuelve a pedir. */
export function olvidarAvatares() {
  recordados.clear()
  for (const avisar of oyentes) avisar()
}

/** Al entrar en Social (antes de pintar nada): alguien puede haber cambiado el suyo. No avisa a nadie. */
export function reiniciarAvatares() {
  recordados.clear()
}

export function useAvatares(alias: string[], comunidad?: string): Record<string, Avatar> {
  const [, setVuelta] = useState(0)
  useEffect(() => {
    const avisar = () => setVuelta(v => v + 1)
    oyentes.add(avisar)
    return () => { oyentes.delete(avisar) }
  }, [])
  const unicos = [...new Set(alias)]
  const faltan = unicos.filter(a => !recordados.has(clave(a, comunidad)) && !pedidos.has(clave(a, comunidad)))
  const firma = faltan.join('|')
  useEffect(() => {
    if (!faltan.length) return
    for (const a of faltan) pedidos.add(clave(a, comunidad))
    const anotar = (encontrados: Record<string, Avatar>) => {
      for (const a of faltan) { recordados.set(clave(a, comunidad), encontrados[a] ?? null); pedidos.delete(clave(a, comunidad)) }
      for (const avisar of oyentes) avisar()
    }
    cargarSocial().then(s => s.avatares(faltan, comunidad)).then(anotar, () => anotar({}))
    // `faltan` se recalcula en cada render; lo que decide cuándo pedir es su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, comunidad])
  const salida: Record<string, Avatar> = {}
  for (const a of unicos) {
    const r = recordados.get(clave(a, comunidad))
    if (r) salida[a] = r
  }
  return salida
}
