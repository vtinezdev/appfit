-- Tras 0027. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare a uuid:=gen_random_uuid(); n int; fallo boolean;
begin
 insert into auth.users(id,email) values(a,'mc-a@appfit.test');

 -- Sin sesión: se guarda sin usuario.
 perform set_config('request.jwt.claims','{}',true);
 perform public.enviar_mensaje_creador('problema','  No carga Nutrición  ',null,'2026.10');
 select count(*) into n from public.mensajes_creador where texto='No carga Nutrición' and user_id is null and version='2026.10';
 assert n=1,'anónimo, recortado y con versión';

 -- Con sesión: se guarda con su usuario; un alimento con sus datos.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.enviar_mensaje_creador('alimento','Yogur de prueba','{"marca":"X","codigo":"123"}'::jsonb,'');
 select count(*) into n from public.mensajes_creador where user_id=a and tipo='alimento' and datos->>'codigo'='123';
 assert n=1,'con usuario y datos';

 -- Tipos, vacíos y tamaños no válidos.
 begin perform public.enviar_mensaje_creador('otro','x'); fallo:=false; exception when others then fallo:=true; end;
 assert fallo,'tipo no válido';
 begin perform public.enviar_mensaje_creador('problema','   '); fallo:=false; exception when others then fallo:=true; end;
 assert fallo,'vacío';
 begin perform public.enviar_mensaje_creador('problema',repeat('a',8001)); fallo:=false; exception when others then fallo:=true; end;
 assert fallo,'demasiado largo';

 -- Freno: 5 por cuenta y hora.
 for i in 1..4 loop perform public.enviar_mensaje_creador('problema','m'||i); end loop;
 begin perform public.enviar_mensaje_creador('problema','sexto'); fallo:=false; exception when others then fallo:=true; end;
 assert fallo,'más de 5 por hora';

 -- Nadie lee ni escribe la tabla desde la app.
 assert not has_table_privilege('anon','public.mensajes_creador','select'),'anon no lee';
 assert not has_table_privilege('authenticated','public.mensajes_creador','select'),'authenticated no lee';
 assert not has_table_privilege('anon','public.mensajes_creador','insert'),'anon no inserta directo';
 assert has_function_privilege('anon','public.enviar_mensaje_creador(text,text,jsonb,text)','execute'),'anon envía';
 raise exception 'PRUEBAS_OK';
end;
$$;
