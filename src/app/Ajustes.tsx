import DiagnosticoAjustes from './DiagnosticoAjustes'
import { PISTAS } from '../shared/lib/pistas'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import InstalarApp from '../shared/components/InstalarApp'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup, migrarBackup } from '../shared/lib/backup'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { formatInt } from '../shared/lib/format'
import { startOfWeek, todayISO } from '../shared/lib/dates'
import * as perfilRepo from '../features/perfil/data/perfilRepo'
import { actualizarObjetivoHoy } from '../features/perfil/data/objetivosDiaRepo'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import GamificacionAjustes from '../features/ritmo/components/GamificacionAjustes'
import ModulosAjustes from './ModulosAjustes'
import { planDeSemana } from '../features/ritmo/lib/plan'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import Button, { IconButton } from '../shared/components/Button'
import Card from '../shared/components/Card'
import Interruptor from '../shared/components/Interruptor'
import Disclosure from '../shared/components/Disclosure'
import Icon from '../shared/components/Icon'
import ListGroup from '../shared/components/ListGroup'
import ListRow from '../shared/components/ListRow'
import NotaAmpliable from '../shared/components/NotaAmpliable'
import SegmentedControl from '../shared/components/SegmentedControl'
import { getFondoPref, getThemePref, setFondoPref, setThemePref, type FondoPref, type ThemePref } from '../shared/design/theme'
import ConfirmacionDestructiva from '../shared/components/ConfirmacionDestructiva'
import PageHeader from '../shared/components/PageHeader'
import { UMBRAL_BACKUP_POR_DEFECTO } from '../shared/lib/recordatorioBackup'
import { descargarCsv, TABLAS_CSV, type TablaCsv } from '../shared/lib/exportarCsv'
import AlmacenamientoAjustes from './AlmacenamientoAjustes'
import CuentaAjustes, { ResumenCuenta } from '../features/cuenta/components/CuentaAjustes'
import ActualizacionesAjustes, { ResumenActualizacion } from './ActualizacionesAjustes'
import { cuentaDisponible } from '../features/cuenta/servicio'
import { GRUPOS_AJUSTES, OPCIONES_FONDO, OPCIONES_TEMA, resumenAjustes, SECCIONES_AJUSTES, type SeccionAjustes } from './seccionesAjustes'

/**
 * Ajustes es un índice por temas (Tú, Entreno, App, Tus datos) con el valor actual de cada sección; cada fila abre su
 * vista, con «Volver» que devuelve el foco a la fila. `seccionInicial` abre una directamente (avisos de Inicio, Cumbres…);
 * `enfocarReferencias` devuelve el foco a la fila Referencias al volver de ella.
 */
/** Pasos de una tarea, cada uno con su número en un círculo. */
function PasosNumerados({ pasos }: { pasos: string[] }) {
  return <ol className="space-y-3">
    {pasos.map((p, i) => <li key={p} className="flex items-start gap-3">
      <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-caption font-semibold text-fg">{i + 1}</span>
      <span className="min-w-0 pt-0.5 text-body-sm text-fg">{p}</span>
    </li>)}
  </ol>
}

