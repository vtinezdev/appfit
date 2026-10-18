-- AppFit · perfil deportivo expresamente publicado. Sin datos corporales ni imágenes subidas.
begin;
alter table public.perfiles add column bio text not null default '' check(char_length(bio)<=160);
alter table public.perfiles add column disciplinas text[] not null default '{}' check(cardinality(disciplinas)<=3 and disciplinas<@array['fuerza','caminar','correr','senderismo']::text[]);
alter table public.perfiles add column destacados uuid[] not null default '{}' check(cardinality(destacados)<=3);
alter table public.perfiles add column avatar_publicacion uuid references public.publicaciones(id) on delete set null;
create function public.editar_perfil_deportivo(p_bio text,p_disciplinas text[],p_destacados uuid[],p_avatar uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_id uuid;
begin
 if p_bio is null or char_length(p_bio)>160 or p_disciplinas is null or cardinality(p_disciplinas)>3
 or not p_disciplinas<@array['fuerza','caminar','correr','senderismo']::text[] or array_position(p_disciplinas,null) is not null
 or p_destacados is null or cardinality(p_destacados)>3 or array_position(p_destacados,null) is not null then raise exception 'perfil_deportivo_no_valido'; end if;
 foreach v_id in array (p_destacados || case when p_avatar is null then '{}'::uuid[] else array[p_avatar] end) loop
  if not exists(select 1 from public.publicaciones where id=v_id and autor=v_yo and tipo='logro' and comunidad is null) then raise exception 'perfil_deportivo_no_valido'; end if;
 end loop;
 update public.perfiles set bio=trim(p_bio),disciplinas=p_disciplinas,destacados=p_destacados,avatar_publicacion=p_avatar where user_id=v_yo;
end;
$$;
create function public.perfil_deportivo(p_alias text,p_comunidad uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_otro uuid; v_resultado jsonb;
begin
 select user_id into v_otro from public.perfiles where alias=lower(trim(p_alias)) and not suspendido;
 if v_otro is null or public.social_bloqueo(v_yo,v_otro) then raise exception 'no_encontrado'; end if;
 if p_comunidad is null then
   -- La relación basta para ver la identidad deportiva, no para leer el feed privado.
   if v_yo<>v_otro and not exists(select 1 from public.seguimientos where (seguidor=v_yo and seguido=v_otro) or (seguidor=v_otro and seguido=v_yo)) then raise exception 'no_encontrado'; end if;
 else
  perform public.social_comunidad(v_yo,p_comunidad);
  if not public.social_es_miembro(v_yo,p_comunidad) or not public.social_es_miembro(v_otro,p_comunidad) then raise exception 'no_miembro'; end if;
 end if;
 select jsonb_build_object('alias',pe.alias,'nombre',pe.nombre,'bio',pe.bio,'disciplinas',pe.disciplinas,
 'avatarId',case when exists(select 1 from public.publicaciones pu where pu.id=pe.avatar_publicacion and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)) then pe.avatar_publicacion end,
 'destacados',coalesce((select jsonb_agg(jsonb_build_object('id',pu.id,'resumen',pu.resumen) order by array_position(pe.destacados,pu.id)) from public.publicaciones pu where pu.id=any(pe.destacados) and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)),'[]'::jsonb),
 'avatar',(select pu.resumen from public.publicaciones pu where pu.id=pe.avatar_publicacion and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)),
 'publicadas',(select count(*) from public.publicaciones pu where pu.autor=v_otro and public.social_puede_ver_publicacion(v_yo,pu.id) and (case when p_comunidad is null then pu.comunidad is null else pu.comunidad=p_comunidad end))) into v_resultado
 from public.perfiles pe where pe.user_id=v_otro;
 return v_resultado;
end;
$$;
revoke execute on function public.editar_perfil_deportivo(text,text[],uuid[],uuid),public.perfil_deportivo(text,uuid) from public,anon;
grant execute on function public.editar_perfil_deportivo(text,text[],uuid[],uuid),public.perfil_deportivo(text,uuid) to authenticated;
create or replace function public.denunciar(p_tipo text, p_objetivo text, p_motivo text, p_detalle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_objetivo uuid;
  v_contenido text;
  v_publicacion uuid;
begin
  if (select count(*) from public.denuncias d where d.denunciante = v_yo and d.creada > now() - interval '1 day') >= 20 then
    raise exception 'limite';
  end if;
  if p_tipo = 'perfil' then
    v_objetivo := public.social_id(v_yo, p_objetivo);
    select p.alias || coalesce(' · ' || p.nombre, '') || case when p.bio<>'' then ' · '||p.bio else '' end || case when cardinality(p.disciplinas)>0 then ' · '||array_to_string(p.disciplinas, ', ') else '' end into v_contenido from public.perfiles p where p.user_id = v_objetivo;
  elsif p_tipo = 'comunidad' then
    begin v_objetivo := p_objetivo::uuid;
    exception when invalid_text_representation then raise exception 'no_encontrado'; end;
    perform public.social_comunidad(v_yo, v_objetivo);
    select c.nombre || ' · ' || c.descripcion into v_contenido from public.comunidades c where c.id = v_objetivo;
  elsif p_tipo in ('publicacion', 'comentario') then
    begin
      v_objetivo := p_objetivo::uuid;
    exception when invalid_text_representation then
      raise exception 'no_encontrado';
    end;
    if p_tipo = 'publicacion' then
      v_publicacion := v_objetivo;
    else
      select c.publicacion, c.texto into v_publicacion, v_contenido from public.comentarios c where c.id = v_objetivo;
      if v_publicacion is null then
        raise exception 'no_encontrado';
      end if;
    end if;
    perform public.social_publicacion(v_yo, v_publicacion);
    if p_tipo = 'publicacion' then
      select pe.alias || ' · ' || p.resumen::text into v_contenido
      from public.publicaciones p join public.perfiles pe on pe.user_id = p.autor where p.id = v_publicacion;
    else
      select pe.alias || ' · ' || v_contenido into v_contenido
      from public.comentarios c join public.perfiles pe on pe.user_id = c.autor where c.id = v_objetivo;
    end if;
  else
    raise exception 'tipo_no_valido';
  end if;
  insert into public.denuncias (denunciante, tipo, objetivo, contenido, motivo, detalle)
  values (v_yo, p_tipo, v_objetivo, v_contenido, p_motivo, nullif(trim(coalesce(p_detalle, '')), ''));
exception
  when check_violation then
    raise exception 'denuncia_no_valida';
end;
$$;
commit;
