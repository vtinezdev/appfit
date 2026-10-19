import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import Disclosure from '../../../shared/components/Disclosure'
import { Textarea } from '../../../shared/components/Input'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { PerfilDeportivo } from '../data/social'
import { useConsulta } from '../hooks/useConsulta'
import type { CursorSocial, PublicacionFeed } from '../lib/feed'
import { cargarSocial } from '../servicio'
import { olvidarAvatares } from '../hooks/useAvatares'
import { CabeceraPerfil, DISCIPLINAS } from './PerfilDeportivo'
import ElegirAvatar from './ElegirAvatar'
import { idAvatar, mismoAvatar, type Avatar } from '../lib/avatar'

export default function EditarPerfilDeportivo({ alias }: { alias: string }) {
  const consulta = useConsulta(async () => {
    const s=await cargarSocial()
    const [perfil,pagina,avatares]=await Promise.all([s.perfilDeportivo(alias),s.publicacionesDe(alias,null),s.avatares([alias])])
    return { perfil,pagina,avatar:avatares[alias]??null }
  },alias)
  if(consulta.estado==='error') return <div className="space-y-2"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" onClick={consulta.recargar}>Reintentar perfil deportivo</Button></div>
  if(!consulta.datos) return <LoadingState />
  return <Formulario key={alias} inicial={consulta.datos.perfil} avatarInicial={consulta.datos.avatar} publicaciones={consulta.datos.pagina.items} cursorInicial={consulta.datos.pagina.cursor} hayMasInicial={consulta.datos.pagina.hayMas} />
}
function Formulario({ inicial, avatarInicial, publicaciones, cursorInicial, hayMasInicial }: { inicial: PerfilDeportivo; avatarInicial: Avatar | null; publicaciones: PublicacionFeed[]; cursorInicial: CursorSocial | null; hayMasInicial: boolean }) {
  const [bio,setBio]=useState(inicial.bio)
  const [disciplinas,setDisciplinas]=useState(inicial.disciplinas)
  const [destacados,setDestacados]=useState(inicial.destacados)
  const [avatar,setAvatar]=useState(avatarInicial)
  const [lista,setLista]=useState(publicaciones)
  const [cursor,setCursor]=useState(cursorInicial)
  const [hayMas,setHayMas]=useState(hayMasInicial)
  const [ocupado,setOcupado]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [guardado,setGuardado]=useState(false)
  const logros = [...inicial.destacados,...(inicial.avatarId && inicial.avatar ? [{ id: inicial.avatarId, resumen: inicial.avatar }] : []),...lista.filter(p => p.resumen.tipo==='logro')].filter((p,i,rs) => rs.findIndex(v => v.id===p.id)===i)
  async function ejecutar(fn:()=>Promise<void>) {
    if(ocupado) return
    setOcupado(true); setError(null); setGuardado(false)
    try { await fn() } catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar.') }
    finally { setOcupado(false) }
  }
  return <form className="space-y-stack" aria-label="Perfil deportivo" onSubmit={e => { e.preventDefault(); void ejecutar(async()=>{
      // El avatar de catálogo primero: si falla, no se toca nada. Elegido uno, el logro publicado de antes deja de usarse.
      const s=await cargarSocial(), cambia=!mismoAvatar(avatar,avatarInicial)
      if(cambia) await s.editarAvatar(avatar?idAvatar(avatar):null)
      await s.editarPerfilDeportivo(bio,disciplinas,destacados.map(p=>p.id),cambia?null:inicial.avatarId); olvidarAvatares(); setGuardado(true) }) }}>
    <Campo etiqueta="Biografía deportiva" ayuda="Hasta 160 caracteres. La verán las personas con las que te relacionas en Social."><Textarea rows={3} maxLength={160} value={bio} onChange={e=>setBio(e.target.value)} /></Campo>
    <fieldset className="space-y-1"><legend className="text-label text-fg-muted">Disciplinas · Hasta tres</legend>{Object.entries(DISCIPLINAS).map(([id,label])=><label key={id} className="flex min-h-touch items-center gap-2 text-body-sm text-fg"><input type="checkbox" className="h-5 w-5 accent-accent" checked={disciplinas.includes(id)} disabled={!disciplinas.includes(id)&&disciplinas.length>=3} onChange={e=>setDisciplinas(ds=>e.target.checked?[...ds,id]:ds.filter(d=>d!==id))}/>{label}</label>)}</fieldset>
    <fieldset className="space-y-1"><legend className="text-label text-fg-muted">Destaca hasta tres logros publicados</legend>{logros.map(p=><label key={p.id} className="flex min-h-touch items-center gap-2 break-words text-body-sm text-fg"><input type="checkbox" className="h-5 w-5 shrink-0 accent-accent" checked={destacados.some(d=>d.id===p.id)} disabled={!destacados.some(d=>d.id===p.id)&&destacados.length>=3} onChange={e=>setDestacados(ds=>e.target.checked?[...ds,p]:ds.filter(d=>d.id!==p.id))}/>{p.resumen.titulo}</label>)}
      {hayMas && <Button variant="subtle" size="sm" loading={ocupado} onClick={()=>void ejecutar(async()=>{const p=await(await cargarSocial()).publicacionesDe(inicial.alias,cursor);setLista(ls=>[...ls,...p.items]);setCursor(p.cursor);setHayMas(p.hayMas)})}>Buscar en publicaciones anteriores</Button>}
      {!logros.length && <p className="text-body-sm text-fg-muted">Comparte un logro de tu Vitrina para destacarlo aquí.</p>}
    </fieldset>
    <ElegirAvatar persona={inicial} avatar={avatar} onChange={setAvatar} />
    <Disclosure title="Así te ven tus seguidores aprobados"><CabeceraPerfil persona={inicial} perfil={{...inicial,bio,disciplinas,destacados}} avatar={avatar} /></Disclosure>
    <p className="text-caption text-fg-muted">En comunidades solo se muestran los logros publicados para esa comunidad. Tu nutrición, tus medidas y tu peso corporal siguen en tu diario.</p>
    <Button type="submit" variant="secondary" block loading={ocupado}>Guardar perfil deportivo</Button>
    {error&&<ErrorState>{error}</ErrorState>}{guardado&&<p role="status" className="text-body-sm text-accent-strong">Perfil deportivo guardado.</p>}
  </form>
}
