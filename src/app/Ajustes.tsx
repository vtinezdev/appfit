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
import CreatinaAjustes from '../features/inicio/components/CreatinaAjustes'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import Button, { IconButton } from '../shared/components/Button'
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
import { formatAgua, objetivoAguaPorDefecto, resolverObjetivoAgua, validarObjetivoAgua } from '../features/inicio/lib/agua'
import { Input } from '../shared/components/Input'
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
export default function Ajustes({ seccionInicial, onIrAPerfil, onIrAReferencias, enfocarReferencias = false }: { seccionInicial?: SeccionAjustes; onIrAPerfil?: () => void; onIrAReferencias?: () => void; enfocarReferencias?: boolean }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const vigentes = useLiveQuery(() => perfilRepo.objetivosVigentes(todayISO()), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const sexo = useLiveQuery(async () => (await perfilRepo.getPerfil()).sexo, [])
  const [seccion, setSeccion] = useState<SeccionAjustes | null>(seccionInicial ?? null)
  const [enfocarTitulo, setEnfocarTitulo] = useState(seccionInicial !== undefined)
  /** Fila del índice que recupera el foco al volver de su sección. */
  const [volverA, setVolverA] = useState<SeccionAjustes | null>(null)
  const [focoReferencias, setFocoReferencias] = useState(enfocarReferencias)
  const [aguaTexto, setAguaTexto] = useState<string | null>(null)
  const [tema, setTema] = useState<ThemePref>(getThemePref)
  const [fondo, setFondo] = useState<FondoPref>(getFondoPref)
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)
  const [errorAjuste, setErrorAjuste] = useState<string | null>(null)
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
  const efectivoAgua = resolverObjetivoAgua(settings.aguaObjetivoMl, sexo)
  const datosResumen = {
    settings, objetivos: vigentes, aguaMl: efectivoAgua?.ml ?? null, tema, fondo,
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
          <ListGroup>{g.secciones.filter((id) => id !== 'cuenta' || cuentaDisponible).map((id) => fila(id))}</ListGroup>
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

    agua: () => {
      const recomendado = objetivoAguaPorDefecto(sexo)
      const errorAgua = 'No se ha podido guardar el objetivo de agua.'
      return <div className="space-y-2">
        <label className="flex items-center justify-between gap-3">
          <span className="text-body-sm font-medium text-fg">Objetivo diario (ml)</span>
          <Input type="number" inputMode="numeric" enterKeyHint="done" className="tabular no-spin w-28 text-right" placeholder={recomendado !== null ? String(recomendado) : 'Sin objetivo'}
            value={aguaTexto ?? (settings.aguaObjetivoMl ?? '')}
            onChange={(e) => {
              setAguaTexto(e.target.value)
              const v = validarObjetivoAgua(Number(e.target.value))
              if (e.target.value !== '' && v !== null) guardar({ aguaObjetivoMl: v }, errorAgua)
            }}
            onBlur={() => setAguaTexto(null)} />
        </label>
        <NotaAmpliable resumen={efectivoAgua ? (efectivoAgua.origen === 'efsa' ? `Ahora: ${formatAgua(efectivoAgua.ml)}, el recomendado según tu sexo en Perfil.` : `Ahora: ${formatAgua(efectivoAgua.ml)}, el que has fijado tú.`) : 'Sin objetivo: Inicio solo muestra lo que bebes.'}>
          <p>{efectivoAgua ? '' : 'Indica tu sexo en Perfil para ver el recomendado o escribe uno. '}El recomendado parte de la ingesta adecuada de EFSA (2010) para adultos; detalles en Referencias › Proteína y agua.</p>
        </NotaAmpliable>
        {settings.aguaObjetivoMl !== undefined && <Button variant="subtle" size="sm" onClick={() => { setAguaTexto(null); guardar({ aguaObjetivoMl: undefined }, errorAgua) }}>Usar el recomendado</Button>}
      </div>
    },

    creatina: () => <CreatinaAjustes settings={settings} />,

    entreno: () => <div className="space-y-stack">
      <div className="space-y-1">
        <SegmentedControl label="Sonido al terminar el descanso" valor={settings.sonidoDescanso === false ? 'no' : 'si'}
          onChange={(v) => guardar({ sonidoDescanso: v === 'si' })}
          opciones={[{ valor: 'si', label: 'Con sonido' }, { valor: 'no', label: 'Sin sonido' }]} />
        <NotaAmpliable resumen="Un pitido corto, solo con la app abierta."><p>iOS no permite vibrar ni avisar en segundo plano sin notificaciones.</p></NotaAmpliable>
      </div>
      <div className="space-y-1">
        <SegmentedControl label="Preguntar el RIR al completar una serie" valor={settings.rirAlCompletar === false ? 'no' : 'si'}
          onChange={(v) => guardar({ rirAlCompletar: v === 'si' })}
          opciones={[{ valor: 'si', label: 'Preguntar RIR' }, { valor: 'no', label: 'No preguntar' }]} />
        <NotaAmpliable resumen="Se pregunta al marcar cada serie."><p>Son las repeticiones que te quedaban en reserva. Siempre puedes anotarlo tocando su celda.</p></NotaAmpliable>
      </div>
    </div>,

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

    instalacion: () => <div className="space-y-section">
      <section aria-label="Añadir a la pantalla de inicio" className="space-y-2">
        <h3 className="text-title text-fg">Añade la app a tu pantalla de inicio</h3>
        <InstalarApp />
        <h4 className="text-body font-semibold text-fg">Android</h4>
        <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
          <li>Abre el enlace de AppFit en Chrome.</li>
          <li>Pulsa «Instalar AppFit» si aparece, o abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
          <li>Confirma la instalación y abre AppFit desde su icono.</li>
        </ol>
        <p className="text-body-sm text-fg-muted">Si usas otro navegador, la opción puede tener otro nombre. Instala desde el navegador donde guardaste tus registros; para cambiar de navegador o móvil, lleva una copia de seguridad.</p>
        <h4 className="text-body font-semibold text-fg">iPhone y iPad</h4>
        <p className="text-body-sm text-fg-muted">Si ya registraste comidas en Safari, exporta primero una copia.</p>
        <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
          <li>Abre el enlace de AppFit en Safari.</li>
          <li>Pulsa «Compartir» y elige «Añadir a pantalla de inicio».</li>
          <li>Abre AppFit desde el nuevo acceso de tu pantalla de inicio.</li>
        </ol>
      </section>
      <section aria-label="Trasladar registros de Safari" className="space-y-2">
        <h3 className="text-title text-fg">¿Ya registraste comidas en Safari?</h3>
        {cuentaDisponible && <p className="text-body-sm text-fg-muted">Con una cuenta es más fácil: créala en Safari (Ajustes › Cuenta) y entra con ella en el nuevo acceso. Tus registros se traen solos.</p>}
        <p className="text-body-sm text-fg-muted">{cuentaDisponible ? 'Sin cuenta, lleva' : 'En iPhone, los registros de Safari pueden guardarse por separado. Lleva'} una copia al nuevo acceso:</p>
        <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
          <li>En Safari, abre el enlace original y entra en Ajustes › Copias de seguridad.</li>
          <li>Pulsa «Exportar» y guarda el archivo. Si todavía no has añadido el acceso, haz esta copia primero.</li>
          <li>Abre AppFit desde la pantalla de inicio y entra en Ajustes › Copias de seguridad.</li>
          <li>Pulsa «Importar», elige el archivo y confirma «Importar copia».</li>
        </ol>
        <p className="text-body-sm font-medium">Después, abre siempre AppFit desde el mismo acceso de la pantalla de inicio.</p>
        <Button variant="secondary" block onClick={() => abrir('copias')}>Ir a Copias de seguridad</Button>
      </section>
      <section aria-label="Pistas" className="space-y-2">
        <h3 className="text-title text-fg">Pistas</h3>
        <Disclosure title="Ayuda para registrar un entreno">
          <div className="space-y-3">{(['entreno-series', 'entreno-rir', 'entreno-progresion', 'entreno-gimnasio'] as const).map(id => <p key={id} className="text-body-sm text-fg-muted">{PISTAS[id]}</p>)}</div>
        </Disclosure>
        <p className="text-body-sm text-fg-muted">Algunas pantallas explican cómo se usan la primera vez que entras.</p>
        <Button variant="secondary" disabled={!settings.pistasVistas?.length} onClick={() => {
          setMensaje(null)
          updateSettings({ pistasVistas: undefined }).then(() => setMensaje('Las pistas volverán a salir.')).catch(() => setErrorAjuste('No se ha podido guardar el ajuste. Inténtalo de nuevo.'))
        }}>Volver a ver las pistas</Button>
      </section>
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
