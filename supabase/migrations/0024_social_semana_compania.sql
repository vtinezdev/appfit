-- Semana en compañía (ADR 057, docs/features/social.md): grupos de 2 o 3 personas que se siguen mutuamente y se
-- acompañan semana tras semana, cada una contra su propio plan de Ritmo («Laura · 2 de 3»), con «Ánimo» y pausa o
-- salida sin reproche. Lo único nuevo que sale del móvil es el agregado de la semana (lunes, entrenos que cuentan y
-- entrenos del plan), y solo mientras la persona está en algún grupo. La app solo lo ofrece cuando
-- `social_capacidades` anuncia `semanaCompania`, que aparece con esta migración: ejecutarla después de desplegar la
-- app. Pruebas: supabase/pruebas/social_semana_compania.sql.
begin;

create table public.companias (
  id uuid primary key,
  creada timestamptz not null default now()
);

create table public.companeros (
  compania uuid not null references public.companias (id) on delete cascade,
  user_id uuid not null references public.perfiles (user_id) on delete cascade,
  -- `invitado` hasta que acepta; `pausa` sigue en el grupo sin cifras.
  estado text not null check (estado in ('invitado', 'activo', 'pausa')),
  invitado_por uuid references public.perfiles (user_id) on delete set null,
  creado timestamptz not null default now(),
  primary key (compania, user_id)
);

create index companeros_user on public.companeros (user_id);

-- El agregado de la semana de cada persona (una fila, la última que subió). La semana es la del móvil de cada uno:
-- `lunes` en su hora local.
create table public.companeros_semana (
  user_id uuid primary key references public.perfiles (user_id) on delete cascade,
  lunes date not null check (extract(isodow from lunes) = 1),
  hechas smallint not null check (hechas between 0 and 7),
  objetivo smallint not null check (objetivo between 0 and 7),
  actualizado timestamptz not null default now()
);

create table public.companeros_animos (
  compania uuid not null references public.companias (id) on delete cascade,
  de uuid not null references public.perfiles (user_id) on delete cascade,
  para uuid not null references public.perfiles (user_id) on delete cascade,
  lunes date not null check (extract(isodow from lunes) = 1),
  creado timestamptz not null default now(),
  primary key (compania, de, para, lunes),
  check (de <> para)
);

alter table public.companias enable row level security;
alter table public.companeros enable row level security;
alter table public.companeros_semana enable row level security;
alter table public.companeros_animos enable row level security;
revoke all on public.companias, public.companeros, public.companeros_semana, public.companeros_animos from anon, authenticated;

-- Al salir alguien: sus ánimos del grupo se van; el grupo se cierra si queda una sola persona o nadie que haya aceptado;
-- y su agregado se borra si ya no está en ningún grupo.
create function public.social_companero_fuera() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.companeros_animos a where a.compania = old.compania and (a.de = old.user_id or a.para = old.user_id);
  if (select count(*) from public.companeros c where c.compania = old.compania) < 2
    or not exists (select 1 from public.companeros c where c.compania = old.compania and c.estado <> 'invitado') then
    delete from public.companias where id = old.compania;
  end if;
  if not exists (select 1 from public.companeros c where c.user_id = old.user_id and c.estado <> 'invitado') then
    delete from public.companeros_semana where user_id = old.user_id;
  end if;
  return null;
end;
$$;
create trigger companero_fuera after delete on public.companeros for each row execute function public.social_companero_fuera();

-- Bloquear a alguien te saca de los grupos que compartís (sin avisar a nadie).
create function public.social_bloqueo_companias() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.companeros c where c.user_id = new.quien
    and exists (select 1 from public.companeros o where o.compania = c.compania and o.user_id = new.bloqueado);
  return null;
end;
$$;
create trigger bloqueo_companias after insert on public.bloqueos for each row execute function public.social_bloqueo_companias();

-- Os seguís los dos (aceptado en ambos sentidos) y no hay bloqueo.
create function public.social_mutuos(p_a uuid, p_b uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.seguimientos where seguidor = p_a and seguido = p_b and estado = 'aceptado')
    and exists (select 1 from public.seguimientos where seguidor = p_b and seguido = p_a and estado = 'aceptado')
    and not public.social_bloqueo(p_a, p_b)
