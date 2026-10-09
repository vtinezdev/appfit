import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import { addDays, todayISO } from '../../../shared/lib/dates'
import { actualizarObjetivoHoy } from '../../perfil/data/objetivosDiaRepo'
import { getPerfil } from '../../perfil/data/perfilRepo'
import * as pesosRepo from '../data/pesosRepo'
import { resolverObjetivoAgua } from '../lib/agua'
import { tendenciaPeso } from '../lib/peso'
import AguaSheet from './AguaSheet'
import RegistrarPesoSheet from './RegistrarPesoSheet'

const PESO_POR_DEFECTO = 70

/**
 * Registrar peso o añadir agua desde las acciones rápidas de la barra, con las mismas hojas y escrituras que Inicio.
 * `apertura` cambia en cada apertura (el selector de peso arranca en el último pesaje); el aviso de éxito lo da quien lo abre.
 */
export default function RegistroRapido({ que, apertura, onCerrar, onPesoGuardado }: { que: 'peso' | 'agua' | null; apertura: number; onCerrar: () => void; onPesoGuardado: () => void }) {
  const hoy = todayISO()
  const pesos = useLiveQuery(() => pesosRepo.delRango(addDays(hoy, -365), hoy), [hoy])
  const objetivoAgua = useLiveQuery(async () => resolverObjetivoAgua((await getSettings()).aguaObjetivoMl, (await getPerfil()).sexo), [])
  const tendencia = pesos ? tendenciaPeso(pesos, hoy) : null

  async function guardarPeso(kg: number) {
    await pesosRepo.registrar(hoy, kg)
    void actualizarObjetivoHoy(hoy, 'peso')
    onCerrar()
    onPesoGuardado()
  }

  return <>
    <RegistrarPesoSheet key={apertura} open={que === 'peso' && pesos !== undefined} onClose={onCerrar} pesoInicial={tendencia?.actual ?? PESO_POR_DEFECTO} onGuardar={guardarPeso} />
    <AguaSheet open={que === 'agua'} onClose={onCerrar} hoy={hoy} objetivo={objetivoAgua ?? null} />
  </>
}
