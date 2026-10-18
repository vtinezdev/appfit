import type { Resumen } from '../lib/publicacion'
import type { SeleccionResumen } from '../lib/seleccion'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'

export default function SeleccionPublicacion({ resumen, valor, onChange }: { resumen: Resumen; valor: SeleccionResumen; onChange: (s: SeleccionResumen)=>void }) {
  const capacidades=useConsulta(async()=>(await cargarSocial()).capacidades(),0)
  if(resumen.tipo!=='entreno'&&resumen.tipo!=='actividad')return null
  const toggle=(clave: 'mapa'|'ejercicios'|'ligas'|'logros'|'duracion'|'volumen', label: string)=> <label key={clave} className="flex min-h-touch items-center gap-2 text-body-sm text-fg"><input type="checkbox" className="h-5 w-5 shrink-0 accent-accent" checked={valor[clave]} onChange={e=>onChange({...valor,[clave]:e.target.checked})}/>{label}</label>
  return <fieldset className="space-y-1"><legend className="text-label text-fg-muted">Mostrar en este resumen</legend>
    {capacidades.datos?.camposOpcionales&&<>{toggle('duracion','Duración')}{resumen.tipo==='entreno'&&toggle('volumen','Volumen')}</>}
    {resumen.tipo==='entreno'&&<>
      {resumen.mapa&&toggle('mapa','Mapa muscular')}{toggle('ejercicios','Ejercicios')}{toggle('ligas','Cambios de liga')}{toggle('logros','Nuevas piezas de Vitrina')}
      {resumen.records.map((r,i)=><label key={i} className="flex min-h-touch items-center gap-2 break-words text-body-sm text-fg"><input type="checkbox" className="h-5 w-5 shrink-0 accent-accent" checked={valor.records.includes(i)} onChange={e=>onChange({...valor,records:e.target.checked?[...valor.records,i]:valor.records.filter(n=>n!==i)})}/>{r.ejercicio} · {r.texto}</label>)}
    </>}
  </fieldset>
}
