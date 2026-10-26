import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon, { type IconName } from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Perfil, Peso } from '../../../shared/db/types'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { ETIQUETAS_OBJETIVO, formatSigned, NIVELES_ACTIVIDAD } from '../lib/energia'
import { ajusteProteina, PROTEINA_KG_DEFECTO } from '../lib/proteina'
import { edadEn, INTENSIDAD_POR_DEFECTO, perfilVacio } from '../lib/validacionPerfil'

export type CampoEditable = 'sexo' | 'fechaNacimiento' | 'alturaCm' | 'peso' | 'actividad' | 'objetivo' | 'proteina'

interface Props {
  perfil: Perfil
  peso: Peso | undefined
  hoy: string
  onEditar: (campo: CampoEditable) => void
  onBorrar: () => void
}

function valorObjetivo(perfil: Perfil): string | null {
  if (!perfil.objetivo) return null
  if (perfil.objetivo === 'mantenimiento') return ETIQUETAS_OBJETIVO.mantenimiento
  const i = perfil.intensidadKcal ?? INTENSIDAD_POR_DEFECTO
  return `${ETIQUETAS_OBJETIVO[perfil.objetivo]} · ${formatSigned(perfil.objetivo === 'definicion' ? -i : i)} kcal`
}

function valorProteina(perfil: Perfil, pesoKg: number | undefined): string {
  if (perfil.proteinaPorKgActiva === false) return 'Desactivada'
  const g = ajusteProteina(perfil, pesoKg ?? 1)?.gPorKg ?? PROTEINA_KG_DEFECTO
  return pesoKg === undefined ? `${formatNumber(g, 1)} g/kg · falta el peso` : `${formatNumber(g, 1)} g/kg · ${formatNumber(Math.round(g * pesoKg))} g/día`
}

interface Dato { campo: CampoEditable; etiqueta: string; valor: string | null; detalle?: string; accion: string }

/** Una casilla de la ficha del cuerpo: rótulo, el valor en grande (o la acción si falta) y un detalle. */
function Casilla({ d, onEditar, className }: { d: Dato; onEditar: (campo: CampoEditable) => void; className: string }) {
  return <button type="button" data-campo={d.campo} onClick={() => onEditar(d.campo)} aria-label={`${d.etiqueta}: ${d.valor ?? d.accion}${d.detalle ? `, ${d.detalle}` : ''}`}
    className={`app-button flex min-h-touch min-w-0 flex-col items-start gap-1 px-card py-3 text-left ${className}`}>
    <span className="text-rotulo text-fg-muted">{d.etiqueta}</span>
    <span className={`tabular break-words ${d.valor ? 'text-title text-fg' : 'text-body font-semibold text-accent-strong'}`}>{d.valor ?? d.accion}</span>
    {d.detalle && <span className="break-words text-caption text-fg-muted">{d.detalle}</span>}
  </button>
}

/**
 * Datos fuente del perfil (punto 10): el cuerpo (sexo, edad, altura y peso) en una ficha de cuatro casillas y el plan
 * (deporte, objetivo y proteína) en una lista; cada dato abre una Sheet con un solo control.
 */
export default function DatosPerfil({ perfil, peso, hoy, onEditar, onBorrar }: Props) {
  const edad = perfil.fechaNacimiento ? edadEn(perfil.fechaNacimiento, hoy) : null
  const cuerpo: Dato[] = [
    { campo: 'sexo', etiqueta: 'Sexo', valor: perfil.sexo ? (perfil.sexo === 'hombre' ? 'Hombre' : 'Mujer') : null, accion: 'Añadir' },
    { campo: 'fechaNacimiento', etiqueta: 'Edad', valor: edad !== null ? `${formatNumber(edad)} años` : null, accion: 'Añadir' },
    { campo: 'alturaCm', etiqueta: 'Altura', valor: perfil.alturaCm !== undefined ? `${formatNumber(perfil.alturaCm, 1)} cm` : null, accion: 'Añadir' },
    { campo: 'peso', etiqueta: 'Peso', valor: peso ? `${formatNumber(peso.kg, 1)} kg` : null, detalle: peso ? formatFriendly(peso.fecha) : undefined, accion: 'Registrar' },
  ]
  const plan: (Dato & { icono: IconName })[] = [
    { campo: 'actividad', icono: 'dumbbell', etiqueta: '¿Cuánto deporte haces?', valor: perfil.actividad ? NIVELES_ACTIVIDAD[perfil.actividad].etiqueta : null, detalle: perfil.actividad ? NIVELES_ACTIVIDAD[perfil.actividad].descripcion : undefined, accion: 'Añadir' },
    { campo: 'objetivo', icono: 'flag', etiqueta: 'Objetivo', valor: valorObjetivo(perfil), accion: 'Elegir' },
    { campo: 'proteina', icono: 'utensils', etiqueta: 'Proteína por kg', valor: valorProteina(perfil, peso?.kg), accion: 'Elegir' },
  ]
  return <section aria-label="Tus datos" className="space-y-stack">
    <SectionHeader variant="section">Tus datos</SectionHeader>
    <Card padded={false} className="grid grid-cols-2 overflow-hidden">
      {cuerpo.map((d, i) => <Casilla key={d.campo} d={d} onEditar={onEditar} className={`${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} border-line`} />)}
    </Card>
    <ListGroup pie="Los datos se guardan solo en este dispositivo. El backup JSON incluye tu fecha de nacimiento.">
      {plan.map((f) => <li key={f.campo}><ListRow data-campo={f.campo} onClick={() => onEditar(f.campo)}>
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name={f.icono} size={18} /></span>
          <span className="min-w-0">
            <span className="block break-words text-caption text-fg-muted">{f.etiqueta}</span>
            <span className={`block break-words text-body font-semibold ${f.valor ? 'text-fg' : 'text-accent-strong'}`}>{f.valor ?? f.accion}</span>
            {f.detalle && <span className="block break-words text-caption text-fg-muted">{f.detalle}</span>}
          </span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </ListRow></li>)}
    </ListGroup>
    {!perfilVacio(perfil) && <Button variant="destructive" size="sm" onClick={onBorrar}>Borrar datos del perfil</Button>}
  </section>
}
