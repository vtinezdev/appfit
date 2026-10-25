-- Lectores preparados antes que escritores: mantener desactivado hasta completar su actualización.
begin;
create table public.social_configuracion(id boolean primary key default true check(id),campos_opcionales boolean not null default false);
insert into public.social_configuracion(id) values(true);
alter table public.social_configuracion enable row level security;
revoke all on public.social_configuracion from anon,authenticated;
create function public.social_capacidades() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform public.social_yo();
 return (select jsonb_build_object('camposOpcionales',campos_opcionales) from public.social_configuracion where id);
end;
$$;
revoke execute on function public.social_capacidades() from public,anon;
grant execute on function public.social_capacidades() to authenticated;
create or replace function public.social_resumen_valido(r jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
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
  if r ? 'duracionSeg' and not public.social_cifra(r->'duracionSeg') then return false; end if;
  if r->>'tipo' = 'actividad' then
    return coalesce(r->>'actividad' in ('caminar','correr','senderismo'), false) and public.social_cifra(r->'distanciaM')
      and (coalesce(r->'desnivelM' = 'null'::jsonb,false) or public.social_cifra(r->'desnivelM'));
  end if;
  if not public.social_cifra(r->'series') or (r ? 'volumenKg' and not public.social_cifra(r->'volumenKg')) then return false; end if;
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

create or replace function public.social_validar_publicacion() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if public.social_resumen_valido(new.resumen) is not true or new.tipo<>new.resumen->>'tipo' then raise exception 'publicacion_no_valida'; end if;
 if ((new.tipo in ('entreno','actividad') and not new.resumen ? 'duracionSeg') or (new.tipo='entreno' and not new.resumen ? 'volumenKg'))
 and not (select campos_opcionales from public.social_configuracion where id) then raise exception 'publicacion_no_valida'; end if;
 return new;
end;
$$;
commit;
