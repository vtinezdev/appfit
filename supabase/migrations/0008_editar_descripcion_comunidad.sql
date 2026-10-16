-- AppFit: quien creó una comunidad puede cambiar su descripción. Ejecutar después de 0007.
-- El nombre, los permisos de publicación y los miembros no cambian.
begin;

create function public.editar_descripcion_comunidad(p_id uuid, p_descripcion text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  update public.comunidades set descripcion = trim(coalesce(p_descripcion, ''))
    where id = p_id and creador = v_yo and not suspendida;
  if not found then raise exception 'no_encontrado'; end if;
exception
  when check_violation then raise exception 'comunidad_no_valida';
end;
$$;

revoke execute on function public.editar_descripcion_comunidad(uuid, text) from public, anon;
grant execute on function public.editar_descripcion_comunidad(uuid, text) to authenticated;

notify pgrst, 'reload schema';
commit;
