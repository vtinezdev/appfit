-- AppFit · imágenes del catálogo de comunidades. Ejecutar después de 0027.
-- Solo guarda identificadores; no sube archivos ni cambia las comunidades anteriores.
-- Víctor ejecuta este archivo completo en el SQL Editor; no se aplica desde la app.
begin;

create function public.imagen_comunidad_valida(p_imagen text)
returns boolean language sql immutable set search_path = '' as $$
  select p_imagen is null or p_imagen = any(array[
    'lugar.campamento',
    'lugar.refugio',
    'lugar.pista',
    'lugar.gimnasio',
    'lugar.jardin',
    'lugar.embarcadero',
    'lugar.sala-fuerza',
    'lugar.parque-barras',
    'lugar.box',
    'lugar.estudio',
    'lugar.sala-baile',
    'lugar.patio',
    'lugar.paseo',
    'lugar.carretera',
    'lugar.sendero',
    'lugar.rocodromo',
    'lugar.estacion',
    'lugar.snowpark',
    'lugar.campo',
    'lugar.cancha',
    'lugar.red-playa',
    'lugar.pabellon',
    'lugar.palos',
    'lugar.pista-hockey',
    'lugar.pista-cristal',
    'lugar.tierra-batida',
    'lugar.sala-raquetas',
    'lugar.club-mesa',
    'lugar.ring',
    'lugar.dojo',
    'lugar.piscina',
    'lugar.bahia',
    'lugar.orilla',
    'lugar.caseta-tablas',
    'lugar.puerto',
    'lugar.transicion'
  ]::text[])
$$;
revoke execute on function public.imagen_comunidad_valida(text) from public, anon, authenticated;

alter table public.comunidades add column imagen text
  constraint comunidades_imagen_check check (public.imagen_comunidad_valida(imagen));

create function public.editar_imagen_comunidad(p_id uuid, p_imagen text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if not public.imagen_comunidad_valida(p_imagen) then raise exception 'imagen_comunidad_no_valida'; end if;
  update public.comunidades set imagen = p_imagen where id = p_id and creador = v_yo and not suspendida;
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

-- Una sola transacción para crear la comunidad, su membresía y su imagen.
-- Serializa con la creación antigua y conserva el idempotente: un reintento no deshace ediciones posteriores.
create function public.crear_comunidad_con_imagen(p_id uuid, p_nombre text, p_descripcion text, p_solo_creador_publica boolean, p_imagen text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_existente public.comunidades%rowtype;
begin
  if not public.imagen_comunidad_valida(p_imagen) then raise exception 'imagen_comunidad_no_valida'; end if;
  if p_solo_creador_publica is null then raise exception 'comunidad_no_valida'; end if;
  perform 1 from public.perfiles where user_id = v_yo for update;
  select * into v_existente from public.comunidades where id = p_id for update;
  if found then
    if v_existente.creador = v_yo and v_existente.solo_creador_publica = p_solo_creador_publica then return; end if;
    raise exception 'comunidad_no_valida';
  end if;
  perform public.crear_comunidad(p_id, p_nombre, p_descripcion, p_solo_creador_publica);
  perform public.editar_imagen_comunidad(p_id, p_imagen);
end;
$$;

-- Se conserva exactamente el filtro de visibilidad, búsqueda, miembros y orden de 0007.
drop function public.comunidades(text, boolean);
create function public.comunidades(p_busqueda text, p_solo_mias boolean)
returns table (id uuid, nombre text, descripcion text, miembros integer, unida boolean, mia boolean, solo_creador_publica boolean, imagen text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  return query select c.id, c.nombre, c.descripcion,
    (select count(*)::int from public.miembros_comunidad m join public.perfiles p on p.user_id = m.miembro where m.comunidad = c.id and not p.suspendido),
    public.social_es_miembro(v_yo, c.id), c.creador = v_yo, c.solo_creador_publica, c.imagen
  from public.comunidades c join public.perfiles creador on creador.user_id = c.creador
  where not c.suspendida and not creador.suspendido and not public.social_bloqueo(v_yo, c.creador)
    and (not coalesce(p_solo_mias, false) or public.social_es_miembro(v_yo, c.id))
    and position(lower(left(trim(coalesce(p_busqueda, '')), 60)) in lower(c.nombre)) > 0
  order by lower(c.nombre), c.id limit 100;
end;
$$;

create or replace function public.social_capacidades() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.social_yo();
  return (select jsonb_build_object('camposOpcionales',campos_opcionales,'imagenesPublicacion',true,'detallesEjercicio',true,'rutinaCompartida',true,'semanaRitmo',true,'semanaCompania',true,'imagenesComunidades',true) from public.social_configuracion where id);
end;
$$;

revoke execute on function public.editar_imagen_comunidad(uuid,text), public.crear_comunidad_con_imagen(uuid,text,text,boolean,text), public.comunidades(text,boolean), public.social_capacidades() from public, anon;
grant execute on function public.editar_imagen_comunidad(uuid,text), public.crear_comunidad_con_imagen(uuid,text,text,boolean,text), public.comunidades(text,boolean), public.social_capacidades() to authenticated;
notify pgrst, 'reload schema';
commit;
