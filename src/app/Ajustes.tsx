import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup, migrarBackup } from '../shared/lib/backup'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { formatInt } from '../shared/lib/format'
import { todayISO } from '../shared/lib/dates'
import * as perfilRepo from '../features/perfil/data/perfilRepo'
import { actualizarObjetivoHoy } from '../features/perfil/data/objetivosDiaRepo'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import AtributosAjustes from '../features/atributos/components/AtributosAjustes'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import Button from '../shared/components/Button'
import Disclosure from '../shared/components/Disclosure'
import SegmentedControl from '../shared/components/SegmentedControl'
import { getThemePref, setThemePref, type ThemePref } from '../shared/design/theme'
import ConfirmacionDestructiva from '../shared/components/ConfirmacionDestructiva'
import PageHeader from '../shared/components/PageHeader'
import SectionHeader from '../shared/components/SectionHeader'
import { UMBRAL_BACKUP_POR_DEFECTO } from '../shared/lib/recordatorioBackup'
import { formatAgua, objetivoAguaPorDefecto, resolverObjetivoAgua, validarObjetivoAgua } from '../features/inicio/lib/agua'
import { Input } from '../shared/components/Input'
import { descargarCsv, TABLAS_CSV, type TablaCsv } from '../shared/lib/exportarCsv'
import AlmacenamientoAjustes from './AlmacenamientoAjustes'

function irASeccion(seccion: HTMLElement | null) {
  seccion?.scrollIntoView({ block: 'start' })
  seccion?.focus({ preventScroll: true })
}

