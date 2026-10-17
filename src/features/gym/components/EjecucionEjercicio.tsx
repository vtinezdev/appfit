import { useState } from 'react'
import type { Agarre, ConfiguracionEjecucion, Exercise } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import FilterChips from '../../../shared/components/FilterChips'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { ejecucionVigente, vaciaRegistro } from '../lib/ejecucion'
import { CAMPOS_AGARRE, perfilAgarre, cambiarAgarre, textoAgarre, type CampoAgarre } from '../lib/agarres'

/** Una opción por dimensión: tocar la elegida la deja sin indicar. */
export function CamposAgarre({ ejercicio, valor, onChange, disabled }: { ejercicio: Exercise; valor?: Agarre; onChange: (a: Agarre | undefined) => void; disabled?: boolean }) {
  const perfil = perfilAgarre(ejercicio, valor)
  const titulos = { orientacion: 'Orientación', anchura: 'Anchura', accesorio: 'Accesorio' }
  const fuera = valor && (Object.keys(valor) as CampoAgarre[]).some(k => !(perfil[k] as readonly string[]).includes(valor[k]!))
  return <div className="space-y-3">
    {(['accesorio', 'orientacion', 'anchura'] as CampoAgarre[]).filter(k => perfil[k].length).map(k => {
      const opciones = Object.fromEntries(perfil[k].map(id => [id, (CAMPOS_AGARRE[k] as Record<string, string>)[id]]))
      return perfil[k].length === 1 ? <p key={k} className="text-body-sm text-fg-muted">{titulos[k]}: <span className="font-semibold text-fg">{Object.values(opciones)[0]}</span> · Propio del ejercicio</p> :
        <FilterChips<string> key={k} label={titulos[k]} opciones={opciones} disabled={disabled} seleccion={valor?.[k] ? [valor[k]!] : []}
          onChange={sel => onChange(cambiarAgarre(ejercicio, valor, k, sel.find(x => x !== valor?.[k])))} />
    })}
    {perfil.orientacion.length > 1 && <p className="text-caption text-fg-muted">Prono: palmas hacia fuera. Supino: hacia ti. Neutro: palmas enfrentadas.{perfil.orientacion.includes('mixto') && ' Mixto: una mano en prono y otra en supino.'}</p>}
    {fuera && <p className="text-body-sm text-fg-muted">Agarre anterior: {textoAgarre(valor)}. Se conserva hasta que lo cambies.</p>}
    {valor && <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(undefined)}>Dejar agarre sin especificar</Button>}
  </div>
}

type Lateralidad = 'bilateral' | 'unilateral'

export default function EjecucionEjercicio({ open, onClose, ejercicio, actual, onGuardar }: {
  open: boolean; onClose: () => void; ejercicio: Exercise; actual: ConfiguracionEjecucion
  onGuardar: (c: ConfiguracionEjecucion, habitual: boolean) => Promise<void>
}) {
  // Se monta al abrir: cada apertura parte de la variante vigente, sin arrastrar un borrador cancelado.
  const [valor, setValor] = useState<ConfiguracionEjecucion>(() => structuredClone(ejecucionVigente(actual)))
  const [habitual, setHabitual] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lateralidad: Lateralidad = valor.ejecucion === 'bilateral' ? 'bilateral' : 'unilateral'
  const cambiaRegistro = vaciaRegistro(actual, valor)
  async function guardar() {
    setOcupado(true); setError(null)
    try { await onGuardar(valor, habitual); onClose() } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.') } finally { setOcupado(false) }
  }
  return (
    <Sheet open={open} onClose={() => { if (!ocupado) onClose() }} title={`Variante · ${ejercicio.nombre}`}
      footer={<div className="space-y-2"><Button block loading={ocupado} onClick={guardar}>Guardar variante</Button><Button block variant="ghost" disabled={ocupado} onClick={onClose}>Cancelar</Button></div>}>
      <div className="space-y-section">
        <div className="space-y-3">
          <SegmentedControl label="Ejecución" valor={lateralidad}
            onChange={(v: Lateralidad) => setValor(c => ({ ...c, ejecucion: v === 'bilateral' ? 'bilateral' : 'lados' }))}
            opciones={[{ valor: 'bilateral', label: 'Bilateral' }, { valor: 'unilateral', label: 'Unilateral' }]} />
          {lateralidad === 'unilateral' && <p className="text-caption text-fg-muted">Una fila por lado, con los kg de cada lado. Lo que pongas en la izquierda se copia en la derecha hasta que cambies la derecha.</p>}
          {cambiaRegistro && <p className="text-body-sm text-fg-muted">Al guardar, las reps y kg de este ejercicio en la sesión se vacían para que los registres con el nuevo significado.</p>}
        </div>
        <CamposAgarre ejercicio={ejercicio} valor={valor.agarre} disabled={ocupado} onChange={agarre => setValor(c => ({ ...c, agarre }))} />
        <label className="flex min-h-touch items-center gap-3 text-body-sm"><input type="checkbox" checked={habitual} disabled={ocupado} onChange={e => setHabitual(e.target.checked)} />Recordar para próximas sesiones</label>
        {habitual && <p className="text-caption text-fg-muted">Las rutinas que tienen un agarre elegido conservarán ese agarre.</p>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
