import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '../shared/db/settings'
import { borrarTodosLosDatos, descargarBackup, exportarBackup, importarBackup, migrarBackup } from '../shared/lib/backup'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { formatInt } from '../shared/lib/format'
import { todayISO } from '../shared/lib/dates'
import * as perfilRepo from '../features/perfil/data/perfilRepo'
import CatalogoAjustes from '../features/nutricion/components/CatalogoAjustes'
import ObjetivosAjustes from '../features/nutricion/components/ObjetivosAjustes'
import { ErrorState, LoadingState } from '../shared/components/StateMessage'
import Button from '../shared/components/Button'
import Disclosure from '../shared/components/Disclosure'
import SegmentedControl from '../shared/components/SegmentedControl'
import { getThemePref, setThemePref, type ThemePref } from '../shared/design/theme'
import ConfirmacionDestructiva from '../shared/components/ConfirmacionDestructiva'
import PageHeader from '../shared/components/PageHeader'
import SectionHeader from '../shared/components/SectionHeader'
import AlmacenamientoAjustes from './AlmacenamientoAjustes'

function irASeccion(seccion: HTMLElement | null) {
  seccion?.scrollIntoView({ block: 'start' })
  seccion?.focus({ preventScroll: true })
}

export default function Ajustes({ abrirGuia = false, onIrAPerfil }: { abrirGuia?: boolean; onIrAPerfil?: () => void }) {
  const settings = useLiveQuery(() => getSettings(), [])
  const vigentes = useLiveQuery(() => perfilRepo.objetivosVigentes(todayISO()), [])
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
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
  }, [abrirGuia, cargados])

  if (!settings || !vigentes) return <LoadingState />

  async function exportar() {
    setErrorBackup(null)
    setOcupado(true)
    try {
      descargarBackup(await exportarBackup())
    } catch {
      setErrorBackup('No se ha podido exportar la copia. Vuelve a intentarlo antes de cambiar de acceso.')
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


      <ObjetivosAjustes objetivos={vigentes} origen={vigentes.origen} onIrAPerfil={onIrAPerfil} onGuardar={(objetivos) => {
        setErrorObjetivos(null)
        updateSettings({ objetivos }).catch(() => setErrorObjetivos('No se han podido guardar los objetivos. Inténtalo de nuevo.'))
      }} />
      {errorObjetivos && <ErrorState>{errorObjetivos}</ErrorState>}
      <section aria-label="Apariencia" className="space-y-stack">
        <SectionHeader variant="section">Apariencia</SectionHeader>
        <SegmentedControl label="Tema de la aplicación" opciones={[{ valor: 'system', label: 'Sistema' }, { valor: 'light', label: 'Claro' }, { valor: 'dark', label: 'Oscuro' }]} valor={tema} onChange={(v) => { setTema(v); setThemePref(v) }} />
      </section>

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