export default function Ajustes({ abrirGuia = false, abrirCopia = false, onIrAPerfil }: { abrirGuia?: boolean; abrirCopia?: boolean; onIrAPerfil?: () => void }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const vigentes = useLiveQuery(() => perfilRepo.objetivosVigentes(todayISO()), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const sexo = useLiveQuery(async () => (await perfilRepo.getPerfil()).sexo, [])
  const [aguaTexto, setAguaTexto] = useState<string | null>(null)
  const [tema, setTema] = useState<ThemePref>(getThemePref)
  const [guiaAbierta, setGuiaAbierta] = useState(abrirGuia)
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)
  const [errorObjetivos, setErrorObjetivos] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorBackup, setErrorBackup] = useState<string | null>(null)
  const [backupPendiente, setBackupPendiente] = useState<{ texto: string; comidas: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const guiaRef = useRef<HTMLElement>(null)
  const backupRef = useRef<HTMLElement>(null)
  const cargados = settings !== undefined

  useEffect(() => {
    if (abrirGuia && cargados) irASeccion(guiaRef.current)
    else if (abrirCopia && cargados) irASeccion(backupRef.current)
  }, [abrirGuia, abrirCopia, cargados])

  if (!settings || !vigentes) return <LoadingState />

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

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title="Ajustes" />


      <ObjetivosAjustes objetivos={vigentes} origen={vigentes.origen} proteinaPorKg={vigentes.proteinaPorKg} onIrAPerfil={onIrAPerfil} onGuardar={(objetivos) => {
        setErrorObjetivos(null)
        updateSettings({ objetivos }).then(() => actualizarObjetivoHoy(todayISO(), 'ajustes')).catch(() => setErrorObjetivos('No se han podido guardar los objetivos. Inténtalo de nuevo.'))
      }} />
      {errorObjetivos && <ErrorState>{errorObjetivos}</ErrorState>}
      <section aria-label="Apariencia" className="space-y-stack">
        <SectionHeader variant="section">Apariencia</SectionHeader>
        <SegmentedControl label="Tema de la aplicación" opciones={[{ valor: 'system', label: 'Sistema' }, { valor: 'light', label: 'Claro' }, { valor: 'dark', label: 'Oscuro' }]} valor={tema} onChange={(v) => { setTema(v); setThemePref(v) }} />
      </section>

      <section aria-label="Agua" className="space-y-stack">
        <SectionHeader variant="section">Agua</SectionHeader>
        {(() => {
          const efectivo = resolverObjetivoAgua(settings.aguaObjetivoMl, sexo)
          const recomendado = objetivoAguaPorDefecto(sexo)
          return <div className="space-y-2">
            <label className="flex items-center justify-between gap-3">
              <span className="text-body-sm font-medium text-fg">Objetivo diario (ml)</span>
              <Input type="number" inputMode="numeric" enterKeyHint="done" className="tabular no-spin w-28 text-right" placeholder={recomendado !== null ? String(recomendado) : 'Sin objetivo'}
                value={aguaTexto ?? (settings.aguaObjetivoMl ?? '')}
                onChange={(e) => {
                  setAguaTexto(e.target.value)
                  const v = validarObjetivoAgua(Number(e.target.value))
                  if (e.target.value !== '' && v !== null) updateSettings({ aguaObjetivoMl: v }).catch(() => setErrorObjetivos('No se ha podido guardar el objetivo de agua.'))
                }}
                onBlur={() => setAguaTexto(null)} />
            </label>
            <p className="text-caption text-fg-muted">
              {efectivo ? (efectivo.origen === 'efsa' ? `Ahora: ${formatAgua(efectivo.ml)}, el recomendado según tu sexo en Perfil.` : `Ahora: ${formatAgua(efectivo.ml)}, el que has fijado tú.`) : 'Sin objetivo: Inicio solo muestra lo que bebes. Indica tu sexo en Perfil para ver el recomendado o escribe uno.'}
              {' '}El recomendado parte de la ingesta adecuada de EFSA (2010) para adultos; detalles en Referencias › Proteína y agua.
            </p>
            {settings.aguaObjetivoMl !== undefined && <Button variant="subtle" size="sm" onClick={() => { setAguaTexto(null); updateSettings({ aguaObjetivoMl: undefined }).catch(() => setErrorObjetivos('No se ha podido guardar el objetivo de agua.')) }}>Usar el recomendado</Button>}
          </div>
        })()}
      </section>

      <section aria-label="Entreno" className="space-y-stack">
        <SectionHeader variant="section">Entreno</SectionHeader>
        <SegmentedControl label="Sonido al terminar el descanso" valor={settings.sonidoDescanso === false ? 'no' : 'si'}
          onChange={(v) => { updateSettings({ sonidoDescanso: v === 'si' }).catch(() => setErrorObjetivos('No se ha podido guardar el ajuste. Inténtalo de nuevo.')) }}
          opciones={[{ valor: 'si', label: 'Con sonido' }, { valor: 'no', label: 'Sin sonido' }]} />
        <p className="text-caption text-fg-muted">Un pitido corto, solo con la app abierta: iOS no permite vibrar ni avisar en segundo plano sin notificaciones.</p>
        <SegmentedControl label="Preguntar el RIR al completar una serie" valor={settings.rirAlCompletar === false ? 'no' : 'si'}
          onChange={(v) => { updateSettings({ rirAlCompletar: v === 'si' }).catch(() => setErrorObjetivos('No se ha podido guardar el ajuste. Inténtalo de nuevo.')) }}
          opciones={[{ valor: 'si', label: 'Preguntar RIR' }, { valor: 'no', label: 'No preguntar' }]} />
        <p className="text-caption text-fg-muted">Al marcar una serie se abre el selector de repeticiones en reserva. Siempre puedes anotarlo tocando su celda.</p>
      </section>

      <AtributosAjustes settings={settings} onError={setErrorObjetivos} />

      <section ref={backupRef} tabIndex={-1} aria-label="Backup" className="scroll-mt-6 space-y-stack">
        <SectionHeader variant="section">Copias de seguridad</SectionHeader>
        <div className="space-y-3">
          <p className="text-body-sm text-fg-muted">Tus registros son privados y se guardan en este dispositivo. Exporta una copia para conservarlos si cambias de móvil.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportar} disabled={ocupado} className="flex-1">
              Exportar
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={ocupado} className="flex-1">
              Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              disabled={ocupado}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importar(file)
                e.target.value = ''
              }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-body-sm text-fg-muted">
              {settings.ultimaExportacion === undefined ? 'Todavía no has exportado ninguna copia desde este acceso.' : `Última copia exportada: ${new Date(settings.ultimaExportacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
            </p>
            <SegmentedControl label="Recordar la copia cada" size="sm" valor={String(settings.recordatorioBackupDias ?? UMBRAL_BACKUP_POR_DEFECTO)}
              onChange={(v) => { updateSettings({ recordatorioBackupDias: Number(v), recordatorioBackupPospuesto: undefined }).catch(() => setErrorBackup('No se ha podido guardar el recordatorio.')) }}
              opciones={[{ valor: '7', label: '7 días' }, { valor: '14', label: '14 días' }, { valor: '30', label: '30 días' }]} />
          </div>
          <Disclosure title="Exportar a Excel (CSV)">
            <div className="space-y-3">
              <p className="text-body-sm text-fg-muted">Un archivo por tema, para abrirlo en Excel o una hoja de cálculo: separado por «;», con coma decimal y en UTF-8. No sustituye a la copia de seguridad: no se puede importar de vuelta.</p>
              <div className="grid grid-cols-2 gap-2">
                {TABLAS_CSV.map(({ tabla, etiqueta }) => <Button key={tabla} variant="secondary" size="sm" disabled={ocupado} onClick={() => exportarCsv(tabla)}>{etiqueta}</Button>)}
              </div>
            </div>
          </Disclosure>
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
          {mensaje && (
            <p role="status" className="text-body-sm text-accent-strong">
              {mensaje}
            </p>
          )}
        </div>
      </section>

      <AlmacenamientoAjustes />

      <section ref={guiaRef} tabIndex={-1} aria-label="Primera vez en AppFit" className="scroll-mt-6 space-y-stack">
        <Disclosure title="Instalación y traslado de registros" open={guiaAbierta} onChange={setGuiaAbierta}>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-body font-semibold">Añade la app a tu pantalla de inicio</h3>
            <p className="text-body-sm text-fg-muted">Si ya registraste comidas en Safari, exporta primero una copia desde Ajustes.</p>
            <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
              <li>Abre el enlace de AppFit en Safari.</li>
              <li>Pulsa «Compartir» y elige «Añadir a pantalla de inicio».</li>
              <li>Abre AppFit desde el nuevo acceso de tu pantalla de inicio.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <p className="text-body-sm text-fg-muted">En Android, abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p>
            <h3 className="text-body font-semibold">¿Ya registraste comidas en Safari?</h3>
            <p className="text-body-sm text-fg-muted">En iPhone, los registros de Safari pueden guardarse por separado. Lleva una copia al nuevo acceso:</p>
            <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg-muted">
              <li>En Safari, abre el enlace original y entra en Ajustes.</li>
              <li>Pulsa «Exportar» y guarda el archivo. Si todavía no has añadido el acceso, haz esta copia primero.</li>
              <li>Abre AppFit desde la pantalla de inicio y entra en Ajustes.</li>
              <li>Pulsa «Importar», elige el archivo y confirma «Importar copia».</li>
            </ol>
          </div>
          <p className="text-body-sm font-medium">Después, abre siempre AppFit desde el mismo acceso de la pantalla de inicio.</p>
          <Button variant="secondary" block onClick={() => irASeccion(backupRef.current)}>Ir a Exportar / Importar</Button>
        </div>
        </Disclosure>
      </section>


      <CatalogoAjustes />

      <section aria-label="Borrar registros" className="space-y-stack">
        <SectionHeader variant="section" tone="destructive">
          Borrar registros
        </SectionHeader>
        <div className="border-t border-line pt-3">
          {!confirmandoBorrado ? (
            <Button variant="destructive" block onClick={() => { setErrorBorrado(null); setConfirmandoBorrado(true) }}>
              Borrar todos los datos
            </Button>
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
        </div>
      </section>
      <p className="border-t border-line pt-4 text-caption text-fg-muted">APPFIT · Privada y sin cuentas.<br />Nutrición y entrenos disponibles sin conexión.</p>
    </div>
  )
}
