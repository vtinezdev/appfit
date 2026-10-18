-- AppFit · mejoras de Social, fase 0. Ejecutar después de 0008 y antes del cliente.
-- Conserva las firmas antiguas para clientes instalados. Pruebas: mejoras_social.sql.
begin;
create index publicaciones_cursor on public.publicaciones (creada desc, id desc);
create index comentarios_cursor on public.comentarios (publicacion, creado desc, id desc);

create function public.feed(p_antes timestamptz, p_antes_id uuid, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb, reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin

  return query select f.* from (
    select pu.id as pid, pu.creada as pcreada from public.publicaciones pu
    where pu.comunidad is null and public.social_puede_ver_publicacion(v_yo, pu.id)
      and (p_antes is null or (pu.creada, pu.id) < (p_antes, p_antes_id))
    order by pu.creada desc, pu.id desc limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x cross join lateral public.social_fila(v_yo, x.pid) f order by x.pcreada desc, x.pid desc;
end;
$$;
revoke execute on function public.feed(timestamptz, uuid, integer) from public, anon;
grant execute on function public.feed(timestamptz, uuid, integer) to authenticated;

create function public.publicaciones_de(p_alias text, p_antes timestamptz, p_antes_id uuid, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb, reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo(); v_autor uuid;
begin
  select user_id into v_autor from public.perfiles where alias = lower(trim(p_alias)); if v_autor is null or not public.social_puede_ver(v_yo, v_autor) then raise exception 'no_encontrado'; end if;
  return query select f.* from (
    select pu.id as pid, pu.creada as pcreada from public.publicaciones pu
    where pu.comunidad is null and pu.autor = v_autor and public.social_puede_ver_publicacion(v_yo, pu.id)
      and (p_antes is null or (pu.creada, pu.id) < (p_antes, p_antes_id))
    order by pu.creada desc, pu.id desc limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x cross join lateral public.social_fila(v_yo, x.pid) f order by x.pcreada desc, x.pid desc;
end;
$$;
revoke execute on function public.publicaciones_de(text, timestamptz, uuid, integer) from public, anon;
grant execute on function public.publicaciones_de(text, timestamptz, uuid, integer) to authenticated;

create function public.publicaciones_comunidad(p_id uuid, p_antes timestamptz, p_antes_id uuid, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb, reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  perform public.social_comunidad(v_yo, p_id); if not public.social_es_miembro(v_yo, p_id) then raise exception 'no_miembro'; end if;
  return query select f.* from (
    select pu.id as pid, pu.creada as pcreada from public.publicaciones pu
    where pu.comunidad = p_id and public.social_puede_ver_publicacion(v_yo, pu.id)
      and (p_antes is null or (pu.creada, pu.id) < (p_antes, p_antes_id))
    order by pu.creada desc, pu.id desc limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x cross join lateral public.social_fila(v_yo, x.pid) f order by x.pcreada desc, x.pid desc;
end;
$$;
revoke execute on function public.publicaciones_comunidad(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.publicaciones_comunidad(uuid, timestamptz, uuid, integer) to authenticated;

create function public.comentarios_pagina(p_id uuid, p_antes timestamptz, p_antes_id uuid, p_limite integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_autor uuid := public.social_publicacion(v_yo, p_id); v_total integer; v_items jsonb;
begin
  select count(*)::int into v_total from public.comentarios c join public.perfiles pe on pe.user_id = c.autor
    where c.publicacion = p_id and not pe.suspendido and not public.social_bloqueo(v_yo, c.autor);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.creado desc, x.id desc), '[]'::jsonb) into v_items from (
    select c.id, pe.alias, pe.nombre, c.texto, c.creado, c.autor = v_yo as mio, c.autor = v_yo or v_autor = v_yo as puedo_borrar
    from public.comentarios c join public.perfiles pe on pe.user_id = c.autor
    where c.publicacion = p_id and not pe.suspendido and not public.social_bloqueo(v_yo, c.autor)
      and (p_antes is null or (c.creado, c.id) < (p_antes, p_antes_id))
    order by c.creado desc, c.id desc limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x;
  return jsonb_build_object('items', v_items, 'total', v_total);
end;
$$;
revoke execute on function public.comentarios_pagina(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.comentarios_pagina(uuid, timestamptz, uuid, integer) to authenticated;

-- Validación cerrada: el resumen nunca puede transportar campos privados arbitrarios.
create function public.social_cifra(x jsonb) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(x) = 'number' and (x::text)::numeric >= 0, false)
$$;
create function public.social_texto(x jsonb, maximo integer) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(x) = 'string' and char_length(x #>> '{}') between 1 and maximo and trim(x #>> '{}') <> '', false)
$$;
create function public.social_resumen_valido(r jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; l jsonb; lista text; permitidas text[]; zonas text[] := array['pecho','espalda','hombros','biceps','triceps','antebrazo','cuadriceps','isquiotibiales','gluteos','aductores','gemelos','core'];
begin
  if jsonb_typeof(r) <> 'object' or r->'v' is distinct from '1'::jsonb or not public.social_texto(r->'titulo',60) then return false; end if;
  case r->>'tipo'
    when 'entreno' then permitidas := array['v','tipo','titulo','duracionSeg','series','volumenKg','ejercicios','records','ligas','logros','mapa','nota','recordsTotal','recordsEjercicios'];
    when 'actividad' then permitidas := array['v','tipo','titulo','actividad','duracionSeg','distanciaM','desnivelM','nota'];
    when 'logro' then permitidas := array['v','tipo','titulo','logroId','grupo','nivel','descripcion','nota'];
    when 'texto' then permitidas := array['v','tipo','titulo','texto'];
    else return false;
  end case;
  for k in select jsonb_object_keys(r) loop if not k = any(permitidas) then return false; end if; end loop;
  if r ? 'nota' and not public.social_texto(r->'nota',280) then return false; end if;
  if r->>'tipo' = 'texto' then return public.social_texto(r->'texto',2000); end if;
  -- El publicador existente valida el catálogo y el nivel de los logros.
  if r->>'tipo' = 'logro' then return public.social_texto(r->'descripcion',500); end if;
  if not public.social_cifra(r->'duracionSeg') then return false; end if;
  if r->>'tipo' = 'actividad' then
    return coalesce(r->>'actividad' in ('caminar','correr','senderismo'), false) and public.social_cifra(r->'distanciaM')
      and (coalesce(r->'desnivelM' = 'null'::jsonb,false) or public.social_cifra(r->'desnivelM'));
  end if;
  if not public.social_cifra(r->'series') or not public.social_cifra(r->'volumenKg') then return false; end if;
  foreach lista in array array['ejercicios','records','ligas','logros'] loop
    if jsonb_typeof(r->lista) is distinct from 'array' then return false; end if;
    if jsonb_array_length(r->lista) > (case when lista = 'ejercicios' then 15 else 6 end) then return false; end if;
    for l in select jsonb_array_elements(r->lista) loop
      if lista in ('ejercicios','logros') then
        if not public.social_texto(l,60) then return false; end if;
      else
        if jsonb_typeof(l) <> 'object' or not public.social_texto(l->'ejercicio',60) or not public.social_texto(l->'texto',60) then return false; end if;
        for k in select jsonb_object_keys(l) loop
          if not k = any(case when lista = 'records' then array['ejercicio','texto','tipo','modo','valor','anterior','peso','variante'] else array['ejercicio','texto'] end) then return false; end if;
        end loop;
        if l ?| array['tipo','modo','valor','anterior','peso','variante'] then
          if lista <> 'records' or not coalesce(l->>'tipo' in ('peso','1rm','reps','asistencia'),false)
            or not coalesce(l->>'modo' in ('externa','corporal','lastre','asistencia'),false)
            or not public.social_cifra(l->'valor') or not public.social_cifra(l->'anterior') then return false; end if;
          if l ? 'peso' and not public.social_cifra(l->'peso') then return false; end if;
          if l ? 'variante' and not public.social_texto(l->'variante',60) then return false; end if;
        end if;
      end if;
    end loop;
  end loop;
  foreach k in array array['recordsTotal','recordsEjercicios'] loop
    if r ? k and (not public.social_cifra(r->k) or (r->>k)::numeric <> trunc((r->>k)::numeric)) then return false; end if;
  end loop;
  if r ? 'recordsTotal' and (r->>'recordsTotal')::numeric < jsonb_array_length(r->'records') then return false; end if;
  if r ? 'recordsEjercicios' and r ? 'recordsTotal' and (r->>'recordsEjercicios')::numeric > (r->>'recordsTotal')::numeric then return false; end if;
  if r ? 'mapa' then
    if jsonb_typeof(r->'mapa') <> 'object' or (select count(*) from jsonb_object_keys(r->'mapa')) <> 12 then return false; end if;
    foreach k in array zonas loop
      if not public.social_cifra(r->'mapa'->k) or (r->'mapa'->>k)::numeric not between 0 and 5
        or (r->'mapa'->>k)::numeric <> trunc((r->'mapa'->>k)::numeric) then return false; end if;
    end loop;
  end if;
  return true;
exception when others then return false;
end;
$$;
create function public.social_validar_publicacion() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.social_resumen_valido(new.resumen) is not true or new.tipo <> new.resumen->>'tipo' then raise exception 'publicacion_no_valida'; end if;
  return new;
end;
$$;
create trigger validar_publicacion before insert or update of resumen, tipo on public.publicaciones
  for each row execute function public.social_validar_publicacion();
revoke execute on function public.social_cifra(jsonb), public.social_texto(jsonb,integer), public.social_resumen_valido(jsonb), public.social_validar_publicacion() from public, anon, authenticated;

-- Vista de persona desde una comunidad: solo sus publicaciones en ese grupo.
create function public.publicaciones_persona_comunidad(p_alias text, p_comunidad uuid, p_antes timestamptz, p_antes_id uuid, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb, reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  perform public.social_comunidad(v_yo, p_comunidad);
  if not public.social_es_miembro(v_yo, p_comunidad) then raise exception 'no_miembro'; end if;
  return query select f.* from (
    select pu.id as pid, pu.creada as pcreada from public.publicaciones pu join public.perfiles pe on pe.user_id = pu.autor
    where pu.comunidad = p_comunidad and pe.alias = lower(trim(p_alias)) and public.social_puede_ver_publicacion(v_yo, pu.id)
      and (p_antes is null or (pu.creada, pu.id) < (p_antes, p_antes_id))
    order by pu.creada desc, pu.id desc limit least(greatest(coalesce(p_limite,20),1),30)
  ) x cross join lateral public.social_fila(v_yo, x.pid) f order by x.pcreada desc, x.pid desc;
end;
$$;
revoke execute on function public.publicaciones_persona_comunidad(text, uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.publicaciones_persona_comunidad(text, uuid, timestamptz, uuid, integer) to authenticated;

commit;
