import { useEffect, useState } from 'react'
import { cargarSocial } from '../servicio'

/**
 * Si quien usa la app es administrador (0017), preguntado una vez y recordado mientras la app está abierta. Mientras
 * llega, o si falla, `false`: lo de administración nunca aparece por error. El servidor comprueba cada acción igualmente.
 */
let pregunta: Promise<boolean> | null = null
let respuesta: boolean | null = null

/** Al entrar en Social o Amigos (puede haber cambiado de cuenta). */
export function reiniciarAdmin() {
  pregunta = null
  respuesta = null
}

export function useAdmin(): boolean {
  const [admin, setAdmin] = useState(respuesta === true)
  useEffect(() => {
    let vivo = true
    pregunta ??= cargarSocial().then(s => s.soyAdmin()).then(r => (respuesta = r), () => { pregunta = null; return false })
    void pregunta.then(r => { if (vivo) setAdmin(r) })
    return () => { vivo = false }
  }, [])
  return admin
}
