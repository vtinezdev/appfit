import { useState } from 'react'
import type { Agarre, ConfiguracionEjecucion, Exercise } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import FilterChips from '../../../shared/components/FilterChips'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { ACCESORIOS, ANCHURAS, ORIENTACIONES, opcionesAgarre } from '../lib/ejecucion'

/** Una opción por dimensión: tocar la elegida la deja sin indicar. */
export function CamposAgarre({ ejercicio, valor, onChange, disabled }: { ejercicio: Exercise; valor?: Agarre; onChange: (a: Agarre | undefined) => void; disabled?: boolean }) {
  const visibles = opcionesAgarre(ejercicio)
  const campos = [
    { id: 'orientacion' as const, titulo: 'Orientación', opciones: ORIENTACIONES as Record<string, string> },
    { id: 'anchura' as const, titulo: 'Anchura', opciones: ANCHURAS as Record<string, string> },
    { id: 'accesorio' as const, titulo: 'Accesorio', opciones: ACCESORIOS as Record<string, string> },
  ].filter(c => visibles[c.id] || valor?.[c.id])
  return <div className="space-y-3">
    {campos.map(c => <FilterChips key={c.id} label={c.titulo} opciones={c.opciones} disabled={disabled} seleccion={valor?.[c.id] ? [valor[c.id]!] : []}
      onChange={sel => {
        const siguiente: Agarre = { ...valor, [c.id]: sel.find(x => x !== valor?.[c.id]) }
        if (!siguiente[c.id]) delete siguiente[c.id]
        onChange(Object.keys(siguiente).length ? siguiente : undefined)
      }} />)}
  </div>
}

type Lateralidad = 'bilateral' | 'unilateral'
type Registro = 'iguales' | 'lados'

export default function EjecucionEjercicio({ open, onClose, ejercicio, actual, onGuardar }: {
  open: boolean; onClose: () => void; ejercicio: Exercise; actual: ConfiguracionEjecucion
  onGuardar: (c: ConfiguracionEjecucion, habitual: boolean) => Promise<void>
}) {
  // Se monta al abrir: cada apertura parte de la variante vigente, sin arrastrar un borrador cancelado.
  const [valor, setValor] = useState<ConfiguracionEjecucion>(() => structuredClone(actual))
  const [habitual, setHabitual] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lateralidad: Lateralidad = valor.ejecucion === 'bilateral' ? 'bilateral' : 'unilateral'
  const cambiaRegistro = (valor.ejecucion !== actual.ejecucion) || (valor.ejecucion === 'unilateral' && (valor.kgUnilateral ?? 'lado') !== (actual.kgUnilateral ?? 'lado'))
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
            onChange={(v: Lateralidad) => setValor(c => ({ ...c, ejecucion: v === 'bilateral' ? 'bilateral' : 'unilateral', kgUnilateral: v === 'bilateral' ? undefined : c.kgUnilateral }))}
            opciones={[{ valor: 'bilateral', label: 'Bilateral' }, { valor: 'unilateral', label: 'Unilateral' }]} />
          {lateralidad === 'unilateral' && <>
            <SegmentedControl label="Registro de los lados" valor={valor.ejecucion === 'lados' ? 'lados' : 'iguales'}
              onChange={(v: Registro) => setValor(c => ({ ...c, ejecucion: v === 'lados' ? 'lados' : 'unilateral', kgUnilateral: v === 'lados' ? undefined : c.kgUnilateral }))}
              opciones={[{ valor: 'iguales', label: 'Ambos lados iguales' }, { valor: 'lados', label: 'Cada lado' }]} />
            {valor.ejecucion === 'unilateral'
              ? <SegmentedControl label="Los kg indican" size="sm" valor={valor.kgUnilateral ?? 'lado'}
                  onChange={(v: 'lado' | 'total') => setValor(c => ({ ...c, kgUnilateral: v }))}
                  opciones={[{ valor: 'lado', label: 'Kg de cada lado' }, { valor: 'total', label: 'Suma de ambos' }]} />
              : <p className="text-caption text-fg-muted">Cada serie tendrá una fila para la izquierda y otra para la derecha, con sus reps, kg y RIR.</p>}
          </>}
          {cambiaRegistro && <p className="text-body-sm text-fg-muted">Al guardar, las reps y kg de este ejercicio en la sesión se vacían para que los registres con el nuevo significado.</p>}
        </div>
        <CamposAgarre ejercicio={ejercicio} valor={valor.agarre} disabled={ocupado} onChange={agarre => setValor(c => ({ ...c, agarre }))} />
        <label className="flex min-h-touch items-center gap-3 text-body-sm"><input type="checkbox" checked={habitual} disabled={ocupado} onChange={e => setHabitual(e.target.checked)} />Recordar para próximas sesiones</label>
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
