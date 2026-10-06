import { useState } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { ActividadPerfil, IntensidadKcal, ObjetivoPerfil, Perfil, SexoPerfil } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import * as perfilRepo from '../data/perfilRepo'
import { calcularEnergia, ETIQUETAS_OBJETIVO, formatSigned, NIVELES_ACTIVIDAD } from '../lib/energia'
import {
  ACTIVIDADES, ALTURA_MAX, ALTURA_MIN, INTENSIDAD_POR_DEFECTO, INTENSIDADES_KCAL, OBJETIVOS, validarAltura, validarFechaNacimiento,
} from '../lib/validacionPerfil'
import type { CampoEditable } from './DatosPerfil'

type CampoSheet = Exclude<CampoEditable, 'peso'>

interface Props {
  campo: CampoSheet
  open: boolean
  perfil: Perfil
  /** Último peso conocido, para enseñar en vivo el objetivo resultante. */
  pesoKg: number | undefined
  hoy: string
  onClose: () => void
  /** Se llama justo antes de guardar (el padre recuerda el objetivo actual para avisar si cambia). */
  onAntesDeGuardar: () => void
}

const TITULOS: Record<CampoSheet, string> = {
  sexo: 'Sexo', fechaNacimiento: 'Fecha de nacimiento', alturaCm: 'Altura', actividad: '¿Cuánto deporte haces?', objetivo: 'Objetivo',
}

