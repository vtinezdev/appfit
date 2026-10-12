import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Settings } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import { formatNumber, leerDecimal } from '../../../shared/lib/format'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import * as creatinaRepo from '../data/creatinaRepo'
import { diaCreatina, dosisManualValida, pesoCreatinaValido } from '../lib/creatina'

export default function CreatinaAjustes({ settings }: { settings: Settings }) {
  const hoy = todayISO()
  const datos = useLiveQuery(() => creatinaRepo.leer(hoy), [hoy])
  const config = settings.creatina
  const [texto, setTexto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const enCurso = useRef(false)
  const dia = diaCreatina(hoy, config, datos?.kg)
  const dosisTexto = texto ?? (config?.dosisManualG === undefined ? '' : String(config.dosisManualG).replace('.', ','))

  async function ejecutar(accion: () => Promise<void>) {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(null)
    try { await accion() }
    catch { setError('No se ha podido guardar Creatina. Inténtalo de nuevo.') }
    finally { enCurso.current = false; setOcupado(false) }
  }
  async function guardarDosis() {
    const g = dosisTexto.trim() === '' ? undefined : leerDecimal(dosisTexto)
    if (dosisTexto.trim() !== '' && (g === undefined || !dosisManualValida(g))) {
      setError('Introduce una dosis mayor que 0 g, o deja el campo vacío para usar la automática.'); return
    }
    await ejecutar(async () => { await creatinaRepo.configurar({ dosisManualG: g }); setTexto(null) })
  }
  return <section aria-label="Creatina" className="space-y-stack">
    <SectionHeader variant="section">Creatina</SectionHeader>
    <label className="flex min-h-touch items-center gap-3 text-body-sm font-medium text-fg">
      <input type="checkbox" role="switch" checked={config?.activa === true} disabled={ocupado}
        onChange={e => { const activa = e.target.checked; void ejecutar(() => creatinaRepo.configurar({ activa })) }} />
      Activar Creatina
    </label>
    <p className="text-caption text-fg-muted">Dosis y registro diario en Inicio. No sube metros en Cumbres ni cuenta para rachas o logros. Desactivarla conserva tus registros.</p>
    {config?.activa && (datos === undefined ? <LoadingState /> : <div className="space-y-stack">
      <p className="text-body-sm text-fg">Mantenimiento: {formatNumber(dia.mantenimientoG, 2)} g al día.</p>
      <p className="text-caption text-fg-muted">Automática: 0,05 g/kg del último pesaje, mínimo 3 g y redondeada a 0,5 g. Sin pesaje: 3 g.</p>
      <div className="space-y-2">
        <label className="block space-y-2 text-body-sm text-fg">
          <span>Dosis manual de mantenimiento (g)</span>
          <Input type="text" inputMode="decimal" enterKeyHint="done" value={dosisTexto} disabled={ocupado}
            placeholder="Automática" onChange={e => setTexto(e.target.value)} />
        </label>
        <p className="text-caption text-fg-muted">Puedes usar la dosis del bote. Deja el campo vacío y guarda para volver a la automática.</p>
        <Button variant="secondary" disabled={ocupado} onClick={() => { void guardarDosis() }}>Guardar dosis</Button>
      </div>
      <div className="space-y-2">
        {dia.carga ? <>
          <p className="text-body-sm text-fg">Fase de carga · día {formatNumber(dia.diaCarga!)} de 5</p>
          <p className="text-caption text-fg-muted">{dia.dosisG === undefined ? 'Registra un peso para calcular la dosis de carga.' : `${formatNumber(dia.dosisG, 2)} g al día, repartidos en 4 tomas.`} Después pasa automáticamente a mantenimiento.</p>
          <Button variant="subtle" disabled={ocupado} onClick={() => { void ejecutar(() => creatinaRepo.configurar({ inicioCarga: undefined })) }}>Cancelar fase de carga</Button>
        </> : <>
          {dia.terminada && <p className="text-caption text-fg-muted">Fase de carga terminada. Ahora estás en mantenimiento.</p>}
          <p className="text-caption text-fg-muted">Carga opcional: 5 días a 0,3 g/kg al día, repartidos en 4 tomas. La dosis manual se aplica al mantenimiento.</p>
          {!pesoCreatinaValido(datos.kg) && <p className="text-caption text-fg-muted">Registra un peso para calcular la fase de carga.</p>}
          <Button variant="secondary" disabled={ocupado || !pesoCreatinaValido(datos.kg)} onClick={() => { void ejecutar(() => creatinaRepo.empezarCarga(hoy)) }}>Empezar fase de carga</Button>
        </>}
      </div>
    </div>)}
    {error && <ErrorState>{error}</ErrorState>}
  </section>
}
