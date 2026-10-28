import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { Input } from '../../../shared/components/Input'
import type { Objetivos } from '../../../shared/db/types'
import { MACROS } from '../../../shared/design/macros'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { distribucionPCG } from '../lib/nutrition'
import { reajustarConProteinaFija, type AjusteProteina } from '../../perfil/lib/proteina'

import { cuadrarObjetivos, kcalDeMacros, objetivosCuadran, reajustarObjetivos } from '../lib/objetivos'

interface Props {
  /** Objetivos vigentes: los de Ajustes, o los derivados del Perfil cuando este manda. */
  objetivos: Objetivos
  /** `perfil`: las kcal se calculan en Perfil y aquí son de solo lectura; los macros siguen editables. */
  origen?: 'perfil' | 'manual'
  onIrAPerfil?: () => void
  /** Proteína calculada con g/kg × peso en Perfil: el campo es de solo lectura y los demás la respetan. */
  proteinaPorKg?: AjusteProteina
  onGuardar: (objetivos: Objetivos) => void
}

const MACROS_FILAS = [
  { campo: 'prot', macro: MACROS.prot },
  { campo: 'carb', macro: MACROS.carbs },
  { campo: 'grasa', macro: MACROS.fat },
] as const

/** Campo que se está tecleando, con los objetivos que había al empezar (los demás se recalculan desde ahí). */
type Edicion = { campo: keyof Objetivos; texto: string; base: Objetivos }

/**
 * Objetivos diarios siempre cuadrados (4·P + 4·C + 9·G = kcal): al cambiar las kcal los macros conservan su reparto;
 * al cambiar un macro, los otros dos se ajustan a lo que queda. Junto a cada macro, su % de las kcal.
 */
export default function ObjetivosAjustes({ objetivos, origen = 'manual', onIrAPerfil, proteinaPorKg, onGuardar }: Props) {
  const reajustar = (base: Objetivos, campo: keyof Objetivos, valor: number) => proteinaPorKg && campo !== 'prot' ? reajustarConProteinaFija(base, campo, valor) : reajustarObjetivos(base, campo, valor)
  const kcalDePerfil = origen === 'perfil'
  const [edicion, setEdicion] = useState<Edicion | null>(null)
  const mostrados = edicion && edicion.texto !== '' ? reajustar(edicion.base, edicion.campo, Number(edicion.texto)) : objetivos
  const dist = distribucionPCG(mostrados)
  const descuadrados = !edicion && !objetivosCuadran(objetivos)

  function teclear(campo: keyof Objetivos, texto: string, base: Objetivos) {
    setEdicion({ campo, texto, base })
    // Un campo vacío a medio teclear no se guarda: al salir del campo se queda lo que había.
    if (texto !== '') onGuardar(reajustar(base, campo, Number(texto)))
  }

  const campoInput = (campo: keyof Objetivos, etiqueta: string, clase = 'w-24') => <Input
    type="number" inputMode="numeric" enterKeyHint="done" aria-label={etiqueta}
    value={edicion?.campo === campo ? edicion.texto : mostrados[campo]}
    onFocus={() => setEdicion({ campo, texto: String(objetivos[campo]), base: objetivos })}
    onChange={(e) => teclear(campo, e.target.value, edicion?.campo === campo ? edicion.base : objetivos)}
    onBlur={() => setEdicion(null)}
    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    className={`tabular no-spin text-right ${clase}`} />

  // Punto 26: las calorías en grande, el reparto en una barra y cada macro en su fila; la regla de ajuste, como pie.
  return (
    <section aria-label="Objetivos diarios" className="space-y-stack">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-rotulo text-fg-muted">Calorías al día</p>
            {kcalDePerfil
              ? <p className="flex items-baseline gap-1.5"><span className="tabular font-numeric text-metric text-fg">{formatInt(mostrados.kcal)}</span><span className="text-body text-fg-muted">kcal</span></p>
              : <div className="pt-1">{campoInput('kcal', 'Calorías (kcal)', 'w-32')}</div>}
            {kcalDePerfil && <p className="text-caption text-fg-muted">Calculadas en Perfil</p>}
          </div>
          {kcalDePerfil && onIrAPerfil && <Button variant="ghost" size="sm" className="shrink-0" onClick={onIrAPerfil}>Ir a Perfil<Icon name="chevron-right" size={16} /></Button>}
        </div>
        <div className="space-y-2">
          <span aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-pill">
            {MACROS_FILAS.map((m) => <span key={m.campo} className={`h-full ${m.macro.bg}`} style={{ width: `${dist[m.campo]}%` }} />)}
          </span>
          <p className="tabular flex flex-wrap gap-x-3 gap-y-1 text-caption text-fg-muted">
            {MACROS_FILAS.map((m) => <span key={m.campo} className="flex items-center gap-1"><span aria-hidden className={`h-2 w-2 rounded-pill ${m.macro.bg}`} />{m.macro.label} {dist[m.campo]} %</span>)}
          </p>
        </div>
      </Card>
      <ListGroup aria-label="Macros" pie={kcalDePerfil
        ? 'Se guardan solos. Si cambias un macro, los otros dos se ajustan para sumar las mismas calorías.'
        : 'Se guardan solos. Si cambias las calorías, los macros mantienen su reparto; si cambias un macro, los otros dos se ajustan.'}>
        {MACROS_FILAS.map(({ campo, macro }) => <li key={campo} className="flex min-h-touch flex-wrap items-center gap-3 py-2">
          <span aria-hidden className={`h-3 w-3 shrink-0 rounded-pill ${macro.bg}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-body text-fg">{macro.label}</span>
            <span className="tabular block break-words text-caption text-fg-muted">
              {proteinaPorKg && campo === 'prot' ? `${formatNumber(proteinaPorKg.gPorKg, 1)} g/kg × ${formatNumber(proteinaPorKg.pesoKg, 1)} kg, en Perfil` : `${dist[campo]} % de las calorías`}
            </span>
          </span>
          {proteinaPorKg && campo === 'prot'
            ? <span className="tabular text-body font-semibold text-fg">{formatInt(mostrados.prot)} <span className="text-caption font-normal text-fg-muted">g</span></span>
            : <span className="flex items-center gap-1.5">{campoInput(campo, `${macro.label} (g)`, 'w-20')}<span className="text-caption text-fg-muted">g</span></span>}
        </li>)}
      </ListGroup>
      {descuadrados && <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-fg-subtle">Los macros suman {formatInt(kcalDeMacros(objetivos))} kcal, no {formatInt(objetivos.kcal)}.</p>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onGuardar(cuadrarObjetivos(objetivos))}>Cuadrar</Button>
      </div>}
    </section>
  )
}