/** Una sola Sheet con un único control por dato. Elegir una opción guarda al instante; fecha y altura tienen «Guardar». */
export default function EditarDatoSheet({ campo, open, perfil, pesoKg, hoy, onClose, onAntesDeGuardar }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fecha, setFecha] = useState(perfil.fechaNacimiento ?? '')
  const [altura, setAltura] = useState(perfil.alturaCm !== undefined ? String(perfil.alturaCm) : '')
  const [objetivo, setObjetivo] = useState<ObjetivoPerfil | null>(perfil.objetivo ?? null)
  const [intensidad, setIntensidad] = useState<IntensidadKcal>(perfil.intensidadKcal ?? INTENSIDAD_POR_DEFECTO)

  async function guardar(patch: Partial<Perfil>, cerrar = true) {
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      onAntesDeGuardar()
      await perfilRepo.guardarPerfil(patch)
      if (cerrar) onClose()
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  function guardarFecha() {
    const r = validarFechaNacimiento(fecha, hoy)
    if (!r.ok) { setError(r.error); return }
    setAviso(r.aviso ?? null)
    void guardar({ fechaNacimiento: fecha })
  }
  function guardarAltura() {
    const valor = validarAltura(Number(altura.replace(',', '.')))
    if (altura.trim() === '' || valor === null) { setError(`Introduce la altura en centímetros, entre ${ALTURA_MIN} y ${ALTURA_MAX}.`); return }
    void guardar({ alturaCm: valor })
  }
  function elegirObjetivo(o: ObjetivoPerfil) {
    setObjetivo(o)
    void guardar({ objetivo: o, ...(o !== 'mantenimiento' && perfil.intensidadKcal === undefined ? { intensidadKcal: intensidad } : {}) }, false)
  }
  function elegirIntensidad(i: IntensidadKcal) {
    setIntensidad(i)
    void guardar({ intensidadKcal: i }, false)
  }

  const textoError = error && <ErrorState>{error}</ErrorState>
  const conBoton = campo === 'fechaNacimiento' || campo === 'alturaCm'
  const footer = <div className="space-y-2">
    {conBoton && textoError}
    {conBoton && <Button block loading={guardando} onClick={campo === 'fechaNacimiento' ? guardarFecha : guardarAltura}>{guardando ? 'Guardando…' : 'Guardar'}</Button>}
  </div>

  let previa: ReturnType<typeof calcularEnergia> | null = null
  if (campo === 'objetivo' && objetivo) previa = calcularEnergia({ ...perfil, objetivo, intensidadKcal: intensidad }, pesoKg, hoy)

  return <Sheet open={open} onClose={onClose} title={TITULOS[campo]} footer={conBoton ? footer : undefined}>
    <div className="space-y-4">
      {campo === 'sexo' && <>
        <SegmentedControl<SexoPerfil> label="Sexo" valor={perfil.sexo ?? null} onChange={(sexo) => void guardar({ sexo })}
          opciones={[{ valor: 'hombre', label: 'Hombre' }, { valor: 'mujer', label: 'Mujer' }]} />
        <p className="text-caption text-fg-muted">Las ecuaciones de gasto solo distinguen entre hombre y mujer: elige la que corresponda a tu fisiología.</p>
      </>}
      {campo === 'fechaNacimiento' && <>
        <label className="block space-y-1">
          <span className="text-label text-fg-muted">Fecha de nacimiento</span>
          <Input type="date" value={fecha} max={hoy} onChange={(e) => { setFecha(e.target.value); setError(null) }} aria-invalid={error ? true : undefined} />
        </label>
        {aviso && <p className="text-body-sm text-warning">{aviso}</p>}
        <p className="text-caption text-fg-muted">Se guarda la fecha, no la edad: así se actualiza sola al cumplir años.</p>
      </>}
      {campo === 'alturaCm' && <>
        <label className="block space-y-1">
          <span className="text-label text-fg-muted">Altura (cm)</span>
          <Input type="number" inputMode="decimal" step="0.1" value={altura} placeholder="175" onChange={(e) => { setAltura(e.target.value); setError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && guardarAltura()} aria-invalid={error ? true : undefined} />
        </label>
        <p className="text-caption text-fg-muted">En centímetros, entre {formatNumber(ALTURA_MIN)} y {formatNumber(ALTURA_MAX)} (por ejemplo 175, no 1,75).</p>
      </>}
      {campo === 'actividad' && <>
        <p className="text-body-sm text-fg-muted">El factor mide el deporte que haces, no el resto del día: si caminas mucho o trabajas de pie, quizá te corresponda un nivel más.</p>
        <SegmentedControl<ActividadPerfil> variante="vertical" label="¿Cuánto deporte haces?" valor={perfil.actividad ?? null} onChange={(actividad) => void guardar({ actividad })}
          opciones={ACTIVIDADES.map((a) => ({ valor: a, label: `${NIVELES_ACTIVIDAD[a].etiqueta} · × ${formatNumber(NIVELES_ACTIVIDAD[a].factor, 3)}`, descripcion: NIVELES_ACTIVIDAD[a].descripcion }))} />
      </>}
      {campo === 'objetivo' && <>
        <SegmentedControl<ObjetivoPerfil> label="Objetivo" valor={objetivo} onChange={elegirObjetivo}
          opciones={OBJETIVOS.map((o) => ({ valor: o, label: ETIQUETAS_OBJETIVO[o] }))} />
        {objetivo && objetivo !== 'mantenimiento' && <div className="space-y-2">
          <p className="text-label text-fg-muted">{objetivo === 'definicion' ? 'Déficit diario (kcal)' : 'Superávit diario (kcal)'}</p>
          <SegmentedControl<`${IntensidadKcal}`> label="Intensidad" valor={`${intensidad}`} onChange={(i) => elegirIntensidad(Number(i) as IntensidadKcal)}
            opciones={INTENSIDADES_KCAL.map((i) => ({ valor: `${i}` as `${IntensidadKcal}`, label: formatSigned(objetivo === 'definicion' ? -i : i) }))} />
        </div>}
        {previa?.estado === 'ok' && previa.objetivoKcal !== null && <p className="tabular text-body-sm text-fg">Objetivo resultante: <span className="font-semibold">{formatNumber(previa.objetivoKcal)} kcal/día</span></p>}
        {previa && previa.estado !== 'ok' && <p className="text-body-sm text-fg-muted">Completa tus datos para ver el objetivo resultante.</p>}
        {previa?.estado === 'ok' && previa.avisos.map((a) => <p key={a.tipo} className="text-body-sm text-warning">{a.texto}</p>)}
        <p className="text-caption text-fg-muted">El rango (200 a 600 kcal) lo fija AppFit con la literatura como contexto; en Referencias tienes el detalle.</p>
      </>}
      {!conBoton && textoError}
    </div>
  </Sheet>
}
