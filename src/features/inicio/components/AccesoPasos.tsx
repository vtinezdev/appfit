import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import { getSettings } from '../../../shared/db/settings'
import type { Aviso } from '../../../shared/hooks/useAviso'
import { formatInt } from '../../../shared/lib/format'
import HojaPasos from '../../caminos/components/HojaPasos'
import HojaSemanaPasos from '../../caminos/components/HojaSemanaPasos'
import * as pasosRepo from '../../caminos/data/pasosRepo'
import { diaTexto, pasosTexto, zancadaDe } from '../../caminos/lib/pasos'
import { mensajeSemana, pasosDeSemana, type DiasSemana } from '../../caminos/lib/semanaPasos'
import { getPerfil } from '../../perfil/data/perfilRepo'
import TarjetaAcceso from './TarjetaAcceso'

interface Props {
  hoy: string
  avisar: (aviso: Aviso) => void
}

/**
 * Pasos en Inicio, al lado del agua: los de hoy y los de la semana (de lunes a hoy). La tarjeta abre «Apuntar pasos» con
 * los de hoy y «Semana» apunta la semana entera repartida; las dos con «Deshacer». Los mismos pasos que en Caminos.
 */
export default function AccesoPasos({ hoy, avisar }: Props) {
  const dias = useLiveQuery(() => pasosRepo.todos(), [])
  const zancada = useLiveQuery(async () => zancadaDe((await getSettings()).zancadaCm, await getPerfil()), [])
  // Montada con `key` para empezar de cero; `abierta` aparte para que se cierre con su animación.
  const [hoja, setHoja] = useState<{ cual: 'dia' | 'semana'; n: number } | null>(null)
  const [abierta, setAbierta] = useState(false)
  const apuntados = new Map((dias ?? []).map((d) => [d.fecha, d.pasos]))
  const deHoy = apuntados.get(hoy)
  const semana = pasosDeSemana(apuntados, hoy)

  const abrir = (cual: 'dia' | 'semana') => { setHoja({ cual, n: Date.now() }); setAbierta(true) }
  const cerrar = () => setAbierta(false)

  async function guardar(fecha: string, pasos: number) {
    const antes = await pasosRepo.guardar(fecha, pasos)
    cerrar()
    avisar({ mensaje: `${pasosTexto(pasos)} ${diaTexto(fecha, hoy)}`, onDeshacer: () => pasosRepo.restaurar(fecha, antes) })
  }

  async function guardarSemana(lunes: string, semanaNueva: DiasSemana) {
    const anteriores = await pasosRepo.guardarSemana(semanaNueva)
    cerrar()
    avisar({ mensaje: mensajeSemana(lunes, semanaNueva), onDeshacer: () => pasosRepo.restaurarSemana(anteriores) })
  }

  return <>
    <TarjetaAcceso etiqueta="Pasos" onAbrir={() => abrir('dia')}
      pie={<Button variant="subtle" size="sm" onClick={() => abrir('semana')}>Semana</Button>}>
      <span className="tabular flex flex-wrap items-baseline gap-x-1.5 text-fg">
        <span className="font-numeric text-heading">{deHoy !== undefined ? formatInt(deHoy) : '—'}</span>
        <span className="text-caption text-fg-muted">{deHoy !== undefined ? (deHoy === 1 ? 'paso hoy' : 'pasos hoy') : 'sin apuntar hoy'}</span>
      </span>
      <span className="tabular block break-words text-body-sm text-fg-muted">{semana > 0 ? `${formatInt(semana)} esta semana` : 'Nada esta semana'}</span>
    </TarjetaAcceso>
    {zancada && hoja?.cual === 'dia' && <HojaPasos key={hoja.n} open={abierta} onClose={cerrar} hoy={hoy} apuntados={apuntados} zancadaCm={zancada.cm}
      editando={deHoy !== undefined ? { fecha: hoy, pasos: deHoy } : undefined} onGuardar={guardar} />}
    {zancada && hoja?.cual === 'semana' && <HojaSemanaPasos key={hoja.n} open={abierta} onClose={cerrar} hoy={hoy} apuntados={apuntados} zancadaCm={zancada.cm}
      onGuardar={guardarSemana} />}
  </>
}
