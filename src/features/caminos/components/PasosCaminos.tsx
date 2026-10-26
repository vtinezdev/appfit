import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import FilaDeslizable from '../../../shared/components/FilaDeslizable'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Aviso } from '../../../shared/hooks/useAviso'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import * as caminosRepo from '../data/caminosRepo'
import * as pasosRepo from '../data/pasosRepo'
import { diaTexto, pasosTexto, type AportePasos, type Zancada } from '../lib/pasos'
import { mensajeSemana, type DiasSemana } from '../lib/semanaPasos'
import HojaPasos from './HojaPasos'
import HojaSemanaPasos from './HojaSemanaPasos'
import HojaZancada from './HojaZancada'

/** Días que se ven fuera del desplegable. */
const RECIENTES = 7

const ORIGEN_ZANCADA: Record<Zancada['origen'], string> = { propia: 'la tuya', altura: 'por tu altura', defecto: 'sin tu altura en Perfil' }

interface Props {
  hoy: string
  /** Día en que empezó Caminos (`undefined` si aún no): los pasos de antes no avanzan la ruta. */
  inicio: string | undefined
  aportes: readonly AportePasos[]
  zancada: Zancada
  zancadaEstimada: Zancada
  avisar: (aviso: Aviso) => void
  avisarError: (mensaje: string) => void
}

/** Lo que dieron los pasos de un día. */
function detalle(a: AportePasos, inicio: string | undefined): string {
  const km = `≈ ${kmTexto(a.metrosPasos)}`
  if (inicio === undefined) return km
  if (a.fecha < inicio) return `${km} · antes de empezar Caminos`
  if (a.metrosActividades === 0) return km
  return a.metros > 0 ? `${km} · +${kmTexto(a.metros)} sobre tus actividades` : `${km} · ya contados en tus actividades`
}

/** Caminos › Pasos: apuntar el total del móvil de cada día, la lista de días y la zancada. */
export default function PasosCaminos({ hoy, inicio, aportes, zancada, zancadaEstimada, avisar, avisarError }: Props) {
  const [hoja, setHoja] = useState<{ n: number; editando?: { fecha: string; pasos: number } } | null>(null)
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [semanaN, setSemanaN] = useState<number | null>(null)
  const [semanaAbierta, setSemanaAbierta] = useState(false)
  const [zancadaN, setZancadaN] = useState<number | null>(null)
  const [zancadaAbierta, setZancadaAbierta] = useState(false)
  const apuntados = new Map(aportes.map((a) => [a.fecha, a.pasos]))
  const dias = [...aportes].reverse()
  const deHoy = apuntados.get(hoy)

  const abrir = (editando?: { fecha: string; pasos: number }) => { setHoja({ n: Date.now(), editando }); setHojaAbierta(true) }

  async function guardar(fecha: string, pasos: number) {
    const antes = await pasosRepo.guardar(fecha, pasos)
    setHojaAbierta(false)
    avisar({ mensaje: `${pasosTexto(pasos)} ${diaTexto(fecha, hoy)}`, onDeshacer: () => pasosRepo.restaurar(fecha, antes) })
  }

  async function guardarSemana(lunes: string, semana: DiasSemana) {
    const anteriores = await pasosRepo.guardarSemana(semana)
    setSemanaAbierta(false)
    avisar({ mensaje: mensajeSemana(lunes, semana), onDeshacer: () => pasosRepo.restaurarSemana(anteriores) })
  }

  async function borrar(fecha: string) {
    try {
      const antes = await pasosRepo.borrar(fecha)
      if (antes) avisar({ mensaje: `Pasos de ${diaTexto(fecha, hoy).replace(/^el /, '')} borrados`, onDeshacer: () => pasosRepo.restaurar(fecha, antes) })
    } catch {
      avisarError('No se han podido borrar los pasos. Inténtalo de nuevo.')
    }
  }

  async function guardarZancada(cm: number | undefined) {
    const antes = await caminosRepo.guardarZancada(cm)
    setZancadaAbierta(false)
    avisar({ mensaje: cm === undefined ? 'Vuelves a la zancada estimada' : `Zancada de ${formatInt(cm)} cm`, onDeshacer: () => caminosRepo.guardarZancada(antes) })
  }

  const fila = (a: AportePasos) => <li key={a.fecha}>
    <FilaDeslizable etiqueta={`Borrar los pasos de ${diaTexto(a.fecha, hoy).replace(/^el /, '')}`} onBorrar={() => { void borrar(a.fecha) }}>
      <button type="button" onClick={() => abrir({ fecha: a.fecha, pasos: a.pasos })} className="app-button flex min-h-touch w-full items-center justify-between gap-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block break-words text-body font-medium text-fg">{formatFriendly(a.fecha)}</span>
          <span className="tabular block break-words text-body-sm text-fg-muted">{detalle(a, inicio)}</span>
        </span>
        <span className="tabular shrink-0 text-body-sm text-fg">{pasosTexto(a.pasos)}</span>
      </button>
    </FilaDeslizable>
  </li>

  return <section aria-label="Pasos" className="space-y-stack">
    <SectionHeader variant="section">Pasos</SectionHeader>
    <p className="break-words text-body-sm text-fg-muted">
      Apunta los que marca tu móvil{inicio === undefined ? '; avanzan tu Camino desde que eliges la primera ruta' : ''}. Lo que ya esté en tus actividades del día no cuenta dos veces.
    </p>
    {dias.length > 0 && <ListGroup aria-label="Pasos apuntados">{dias.slice(0, RECIENTES).map(fila)}</ListGroup>}
    {dias.length > RECIENTES && <Disclosure title={`Todos los días (${formatInt(dias.length)})`}>
      <ul className="app-list-flat divide-y divide-line" aria-label="Todos los días con pasos">{dias.slice(RECIENTES).map(fila)}</ul>
    </Disclosure>}
    <Button variant="secondary" size="sm" onClick={() => abrir(deHoy !== undefined ? { fecha: hoy, pasos: deHoy } : undefined)}>
      {deHoy !== undefined ? 'Cambiar los de hoy' : 'Apuntar los de hoy'}
    </Button>
    {dias.length > 0 && <Button variant="ghost" size="sm" onClick={() => abrir()}>Apuntar otro día</Button>}
    <Button variant="ghost" size="sm" onClick={() => { setSemanaN(Date.now()); setSemanaAbierta(true) }}>Apuntar una semana</Button>
    <div className="flex min-h-touch items-center justify-between gap-3">
      <span className="tabular min-w-0 break-words text-body-sm text-fg-muted">Zancada de {formatInt(zancada.cm)} cm, {ORIGEN_ZANCADA[zancada.origen]}</span>
      <Button variant="subtle" size="sm" onClick={() => { setZancadaN(Date.now()); setZancadaAbierta(true) }}>Cambiar</Button>
    </div>

    {hoja && <HojaPasos key={hoja.n} open={hojaAbierta} onClose={() => setHojaAbierta(false)} hoy={hoy} editando={hoja.editando} apuntados={apuntados}
      zancadaCm={zancada.cm} onGuardar={guardar} />}
    {semanaN !== null && <HojaSemanaPasos key={semanaN} open={semanaAbierta} onClose={() => setSemanaAbierta(false)} hoy={hoy} apuntados={apuntados}
      zancadaCm={zancada.cm} onGuardar={guardarSemana} />}
    {zancadaN !== null && <HojaZancada key={zancadaN} open={zancadaAbierta} onClose={() => setZancadaAbierta(false)} zancada={zancada} estimada={zancadaEstimada}
      onGuardar={guardarZancada} />}
  </section>
}
