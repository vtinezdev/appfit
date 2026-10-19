-- AppFit · logros destacados sin publicar. Ejecutar después de 0015. El perfil deportivo guarda la medalla de cada logro
-- elegido (identidad, grupo, nivel y requisito, como una publicación de logro sin nota) en lugar de apuntar a una
-- publicación: ya no hace falta compartir un logro para destacarlo. Se ven donde se vea el perfil deportivo, como la
-- biografía. Es aditiva: los clientes anteriores siguen leyendo `destacados` (publicaciones) hasta que la persona guarde
-- su perfil con el cliente nuevo. Pruebas: supabase/pruebas/social_logros_destacados.sql.
begin;

alter table public.perfiles add column logros_destacados jsonb not null default '[]'::jsonb
  check (jsonb_typeof(logros_destacados) = 'array' and jsonb_array_length(logros_destacados) <= 3);

-- Lo ya destacado (publicaciones de logro) pasa a la columna nueva, en su orden y sin la nota de la publicación.
update public.perfiles pe set logros_destacados = coalesce((
  select jsonb_agg(pu.resumen - 'nota' order by array_position(pe.destacados, pu.id))
  from public.publicaciones pu where pu.id = any(pe.destacados) and pu.tipo = 'logro' and pu.autor = pe.user_id), '[]'::jsonb)
where cardinality(pe.destacados) > 0;

-- Una medalla de logro: el resumen de una publicación de logro, sin nota ni campos de más.
create function public.social_logro_destacado_valido(r jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(r) is distinct from 'object' or r->>'tipo' is distinct from 'logro' or r ? 'nota' then return false; end if;
  if not coalesce(public.social_resumen_valido(r), false) then return false; end if;
  if jsonb_typeof(r->'logroId') is distinct from 'string' or (r->>'logroId') !~ '^[a-z0-9-]{1,60}$'
    or coalesce(r->>'grupo', '') not in ('entreno', 'constancia', 'cumbres', 'caminos', 'nutricion', 'oculto')
    or not r ? 'nivel' then return false; end if;
  return r->'nivel' = 'null'::jsonb or (jsonb_typeof(r->'nivel') = 'number' and (r->>'nivel') ~ '^[1-5]$');
end;
$$;

-- Biografía, disciplinas y hasta tres logros distintos. No toca el avatar (`editar_avatar`).
create function public.guardar_perfil_deportivo(p_bio text, p_disciplinas text[], p_logros jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if p_bio is null or char_length(p_bio) > 160 or p_disciplinas is null or cardinality(p_disciplinas) > 3
    or not p_disciplinas <@ array['fuerza','caminar','correr','senderismo']::text[] or array_position(p_disciplinas, null) is not null
    or p_logros is null or jsonb_typeof(p_logros) <> 'array' then raise exception 'perfil_deportivo_no_valido'; end if;
  if jsonb_array_length(p_logros) > 3
    or exists(select 1 from jsonb_array_elements(p_logros) e where not public.social_logro_destacado_valido(e))
    or (select count(distinct e->>'logroId') from jsonb_array_elements(p_logros) e) <> jsonb_array_length(p_logros)
  then raise exception 'perfil_deportivo_no_valido'; end if;
  update public.perfiles set bio = trim(p_bio), disciplinas = p_disciplinas, logros_destacados = p_logros, destacados = '{}'
  where user_id = v_yo;
end;
$$;

-- Como en 0012, con `logros`: las medallas elegidas, con la misma visibilidad que la biografía.
create or replace function public.perfil_deportivo(p_alias text,p_comunidad uuid default null)
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
 select jsonb_build_object('alias',pe.alias,'nombre',pe.nombre,'bio',pe.bio,'disciplinas',pe.disciplinas,'logros',pe.logros_destacados,
 'avatarId',case when exists(select 1 from public.publicaciones pu where pu.id=pe.avatar_publicacion and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)) then pe.avatar_publicacion end,
 'destacados',coalesce((select jsonb_agg(jsonb_build_object('id',pu.id,'resumen',pu.resumen) order by array_position(pe.destacados,pu.id)) from public.publicaciones pu where pu.id=any(pe.destacados) and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)),'[]'::jsonb),
 'avatar',(select pu.resumen from public.publicaciones pu where pu.id=pe.avatar_publicacion and public.social_puede_ver_publicacion(v_yo,pu.id) and (p_comunidad is null or pu.comunidad=p_comunidad)),
 'publicadas',(select count(*) from public.publicaciones pu where pu.autor=v_otro and public.social_puede_ver_publicacion(v_yo,pu.id) and (case when p_comunidad is null then pu.comunidad is null else pu.comunidad=p_comunidad end))) into v_resultado
 from public.perfiles pe where pe.user_id=v_otro;
 return v_resultado;
end;
$$;

revoke execute on function public.social_logro_destacado_valido(jsonb) from public, anon, authenticated;
revoke execute on function public.guardar_perfil_deportivo(text, text[], jsonb) from public, anon;
grant execute on function public.guardar_perfil_deportivo(text, text[], jsonb) to authenticated;

-- Como en 0012; la denuncia de un perfil conserva también los nombres de sus logros destacados.
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
    select p.alias || coalesce(' · ' || p.nombre, '') || case when p.bio<>'' then ' · '||p.bio else '' end || case when cardinality(p.disciplinas)>0 then ' · '||array_to_string(p.disciplinas, ', ') else '' end
      || case when jsonb_array_length(p.logros_destacados)>0 then ' · '||(select string_agg(e->>'titulo', ', ') from jsonb_array_elements(p.logros_destacados) e) else '' end into v_contenido from public.perfiles p where p.user_id = v_objetivo;
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
