-- AppFit · conversación y control. Después de 0009, antes de desplegar el cliente.
begin;
alter table public.reacciones add column id uuid not null default gen_random_uuid() unique;
create index reacciones_cursor on public.reacciones(publicacion,creada desc,id desc);
alter table public.comentarios add column respuesta_a uuid references public.comentarios(id) on delete set null;
create index comentarios_respuesta on public.comentarios(respuesta_a) where respuesta_a is not null;
alter table public.seguimientos add column aceptado timestamptz;
create function public.social_fecha_aceptacion() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'aceptado' and old.estado <> 'aceptado' then new.aceptado := clock_timestamp(); end if;
  return new;
end;
$$;
create trigger fecha_aceptacion before update of estado on public.seguimientos for each row execute function public.social_fecha_aceptacion();
revoke execute on function public.social_fecha_aceptacion() from public,anon,authenticated;

create function public.comentar_respuesta(p_id uuid,p_texto text,p_respuesta uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_id uuid;
begin
  -- Serializa la cuota de esta persona, incluso con varias pestañas.
  perform 1 from public.perfiles where user_id=v_yo for update;
  perform public.social_publicacion(v_yo,p_id);
  if p_respuesta is not null and not exists(
    select 1 from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
    where c.id=p_respuesta and c.publicacion=p_id and c.respuesta_a is null
      and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor)
  ) then raise exception 'no_encontrado'; end if;
  v_id := public.comentar(p_id,p_texto);
  update public.comentarios set respuesta_a=p_respuesta where id=v_id;
  return v_id;
end;
$$;
-- No se añaden avisos genéricos de hilo: solo la respuesta dirigida a un comentario raíz.
create or replace function public.comentarios_pagina(p_id uuid,p_antes timestamptz,p_antes_id uuid,p_limite integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_autor uuid:=public.social_publicacion(v_yo,p_id); v_total integer; v_items jsonb;
begin
 select count(*)::int into v_total from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
 where c.publicacion=p_id and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.creado desc,x.id desc),'[]'::jsonb) into v_items from (
  select c.id,pe.alias,pe.nombre,c.texto,c.creado,c.autor=v_yo as mio,c.autor=v_yo or v_autor=v_yo as puedo_borrar,
    case when not coalesce(q.suspendido,true) and not public.social_bloqueo(v_yo,q.user_id) then c.respuesta_a end as respuesta_a,
    case when not coalesce(q.suspendido,true) and not public.social_bloqueo(v_yo,q.user_id) then q.alias end as respuesta_alias
  from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
  left join public.comentarios padre on padre.id=c.respuesta_a left join public.perfiles q on q.user_id=padre.autor
  where c.publicacion=p_id and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor)
    and (p_antes is null or (c.creado,c.id)<(p_antes,p_antes_id))
  order by c.creado desc,c.id desc limit least(greatest(coalesce(p_limite,20),1),30)
 ) x;
 return jsonb_build_object('items',v_items,'total',v_total);
