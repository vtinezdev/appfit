import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import { todayISO } from '../../../shared/lib/dates'
import { marcarVistos } from '../data/logrosVistosRepo'
import { useVitrina } from '../hooks/useVitrina'
import { piezasPorCelebrar, type PiezaConseguida } from '../lib/logros'
import NuevosLogrosSheet from './NuevosLogrosSheet'

/**
 * Celebra cada pieza nueva de la Vitrina con la hoja de nuevos logros, en la pantalla en la que se consiga (punto 5 del
 * documento de mejoras). Vive en el shell; no se monta con el entreno en curso abierto, porque cada serie recalcularía la
 * Vitrina: lo de ese entreno sale al terminarlo. Al cerrar la hoja, sus piezas quedan como vistas (`logrosVistosRepo`).
 */
export default function CelebracionLogros() {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  const vistos = useLiveQuery(async () => (await getSettings()).logrosVistos ?? [], [])
  const [piezas, setPiezas] = useState<PiezaConseguida[] | null>(null)
  const [abierta, setAbierta] = useState(false)
  // Las ya mostradas en esta sesión no vuelven aunque la marca tarde en leerse (o falle al guardarse).
  const mostradas = useRef(new Set<string>())
  const pendientes = estado?.visible && vistos ? piezasPorCelebrar(estado.vitrina.logros, vistos, hoy).filter((p) => !mostradas.current.has(p.clave)) : []
  const claves = pendientes.map((p) => p.clave).join(',')

  useEffect(() => {
    if (piezas || !claves) return
    for (const p of pendientes) mostradas.current.add(p.clave)
    setPiezas(pendientes)
    setAbierta(true)
  }, [claves]) // eslint-disable-line react-hooks/exhaustive-deps -- `claves` resume `pendientes`

  if (!piezas) return null
  return <NuevosLogrosSheet nuevos={piezas.map((p) => p.nuevo)} open={abierta}
    onClose={() => { setAbierta(false); marcarVistos(piezas.map((p) => p.clave)).catch(() => undefined) }}
    onExited={() => setPiezas(null)} />
}
