import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Ayuda from '../../../shared/components/Ayuda'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays, formatFriendly, parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber, leerDecimal } from '../../../shared/lib/format'
import * as creatinaRepo from '../data/creatinaRepo'
import { DIAS_CARGA, diaCreatina, dosisManualValida, pesoCreatinaValido } from '../lib/creatina'
import TarjetaAcceso from './TarjetaAcceso'

const gramos = (g: number) => `${formatNumber(g, 2)} g`
const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Creatina en Inicio: la tarjeta con la dosis de hoy y «Tomada hoy» y, al tocarla, una hoja con todo lo suyo (punto 24): la
 * toma de hoy, la fase de carga (empezar o cancelar), la dosis de mantenimiento y los últimos 7 días como una fila de
 * círculos (con check los tomados). Ajustes solo la activa o la apaga, en «Lo que usas».
 */
export default function CreatinaHoy({ hoy }: { hoy: string }) {
  const datos = useLiveQuery(() => creatinaRepo.leer(hoy), [hoy])
  const [abierta, setAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [texto, setTexto] = useState<string | null>(null)
  const enCurso = useRef(false)
  if (!datos?.config?.activa) return null
  const config = datos.config
  const dia = diaCreatina(hoy, config, datos.kg)
  const conPeso = pesoCreatinaValido(datos.kg)
  const estado = dia.carga ? `Carga · día ${formatNumber(dia.diaCarga!)} de ${formatNumber(DIAS_CARGA)}` : 'Mantenimiento'
  const marcados = new Set(datos.historial.map(t => t.fecha))
  const semana = Array.from({ length: 7 }, (_, i) => addDays(hoy, i - 6))
  const tomados = semana.filter((f) => marcados.has(f)).length
  const manual = config.dosisManualG !== undefined
  const dosisTexto = texto ?? (manual ? String(config.dosisManualG).replace('.', ',') : '')

  async function ejecutar(accion: () => Promise<void>, fallo: string) {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(null)
    try { await accion() }
    catch { setError(fallo) }
    finally { enCurso.current = false; setOcupado(false) }
  }
  const cambiar = (tomada: boolean) => ejecutar(() => creatinaRepo.marcar(todayISO(), tomada), 'No se ha podido guardar la toma. Inténtalo de nuevo.')
  const guardarCreatina = (accion: () => Promise<void>) => ejecutar(accion, 'No se ha podido guardar Creatina. Inténtalo de nuevo.')
  function guardarDosis() {
    const g = dosisTexto.trim() === '' ? undefined : leerDecimal(dosisTexto)
    if (dosisTexto.trim() !== '' && (g === undefined || !dosisManualValida(g))) {
      setError('Introduce una dosis mayor que 0 g, o deja el campo vacío para usar la automática.'); return
    }
    void guardarCreatina(async () => { await creatinaRepo.configurar({ dosisManualG: g }); setTexto(null) })
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
    <Sheet open={abierta} onClose={() => { setAbierta(false); setTexto(null); setError(null) }} title="Creatina">
      <div className="space-y-section">
        <div className="space-y-3">
          <div className="relative pr-10">
            <div className="absolute -right-2 -top-2"><Ayuda titulo="Cómo se calcula la creatina">
              <p><span className="font-semibold text-fg">Mantenimiento.</span> 0,05 g por kg de tu último pesaje, como mínimo 3 g y redondeado a 0,5 g. Sin pesaje, 3 g. Si pones la dosis de tu bote, manda la tuya.</p>
              <p><span className="font-semibold text-fg">Fase de carga.</span> Opcional: {formatNumber(DIAS_CARGA)} días a 0,3 g por kg al día, repartidos en 4 tomas, para llenar antes los depósitos. Después pasa sola a mantenimiento.</p>
              <p>No sube metros en Cumbres ni cuenta para rachas o logros. Se activa y se apaga en Ajustes › Lo que usas; apagarla conserva tus tomas.</p>
            </Ayuda></div>
            <p className="text-rotulo text-fg-muted">Hoy · {estado}</p>
            {dia.dosisG !== undefined
              ? <p className="flex items-baseline gap-1.5"><span className="tabular font-numeric text-metric text-fg">{formatNumber(dia.dosisG, 2)}</span><span className="text-body text-fg-muted">g</span></p>
              : <p className="text-title text-fg">Peso pendiente</p>}
            {dia.carga && <p className="text-caption text-fg-muted">{dia.dosisG === undefined ? 'Registra un peso en Inicio para calcular la carga.' : `En 4 tomas de ${gramos(Math.round(dia.dosisG / 4 * 100) / 100)}`}</p>}
          </div>
          {control}
        </div>

        <section aria-labelledby="creatina-carga" className="space-y-2">
          <h3 id="creatina-carga" className="text-title text-fg">Fase de carga</h3>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-muted p-3">
            <span className="tabular min-w-0 text-body-sm text-fg">{dia.carga
              ? `Día ${formatNumber(dia.diaCarga!)} de ${formatNumber(DIAS_CARGA)} · hasta el ${formatFriendly(dia.finCarga!)}`
              : !conPeso ? 'Registra un peso para calcularla' : `${formatNumber(DIAS_CARGA)} días · ${gramos(Math.round(datos.kg! * .3 * 100) / 100)} al día`}</span>
            {dia.carga
              ? <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => { void guardarCreatina(() => creatinaRepo.configurar({ inicioCarga: undefined })) }}>Cancelar</Button>
              : <Button variant="secondary" size="sm" disabled={ocupado || !conPeso} onClick={() => { void guardarCreatina(() => creatinaRepo.empezarCarga(hoy)) }}>Empezar</Button>}
          </div>
        </section>

        <section aria-labelledby="creatina-mantenimiento" className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="creatina-mantenimiento" className="text-title text-fg">Mantenimiento</h3>
            <span className="tabular text-body-sm text-fg-muted">{gramos(dia.mantenimientoG)} al día</span>
          </div>
          <div className="flex items-end gap-2">
            <label className="block min-w-0 flex-1 space-y-2 text-body-sm text-fg">
              <span>Dosis de tu bote (g)</span>
              <Input type="text" inputMode="decimal" enterKeyHint="done" value={dosisTexto} disabled={ocupado}
                placeholder="Automática" onChange={e => setTexto(e.target.value)} />
            </label>
            <Button variant="secondary" disabled={ocupado || texto === null} onClick={guardarDosis}>Guardar</Button>
          </div>
        </section>
        {error && <ErrorState>{error}</ErrorState>}

        <section aria-labelledby="creatina-dias" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="creatina-dias" className="text-title text-fg">Últimos 7 días</h3>
            <span className="tabular text-body-sm text-fg-muted">{formatNumber(tomados)} de 7</span>
          </div>
          <ol className="grid grid-cols-7 gap-1">{semana.map((fecha) => {
            const dow = parseISODate(fecha).getDay()
            const tomada = marcados.has(fecha)
            return <li key={fecha} className="flex flex-col items-center gap-1">
              <span aria-hidden className={`text-caption ${fecha === hoy ? 'font-bold text-fg' : 'text-fg-muted'}`}>{LETRAS[dow]}</span>
              <span aria-hidden className={`tabular flex h-9 w-9 items-center justify-center rounded-pill text-caption font-semibold ${tomada ? 'bg-accent text-accent-on' : `bg-surface-muted text-fg-subtle ${fecha === hoy ? 'border-2 border-dashed border-line-strong' : ''}`}`}>
                {tomada ? <Icon name="check" size={16} /> : Number(fecha.slice(8, 10))}
              </span>
              <span className="sr-only">{NOMBRES_DIA[dow]} {Number(fecha.slice(8, 10))}{fecha === hoy ? ' (hoy)' : ''}: {tomada ? 'tomada' : 'sin marcar'}</span>
            </li>
          })}</ol>
        </section>
      </div>
    </Sheet>
  </>
}
