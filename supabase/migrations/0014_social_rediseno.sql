-- AppFit · rediseño de Social. Ejecutar después de 0013. Solo añade dos lecturas: los clientes anteriores no las llaman
-- y el cliente nuevo funciona sin ellas (monograma y sin vista previa). Pruebas: supabase/pruebas/social_rediseno.sql.
begin;

-- Avatar (la insignia elegida en el perfil deportivo) de varias personas a la vez, con la visibilidad de perfil_deportivo:
-- solo si quien pregunta puede ver esa publicación de logro y, desde una comunidad, solo si se publicó en ella. Quien no
-- cumpla no aparece en el resultado (el cliente pinta su monograma). Viajan alias y resumen, nunca UUID de usuario.
create function public.avatares_social(p_alias text[], p_comunidad uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_lista jsonb;
begin
  if p_comunidad is not null then
    perform public.social_comunidad(v_yo, p_comunidad);
    if not public.social_es_miembro(v_yo, p_comunidad) then raise exception 'no_miembro'; end if;
  end if;
  select coalesce(jsonb_object_agg(pe.alias, pu.resumen), '{}'::jsonb) into v_lista
  from public.perfiles pe join public.publicaciones pu on pu.id = pe.avatar_publicacion
  where pe.alias in (select lower(trim(a)) from unnest(p_alias[1:60]) a)
    and not pe.suspendido and not public.social_bloqueo(v_yo, pe.user_id)
    and pu.tipo = 'logro' and public.social_puede_ver_publicacion(v_yo, pu.id)
    and (p_comunidad is null or pu.comunidad = p_comunidad);
  return v_lista;
end;
$$;

-- Último comentario visible de varias publicaciones (vista previa en el feed), con los filtros de comentarios_pagina:
-- publicación visible, autor del comentario sin suspender y sin bloqueo con quien pregunta. Texto recortado a 140.
create function public.ultimos_comentarios(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_lista jsonb;
begin
  select coalesce(jsonb_object_agg(x.publicacion::text, jsonb_build_object('alias', x.alias, 'nombre', x.nombre, 'texto', x.texto)), '{}'::jsonb) into v_lista
  from (
    select distinct on (c.publicacion) c.publicacion, pe.alias, pe.nombre, left(c.texto, 140) as texto
    from public.comentarios c join public.perfiles pe on pe.user_id = c.autor
    where c.publicacion in (select unnest(p_ids[1:30])) and not pe.suspendido and not public.social_bloqueo(v_yo, c.autor)
      and public.social_puede_ver_publicacion(v_yo, c.publicacion)
    order by c.publicacion, c.creado desc, c.id desc
  ) x;
  return v_lista;
end;
$$;

revoke execute on function public.avatares_social(text[], uuid), public.ultimos_comentarios(uuid[]) from public, anon;
grant execute on function public.avatares_social(text[], uuid), public.ultimos_comentarios(uuid[]) to authenticated;
commit;