$$;

-- Lunes de una semana local cercana (la de cada móvil puede ir un día por delante o por detrás del servidor).
create function public.social_lunes_valido(p_lunes date) returns boolean language sql stable set search_path = '' as $$
  select p_lunes is not null and extract(isodow from p_lunes) = 1 and p_lunes between current_date - 8 and current_date + 1
$$;

revoke execute on function public.social_companero_fuera(), public.social_bloqueo_companias(), public.social_mutuos(uuid, uuid),
  public.social_lunes_valido(date) from public, anon, authenticated;

-- Mis grupos (con cada miembro, su estado y su última semana, y los ánimos de las dos últimas semanas) y las
-- invitaciones que me esperan. Los invitados aún no enseñan su semana. Sin miembros suspendidos.
create function public.companias() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  return jsonb_build_object(
    'grupos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', g.compania,
        'miembros', (select jsonb_agg(jsonb_build_object('alias', p.alias, 'nombre', p.nombre, 'yo', c.user_id = v_yo, 'estado', c.estado,
            'semana', case when c.estado = 'activo' then (select jsonb_build_object('lunes', s.lunes, 'hechas', s.hechas, 'objetivo', s.objetivo) from public.companeros_semana s where s.user_id = c.user_id) end)
          order by c.user_id <> v_yo, c.creado, p.alias)
          from public.companeros c join public.perfiles p on p.user_id = c.user_id
          where c.compania = g.compania and not p.suspendido),
        'animos', coalesce((select jsonb_agg(jsonb_build_object('de', pd.alias, 'para', pp.alias, 'lunes', a.lunes) order by a.creado)
          from public.companeros_animos a join public.perfiles pd on pd.user_id = a.de join public.perfiles pp on pp.user_id = a.para
          where a.compania = g.compania and a.lunes >= current_date - 14 and not pd.suspendido and not pp.suspendido), '[]'::jsonb)
      ) order by g.creado)
      from public.companeros g where g.user_id = v_yo and g.estado <> 'invitado'), '[]'::jsonb),
    'invitaciones', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.compania,
        'de', (select p.alias from public.perfiles p where p.user_id = i.invitado_por),
        'miembros', (select jsonb_agg(jsonb_build_object('alias', p.alias, 'nombre', p.nombre) order by c.creado, p.alias)
          from public.companeros c join public.perfiles p on p.user_id = c.user_id
          where c.compania = i.compania and c.user_id <> v_yo and c.estado <> 'invitado' and not p.suspendido)
      ) order by i.creado)
      from public.companeros i where i.user_id = v_yo and i.estado = 'invitado'), '[]'::jsonb)
  );
end;
$$;

