-- AppFit: comunidades donde solo publica su creador; los miembros siguen comentando.
-- Ejecutar después de 0006. Las comunidades existentes (incluida Testers) conservan sus permisos.
begin;

alter table public.comunidades add column solo_creador_publica boolean not null default false;

-- La restricción vive en la escritura, para todos los tipos y clientes, sin cambiar la lectura ni comentarios.
create function public.social_validar_autoria_comunidad()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.comunidad is not null and exists (
    select 1 from public.comunidades c
    where c.id = new.comunidad and c.solo_creador_publica and c.creador <> new.autor
  ) then raise exception 'solo_creador_publica'; end if;
  return new;
end;
$$;
revoke execute on function public.social_validar_autoria_comunidad() from public, anon, authenticated;
create trigger validar_autoria_comunidad
  before insert or update of autor, comunidad on public.publicaciones
  for each row execute function public.social_validar_autoria_comunidad();

-- Hay una columna nueva en el resultado: recrear y restablecer sus permisos de RPC explícitamente.
drop function public.comunidades(text, boolean);
create function public.comunidades(p_busqueda text, p_solo_mias boolean)
returns table (id uuid, nombre text, descripcion text, miembros integer, unida boolean, mia boolean, solo_creador_publica boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  return query select c.id, c.nombre, c.descripcion,
    (select count(*)::int from public.miembros_comunidad m join public.perfiles p on p.user_id = m.miembro where m.comunidad = c.id and not p.suspendido),
    public.social_es_miembro(v_yo, c.id), c.creador = v_yo, c.solo_creador_publica
  from public.comunidades c join public.perfiles creador on creador.user_id = c.creador
  where not c.suspendida and not creador.suspendido and not public.social_bloqueo(v_yo, c.creador)
    and (not coalesce(p_solo_mias, false) or public.social_es_miembro(v_yo, c.id))
    and position(lower(left(trim(coalesce(p_busqueda, '')), 60)) in lower(c.nombre)) > 0
  order by lower(c.nombre), c.id limit 100;
end;
$$;

create function public.crear_comunidad(p_id uuid, p_nombre text, p_descripcion text, p_solo_creador_publica boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_existente public.comunidades%rowtype;
begin
  if p_solo_creador_publica is null then raise exception 'comunidad_no_valida'; end if;
  perform 1 from public.perfiles where user_id = v_yo for update;
  select * into v_existente from public.comunidades where id = p_id;
  if found then
    if v_existente.creador = v_yo and v_existente.solo_creador_publica = p_solo_creador_publica then return; end if;
    raise exception 'comunidad_no_valida';
  end if;
  if (select count(*) from public.comunidades where creador = v_yo and creada > now() - interval '1 day') >= 5 then raise exception 'limite'; end if;
  insert into public.comunidades(id, creador, nombre, descripcion, solo_creador_publica)
    values (p_id, v_yo, trim(p_nombre), trim(coalesce(p_descripcion, '')), p_solo_creador_publica);
  insert into public.miembros_comunidad(comunidad, miembro) values (p_id, v_yo);
exception
  when unique_violation then raise exception 'comunidad_ocupada';
  when check_violation or not_null_violation then raise exception 'comunidad_no_valida';
end;
$$;

-- Los clientes anteriores siguen creando comunidades abiertas a publicaciones de todos los miembros.
create or replace function public.crear_comunidad(p_id uuid, p_nombre text, p_descripcion text)
returns void language sql security definer set search_path = '' as $$
  select public.crear_comunidad(p_id, p_nombre, p_descripcion, false)
$$;

revoke execute on function public.comunidades(text, boolean), public.crear_comunidad(uuid, text, text, boolean)
  from public, anon;
grant execute on function public.comunidades(text, boolean), public.crear_comunidad(uuid, text, text, boolean)
  to authenticated;

notify pgrst, 'reload schema';
commit;