export default function Ajustes({ seccionInicial, onIrAPerfil, onIrAReferencias, enfocarReferencias = false }: { seccionInicial?: SeccionAjustes; onIrAPerfil?: () => void; onIrAReferencias?: () => void; enfocarReferencias?: boolean }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const vigentes = useLiveQuery(() => perfilRepo.objetivosVigentes(todayISO()), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const [seccion, setSeccion] = useState<SeccionAjustes | null>(seccionInicial ?? null)
  const [enfocarTitulo, setEnfocarTitulo] = useState(seccionInicial !== undefined)
  /** Fila del índice que recupera el foco al volver de su sección. */
  const [volverA, setVolverA] = useState<SeccionAjustes | null>(null)
  const [focoReferencias, setFocoReferencias] = useState(enfocarReferencias)
  const [tema, setTema] = useState<ThemePref>(getThemePref)
  const [fondo, setFondo] = useState<FondoPref>(getFondoPref)
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)
  const [errorAjuste, setErrorAjuste] = useState<string | null>(null)
  const [plataforma, setPlataforma] = useState<'iphone' | 'android'>(() => (/iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'iphone' : 'android'))
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorBackup, setErrorBackup] = useState<string | null>(null)
  const [backupPendiente, setBackupPendiente] = useState<{ texto: string; comidas: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const indiceRef = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const cargados = settings !== undefined && vigentes !== undefined

  useEffect(() => {
    if (!enfocarTitulo || !cargados) return
    tituloRef.current?.focus({ preventScroll: true })
    tituloRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    setEnfocarTitulo(false)
  }, [seccion, enfocarTitulo, cargados])
  useEffect(() => {
    if (seccion !== null || volverA === null) return
    indiceRef.current?.querySelector<HTMLButtonElement>(`[data-seccion="${volverA}"]`)?.focus()
    setVolverA(null)
  }, [seccion, volverA])
  useEffect(() => {
    if (!focoReferencias || !cargados || seccion !== null) return
    indiceRef.current?.querySelector<HTMLButtonElement>('[data-fila="referencias"]')?.focus()
    setFocoReferencias(false)
  }, [focoReferencias, cargados, seccion])

  if (!settings || !vigentes) return <LoadingState />

  function abrir(siguiente: SeccionAjustes) {
    setErrorAjuste(null)
    setMensaje(null)
    setSeccion(siguiente)
    setEnfocarTitulo(true)
  }
  function volver() {
    setVolverA(seccion)
    setSeccion(null)
    setErrorAjuste(null)
    setMensaje(null)
  }

  async function exportar() {
    setErrorBackup(null)
    setOcupado(true)
    try {
      descargarBackup(await exportarBackup())
      // Solo cuenta si la descarga se lanzó; un fallo al anotarlo no invalida la copia.
      await updateSettings({ ultimaExportacion: Date.now() }).catch(() => undefined)
    } catch {
      setErrorBackup('No se ha podido exportar la copia. Vuelve a intentarlo antes de cambiar de acceso.')
    } finally {
      setOcupado(false)
    }
  }

  async function exportarCsv(tabla: TablaCsv) {
    setErrorBackup(null)
    setOcupado(true)
    try {
      await descargarCsv(tabla, todayISO())
    } catch {
      setErrorBackup('No se ha podido exportar el CSV. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function importar(file: File) {
    setMensaje(null)
    setErrorBackup(null)
    setBackupPendiente(null)
    setOcupado(true)
    try {
      const texto = await file.text()
      const backup = migrarBackup(JSON.parse(texto))
      // Elegir un archivo solo lo valida; no sustituye ningún registro hasta confirmar.
      setBackupPendiente({ texto, comidas: backup.entries.length })
    } catch (e) {
      setErrorBackup(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : e instanceof Error ? e.message : 'Error leyendo el backup.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarImportacion() {
    if (!backupPendiente || ocupado) return
    setOcupado(true)
    setErrorBackup(null)
    try {
      await importarBackup(backupPendiente.texto)
      setBackupPendiente(null)
      setMensaje('Copia importada correctamente.')
    } catch (e) {
      setErrorBackup(e instanceof Error ? e.message : 'Error importando el backup.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarBorrado() {
    if (ocupado) return
    setOcupado(true)
    setErrorBorrado(null)
    try {
      await borrarTodosLosDatos()
      setConfirmandoBorrado(false)
      setMensaje('Todos los datos han sido borrados.')
    } catch {
      setErrorBorrado('No se han podido borrar los datos. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const guardar = (patch: Parameters<typeof updateSettings>[0], error = 'No se ha podido guardar el ajuste. Inténtalo de nuevo.') => {
    updateSettings(patch).catch(() => setErrorAjuste(error))
  }
  const datosResumen = {
    settings, objetivos: vigentes, tema, fondo,
    entrenosPlan: planDeSemana(settings.planSemanal, startOfWeek(todayISO())).entrenos,
  }

  const fila = (id: SeccionAjustes, destructiva = false) => <li key={id}>
    <ListRow data-seccion={id} onClick={() => abrir(id)}>
      <Icon name={SECCIONES_AJUSTES[id].icon} size={20} className={destructiva ? 'text-destructive' : 'text-fg-muted'} />
      <span className="min-w-0 flex-1">
        <span className={`block break-words text-body font-semibold ${destructiva ? 'text-destructive' : 'text-fg'}`}>{SECCIONES_AJUSTES[id].nombre}</span>
        <span className="block break-words text-caption text-fg-muted">{id === 'cuenta' ? <ResumenCuenta /> : id === 'actualizaciones' ? <ResumenActualizacion /> : resumenAjustes(id, datosResumen)}</span>
      </span>
      <Icon name="chevron-right" size={18} className="text-fg-subtle" />
    </ListRow>
  </li>

  if (seccion === null) {
    return (
      <div ref={indiceRef} className="space-y-section px-page pt-5">
        <PageHeader title="Ajustes" />
        {GRUPOS_AJUSTES.map((g) => <section key={g.nombre} aria-labelledby={`ajustes-${g.nombre}`} className="space-y-2">
          <h2 id={`ajustes-${g.nombre}`} className="px-1 text-rotulo text-fg-muted">{g.nombre}</h2>
          <ListGroup>{g.secciones.filter((id) => (id !== 'cuenta' || cuentaDisponible)).map((id) => fila(id))}</ListGroup>
        </section>)}
        {onIrAReferencias && <section aria-labelledby="ajustes-saber-mas" className="space-y-2">
          <h2 id="ajustes-saber-mas" className="px-1 text-rotulo text-fg-muted">Saber más</h2>
          <ListGroup><li><ListRow data-fila="referencias" onClick={onIrAReferencias}>
            <Icon name="info" size={20} className="text-fg-muted" />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-body font-semibold text-fg">Referencias</span>
              <span className="block break-words text-caption text-fg-muted">Nutrientes, energía y fuentes</span>
            </span>
            <Icon name="chevron-right" size={18} className="text-fg-subtle" />
          </ListRow></li></ListGroup>
        </section>}
        <ListGroup aria-label="Borrar">{fila('borrar', true)}</ListGroup>
        {mensaje && <p role="status" className="text-body-sm text-accent-strong">{mensaje}</p>}
        <p className="border-t border-line pt-4 text-caption text-fg-muted">APPFIT · Privada: tus registros viven en este móvil y la copia de la nube, si tienes cuenta, va cifrada.<br />Nutrición y entrenos disponibles sin conexión.</p>
      </div>
    )
  }

  const contenido: Record<SeccionAjustes, () => ReactNode> = {
    modulos: () => <ModulosAjustes settings={settings} onError={setErrorAjuste} />,

    objetivos: () => <ObjetivosAjustes objetivos={vigentes} origen={vigentes.origen} proteinaPorKg={vigentes.proteinaPorKg} onIrAPerfil={onIrAPerfil} onGuardar={(objetivos) => {
      setErrorAjuste(null)
      updateSettings({ objetivos }).then(() => actualizarObjetivoHoy(todayISO(), 'ajustes')).catch(() => setErrorAjuste('No se han podido guardar los objetivos. Inténtalo de nuevo.'))
    }} />,


    // Punto 28: dos interruptores en una lista, con lo que hacen en su misma fila.
    entreno: () => <ListGroup aria-label="Entreno" pie="iOS no deja vibrar ni avisar en segundo plano sin notificaciones: el pitido suena solo con la app abierta.">
      <li><Interruptor label="Sonido al terminar el descanso" detalle="Un pitido corto, con la app abierta" activo={settings.sonidoDescanso !== false} onChange={(v) => guardar({ sonidoDescanso: v })} /></li>
      <li><Interruptor label="Preguntar el RIR al completar una serie" detalle="Las repeticiones que te quedaban; también se anota tocando su celda" activo={settings.rirAlCompletar !== false} onChange={(v) => guardar({ rirAlCompletar: v })} /></li>
    </ListGroup>,

    gamificacion: () => <GamificacionAjustes settings={settings} onError={setErrorAjuste} />,

    apariencia: () => <div className="space-y-stack">
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-fg">Tema</p>
        <SegmentedControl label="Tema de la aplicación" opciones={OPCIONES_TEMA} valor={tema} onChange={(v) => { setTema(v); setThemePref(v) }} />
      </div>
      <div className="space-y-2">
        <p className="text-body-sm font-medium text-fg">Fondo de las secciones</p>
        <SegmentedControl label="Fondo de las secciones" opciones={OPCIONES_FONDO} valor={fondo} onChange={(v) => { setFondo(v); setFondoPref(v) }} />
      </div>
    </div>,

    diagnostico: () => <DiagnosticoAjustes />,

    actualizaciones: () => <ActualizacionesAjustes />,

    // Punto 31: añadir la app en una tarjeta, con los pasos numerados del móvil elegido; lo demás, recogido.
    instalacion: () => <div className="space-y-section">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on"><Icon name="download" size={20} /></span>
          <div className="min-w-0"><h3 className="text-title text-fg">Añade AppFit a tu pantalla de inicio</h3><p className="text-body-sm text-fg-muted">Se abre como una app y funciona sin conexión.</p></div>
        </div>
        <InstalarApp />
        <SegmentedControl label="Tu móvil" valor={plataforma} onChange={setPlataforma} opciones={[{ valor: 'iphone', label: 'iPhone y iPad' }, { valor: 'android', label: 'Android' }]} />
        <PasosNumerados pasos={plataforma === 'iphone'
          ? ['Abre el enlace de AppFit en Safari.', 'Pulsa «Compartir» y elige «Añadir a pantalla de inicio».', 'Abre AppFit desde el nuevo icono.']
          : ['Abre el enlace de AppFit en Chrome.', 'Pulsa «Instalar AppFit» o, en el menú, «Instalar aplicación».', 'Abre AppFit desde su icono.']} />
        <p className="border-t border-line pt-3 text-caption text-fg-muted">{plataforma === 'iphone'
          ? 'Si ya registraste comidas en Safari, lleva antes una copia (abajo).'
          : 'Instala desde el navegador donde guardaste tus registros; para cambiar de navegador o de móvil, lleva una copia.'}</p>
      </Card>
      <ListGroup aria-label="Más ayuda">
        <li><Disclosure title="¿Ya registraste comidas en Safari?">
          <div className="space-y-3">
            {cuentaDisponible && <p className="text-body-sm text-fg-muted">Con una cuenta es más fácil: créala en Safari (Ajustes › Cuenta) y entra con ella desde el icono. Tus registros se traen solos. Sin cuenta, lleva una copia:</p>}
            <PasosNumerados pasos={[
              'En Safari, abre el enlace y entra en Ajustes › Copias de seguridad.',
              'Pulsa «Exportar» y guarda el archivo.',
              'Abre AppFit desde la pantalla de inicio y entra en Ajustes › Copias de seguridad.',
              'Pulsa «Importar», elige el archivo y confirma «Importar copia».',
            ]} />
            <p className="text-caption text-fg-muted">Después, abre siempre AppFit desde el mismo icono.</p>
            <Button variant="secondary" block onClick={() => abrir('copias')}>Ir a Copias de seguridad</Button>
          </div>
        </Disclosure></li>
        <li><Disclosure title="Ayuda para registrar un entreno">
          <div className="space-y-3">{(['entreno-series', 'entreno-rir', 'entreno-progresion', 'entreno-gimnasio'] as const).map(id => <p key={id} className="text-body-sm text-fg-muted">{PISTAS[id]}</p>)}</div>
        </Disclosure></li>
        <li><button type="button" disabled={!settings.pistasVistas?.length} onClick={() => {
          setMensaje(null)
          updateSettings({ pistasVistas: undefined }).then(() => setMensaje('Las pistas volverán a salir.')).catch(() => setErrorAjuste('No se ha podido guardar el ajuste. Inténtalo de nuevo.'))
        }} className="app-button flex min-h-touch w-full items-center gap-3 py-3 text-left disabled:opacity-50">
          <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold text-fg">Volver a ver las pistas</span><span className="block text-caption text-fg-muted">{settings.pistasVistas?.length ? 'Las explicaciones de la primera vez saldrán otra vez' : 'Aún no has cerrado ninguna'}</span></span>
          <Icon name="sparkles" size={18} className="shrink-0 text-fg-subtle" />
        </button></li>
      </ListGroup>
    </div>,

    cuenta: () => <CuentaAjustes />,

    copias: () => <div className="space-y-stack">
      <p className="text-body-sm text-fg-muted">Exporta una copia para conservar tus registros si cambias de móvil.</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={exportar} disabled={ocupado} className="flex-1">Exportar</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={ocupado} className="flex-1">Importar</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" disabled={ocupado}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importar(file)
            e.target.value = ''
          }} />
      </div>
      {backupPendiente && (
        <div role="group" aria-label="Confirmar importación" className="space-y-3">
          <p className="text-body-sm text-fg-muted">La copia contiene {formatInt(backupPendiente.comidas)} registros de comida, además de sus alimentos, entrenos y ajustes.</p>
          {hayDatos && <p className="text-body-sm text-destructive">La importación sustituirá los registros de este acceso. Exporta primero una copia si quieres conservarlos.</p>}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => setBackupPendiente(null)}>Cancelar</Button>
            <Button variant={hayDatos ? 'danger' : 'primary'} className="flex-1" loading={ocupado} disabled={hayDatos === undefined} onClick={confirmarImportacion}>Importar copia</Button>
          </div>
        </div>
      )}
      {errorBackup && <ErrorState>{errorBackup}</ErrorState>}
      <div className="space-y-2">
        <p className="text-body-sm text-fg-muted">
          {settings.ultimaExportacion === undefined ? 'Todavía no has exportado ninguna copia desde este acceso.' : `Última copia exportada: ${new Date(settings.ultimaExportacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
        </p>
        <SegmentedControl label="Recordar la copia cada" size="sm" valor={String(settings.recordatorioBackupDias ?? UMBRAL_BACKUP_POR_DEFECTO)}
          onChange={(v) => guardar({ recordatorioBackupDias: Number(v), recordatorioBackupPospuesto: undefined }, 'No se ha podido guardar el recordatorio.')}
          opciones={[{ valor: '7', label: '7 días' }, { valor: '14', label: '14 días' }, { valor: '30', label: '30 días' }]} />
      </div>
      <div>
        <Disclosure title="Exportar a Excel (CSV)">
          <div className="space-y-3">
            <NotaAmpliable resumen="Un archivo por tema. No se puede importar de vuelta."><p>Para abrirlo en Excel o una hoja de cálculo: separado por «;», con coma decimal y en UTF-8. No sustituye a la copia de seguridad.</p></NotaAmpliable>
            <div className="grid grid-cols-2 gap-2">
              {TABLAS_CSV.map(({ tabla, etiqueta }) => <Button key={tabla} variant="secondary" size="sm" disabled={ocupado} onClick={() => exportarCsv(tabla)}>{etiqueta}</Button>)}
            </div>
          </div>
        </Disclosure>
        <AlmacenamientoAjustes />
      </div>
    </div>,

    catalogo: () => <CatalogoAjustes />,

    borrar: () => <div className="space-y-3">
      {!confirmandoBorrado ? (
        <Button variant="destructive" block onClick={() => { setErrorBorrado(null); setConfirmandoBorrado(true) }}>Borrar todos los datos</Button>
      ) : (
        <ConfirmacionDestructiva
          mensaje="¿Seguro? Esto borra nutrición, gym y ajustes de este móvil. No se puede deshacer."
          confirmar="Sí, borrar"
          onConfirmar={confirmarBorrado}
          onCancelar={() => setConfirmandoBorrado(false)}
          ocupado={ocupado}
        />
      )}
      {errorBorrado && <ErrorState>{errorBorrado}</ErrorState>}
    </div>,
  }

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title="Ajustes" />
      <section aria-labelledby="ajustes-seccion" className="space-y-stack">
        <div className="flex items-start gap-2">
          <IconButton icon="arrow-left" label="Volver a Ajustes" variant="ghost" onClick={volver} />
          <h2 id="ajustes-seccion" ref={tituloRef} tabIndex={-1} className={`min-w-0 break-words text-heading outline-none ${seccion === 'borrar' ? 'text-destructive' : 'text-fg'}`}>{SECCIONES_AJUSTES[seccion].nombre}</h2>
        </div>
        {contenido[seccion]()}
        {errorAjuste && <ErrorState>{errorAjuste}</ErrorState>}
        {mensaje && <p role="status" className="text-body-sm text-accent-strong">{mensaje}</p>}
      </section>
    </div>
  )
}
