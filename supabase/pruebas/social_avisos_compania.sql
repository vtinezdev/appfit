-- Tras 0025. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); x jsonb; n int;
 lunes date:=date_trunc('week',current_date)::date;
begin
 insert into auth.users(id,email) values(a,'avc-a@appfit.test'),(b,'avc-b@appfit.test'),(c,'avc-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('avc.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('avc.beto',null,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('avc.carla',null,true);
 insert into public.seguimientos(seguidor,seguido,estado) values (a,b,'aceptado'),(b,a,'aceptado'),(a,c,'aceptado'),(c,a,'aceptado'),(b,c,'aceptado'),(c,b,'aceptado');

 -- Ana invita a Beto: a Beto le cuenta como pendiente hasta que responde.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.invitar_compania(g,'avc.beto');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avisos();
 assert x->>'companias'='1','la invitación cuenta';
 assert x->>'solicitudes'='0' and x->>'nuevos'='0','no es una solicitud ni una novedad';
 perform public.responder_compania(g,true);
 assert public.avisos()->>'companias'='0','al aceptar deja de contar';

 -- Ana anima a Beto: le llega como aviso nuevo, agrupado por grupo.
 -- (En la prueba todo pasa en la misma transacción: `now()` no avanza, así que «visto» se pone antes.)
 update public.perfiles set avisos_vistos=now()-interval '1 hour' where user_id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.animar_companero(g,'avc.beto',lunes,true);
 perform public.invitar_compania(g,'avc.carla');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 perform public.responder_compania(g,true);
 perform public.animar_companero(g,'avc.beto',lunes,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avisos();
 assert x->>'nuevos'='2','dos ánimos nuevos';
 select count(*) into n from jsonb_array_elements(x->'lista') e where e->>'tipo'='animo_compania';
 assert n=1,'un solo aviso para el grupo';
 select (e->>'personas')::int into n from jsonb_array_elements(x->'lista') e where e->>'tipo'='animo_compania';
 assert n=2,'de dos personas';
 assert (select e->>'publicacion' from jsonb_array_elements(x->'lista') e where e->>'tipo'='animo_compania')=g::text,'con el id del grupo';
 perform public.marcar_avisos_vistos();
 assert public.avisos()->>'nuevos'='0','visto';

 -- Quien da ánimo no recibe aviso propio; pausar, bloquear y salir no avisan.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 select count(*) into n from jsonb_array_elements(public.avisos()->'lista') e where e->>'tipo'='animo_compania';
 assert n=0,'Ana no recibe su propio ánimo';
 perform public.pausar_compania(g,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert public.avisos()->>'nuevos'='0','pausar no avisa';
 perform public.bloquear('avc.carla');
 select count(*) into n from jsonb_array_elements(public.avisos()->'lista') e where e->>'tipo'='animo_compania';
 assert n=0,'bloquear saca a Beto del grupo (0024) y con él se van sus ánimos';
 assert public.avisos()->>'nuevos'='0','sin avisos al bloquear';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.salir_compania(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert public.avisos()->>'nuevos'='0','salir no avisa';
 raise exception 'PRUEBAS_OK';
end;
$$;
