import { conseguido, type Logro } from '../../vitrina/lib/logros'
import { leerResumen, resumenLogro, type ResumenLogro } from './publicacion'

/** Logros que se pueden destacar a la vez en el perfil deportivo. */
export const MAX_DESTACADOS = 3

/** La medalla de un logro: el resumen de logro sin nota, como lo guarda el perfil. */
function sinNota({ nota: _, ...r }: ResumenLogro): ResumenLogro {
  return r
}

/**
 * Los logros destacados que llegan del servidor: con 0016, `logros` (medallas guardadas en el perfil); sin ella, el
 * resumen de las publicaciones de `destacados`. Sin nota, sin repetir logro y como mucho tres.
 */
export function leerLogrosDestacados(perfil: { logros?: unknown; destacados?: unknown }): ResumenLogro[] {
  const crudos = Array.isArray(perfil.logros) ? perfil.logros
    : Array.isArray(perfil.destacados) ? perfil.destacados.map(p => (p as { resumen?: unknown } | null)?.resumen) : []
  const logros = crudos.flatMap(x => { const r = leerResumen(x); return r?.tipo === 'logro' ? [sinNota(r)] : [] })
  return logros.filter((r, i) => logros.findIndex(o => o.logroId === r.logroId) === i).slice(0, MAX_DESTACADOS)
}

/** Marca o desmarca un logro; con los tres ocupados, marcar otro no cambia nada. */
export function alternarDestacado(destacados: ResumenLogro[], logro: ResumenLogro): ResumenLogro[] {
  if (destacados.some(d => d.logroId === logro.logroId)) return destacados.filter(d => d.logroId !== logro.logroId)
  return destacados.length >= MAX_DESTACADOS ? destacados : [...destacados, logro]
}

/** La medalla de un logro conseguido, en el nivel más alto alcanzado. */
const medalla = (l: Logro): ResumenLogro | null => (conseguido(l) ? resumenLogro(l) : null)

/**
 * Los elegidos al día: si la Vitrina tiene el logro, con su nivel de ahora; si no (Vitrina oculta, otro dispositivo),
 * como estaban guardados.
 */
export function destacadosAlDia(destacados: ResumenLogro[], locales: readonly Logro[]): ResumenLogro[] {
  return destacados.map(d => {
    const l = locales.find(x => x.id === d.logroId)
    return (l && medalla(l)) ?? d
  })
}

/**
 * Lo que ofrece la hoja de destacados: los logros desbloqueados (medallas al día, en el orden de la Vitrina, más los
 * elegidos que la Vitrina no tenga) y los que faltan por desbloquear, que solo se ven.
 */
export function opcionesDestacados(locales: readonly Logro[], destacados: ResumenLogro[]): { desbloqueados: ResumenLogro[]; bloqueados: Logro[] } {
  const propios = locales.flatMap(l => { const m = medalla(l); return m ? [m] : [] })
  const ajenos = destacados.filter(d => !propios.some(p => p.logroId === d.logroId))
  return { desbloqueados: [...ajenos, ...propios], bloqueados: locales.filter(l => !conseguido(l)) }
}
