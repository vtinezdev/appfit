import { useEffect, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { DecimalInput, Input } from '../../../shared/components/Input'
import Metric from '../../../shared/components/Metric'
import ModalPage from '../../../shared/components/ModalPage'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { PuntoRuta, RutaPropia } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { formatKm } from '../../actividades/lib/actividad'
import { cargarLugares } from '../data/lugares'
import * as rutasPropiasRepo from '../data/rutasPropiasRepo'
import { FACTOR_CAMINO, type Lugar } from '../lib/lugares'
import {
  anadirVuelta, aPunto, etapasPropuestas, insertarParada, kmTotales, mismoSitio, nombrePorDefecto, puntosDe, quitarParada, validarRutaPropia, type EtapaBorrador,
} from '../lib/rutasPropias'
import BuscadorLugar from './BuscadorLugar'
import MapaRuta from './MapaRuta'

const CADA = ['15', '25', '40'] as const
type Cada = (typeof CADA)[number]

interface Props {
  /** Sin ruta: crear una nueva. */
  ruta?: RutaPropia
  /** La ruta está en el viaje de Caminos: no se puede borrar. */
  enUso?: boolean
  onClose: () => void
  /** Tras guardar o borrar, con el mensaje para el aviso. */
  onHecho: (mensaje: string) => void
}

function LugarElegido({ punto, onCambiar, etiqueta }: { punto: PuntoRuta; onCambiar: () => void; etiqueta: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2">
    <span className="min-w-0">
      <span className="block break-words text-body font-semibold text-fg">{punto.nombre}</span>
      {punto.provincia && <span className="block break-words text-caption text-fg-muted">{punto.provincia}</span>}
    </span>
    <Button variant="ghost" size="sm" onClick={onCambiar} aria-label={`Cambiar ${etiqueta.toLowerCase()}`}>Cambiar</Button>
  </div>
}

/**
 * Crear o editar una ruta propia de Caminos: salida y llegada de la lista de pueblos de España, paradas propuestas cada
 * 15, 25 o 40 km (que se pueden quitar, añadir y corregir) y el nombre. Sin mapa ni servicios externos: los km son la
 * línea recta con un margen por las curvas del camino.
 */
export default function EditorRuta({ ruta, enUso = false, onClose, onHecho }: Props) {
  const [lugares, setLugares] = useState<Lugar[] | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [salida, setSalida] = useState<PuntoRuta | null>(ruta?.salida ?? null)
  const [etapas, setEtapas] = useState<EtapaBorrador[]>(ruta?.etapas ?? [])
  const [eligiendo, setEligiendo] = useState<'salida' | 'llegada' | null>(ruta ? null : 'salida')
  const [cada, setCada] = useState<Cada>('25')
  const [nombre, setNombre] = useState(ruta?.nombre ?? '')
  const [nombreTocado, setNombreTocado] = useState(!!ruta)
  const [anadiendo, setAnadiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let vivo = true
    setErrorCarga(false)
    cargarLugares().then((l) => { if (vivo) setLugares(l) }).catch(() => { if (vivo) setErrorCarga(true) })
    return () => { vivo = false }
  }, [intento])

  const llegada = etapas.at(-1)
  const nombreVisible = nombreTocado ? nombre : nombrePorDefecto(salida, etapas)
  const lugarDe = (p: PuntoRuta | undefined) => (p && lugares ? lugares.find((l) => l.nombre === p.nombre && l.lat === p.lat && l.lon === p.lon) : undefined)

  function proponer(s: PuntoRuta | null, l: PuntoRuta | undefined, c: Cada) {
    const ls = lugarDe(s ?? undefined)
    const ll = lugarDe(l)
    if (lugares && ls && ll) setEtapas(etapasPropuestas(ls, ll, lugares, Number(c)))
  }

  function elegir(l: Lugar) {
    setError(null)
    if (eligiendo === 'salida') {
      const s = aPunto(l)
      setSalida(s)
      setEligiendo(llegada ? null : 'llegada')
      if (llegada) proponer(s, llegada, cada)
    } else {
      setEtapas([{ ...aPunto(l), km: undefined }])
      setEligiendo(null)
      if (salida) proponer(salida, aPunto(l), cada)
    }
  }

  function cambiarKm(i: number, km: number | undefined) {
    setEtapas((es) => es.map((e, j) => (j === i ? { ...e, km } : e)))
  }

  async function guardar() {
    if (ocupado) return
    const borrador = { nombre: nombreVisible, salida, etapas }
    const invalido = validarRutaPropia(borrador)
    if (invalido) { setError(invalido); return }
    setOcupado(true)
    setError(null)
    try {
      if (ruta) await rutasPropiasRepo.actualizar(ruta.id, borrador)
      else await rutasPropiasRepo.crear(borrador)
      onHecho(ruta ? 'Ruta guardada' : `Ruta creada: ${borrador.nombre.trim()}`)
    } catch (e) {
      setError(e instanceof rutasPropiasRepo.RutaPropiaInvalida ? e.message : 'No se ha podido guardar la ruta. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  async function borrar() {
    if (!ruta) return
    setOcupado(true)
    try {
      await rutasPropiasRepo.borrar(ruta.id)
      onHecho('Ruta borrada')
    } catch (e) {
      setError(e instanceof rutasPropiasRepo.RutaEnUso ? e.message : 'No se ha podido borrar la ruta. Inténtalo de nuevo.')
      setOcupado(false)
      setBorrando(false)
    }
  }

  const puntos = salida ? puntosDe({ salida, etapas: etapas.map((e) => ({ ...e, km: e.km ?? 0 })) }) : []

  const footer = <div className="space-y-2">
    {error && <ErrorState>{error}</ErrorState>}
    {borrando
      ? <ConfirmacionDestructiva mensaje={`¿Borrar «${ruta?.nombre}»? No se puede deshacer.`} confirmar="Sí, borrar" onConfirmar={borrar} onCancelar={() => setBorrando(false)} ocupado={ocupado} />
      : <>
        <Button block loading={ocupado} disabled={!salida || !llegada} onClick={guardar}>{ruta ? 'Guardar cambios' : 'Guardar ruta'}</Button>
        {ruta && !enUso && <Button variant="destructive" block disabled={ocupado} onClick={() => setBorrando(true)}>Borrar ruta</Button>}
        {ruta && enUso && <p className="break-words text-caption text-fg-muted">Está en tu viaje de Caminos: no se puede borrar.</p>}
      </>}
  </div>

  return (
    <ModalPage title={ruta ? 'Editar ruta' : 'Nueva ruta'} onClose={onClose} busy={ocupado} footer={footer}>
      {errorCarga
        ? <div className="space-y-3">
          <ErrorState>No se ha podido cargar la lista de pueblos. La primera vez hace falta conexión.</ErrorState>
          <Button variant="secondary" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
        </div>
        : !lugares ? <LoadingState>Cargando pueblos…</LoadingState>
          : <div className="space-y-section">
            <section aria-label="Salida y llegada" className="space-y-stack">
              <p className="break-words text-body-sm text-fg-muted">Elige de dónde sales y adónde llegas. AppFit propone paradas por el camino; los km son la línea recta con un {formatInt((FACTOR_CAMINO - 1) * 100)} % más por las curvas, y puedes corregirlos.</p>
              <div className="space-y-2">
                <p className="text-label text-fg-muted">Salida</p>
                {eligiendo === 'salida' || !salida
                  ? <BuscadorLugar lugares={lugares} etiqueta="Buscar el lugar de salida" onElegir={elegir} />
                  : <LugarElegido punto={salida} etiqueta="Salida" onCambiar={() => setEligiendo('salida')} />}
              </div>
              <div className="space-y-2">
                <p className="text-label text-fg-muted">Llegada</p>
                {eligiendo === 'llegada' || !llegada
                  ? (salida ? <BuscadorLugar lugares={lugares} etiqueta="Buscar el lugar de llegada" placeholder="Pueblo o ciudad (o la salida, para ida y vuelta)" onElegir={elegir} /> : <p className="text-body-sm text-fg-muted">Primero, la salida.</p>)
                  : <LugarElegido punto={llegada} etiqueta="Llegada" onCambiar={() => setEligiendo('llegada')} />}
              </div>
            </section>

            {salida && llegada && <>
              {!mismoSitio(salida, llegada) && <div className="space-y-2">
                <p className="text-label text-fg-muted">Proponer una parada cada</p>
                <SegmentedControl<Cada> label="Proponer una parada cada" valor={cada} onChange={(c) => { setCada(c); proponer(salida, llegada, c) }}
                  opciones={CADA.map((c) => ({ valor: c, label: `${c} km` }))} />
              </div>}

              <Card className="space-y-3">
                {puntos.length >= 2 && <MapaRuta puntos={puntos} label={`Ruta de ${salida.nombre} a ${llegada.nombre} con ${formatInt(etapas.length - 1)} paradas`} />}
                <Metric size="title" label="Total" valor={formatKm(kmTotales(etapas) * 1000)} unidad={`km · ${etapas.length} ${etapas.length === 1 ? 'etapa' : 'etapas'}`} />
              </Card>

              <section aria-label="Etapas" className="space-y-stack">
                <SectionHeader variant="section">Etapas</SectionHeader>
                <ol className="app-list-flat" aria-label="Etapas de la ruta">
                  {etapas.map((e, i) => <li key={`${e.nombre}-${i}`} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-body font-medium text-fg">{e.nombre}</span>
                      <span className="block break-words text-caption text-fg-muted">{i === etapas.length - 1 ? 'Llegada' : `Parada ${formatInt(i + 1)}`}{e.provincia ? ` · ${e.provincia}` : ''}</span>
                    </span>
                    <label className="flex shrink-0 items-center gap-1">
                      <DecimalInput className="w-20" aria-label={`Km hasta ${e.nombre}`} value={e.km} onChange={(km) => cambiarKm(i, km)} />
                      <span className="text-body-sm text-fg-muted">km</span>
                    </label>
                    {i < etapas.length - 1
                      ? <IconButton icon="close" variant="ghost" label={`Quitar ${e.nombre}`} onClick={() => setEtapas((es) => quitarParada(salida, es, i))} />
                      : <span aria-hidden className="w-touch shrink-0" />}
                  </li>)}
                </ol>
                {anadiendo
                  ? <div className="space-y-2">
                    <BuscadorLugar lugares={lugares} etiqueta="Buscar una parada" onElegir={(l) => { setEtapas((es) => insertarParada(salida, es, l)); setAnadiendo(false) }} />
                    <Button variant="subtle" size="sm" onClick={() => setAnadiendo(false)}>Cancelar</Button>
                  </div>
                  : <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setAnadiendo(true)}>Añadir parada</Button>
                    {!mismoSitio(salida, llegada) && <Button variant="subtle" onClick={() => setEtapas((es) => anadirVuelta(salida, es))}>Volver a {salida.nombre}</Button>}
                  </div>}
                <p className="break-words text-caption text-fg-muted">{mismoSitio(salida, llegada)
                  ? 'Ida y vuelta: las paradas se añaden en el orden en que las elijas.'
                  : 'Las paradas se colocan solas en su sitio entre la salida y la llegada.'}</p>
              </section>

              <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la ruta</span>
                <Input value={nombreVisible} maxLength={80} onChange={(e) => { setNombreTocado(true); setNombre(e.target.value) }} /></label>
            </>}
          </div>}
    </ModalPage>
  )
}
