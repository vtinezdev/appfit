import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays, formatFriendly, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as creatinaRepo from '../data/creatinaRepo'
import { diaCreatina } from '../lib/creatina'
import TarjetaAcceso from './TarjetaAcceso'

export default function CreatinaHoy({ hoy }: { hoy: string }) {
  const datos = useLiveQuery(() => creatinaRepo.leer(hoy), [hoy])
  const [abierta, setAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enCurso = useRef(false)
  if (!datos?.config?.activa) return null
  const dia = diaCreatina(hoy, datos.config, datos.kg)
  const estado = dia.carga ? `Carga · día ${formatNumber(dia.diaCarga!)} de 5` : 'Mantenimiento'
  const marcados = new Set(datos.historial.map(t => t.fecha))
  async function cambiar(tomada: boolean) {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(null)
    try { await creatinaRepo.marcar(todayISO(), tomada) }
    catch { setError('No se ha podido guardar la toma. Inténtalo de nuevo.') }
    finally { enCurso.current = false; setOcupado(false) }
  }
  const control = <Button variant="secondary" block disabled={ocupado} aria-pressed={datos.tomada}
    onClick={() => { void cambiar(!datos.tomada) }}>
    <Icon name={datos.tomada ? 'check' : 'plus'} size={20} className={datos.tomada ? 'text-success' : 'text-fg-muted'} />Tomada hoy
  </Button>
  return <>
    <div className="space-y-2">
      <TarjetaAcceso etiqueta="Creatina" onAbrir={() => setAbierta(true)} pie={control}>
        <span className="flex flex-wrap items-baseline gap-2 tabular text-fg">
          {dia.dosisG !== undefined ? <><span className="font-numeric text-heading">{formatNumber(dia.dosisG, 2)}</span><span className="text-caption text-fg-muted">g hoy</span></> : <span className="text-body-sm text-fg-muted">Peso pendiente</span>}
        </span>
        <span className="text-body-sm text-fg-muted">{estado}</span>
      </TarjetaAcceso>
      {!abierta && error && <ErrorState>{error}</ErrorState>}
    </div>
    <Sheet open={abierta} onClose={() => setAbierta(false)} title="Creatina">
      <div className="space-y-section">
        <div className="space-y-2">
          <p className="text-body font-semibold text-fg">{dia.dosisG === undefined ? 'Registra un peso para calcular la carga.' : `${formatNumber(dia.dosisG, 2)} g hoy`} · {estado}</p>
          {dia.carga && <p className="text-caption text-fg-muted">Reparte la dosis en 4 tomas y marca «Tomada hoy» al completar el día.</p>}
          {dia.terminada && <p className="text-caption text-fg-muted">Fase de carga terminada.</p>}
          {control}
          {error && <ErrorState>{error}</ErrorState>}
        </div>
        <section aria-label="Últimos 7 días" className="space-y-2">
          <h3 className="text-label text-fg-muted">Últimos 7 días</h3>
          <ul className="divide-y divide-line">{Array.from({ length: 7 }, (_, i) => addDays(hoy, -i)).map(fecha =>
            <li key={fecha} className="flex min-h-touch flex-wrap items-center justify-between gap-3 text-body-sm">
              <span className="text-fg-muted">{formatFriendly(fecha)}</span><span className="font-semibold text-fg">{marcados.has(fecha) ? 'Tomada' : 'Sin marcar'}</span>
            </li>)}
          </ul>
        </section>
        <p className="text-caption text-fg-muted">Puedes cambiar la dosis o la fase de carga en Ajustes › Creatina.</p>
      </div>
    </Sheet>
  </>
}
