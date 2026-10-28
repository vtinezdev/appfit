import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import { todayISO } from '../../../shared/lib/dates'
import { marcarVistos } from '../data/logrosVistosRepo'
import { useVitrina } from '../hooks/useVitrina'
import { DIAS_CELEBRAR, piezasPorCelebrar, type PiezaConseguida } from '../lib/logros'
import NuevosLogrosSheet from './NuevosLogrosSheet'
import LlegadaRutaSheet from '../../caminos/components/LlegadaRutaSheet'
import * as caminosRepo from '../../caminos/data/caminosRepo'
import { confirmarRuta, llegadaPorCelebrar, type Expedicion } from '../../caminos/lib/caminos'

/**
 * Celebra cada pieza nueva de la Vitrina con la hoja de nuevos logros, en la pantalla en la que se consiga (punto 5 del
 * documento de mejoras), y, después, la llegada al final de una ruta de Caminos con la elección de la siguiente (punto 4). Vive en el shell; no se monta con el entreno en curso abierto, porque cada serie recalcularía la
 * Vitrina: lo de ese entreno sale al terminarlo. Al cerrar la hoja, sus piezas quedan como vistas (`logrosVistosRepo`).
 */
export default function CelebracionLogros({ onElegirRuta }: { onElegirRuta: () => void }) {
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

  // La llegada, cuando no hay logros por enseñar (van antes); la clave queda vista al cerrar, como las piezas.
  const [llegada, setLlegada] = useState<{ clave: string; llegada: Expedicion; sugerida: Expedicion } | null>(null)
  const [llegadaAbierta, setLlegadaAbierta] = useState(false)
  const caminos = estado?.visible && estado.caminos?.visible ? estado.caminos.caminos : null
  const porCelebrar = vistos && !claves ? llegadaPorCelebrar(caminos, vistos, hoy, DIAS_CELEBRAR) : null
  const pendienteLlegada = porCelebrar && !mostradas.current.has(porCelebrar.clave) ? porCelebrar : null
  useEffect(() => {
    if (piezas || llegada || !pendienteLlegada || !caminos) return
    mostradas.current.add(pendienteLlegada.clave)
    setLlegada({ ...pendienteLlegada, sugerida: caminos.actual })
    setLlegadaAbierta(true)
  }, [piezas, pendienteLlegada?.clave]) // eslint-disable-line react-hooks/exhaustive-deps -- la clave resume la llegada

  const cerrarLlegada = () => { setLlegadaAbierta(false); if (llegada) marcarVistos([llegada.clave]).catch(() => undefined) }
  async function seguir() {
    const config = (await getSettings()).caminos
    if (!config || !caminos) throw new Error('Sin Caminos')
    await caminosRepo.guardar(confirmarRuta(config, caminos))
    cerrarLlegada()
  }

  if (llegada && !piezas) return <LlegadaRutaSheet llegada={llegada.llegada} sugerida={llegada.sugerida} open={llegadaAbierta}
    onClose={cerrarLlegada} onExited={() => setLlegada(null)} onElegir={() => { cerrarLlegada(); onElegirRuta() }} onSeguir={seguir} />
  if (!piezas) return null
  return <NuevosLogrosSheet nuevos={piezas.map((p) => p.nuevo)} open={abierta}
    onClose={() => { setAbierta(false); marcarVistos(piezas.map((p) => p.clave)).catch(() => undefined) }}
    onExited={() => setPiezas(null)} />
}
