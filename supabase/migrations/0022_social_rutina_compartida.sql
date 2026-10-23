-- Compartir una rutina para guardarla (ADR 055, docs/features/social.md): publicaciones de tipo `rutina` con la estructura
-- de la rutina (ejercicios, series, repeticiones, descansos y calentamientos), nunca cargas. La app solo lo ofrece
-- cuando `social_capacidades` anuncia `rutinaCompartida`, que aparece con esta migración; las versiones que ya leen el
-- tipo lo pintan y las anteriores lo descartan sin romper la paginación. Ejecutarla después de desplegar la app.
begin;
alter table public.publicaciones drop constraint publicaciones_tipo_check;
alter table public.publicaciones add constraint publicaciones_tipo_check check (tipo in ('entreno', 'actividad', 'texto', 'logro', 'rutina'));

create or replace function public.social_resumen_valido(r jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; l jsonb; s jsonb; lista text; permitidas text[]; zonas text[] := array['pecho','espalda','hombros','biceps','triceps','antebrazo','cuadriceps','isquiotibiales','gluteos','aductores','gemelos','core'];
begin
  if jsonb_typeof(r) <> 'object' or r->'v' is distinct from '1'::jsonb or not public.social_texto(r->'titulo',60) then return false; end if;
  case r->>'tipo'
    when 'entreno' then permitidas := array['v','tipo','titulo','duracionSeg','series','volumenKg','ejercicios','records','ligas','logros','mapa','nota','recordsTotal','recordsEjercicios','catalogIds','insignias','detalles'];
    when 'actividad' then permitidas := array['v','tipo','titulo','actividad','duracionSeg','distanciaM','desnivelM','nota'];
    when 'logro' then permitidas := array['v','tipo','titulo','logroId','grupo','nivel','descripcion','nota'];
    when 'texto' then permitidas := array['v','tipo','titulo','texto'];
    when 'rutina' then permitidas := array['v','tipo','titulo','ejercicios','nota'];
    else return false;
  end case;
  for k in select jsonb_object_keys(r) loop if not k = any(permitidas) then return false; end if; end loop;
  if r ? 'nota' and not public.social_texto(r->'nota',280) then return false; end if;
  if r->>'tipo' = 'texto' then return public.social_texto(r->'texto',2000); end if;
  -- El publicador existente valida el catálogo y el nivel de los logros.
  if r->>'tipo' = 'logro' then return public.social_texto(r->'descripcion',500); end if;
  -- 0022: la estructura de una rutina (ADR 055). De 1 a 15 ejercicios: nombre, id del catálogo de la app o null y, si
  -- lleva objetivo, series y rango de repeticiones (y, opcionales, descanso y calentamientos) enteros y acotados.
  if r->>'tipo' = 'rutina' then
    if jsonb_typeof(r->'ejercicios') is distinct from 'array' or jsonb_array_length(r->'ejercicios') not between 1 and 15 then return false; end if;
    for l in select jsonb_array_elements(r->'ejercicios') loop
      if jsonb_typeof(l) <> 'object' or not public.social_texto(l->'nombre',60) or not l ? 'catalogId' then return false; end if;
      for k in select jsonb_object_keys(l) loop
        if not k = any(array['nombre','catalogId','series','repsMin','repsMax','descansoSeg','calentamientos']) then return false; end if;
      end loop;
      if l->'catalogId' <> 'null'::jsonb and (jsonb_typeof(l->'catalogId') <> 'string' or (l->>'catalogId') !~ '^appfit:[a-z0-9-]{1,40}$') then return false; end if;
      if l ?| array['series','repsMin','repsMax','descansoSeg','calentamientos'] and not l ?& array['series','repsMin','repsMax'] then return false; end if;
      foreach k in array array['series','repsMin','repsMax','descansoSeg','calentamientos'] loop
        if l ? k and (jsonb_typeof(l->k) <> 'number' or (l->>k)::numeric <> trunc((l->>k)::numeric) or (l->>k)::numeric not between
          (case k when 'descansoSeg' then 15 else 1 end) and (case k when 'series' then 20 when 'descansoSeg' then 900 when 'calentamientos' then 5 else 100 end)) then return false; end if;
      end loop;
      if l ? 'repsMin' and (l->>'repsMin')::numeric > (l->>'repsMax')::numeric then return false; end if;
    end loop;
    return true;
  end if;
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
  -- 0020: paralelas a `ejercicios` y `logros`, del mismo largo. Solo ids del catálogo de la app (la imagen sale del
  -- propio origen) e insignias de la Vitrina; nada del dispositivo.
  if r ? 'catalogIds' then
    if jsonb_typeof(r->'catalogIds') <> 'array' or jsonb_array_length(r->'catalogIds') <> jsonb_array_length(r->'ejercicios') then return false; end if;
    for l in select jsonb_array_elements(r->'catalogIds') loop
      if l <> 'null'::jsonb and (jsonb_typeof(l) <> 'string' or (l#>>'{}') !~ '^appfit:[a-z0-9-]{1,40}$') then return false; end if;
    end loop;
  end if;
  if r ? 'insignias' then
    if jsonb_typeof(r->'insignias') <> 'array' or jsonb_array_length(r->'insignias') <> jsonb_array_length(r->'logros') then return false; end if;
    for l in select jsonb_array_elements(r->'insignias') loop
      if jsonb_typeof(l) <> 'object' or (select count(*) from jsonb_object_keys(l)) <> 3
        or jsonb_typeof(l->'id') is distinct from 'string' or (l->>'id') !~ '^[a-z0-9-]{1,60}$'
        or not coalesce(l->>'grupo' in ('entreno','constancia','cumbres','caminos','nutricion','oculto'), false)
        or not (l->'nivel' = 'null'::jsonb or (jsonb_typeof(l->'nivel') = 'number' and (l->>'nivel')::numeric in (1,2,3,4,5))) then return false; end if;
    end loop;
  end if;
  -- 0021: paralela a `ejercicios`, lo que se ve al tocar cada uno: su liga, si cambió, y sus series en texto («80 kg × 8»)
  -- con la subida del récord en la suya. Todo opcional por ejercicio; nada que no sea texto acotado o una liga conocida.
  if r ? 'detalles' then
    if jsonb_typeof(r->'detalles') <> 'array' or jsonb_array_length(r->'detalles') <> jsonb_array_length(r->'ejercicios') then return false; end if;
    for l in select jsonb_array_elements(r->'detalles') loop
      if jsonb_typeof(l) <> 'object' then return false; end if;
      for k in select jsonb_object_keys(l) loop if not k = any(array['liga','cambio','series','records']) then return false; end if; end loop;
      if l ? 'liga' and not coalesce(l->>'liga' in ('Bronce','Plata','Oro','Zafiro','Rubí','Élite'), false) then return false; end if;
      if l ? 'cambio' and not public.social_texto(l->'cambio',60) then return false; end if;
      if l ? 'series' then
        if jsonb_typeof(l->'series') <> 'array' or jsonb_array_length(l->'series') > 12 then return false; end if;
        for s in select jsonb_array_elements(l->'series') loop if not public.social_texto(s,60) then return false; end if; end loop;
      end if;
      if l ? 'records' then
        if jsonb_typeof(l->'records') <> 'array' or jsonb_array_length(l->'records') > 12 then return false; end if;
        for s in select jsonb_array_elements(l->'records') loop
          if jsonb_typeof(s) <> 'object' or (select count(*) from jsonb_object_keys(s)) <> 2 or not public.social_texto(s->'mejora',60)
            or jsonb_typeof(s->'serie') is distinct from 'number' or (s->>'serie')::numeric <> trunc((s->>'serie')::numeric)
            or (s->>'serie')::numeric < 0 or (s->>'serie')::numeric >= jsonb_array_length(coalesce(l->'series','[]'::jsonb)) then return false; end if;
        end loop;
      end if;
    end loop;
  end if;
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

create or replace function public.social_capacidades() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform public.social_yo();
 return (select jsonb_build_object('camposOpcionales',campos_opcionales,'imagenesPublicacion',true,'detallesEjercicio',true,'rutinaCompartida',true) from public.social_configuracion where id);
end;
$$;
revoke execute on function public.social_capacidades() from public,anon;
grant execute on function public.social_capacidades() to authenticated;
commit;
