import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import { formatNumber } from '../../shared/lib/format'
import { todayISO } from '../../shared/lib/dates'
import { useAviso } from '../../shared/hooks/useAviso'
import * as pesosRepo from '../inicio/data/pesosRepo'
import RegistrarPesoSheet from '../inicio/components/RegistrarPesoSheet'
import * as perfilRepo from './data/perfilRepo'
import { actualizarObjetivoHoy } from './data/objetivosDiaRepo'
import DatosPerfil, { type CampoEditable } from './components/DatosPerfil'
import EditarDatoSheet from './components/EditarDatoSheet'
import ResultadoEnergia from './components/ResultadoEnergia'
import GastoObservadoCard from './components/GastoObservadoCard'
import MedidasCorporales from './components/MedidasCorporales'

const PESO_POR_DEFECTO = 70

/** Perfil: resultado de la estimación arriba, datos editables debajo. La explicación completa vive en Referencias. */
export default function PerfilTab({ onVerMetodo }: { onVerMetodo: () => void }) {
  const hoy = todayISO()
  const estado = useLiveQuery(() => perfilRepo.estadoEnergetico(hoy), [hoy])
  const { avisar, avisarError, toast } = useAviso()
  const [campo, setCampo] = useState<Exclude<CampoEditable, 'peso'>>('sexo')
  const [abierto, setAbierto] = useState(false)
  const [pesoAbierto, setPesoAbierto] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  /** kcal objetivo al guardar un dato aquí; el siguiente cambio del resultado se avisa una sola vez. */
  const esperando = useRef<{ antes: number | null } | null>(null)

  const kcal = estado?.energia.estado === 'ok' ? estado.energia.objetivoKcal : null
  useEffect(() => {
    const e = esperando.current
    if (!e) return
    esperando.current = null
    if (kcal !== null && kcal !== e.antes) avisar({ mensaje: `Objetivo actualizado: ${formatNumber(kcal)} kcal` })
  }, [kcal, estado, avisar])

  function editar(c: CampoEditable) {
    setAperturas((n) => n + 1)
    if (c === 'peso') setPesoAbierto(true)
    else { setCampo(c); setAbierto(true) }
  }
  function recordarObjetivo() { esperando.current = { antes: kcal } }

  async function guardarPeso(kg: number) {
    recordarObjetivo()
    await pesosRepo.registrar(hoy, kg)
    void actualizarObjetivoHoy(hoy, 'peso')
    setPesoAbierto(false)
  }
  async function borrar() {
    try {
      const anterior = await perfilRepo.borrarPerfil()
      void actualizarObjetivoHoy(hoy, 'perfil')
      avisar({ mensaje: 'Datos del perfil borrados', onDeshacer: async () => { await perfilRepo.restaurarPerfil(anterior); void actualizarObjetivoHoy(hoy, 'perfil') } })
    } catch {
      avisarError('No se han podido borrar los datos del perfil.')
    }
  }

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Perfil" overline="Tus datos para estimar tu energía diaria" />
    {!estado ? <LoadingState /> : <>
      <ResultadoEnergia perfil={estado.perfil} energia={estado.energia} onElegirObjetivo={() => editar('objetivo')} onVerMetodo={onVerMetodo} />
      <GastoObservadoCard perfil={estado.perfil} energia={estado.energia} observado={estado.observado} hoy={hoy} />
      <DatosPerfil perfil={estado.perfil} peso={estado.peso} hoy={hoy} onEditar={editar} onBorrar={borrar} />
      <MedidasCorporales />
      <EditarDatoSheet key={aperturas} campo={campo} open={abierto} perfil={estado.perfil} pesoKg={estado.peso?.kg} hoy={hoy}
        onClose={() => setAbierto(false)} onAntesDeGuardar={recordarObjetivo} />
      <RegistrarPesoSheet key={`peso-${aperturas}`} open={pesoAbierto} onClose={() => setPesoAbierto(false)}
        pesoInicial={estado.peso?.kg ?? PESO_POR_DEFECTO} onGuardar={guardarPeso} />
    </>}
    {toast}
  </div>
}
