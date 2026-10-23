-- Avisos de la semana en compañía (A19, ADR 057, docs/features/social.md): la invitación que espera respuesta cuenta en
-- la campana como una solicitud (`avisos().companias`) y el ánimo de alguien del grupo llega como aviso del día
-- (`animo_compania`). Pausar o salir de un grupo nunca avisa. Las versiones anteriores de la app ignoran el tipo y el
-- recuento nuevos. Ejecutar después de 0024; se puede ejecutar antes o después de desplegar.
-- Pruebas: supabase/pruebas/social_avisos_compania.sql.
begin;

create or replace function public.social_eventos(p_yo uuid)
returns table(tipo text,alias text,nombre text,publicacion uuid,titulo text,texto text,creado timestamptz,mia boolean)
language sql stable security definer set search_path = '' as $$
 select 'reaccion',pe.alias,pe.nombre,pu.id,case when pu.tipo='texto' then left(pu.resumen->>'texto',60) else pu.resumen->>'titulo' end,null::text,r.creada,true
 from public.reacciones r join public.publicaciones pu on pu.id=r.publicacion and pu.autor=p_yo
 join public.perfiles pe on pe.user_id=r.user_id and not pe.suspendido
 where r.user_id<>p_yo and not public.social_bloqueo(p_yo,r.user_id) and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select case when pu.autor=p_yo then 'comentario' else 'respuesta' end,pe.alias,pe.nombre,pu.id,
 case when pu.tipo='texto' then left(pu.resumen->>'texto',60) else pu.resumen->>'titulo' end,left(c.texto,120),c.creado,pu.autor=p_yo
 from public.comentarios c join public.publicaciones pu on pu.id=c.publicacion
 join public.perfiles pe on pe.user_id=c.autor and not pe.suspendido
 left join public.comentarios padre on padre.id=c.respuesta_a
 where (pu.autor=p_yo or padre.autor=p_yo) and c.autor<>p_yo
 and not public.social_bloqueo(p_yo,c.autor) and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select 'aceptada',pe.alias,pe.nombre,null::uuid,'',null::text,s.aceptado,false
 from public.seguimientos s join public.perfiles pe on pe.user_id=s.seguido and not pe.suspendido
 where s.seguidor=p_yo and s.estado='aceptado' and s.aceptado is not null and not public.social_bloqueo(p_yo,s.seguido)
 union all
 select 'comunidad',pe.alias,pe.nombre,pu.id,co.nombre,null::text,pu.creada,false
 from public.miembros_comunidad m join public.comunidades co on co.id=m.comunidad and co.solo_creador_publica
 join public.publicaciones pu on pu.comunidad=co.id and pu.autor=co.creador and pu.creada>m.creado
 join public.perfiles pe on pe.user_id=pu.autor and not pe.suspendido
 where m.miembro=p_yo and pu.autor<>p_yo and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select 'anadido',pe.alias,pe.nombre,co.id,co.nombre,null::text,m.creado,false
 from public.miembros_comunidad m join public.comunidades co on co.id=m.comunidad and not co.suspendida
 join public.perfiles pe on pe.user_id=m.anadido_por and not pe.suspendido
 join public.perfiles cr on cr.user_id=co.creador and not cr.suspendido
 where m.miembro=p_yo and m.anadido_por<>p_yo
 and not public.social_bloqueo(p_yo,m.anadido_por) and not public.social_bloqueo(p_yo,co.creador)
 union all
 -- 0025: un ánimo en tu semana de un grupo de la semana en compañía (en `publicacion`, el id del grupo).
 select 'animo_compania',pe.alias,pe.nombre,a.compania,'',null::text,a.creado,false
 from public.companeros_animos a join public.perfiles pe on pe.user_id=a.de and not pe.suspendido
 where a.para=p_yo and not public.social_bloqueo(p_yo,a.de)
$$;
revoke execute on function public.social_eventos(uuid) from public,anon,authenticated;

create or replace function public.avisos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_desde timestamptz; v_lista jsonb; v_nuevos integer;
begin
 select avisos_vistos into v_desde from public.perfiles where user_id=v_yo;
 select count(*)::int into v_nuevos from public.social_eventos(v_yo) e where e.creado>v_desde;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.creado desc),'[]'::jsonb) into v_lista from (
 select distinct on (g.creado,g.tipo,g.publicacion,g.alias) g.* from (
 select e.tipo,(array_agg(e.alias order by e.creado desc,e.alias))[1] as alias,
 (array_agg(e.nombre order by e.creado desc,e.alias))[1] as nombre,e.publicacion,
 (array_agg(e.titulo order by e.creado desc,e.alias))[1] as titulo,
 (array_agg(e.texto order by e.creado desc,e.alias))[1] as texto,max(e.creado) as creado,bool_or(e.mia) as mia,
 bool_or(e.creado>v_desde) as nuevo,count(distinct e.alias)::int as personas
 from public.social_eventos(v_yo) e group by e.tipo,e.publicacion,case when e.publicacion is null then e.alias end
 ) g order by g.creado desc,g.tipo,g.publicacion,g.alias limit 30
 ) x;
 return jsonb_build_object('solicitudes',(select count(*) from public.seguimientos where seguido=v_yo and estado='pendiente'),'nuevos',v_nuevos,'lista',v_lista,
  -- 0025: invitaciones de la semana en compañía que esperan respuesta (como las solicitudes, cuentan hasta responderlas).
  'companias',(select count(*) from public.companeros c where c.user_id=v_yo and c.estado='invitado'
    and exists (select 1 from public.perfiles p where p.user_id=c.invitado_por and not p.suspendido)));
end;
$$;
revoke execute on function public.avisos() from public,anon;
grant execute on function public.avisos() to authenticated;

notify pgrst, 'reload schema';
commit;
