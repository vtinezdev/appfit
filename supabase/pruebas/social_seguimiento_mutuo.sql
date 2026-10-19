-- Tras 0018. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); r record; e text; n int;
begin
 insert into auth.users(id,email) values(a,'mutuo-a@appfit.test'),(b,'mutuo-b@appfit.test'),(c,'mutuo-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('mutuo.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('mutuo.beto',null,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('mutuo.carla',null,true);

 -- Beto pide seguir a Ana; al aceptar, los dos se siguen.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert public.pedir_seguir('mutuo.ana')='pendiente','queda pendiente';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 select count(*) into n from public.personas('siguiendo');
 assert n=0,'pedir no hace que Ana siga a Beto';
 perform public.responder_solicitud('mutuo.beto',true);
 select * into r from public.personas('siguiendo');
 assert r.alias='mutuo.beto' and r.sigo='aceptado' and r.me_sigue='aceptado','Ana sigue a Beto al aceptar';
 select count(*) into n from public.social_eventos(a) where tipo='aceptada';
 assert n=0,'quien acepta no recibe «aceptó tu solicitud»';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 select * into r from public.personas('seguidores');
 assert r.alias='mutuo.ana' and r.sigo='aceptado' and r.me_sigue='aceptado','Beto tiene a Ana en seguidores';
 select count(*) into n from public.social_eventos(b) where tipo='aceptada' and alias='mutuo.ana';
 assert n=1,'Beto recibe el aviso de aceptación';

 -- Después, cada sentido es independiente.
 perform public.dejar_de_seguir('mutuo.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 select count(*) into n from public.seguimientos where seguidor=a and seguido=b and estado='aceptado';
 assert n=1,'dejar de seguir no rompe el otro sentido';
 perform public.quitar_seguidor('mutuo.beto');
 select count(*) into n from public.seguimientos where seguidor=a and seguido=b;
 assert n=1,'quitar a alguien que ya no me sigue no toca lo mío';

 -- Rechazar no crea nada.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.pedir_seguir('mutuo.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('mutuo.carla',false);
 select count(*) into n from public.seguimientos where (seguidor=a and seguido=c) or (seguidor=c and seguido=a);
 assert n=0,'rechazar no deja ningún seguimiento';
 begin perform public.responder_solicitud('mutuo.carla',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','sin solicitud no se acepta';
 select count(*) into n from public.seguimientos where seguidor=a and seguido=c;
 assert n=0,'y aceptar sin solicitud no hace seguir';

 -- Solicitudes cruzadas: al aceptar una, la otra queda aceptada sin aviso falso para quien acepta.
 perform public.pedir_seguir('mutuo.carla');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.pedir_seguir('mutuo.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('mutuo.carla',true);
 select count(*) into n from public.seguimientos where ((seguidor=a and seguido=c) or (seguidor=c and seguido=a)) and estado='aceptado';
 assert n=2,'las dos cruzadas aceptadas';
 select count(*) into n from public.social_eventos(a) where tipo='aceptada' and alias='mutuo.carla';
 assert n=0,'Ana no recibe «Carla aceptó» por lo que aceptó ella';
 select count(*) into n from public.social_eventos(c) where tipo='aceptada' and alias='mutuo.ana';
 assert n=1,'Carla sí recibe que Ana aceptó';
 select count(*) into n from public.personas('solicitudes');
 assert n=0,'no quedan solicitudes';

 raise exception 'PRUEBAS_OK';
end;
$$;
