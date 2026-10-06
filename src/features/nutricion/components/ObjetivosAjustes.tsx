import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import { Input } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Objetivos } from '../../../shared/db/types'
import { MACROS } from '../../../shared/design/macros'
import { formatInt } from '../../../shared/lib/format'
import { distribucionPCG } from '../lib/nutrition'
import { cuadrarObjetivos, kcalDeMacros, objetivosCuadran, reajustarObjetivos } from '../lib/objetivos'

interface Props {
  /** Objetivos vigentes: los de Ajustes, o los derivados del Perfil cuando este manda. */
  objetivos: Objetivos
  /** `perfil`: las kcal se calculan en Perfil y aquí son de solo lectura; los macros siguen editables. */
  origen?: 'perfil' | 'manual'
  onIrAPerfil?: () => void
  onGuardar: (objetivos: Objetivos) => void
}

const CAMPOS = [
  { campo: 'kcal', label: 'Calorías (kcal)', macro: MACROS.kcal },
  { campo: 'prot', label: 'Proteína (g)', macro: MACROS.prot },
  { campo: 'carb', label: 'Carbohidratos (g)', macro: MACROS.carbs },
  { campo: 'grasa', label: 'Grasa (g)', macro: MACROS.fat },
] as const

/** Campo que se está tecleando, con los objetivos que había al empezar (los demás se recalculan desde ahí). */
type Edicion = { campo: keyof Objetivos; texto: string; base: Objetivos }

/**
 * Objetivos diarios siempre cuadrados (4·P + 4·C + 9·G = kcal): al cambiar las kcal los macros conservan su reparto;
 * al cambiar un macro, los otros dos se ajustan a lo que queda. Junto a cada macro, su % de las kcal.
 */
export default function ObjetivosAjustes({ objetivos, origen = 'manual', onIrAPerfil, onGuardar }: Props) {
  const kcalDePerfil = origen === 'perfil'
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const mostrados = edicion && edicion.texto !== '' ? reajustarObjetivos(edicion.base, edicion.campo, Number(edicion.texto)) : objetivos
  const dist = distribucionPCG(mostrados)
  const descuadrados = !edicion && !objetivosCuadran(objetivos)

  function teclear(campo: keyof Objetivos, texto: string, base: Objetivos) {
    setEdicion({ campo, texto, base })
    // Un campo vacío a medio teclear no se guarda: al salir del campo se queda lo que había.
    if (texto !== '') onGuardar(reajustarObjetivos(base, campo, Number(texto)))
  }

  return (
    <section aria-label="Objetivos diarios" className="space-y-stack">
      <SectionHeader variant="section">Objetivos diarios</SectionHeader>
      <div className="space-y-3">
      {CAMPOS.map(({ campo, label, macro }) => kcalDePerfil && campo === 'kcal' ? (
        <div key={campo} className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm font-medium text-fg">{label}</span>
            <span className="tabular text-body font-semibold text-fg">{formatInt(mostrados.kcal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-fg-muted">Calculado en Perfil</p>
            {onIrAPerfil && <Button variant="ghost" size="sm" className="shrink-0" onClick={onIrAPerfil}>Ir a Perfil</Button>}
          </div>
        </div>
      ) : (
        <label key={campo} className="flex items-center justify-between gap-3">
          <span className="text-body-sm font-medium text-fg">{label}</span>
          <span className="flex items-center gap-3">
            {campo !== 'kcal' && (
              <span className="tabular flex w-12 items-center justify-end gap-1 text-caption text-fg-muted"><span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-pill ${macro.bg}`} />{dist[campo]} %</span>
            )}
            <Input
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
              value={edicion?.campo === campo ? edicion.texto : mostrados[campo]}
              onFocus={() => setEdicion({ campo, texto: String(objetivos[campo]), base: objetivos })}
              onChange={(e) => teclear(campo, e.target.value, edicion?.campo === campo ? edicion.base : objetivos)}
              onBlur={() => setEdicion(null)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="tabular no-spin w-24 text-right"
            />
          </span>
        </label>
      ))}
      <p className="text-caption text-fg-muted">Los cambios se guardan automáticamente.</p>
      {descuadrados ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption text-fg-subtle">
            Los macros suman {formatInt(kcalDeMacros(objetivos))} kcal, no {formatInt(objetivos.kcal)}.
          </p>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onGuardar(cuadrarObjetivos(objetivos))}>
            Cuadrar
          </Button>
        </div>
      ) : (
        <Disclosure title="Cómo se ajustan los objetivos"><p className="text-body-sm text-fg-muted">
          {kcalDePerfil ? 'Las calorías salen de tu Perfil. Si cambias un macro, los otros dos se ajustan para seguir sumando las mismas calorías.' : 'Si cambias las calorías, los macros mantienen su reparto. Si cambias un macro, los otros dos se ajustan para seguir sumando las mismas calorías.'}
        </p></Disclosure>
      )}
      </div>
    </section>
  )
}
