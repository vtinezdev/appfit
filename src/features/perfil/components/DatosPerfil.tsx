import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
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

/** Datos fuente del perfil: cada fila abre una Sheet con un solo control. */
export default function DatosPerfil({ perfil, peso, hoy, onEditar, onBorrar }: Props) {
  const edad = perfil.fechaNacimiento ? edadEn(perfil.fechaNacimiento, hoy) : null
  const filas: { campo: CampoEditable; etiqueta: string; valor: string | null; accion: string }[] = [
    { campo: 'sexo', etiqueta: 'Sexo', valor: perfil.sexo ? (perfil.sexo === 'hombre' ? 'Hombre' : 'Mujer') : null, accion: 'Añadir' },
    { campo: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', valor: edad !== null ? `${formatNumber(edad)} años` : null, accion: 'Añadir' },
    { campo: 'alturaCm', etiqueta: 'Altura', valor: perfil.alturaCm !== undefined ? `${formatNumber(perfil.alturaCm, 1)} cm` : null, accion: 'Añadir' },
    { campo: 'peso', etiqueta: 'Peso', valor: peso ? `${formatNumber(peso.kg, 1)} kg · ${formatFriendly(peso.fecha).toLowerCase()}` : null, accion: 'Registrar' },
    { campo: 'actividad', etiqueta: '¿Cuánto deporte haces?', valor: perfil.actividad ? NIVELES_ACTIVIDAD[perfil.actividad].etiqueta : null, accion: 'Añadir' },
    { campo: 'objetivo', etiqueta: 'Objetivo', valor: valorObjetivo(perfil), accion: 'Elegir' },
    { campo: 'proteina', etiqueta: 'Proteína por kg', valor: valorProteina(perfil, peso?.kg), accion: 'Elegir' },
  ]
  return <section aria-label="Tus datos" className="space-y-stack">
    <SectionHeader variant="section">Tus datos</SectionHeader>
    <ListGroup>
      {filas.map((f) => <li key={f.campo}><ListRow data-campo={f.campo} onClick={() => onEditar(f.campo)}>
        <span className="min-w-0 break-words text-body text-fg">{f.etiqueta}</span>
        <span className="flex min-w-0 items-center gap-2 text-body-sm">
          <span className={`min-w-0 break-words text-right ${f.valor ? 'text-fg-muted' : 'font-semibold text-accent-strong'}`}>{f.valor ?? f.accion}</span>
          <Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
        </span>
      </ListRow></li>)}
    </ListGroup>
    <p className="text-caption text-fg-muted">Los datos se guardan solo en este dispositivo. El backup JSON incluye tu fecha de nacimiento.</p>
    {!perfilVacio(perfil) && <Button variant="destructive" block onClick={onBorrar}>Borrar datos del perfil</Button>}
  </section>
}