end;
$$;
create function public.animos_de(p_id uuid,p_antes timestamptz,p_antes_id uuid,p_limite integer)
returns table(id uuid,alias text,nombre text,creada timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid:=public.social_yo();
begin
 if public.social_publicacion(v_yo,p_id) <> v_yo then raise exception 'no_encontrado'; end if;
 return query select r.id,pe.alias,pe.nombre,r.creada from public.reacciones r join public.perfiles pe on pe.user_id=r.user_id
 where r.publicacion=p_id and not pe.suspendido and not public.social_bloqueo(v_yo,r.user_id)
 and (p_antes is null or (r.creada,r.id)<(p_antes,p_antes_id))
 order by r.creada desc,r.id desc limit least(greatest(coalesce(p_limite,20),1),30);
end;
$$;

create table public.silencios (
 quien uuid not null references public.perfiles(user_id) on delete cascade,
 silenciado uuid not null references public.perfiles(user_id) on delete cascade,
 primary key(quien,silenciado),check(quien<>silenciado)
);
alter table public.silencios enable row level security;
revoke all on public.silencios from anon,authenticated;
create function public.silenciar(p_alias text,p_silenciar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_otro uuid:=public.social_id(v_yo,p_alias);
begin
 if v_yo=v_otro then raise exception 'no_encontrado'; end if;
 if p_silenciar then insert into public.silencios values(v_yo,v_otro) on conflict do nothing;
 else delete from public.silencios where quien=v_yo and silenciado=v_otro; end if;
end;
$$;
create function public.silenciados() returns table(alias text,nombre text)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo();
begin
 return query select p.alias,p.nombre from public.silencios s join public.perfiles p on p.user_id=s.silenciado
 where s.quien=v_yo and not p.suspendido and not public.social_bloqueo(v_yo,p.user_id) order by p.alias;
end;
$$;
create or replace function public.feed(p_antes timestamptz,p_antes_id uuid,p_limite integer)
returns table(id uuid,alias text,nombre text,fecha timestamptz,creada timestamptz,resumen jsonb,reacciones integer,comentarios integer,reaccione boolean,mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid:=public.social_yo();
begin
 return query select f.* from (
 select pu.id as pid,pu.creada as pcreada from public.publicaciones pu
 where pu.comunidad is null and public.social_puede_ver_publicacion(v_yo,pu.id)
 and not exists(select 1 from public.silencios s where s.quien=v_yo and s.silenciado=pu.autor)
 and (p_antes is null or (pu.creada,pu.id)<(p_antes,p_antes_id))
 order by pu.creada desc,pu.id desc limit least(greatest(coalesce(p_limite,20),1),30)
 ) x cross join lateral public.social_fila(v_yo,x.pid) f order by x.pcreada desc,x.pid desc;
end;
$$;
create or replace function public.feed(p_antes timestamptz,p_limite integer)
returns table(id uuid,alias text,nombre text,fecha timestamptz,creada timestamptz,resumen jsonb,reacciones integer,comentarios integer,reaccione boolean,mia boolean)
language sql stable security definer set search_path = '' as $$
 select * from public.feed(p_antes,'00000000-0000-0000-0000-000000000000'::uuid,p_limite)
$$;

alter table public.miembros_comunidad add column visto timestamptz;
create function public.ver_comunidad(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo();
begin
 perform public.social_comunidad(v_yo,p_id);
 update public.miembros_comunidad set visto=clock_timestamp() where comunidad=p_id and miembro=v_yo;
 if not found then raise exception 'no_miembro'; end if;
end;
$$;
create function public.novedades_comunidades() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_lista jsonb;
begin
 select coalesce(jsonb_object_agg(x.id,x.n),'{}'::jsonb) into v_lista from (
 select m.comunidad as id,count(pu.id) as n from public.miembros_comunidad m
 join public.comunidades c on c.id=m.comunidad join public.perfiles pe on pe.user_id=c.creador
 left join public.publicaciones pu on pu.comunidad=m.comunidad and pu.creada>coalesce(m.visto,m.creado)
   and pu.autor<>v_yo and public.social_puede_ver_publicacion(v_yo,pu.id)
 where m.miembro=v_yo and not c.suspendida and not pe.suspendido and not public.social_bloqueo(v_yo,c.creador)
 group by m.comunidad
 ) x;
 return v_lista;
end;
$$;

-- Eventos visibles actuales; no guarda texto adicional ni datos privados.
create function public.social_eventos(p_yo uuid)
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
 return jsonb_build_object('solicitudes',(select count(*) from public.seguimientos where seguido=v_yo and estado='pendiente'),'nuevos',v_nuevos,'lista',v_lista);
end;
$$;
revoke execute on function public.comentar_respuesta(uuid,text,uuid),public.animos_de(uuid,timestamptz,uuid,integer),public.silenciar(text,boolean),public.silenciados(),public.ver_comunidad(uuid),public.novedades_comunidades() from public,anon;
grant execute on function public.comentar_respuesta(uuid,text,uuid),public.animos_de(uuid,timestamptz,uuid,integer),public.silenciar(text,boolean),public.silenciados(),public.ver_comunidad(uuid),public.novedades_comunidades() to authenticated;
commit;
