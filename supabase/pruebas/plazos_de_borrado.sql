-- Tras 0030. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare a uuid:=gen_random_uuid(); r record; n int;
begin
 insert into auth.users(id,email) values(a,'pb-a@appfit.test');
 insert into public.denuncias(denunciante,tipo,objetivo,contenido,motivo,creada,revisada) values
  (a,'perfil',gen_random_uuid(),'vieja revisada','spam',now()-interval '9 months',now()-interval '7 months'),
  (a,'perfil',gen_random_uuid(),'reciente revisada','spam',now()-interval '3 months',now()-interval '2 months'),
  (a,'perfil',gen_random_uuid(),'vieja sin revisar','spam',now()-interval '2 years',null);
 insert into public.mensajes_creador(tipo,texto,creado,leido) values
  ('problema','viejo leído',now()-interval '13 months',true),
  ('alimento','viejo sin leer',now()-interval '13 months',false),
  ('problema','reciente',now()-interval '11 months',false);

 select * into r from public.borrar_caducados();
 assert r.denuncias=1,'una denuncia revisada hace más de 6 meses';
 assert r.mensajes=2,'dos mensajes de hace más de 12 meses, leídos o no';
 select count(*) into n from public.denuncias where contenido in ('reciente revisada','vieja sin revisar');
 assert n=2,'se quedan la reciente y la que sigue sin revisar';
 select count(*) into n from public.mensajes_creador where texto='reciente';
 assert n=1,'se queda el mensaje reciente';

 -- Volver a pasarla no borra más.
 select * into r from public.borrar_caducados();
 assert r.denuncias=0 and r.mensajes=0,'idempotente';

 -- Nadie la ejecuta desde la app.
 assert not has_function_privilege('anon','public.borrar_caducados()','execute'),'anon no';
 assert not has_function_privilege('authenticated','public.borrar_caducados()','execute'),'authenticated no';
 raise exception 'PRUEBAS_OK';
end;
$$;
