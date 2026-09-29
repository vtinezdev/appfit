import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as entriesRepo from '../data/entriesRepo'
import type { Comida, Entry } from '../../../shared/db/types'
import { addDays, formatFriendly, todayISO } from '../../../shared/lib/dates'
import { getSettings } from '../../../shared/db/settings'
import AccionesComidaSheet from '../components/AccionesComidaSheet'
import ComidaSection from '../components/ComidaSection'
import ComidasVacias from '../components/ComidasVacias'
import CopiarDiaSheet from '../components/CopiarDiaSheet'
import KcalDia from '../components/KcalDia'
import MacroBar from '../components/MacroBar'
import { useAviso } from '../../../shared/hooks/useAviso'
import { sumMacros } from '../lib/nutrition'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { LoadingState } from '../../../shared/components/StateMessage'
import Card from '../../../shared/components/Card'

interface Props {
  fecha: string
  onFechaChange: (fecha: string) => void
  onEditarEntry: (entry: Entry) => void
  onAnadir: () => void
}

const ORDEN_COMIDAS: Comida[] = ['desayuno', 'comida', 'cena', 'snack']
const LABELS: Record<Comida, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  snack: 'Snack',
}

export default function Hoy({ fecha, onFechaChange, onEditarEntry, onAnadir }: Props) {
  const ayer = addDays(fecha, -1)
  const entries = useLiveQuery(() => entriesRepo.delDia(fecha), [fecha])
  const entriesAyer = useLiveQuery(() => entriesRepo.delDia(ayer), [ayer])
  const settings = useLiveQuery(() => getSettings(), [])
  const { avisar, avisarError, toast } = useAviso()
  const [copiarDia, setCopiarDia] = useState<{ fechaDestino: string } | null>(null)
  const [copiandoDia, setCopiandoDia] = useState(false)
  const [repitiendo, setRepitiendo] = useState<Comida | null>(null)
  const [accionesComida, setAccionesComida] = useState<Comida | null>(null)
  // Sentido del último cambio de día, solo para orientar la transición (no afecta a los datos).
  const [navegacion, setNavegacion] = useState<{ fecha: string; sentido: 'next' | 'prev' | null }>({ fecha, sentido: null })
  if (navegacion.fecha !== fecha) setNavegacion({ fecha, sentido: fecha > navegacion.fecha ? 'next' : 'prev' })

  async function borrar(id: number) {
    const entry = await entriesRepo.borrar(id)
    if (entry) avisar({ mensaje: `Borrada «${entry.nombre}»`, onDeshacer: () => entriesRepo.restaurar([entry]) })
  }

  function avisarCopia(ids: number[]) {
    if (ids.length === 0) return
    const mensaje = ids.length === 1 ? '1 entrada copiada' : `${ids.length} entradas copiadas`
    avisar({ mensaje, onDeshacer: () => entriesRepo.borrarVarias(ids) })
  }

  async function confirmarCopiarDia() {
    if (!copiarDia || copiandoDia) return
    setCopiandoDia(true)
    try {
      const ids = await entriesRepo.copiar({ origen: { fecha }, destino: { fecha: copiarDia.fechaDestino } })
      setCopiarDia(null)
      avisarCopia(ids)
    } catch {
      avisarError('No se ha podido copiar el día. Inténtalo de nuevo.')
    } finally {
      setCopiandoDia(false)
    }
  }

  function avisarPlantillaGuardada(nombre: string) {
    avisar({ mensaje: `Plantilla «${nombre}» guardada` })
  }

  async function repetirDeAyer(c: Comida) {
    if (repitiendo) return
    setRepitiendo(c)
    try {
      avisarCopia(await entriesRepo.copiar({ origen: { fecha: ayer, comida: c }, destino: { fecha, comida: c } }))
    } catch {
      avisarError('No se ha podido repetir la comida. Inténtalo de nuevo.')
    } finally {
      setRepitiendo(null)
    }
  }

  const cargado = entries && settings
  const totales = cargado ? sumMacros(entries) : null
  const objetivos = settings?.objetivos

  const porComida = new Map<Comida, Entry[]>()
  for (const c of ORDEN_COMIDAS) porComida.set(c, [])
  for (const e of entries ?? []) porComida.get(e.comida)?.push(e)

  const porComidaAyer = new Map<Comida, number>()
  for (const e of entriesAyer ?? []) porComidaAyer.set(e.comida, (porComidaAyer.get(e.comida) ?? 0) + 1)

  const transicion = navegacion.sentido === 'next' ? 'animate-shift-next' : navegacion.sentido === 'prev' ? 'animate-shift-prev' : ''

  return (
    <div className="space-y-section pb-4">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-pill bg-surface shadow-raised">
          <IconButton icon="chevron-left" label="Día anterior" variant="ghost" onClick={() => onFechaChange(addDays(fecha, -1))} />
          <h2 key={fecha} aria-live="polite" className={`min-w-0 flex-1 truncate text-center text-title text-fg first-letter:uppercase ${transicion}`}>
            {formatFriendly(fecha)}
          </h2>
          <IconButton icon="chevron-right" label="Día siguiente" variant="ghost" onClick={() => onFechaChange(addDays(fecha, 1))} disabled={fecha >= todayISO()} />
        </div>
        <IconButton icon="more" label="Copiar el día" onClick={() => setCopiarDia({ fechaDestino: fecha })} />
      </div>

      {!cargado || !totales || !objetivos ? (
        <div className="animate-fade-in-late">
          <LoadingState />
        </div>
      ) : (
        <>
          <Card className="space-y-5">
            <KcalDia valor={totales.kcal} objetivo={objetivos.kcal} />
            <div className="grid grid-cols-3 gap-4 border-t border-line pt-5">
              <MacroBar macro="prot" valor={totales.prot} objetivo={objetivos.prot} />
              <MacroBar macro="carbs" valor={totales.carb} objetivo={objetivos.carb} />
              <MacroBar macro="fat" valor={totales.grasa} objetivo={objetivos.grasa} />
            </div>
          </Card>

          <div key={fecha} className={`space-y-section ${transicion}`}>
            {entries.length === 0 ? (
              <ComidasVacias
                ocupado={repitiendo !== null}
                repitiendo={repitiendo}
                comidas={ORDEN_COMIDAS.map((c) => ({
                  clave: c,
                  titulo: LABELS[c],
                  disponiblesAyer: porComidaAyer.get(c) ?? 0,
                  onRepetir: () => repetirDeAyer(c),
                }))}
              />
            ) : (
              ORDEN_COMIDAS.map((c) => {
                const items = porComida.get(c) ?? []
                const disponiblesAyer = porComidaAyer.get(c) ?? 0
                return (
                  <ComidaSection
                    key={c}
                    titulo={LABELS[c]}
                    entries={items}
                    onAcciones={() => setAccionesComida(c)}
                    onEditar={onEditarEntry}
                    onBorrar={(e) => borrar(e.id)}
                    vacioAccion={
                      disponiblesAyer > 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-x-3 px-1 text-body-sm text-fg-subtle">
                          <span>Sin registros</span>
                          <Button variant="ghost" size="sm" className="-mr-3" onClick={() => repetirDeAyer(c)} disabled={repitiendo !== null}>
                            <Icon name="copy" size={16} />
                            {repitiendo === c ? 'Repitiendo…' : `Repetir del día anterior (${disponiblesAyer})`}
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                )
              })
            )}
          </div>
          <Button size="lg" shape="pill" block onClick={onAnadir}>
            <Icon name="plus" size={22} />
            Añadir comida
          </Button>
        </>
      )}

      {toast}

      <CopiarDiaSheet
        open={copiarDia !== null}
        fechaOrigen={fecha}
        fechaDestino={copiarDia?.fechaDestino ?? fecha}
        onFechaDestinoChange={(f) => setCopiarDia((d) => (d ? { fechaDestino: f } : d))}
        onCopiar={confirmarCopiarDia}
        onClose={() => setCopiarDia(null)}
        copiando={copiandoDia}
      />

      {accionesComida && (
        <AccionesComidaSheet
          fecha={fecha}
          comida={accionesComida}
          entries={porComida.get(accionesComida) ?? []}
          onClose={() => setAccionesComida(null)}
          onCopiado={avisarCopia}
          onPlantillaGuardada={avisarPlantillaGuardada}
        />
      )}
    </div>
  )
}