-- Invita a alguien a un grupo (lo crea si `p_compania` aún no existe, contigo dentro). Solo a quien os seguís
-- mutuamente con todos los del grupo, hasta 3 personas, 5 grupos por persona y 20 invitaciones al día. Repetirla no
-- duplica.
create function public.invitar_compania(p_compania uuid, p_alias text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
  v_estado text;
begin
  if p_compania is null then raise exception 'no_encontrado'; end if;
  if exists (select 1 from public.perfiles where user_id = v_otro and suspendido) then raise exception 'no_encontrado'; end if;
  select estado into v_estado from public.companeros where compania = p_compania and user_id = v_yo;
  if v_estado is null then
    if exists (select 1 from public.companias where id = p_compania) then raise exception 'no_encontrado'; end if;
    if (select count(*) from public.companeros where user_id = v_yo) >= 5 then raise exception 'limite_companias'; end if;
    insert into public.companias (id) values (p_compania);
    insert into public.companeros (compania, user_id, estado) values (p_compania, v_yo, 'activo');
  elsif v_estado = 'invitado' then
    raise exception 'no_encontrado';
  end if;
  perform 1 from public.companias where id = p_compania for update;
  if exists (select 1 from public.companeros where compania = p_compania and user_id = v_otro) then return; end if;
  if exists (select 1 from public.companeros c where c.compania = p_compania and not public.social_mutuos(c.user_id, v_otro)) then
    raise exception 'no_mutuos';
  end if;
  if (select count(*) from public.companeros where compania = p_compania) >= 3 then raise exception 'compania_llena'; end if;
  if (select count(*) from public.companeros where user_id = v_otro) >= 5 then raise exception 'limite_companias'; end if;
  if (select count(*) from public.companeros where invitado_por = v_yo and creado > now() - interval '1 day') >= 20 then raise exception 'limite'; end if;
  insert into public.companeros (compania, user_id, estado, invitado_por) values (p_compania, v_otro, 'invitado', v_yo);
end;
$$;

-- Aceptar te une al grupo; rechazar quita la invitación sin avisar.
create function public.responder_compania(p_compania uuid, p_aceptar boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if p_aceptar then
    update public.companeros set estado = 'activo' where compania = p_compania and user_id = v_yo and estado = 'invitado';
  else
    delete from public.companeros where compania = p_compania and user_id = v_yo and estado = 'invitado';
  end if;
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

-- Pausa o vuelta: en pausa sigues en el grupo, sin cifras.
create function public.pausar_compania(p_compania uuid, p_pausa boolean) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  update public.companeros set estado = case when p_pausa then 'pausa' else 'activo' end
  where compania = p_compania and user_id = v_yo and estado <> 'invitado';
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

create function public.salir_compania(p_compania uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  delete from public.companeros where compania = p_compania and user_id = v_yo;
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

-- Tu semana, calculada en el móvil con Ritmo. Solo se guarda si estás en algún grupo; si no, no hace nada.
create function public.subir_semana_compania(p_lunes date, p_hechas integer, p_objetivo integer) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if not public.social_lunes_valido(p_lunes) or p_hechas is null or p_hechas not between 0 and 7 or p_objetivo is null or p_objetivo not between 0 and 7 then
    raise exception 'semana_no_valida';
  end if;
  if not exists (select 1 from public.companeros where user_id = v_yo and estado <> 'invitado') then return false; end if;
  insert into public.companeros_semana (user_id, lunes, hechas, objetivo) values (v_yo, p_lunes, p_hechas, p_objetivo)
  on conflict (user_id) do update set lunes = excluded.lunes, hechas = excluded.hechas, objetivo = excluded.objetivo, actualizado = now();
  return true;
end;
$$;

-- «Ánimo» a alguien del grupo en tu semana (o quitarlo). Las dos personas tienen que estar dentro.
create function public.animar_companero(p_compania uuid, p_alias text, p_lunes date, p_animar boolean) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
begin
  if not public.social_lunes_valido(p_lunes) then raise exception 'semana_no_valida'; end if;
  if (select count(*) from public.companeros c join public.perfiles p on p.user_id = c.user_id
      where c.compania = p_compania and c.user_id in (v_yo, v_otro) and c.estado <> 'invitado' and not p.suspendido) < 2 then
    raise exception 'no_encontrado';
  end if;
  if p_animar then
    insert into public.companeros_animos (compania, de, para, lunes) values (p_compania, v_yo, v_otro, p_lunes) on conflict do nothing;
  else
    delete from public.companeros_animos where compania = p_compania and de = v_yo and para = v_otro and lunes = p_lunes;
  end if;
end;
$$;

revoke execute on function public.companias(), public.invitar_compania(uuid, text), public.responder_compania(uuid, boolean),
  public.pausar_compania(uuid, boolean), public.salir_compania(uuid), public.subir_semana_compania(date, integer, integer),
  public.animar_companero(uuid, text, date, boolean) from public, anon;
grant execute on function public.companias(), public.invitar_compania(uuid, text), public.responder_compania(uuid, boolean),
  public.pausar_compania(uuid, boolean), public.salir_compania(uuid), public.subir_semana_compania(date, integer, integer),
  public.animar_companero(uuid, text, date, boolean) to authenticated;

create or replace function public.social_capacidades() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform public.social_yo();
 return (select jsonb_build_object('camposOpcionales',campos_opcionales,'imagenesPublicacion',true,'detallesEjercicio',true,'rutinaCompartida',true,'semanaRitmo',true,'semanaCompania',true) from public.social_configuracion where id);
end;
$$;
revoke execute on function public.social_capacidades() from public,anon;
grant execute on function public.social_capacidades() to authenticated;

notify pgrst, 'reload schema';
commit;
