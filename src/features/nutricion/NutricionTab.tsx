import { lazy, Suspense, useState } from 'react'
import type { Comida, Entry } from '../../shared/db/types'
import { todayISO } from '../../shared/lib/dates'
import PageHeader from '../../shared/components/PageHeader'
import ViewTabs from '../../shared/components/ViewTabs'
import { IconButton } from '../../shared/components/Button'
import KcalRapidasSheet from './components/KcalRapidasSheet'
import * as entriesRepo from './data/entriesRepo'
import { validarKcalRapidas, type KcalRapidasDraft } from './lib/alimentos'
import Hoy from './pages/Hoy'
import Alimentos from './pages/Alimentos'
import AnadirComida from './pages/AnadirComida'
import { LoadingState } from '../../shared/components/StateMessage'

const RAPIDA_VACIA: KcalRapidasDraft = { nombre: '', kcal: 0, prot: 0, carb: 0, grasa: 0 }

// Resumen lleva Recharts: se carga aparte para no inflar el arranque de la app.
const Resumen = lazy(() => import('./pages/Resumen'))

type Vista = 'hoy' | 'resumen' | 'alimentos'

const VISTAS: { valor: Vista; label: string }[] = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'resumen', label: 'Resumen' },
  { valor: 'alimentos', label: 'Alimentos' },
]

export default function NutricionTab({ anadirAlAbrir = false }: { anadirAlAbrir?: boolean }) {
  const [vista, setVista] = useState<Vista>('hoy')
  const [fecha, setFecha] = useState(todayISO())
  const [mostrarAnadir, setMostrarAnadir] = useState(anadirAlAbrir)
  const [comidaAnadir, setComidaAnadir] = useState<Comida | undefined>(undefined)
  const [entryEditar, setEntryEditar] = useState<Entry | undefined>(undefined)
  const [rapidaEditar, setRapidaEditar] = useState<Entry | null>(null)
  const [rapidaDraft, setRapidaDraft] = useState<KcalRapidasDraft>(RAPIDA_VACIA)
  const [guardandoRapida, setGuardandoRapida] = useState(false)
  const [errorRapida, setErrorRapida] = useState<string | null>(null)

  function cerrarAnadir() {
    setMostrarAnadir(false)
    setEntryEditar(undefined)
    setComidaAnadir(undefined)
  }

  function cerrarRapidaEditar() {
    setRapidaEditar(null)
    setErrorRapida(null)
  }

  // Las entradas «rápidas» (A5) no pasan por la revisión: sus gramos son 0 y dividirían entre 0.
  function editarEntry(e: Entry) {
    if (e.rapida) {
      setRapidaEditar(e)
      setRapidaDraft({ nombre: e.nombre, kcal: e.kcal, prot: e.prot, carb: e.carb, grasa: e.grasa })
      setErrorRapida(null)
    } else {
      setEntryEditar(e)
      setMostrarAnadir(true)
    }
  }

  async function guardarRapidaEditada() {
    const validado = validarKcalRapidas(rapidaDraft)
    if (!validado || !rapidaEditar || guardandoRapida) return
    setGuardandoRapida(true)
    setErrorRapida(null)
    try {
      await entriesRepo.editarRapida(rapidaEditar.id, validado)
      setRapidaEditar(null)
    } catch {
      setErrorRapida('No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardandoRapida(false)
    }
  }

  return (
    <div className="space-y-3 px-page pt-5">
      <PageHeader title="Nutrición" action={<IconButton icon="plus" label="Añadir comida" variant="primary" onClick={() => { setComidaAnadir(undefined); setMostrarAnadir(true) }} />} />
      <ViewTabs label="Vistas de nutrición" opciones={VISTAS} valor={vista} onChange={setVista}>
      {vista === 'hoy' && <Hoy fecha={fecha} onFechaChange={setFecha} onEditarEntry={editarEntry} onAnadir={(comida) => { setComidaAnadir(comida); setMostrarAnadir(true) }} />}
      {vista === 'resumen' && (
        <Suspense fallback={<LoadingState />}>
          <Resumen />
        </Suspense>
      )}
      {vista === 'alimentos' && <Alimentos />}
      </ViewTabs>

      {mostrarAnadir && (
        <AnadirComida fecha={entryEditar?.fecha ?? fecha} entryEditar={entryEditar} comidaInicial={comidaAnadir} onClose={cerrarAnadir} onGuardado={cerrarAnadir} />
      )}

      <KcalRapidasSheet
        open={rapidaEditar !== null}
        valor={rapidaDraft}
        onChange={(patch) => setRapidaDraft((d) => ({ ...d, ...patch }))}
        onGuardar={guardarRapidaEditada}
        onClose={cerrarRapidaEditar}
        guardando={guardandoRapida}
        error={errorRapida}
      />
    </div>
  )
}
