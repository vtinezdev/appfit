-- Tras 0024. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); d uuid:=gen_random_uuid();
 g uuid:=gen_random_uuid(); g2 uuid:=gen_random_uuid(); x jsonb; e text; n int;
 lunes date:=date_trunc('week',current_date)::date;
begin
 insert into auth.users(id,email) values(a,'comp-a@appfit.test'),(b,'comp-b@appfit.test'),(c,'comp-c@appfit.test'),(d,'comp-d@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('comp.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('comp.beto',null,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('comp.carla',null,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',d)::text,true); perform public.crear_perfil('comp.dani',null,true);
 -- Ana, Beto y Carla se siguen entre sí; Dani solo sigue a Ana (un sentido).
 insert into public.seguimientos(seguidor,seguido,estado) values (a,b,'aceptado'),(b,a,'aceptado'),(a,c,'aceptado'),(c,a,'aceptado'),(b,c,'aceptado'),(c,b,'aceptado'),(d,a,'aceptado');

 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 assert public.social_capacidades()->'semanaCompania'='true'::jsonb,'anuncia la capacidad';
 assert public.social_capacidades()->'semanaRitmo'='true'::jsonb,'conserva la de 0023';
 assert public.subir_semana_compania(lunes,1,3) is false,'sin grupo no se guarda la semana';
 assert not exists(select 1 from public.companeros_semana where user_id=a),'ni una fila';

 -- Solo a quien os seguís los dos.
 begin perform public.invitar_compania(g,'comp.dani'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_mutuos','un solo sentido no basta';
 assert not exists(select 1 from public.companias where id=g),'y no deja un grupo a medias';
 begin perform public.invitar_compania(g,'comp.ana'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','a ti no te invitas';

 perform public.invitar_compania(g,'comp.beto');
 perform public.invitar_compania(g,'comp.beto');
 select count(*) into n from public.companeros where compania=g;
 assert n=2,'crea el grupo con Ana dentro y Beto invitado; repetir no duplica';
 assert (select estado from public.companeros where compania=g and user_id=b)='invitado','Beto aún no está';

 -- Beto ve la invitación, sin cifras de nadie.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.companias();
 assert jsonb_array_length(x->'grupos')=0 and jsonb_array_length(x->'invitaciones')=1,'una invitación y ningún grupo';
 assert x->'invitaciones'->0->>'de'='comp.ana' and x->'invitaciones'->0->'miembros'->0->>'alias'='comp.ana','quién invita y quién está';
 begin perform public.pausar_compania(g,true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','sin aceptar no se pausa';
 begin perform public.animar_companero(g,'comp.ana',lunes,true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','sin aceptar no se anima';
 perform public.responder_compania(g,true);
 assert public.subir_semana_compania(lunes,2,3),'dentro, la semana se guarda';
 begin perform public.subir_semana_compania(lunes+1,2,3); e:=null; exception when others then e:=sqlerrm; end;
 assert e='semana_no_valida','el lunes es lunes';
 begin perform public.subir_semana_compania(lunes-28,2,3); e:=null; exception when others then e:=sqlerrm; end;
 assert e='semana_no_valida','y de esta semana';
 begin perform public.subir_semana_compania(lunes,8,3); e:=null; exception when others then e:=sqlerrm; end;
 assert e='semana_no_valida','cifras acotadas';
 perform public.animar_companero(g,'comp.ana',lunes,true);
 perform public.animar_companero(g,'comp.ana',lunes,true);

 -- Ana ve a Beto «2 de 3» y su ánimo.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 x:=public.companias()->'grupos'->0;
 assert x->>'id'=g::text and jsonb_array_length(x->'miembros')=2,'el grupo con los dos';
 assert x->'miembros'->0->>'yo'='true','primero yo';
 assert x->'miembros'->1->>'alias'='comp.beto' and x->'miembros'->1->'semana'->>'hechas'='2' and x->'miembros'->1->'semana'->>'objetivo'='3','Beto, 2 de 3';
 assert jsonb_array_length(x->'animos')=1 and x->'animos'->0->>'de'='comp.beto' and x->'animos'->0->>'para'='comp.ana','un ánimo, sin duplicar';
 assert not (x::text ~ '"(user_id|kcal|peso)"'),'sin ids ni nada más';

 -- Ana invita a Carla (mutua con los dos); Dani no cabe aunque fuese mutua.
 perform public.invitar_compania(g,'comp.carla');
 insert into public.seguimientos(seguidor,seguido,estado) values (a,d,'aceptado'),(b,d,'aceptado'),(d,b,'aceptado'),(c,d,'aceptado'),(d,c,'aceptado');
 begin perform public.invitar_compania(g,'comp.dani'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='compania_llena','grupos de 3 como mucho';

 -- Carla rechaza sin aviso; el grupo sigue con dos.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 perform public.responder_compania(g,false);
 assert exists(select 1 from public.companias where id=g) and (select count(*) from public.companeros where compania=g)=2,'rechazar no toca el grupo';

 -- Beto pausa: sigue dentro, sin cifras.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.pausar_compania(g,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 x:=public.companias()->'grupos'->0->'miembros'->1;
 assert x->>'estado'='pausa' and x->'semana'='null'::jsonb,'en pausa no enseña la semana';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.pausar_compania(g,false);

 -- Bloquear saca a quien bloquea del grupo; con uno solo, el grupo se cierra y su semana se borra.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.subir_semana_compania(lunes,1,2);
 perform public.invitar_compania(g2,'comp.carla');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.bloquear('comp.ana');
 assert not exists(select 1 from public.companias where id=g),'el grupo de dos se cierra';
 assert not exists(select 1 from public.companeros_semana where user_id=b),'Beto ya no está en ninguno: su semana se borra';
 assert exists(select 1 from public.companeros_semana where user_id=a),'Ana sigue en otro grupo: la suya queda';
 assert not exists(select 1 from public.companeros_animos where compania=g),'ni ánimos';

 -- Salir: si solo queda alguien invitado, el grupo se cierra.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.salir_compania(g2);
 assert not exists(select 1 from public.companias where id=g2),'sin nadie que haya aceptado, se cierra';
 assert not exists(select 1 from public.companeros_semana where user_id=a),'y la semana de Ana se borra';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 assert jsonb_array_length(public.companias()->'invitaciones')=0,'la invitación de Carla desaparece';

 -- Hasta 5 grupos por persona.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 for n in 1..5 loop perform public.invitar_compania(gen_random_uuid(),'comp.carla'); end loop;
 begin perform public.invitar_compania(gen_random_uuid(),'comp.dani'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='limite_companias','cinco grupos como mucho';

 -- Borrar el perfil limpia sus grupos.
 perform public.borrar_perfil();
 assert not exists(select 1 from public.companeros where user_id=c),'los grupos de Ana se cierran con su perfil';
 raise exception 'PRUEBAS_OK';
end;
$$;
