import Sheet from '../../../shared/components/Sheet'
import { validarKcalRapidas, type KcalRapidasDraft } from '../lib/alimentos'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  open: boolean
  valor: KcalRapidasDraft
  onChange: (patch: Partial<KcalRapidasDraft>) => void
  onGuardar: () => void
  onClose: () => void
  guardando?: boolean
  error?: string | null
}

const MACROS: { key: 'prot' | 'carb' | 'grasa'; label: string }[] = [
  { key: 'prot', label: 'Proteína' },
  { key: 'carb', label: 'Carbohidr.' },
  { key: 'grasa', label: 'Grasa' },
]

const ETIQUETA = 'mb-1 block text-caption text-fg-subtle'

/**
 * Formulario de «Kcal rápidas» (A5): para una comida fuera que no merece registrarse con detalle.
 * Las kcal son lo único obligatorio y llevan el campo principal; los macros son opcionales.
 */
export default function KcalRapidasSheet({ open, valor, onChange, onGuardar, onClose, guardando = false, error = null }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Kcal rápidas">
      <div className="space-y-4">
        <label className="block">
          <span className={ETIQUETA}>Nombre</span>
          <Input value={valor.nombre} onChange={(e) => onChange({ nombre: e.target.value })} placeholder="Comida fuera" />
        </label>
        <label className="block">
          <span className={ETIQUETA}>Calorías</span>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              className="no-spin pr-14 font-semibold"
              value={valor.kcal}
              onChange={(e) => onChange({ kcal: Number(e.target.value) || 0 })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-sm text-fg-subtle">kcal</span>
          </div>
        </label>
        <fieldset>
          <legend className={ETIQUETA}>Opcional · gramos</legend>
          <div className="grid grid-cols-3 gap-2">
            {MACROS.map(({ key, label }) => (
              <label key={key} className="block min-w-0">
                <span className="mb-1 block truncate text-caption text-fg-muted">{label}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="no-spin"
                  value={valor[key]}
                  onChange={(e) => onChange({ [key]: Number(e.target.value) || 0 })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={guardando} onClick={onGuardar} disabled={!validarKcalRapidas(valor)}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </Sheet>
  )
}
