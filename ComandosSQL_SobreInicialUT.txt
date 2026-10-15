-- SOBRE INICIAL UT · POOL DE 67 JUGADORES · 13 OCTUBRE 2026
-- Copia y ejecuta TODO. Requiere el SQL de UT y Online ya instalado.
-- Para una instalación completa está incluido AL FINAL de ComandosSQL_ActualizacionUT.txt.
-- Cada cuenta obtiene 23 distintos y equilibrados, una única vez. Nunca 67 regalos.
-- Catálogo: 37 Bronce / 24 Plata / 5 Oro / 1 Plus (67 total).
-- Tasas base por carta: 55% / 34.5% / 10% / 0.5% respectivamente.
-- Primero se sortean GLOBALMENTE las 23 calidades; después los jugadores.
-- Sólo se renormaliza una calidad agotada. Cubrir posiciones nunca cambia el tipo.
-- Sin duplicados ni Plus garantizado: máximo una Plus porque sólo hay una en el pool.
-- Los clubes existentes conservan sus 23 originales y su plantilla sin modificaciones.
-- Borrar o reiniciar el club no borra el recibo: al volver se recupera la misma entrega.
begin;
do $preflight$
begin
  if to_regclass('thc_private.ut_jugadores_base') is null or to_regclass('public.perfiles_ut') is null or
     to_regclass('public.equipos_ut') is null or to_regclass('public.plantillas_ut') is null or
     to_regprocedure('public.thc_ut_guardar_plantilla(jsonb)') is null or
     to_regprocedure('thc_private.ut_online_canonical(uuid,text)') is null then
    raise exception 'Instala primero la actualización completa de Ultimate Team y Online.';
  end if;
end $preflight$;

insert into thc_private.ut_jugadores_base(id,datos) values
  ('p1','{"id":"p1","nombre":"V. RIVERA","pos":"GK","grl":72,"pac":72,"sho":68,"pas":65,"dri":73,"def":30,"phy":68,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p2','{"id":"p2","nombre":"M. SILVA","pos":"CB","grl":74,"pac":62,"sho":38,"pas":55,"dri":50,"def":75,"phy":78,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p3','{"id":"p3","nombre":"J. CRUZ","pos":"CB","grl":70,"pac":65,"sho":32,"pas":50,"dri":48,"def":72,"phy":74,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p4','{"id":"p4","nombre":"A. GOMEZ","pos":"RB","grl":68,"pac":78,"sho":45,"pas":58,"dri":64,"def":65,"phy":62,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p5','{"id":"p5","nombre":"C. REYES","pos":"LB","grl":69,"pac":76,"sho":42,"pas":60,"dri":65,"def":66,"phy":64,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p6','{"id":"p6","nombre":"F. BLANCO","pos":"CDM","grl":75,"pac":65,"sho":55,"pas":72,"dri":68,"def":74,"phy":78,"color":"oro","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p7','{"id":"p7","nombre":"L. MENDES","pos":"CM","grl":71,"pac":68,"sho":62,"pas":72,"dri":70,"def":60,"phy":65,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p8','{"id":"p8","nombre":"D. VEGA","pos":"CAM","grl":77,"pac":75,"sho":76,"pas":78,"dri":79,"def":42,"phy":60,"color":"oro","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p9','{"id":"p9","nombre":"R. SANTOS","pos":"RW","grl":73,"pac":84,"sho":68,"pas":65,"dri":75,"def":32,"phy":55,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p10','{"id":"p10","nombre":"S. PINTO","pos":"LW","grl":70,"pac":82,"sho":64,"pas":60,"dri":72,"def":28,"phy":50,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p11','{"id":"p11","nombre":"T. COSTA","pos":"ST","grl":74,"pac":78,"sho":75,"pas":55,"dri":72,"def":30,"phy":74,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p12','{"id":"p12","nombre":"E. LARA","pos":"GK","grl":65,"pac":66,"sho":62,"pas":60,"dri":68,"def":25,"phy":60,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p13','{"id":"p13","nombre":"P. ROJAS","pos":"CB","grl":66,"pac":58,"sho":28,"pas":45,"dri":40,"def":68,"phy":72,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p14','{"id":"p14","nombre":"N. MORA","pos":"RB","grl":64,"pac":74,"sho":38,"pas":55,"dri":60,"def":62,"phy":60,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p15','{"id":"p15","nombre":"H. LUNA","pos":"CM","grl":67,"pac":65,"sho":58,"pas":68,"dri":66,"def":55,"phy":60,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p16','{"id":"p16","nombre":"K. DIAZ","pos":"RM","grl":65,"pac":78,"sho":55,"pas":60,"dri":68,"def":35,"phy":45,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p17','{"id":"p17","nombre":"I. RUIZ","pos":"LM","grl":63,"pac":76,"sho":52,"pas":58,"dri":64,"def":40,"phy":48,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p18','{"id":"p18","nombre":"B. SOTO","pos":"ST","grl":66,"pac":72,"sho":68,"pas":50,"dri":64,"def":30,"phy":68,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p19','{"id":"p19","nombre":"O. PEÑA","pos":"CDM","grl":62,"pac":55,"sho":40,"pas":58,"dri":54,"def":62,"phy":65,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p20','{"id":"p20","nombre":"G. NINA","pos":"ST","grl":61,"pac":68,"sho":60,"pas":45,"dri":58,"def":25,"phy":58,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p21','{"id":"p21","nombre":"A. VERA","pos":"LB","grl":61,"pac":70,"sho":32,"pas":48,"dri":52,"def":58,"phy":55,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p22','{"id":"p22","nombre":"W. RIOS","pos":"CAM","grl":60,"pac":62,"sho":50,"pas":60,"dri":60,"def":32,"phy":45,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p23','{"id":"p23","nombre":"Y. CRUZ","pos":"CB","grl":60,"pac":52,"sho":22,"pas":35,"dri":35,"def":60,"phy":64,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p24','{"id":"p24","nombre":"M. QUISPE","pos":"GK","grl":69,"gk_div":70,"gk_han":70,"gk_kic":66,"gk_ref":73,"gk_spd":55,"gk_pos":69,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p25','{"id":"p25","nombre":"A. FERRERO","pos":"GK","grl":67,"gk_div":68,"gk_han":68,"gk_kic":59,"gk_ref":71,"gk_spd":53,"gk_pos":67,"color":"plata","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p26','{"id":"p26","nombre":"I. SUAREZ","pos":"GK","grl":72,"gk_div":74,"gk_han":74,"gk_kic":65,"gk_ref":77,"gk_spd":54,"gk_pos":73,"color":"plata","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p27','{"id":"p27","nombre":"D. MONTERO","pos":"GK","grl":65,"gk_div":68,"gk_han":63,"gk_kic":59,"gk_ref":71,"gk_spd":48,"gk_pos":67,"color":"plata","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p28','{"id":"p28","nombre":"J. ARIAS","pos":"CB","grl":71,"pac":63,"sho":35,"pas":56,"dri":48,"def":75,"phy":79,"color":"plata","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p29','{"id":"p29","nombre":"R. LIMA","pos":"CB","grl":73,"pac":62,"sho":39,"pas":60,"dri":52,"def":79,"phy":78,"color":"plata","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p30','{"id":"p30","nombre":"P. SERRANO","pos":"CB","grl":67,"pac":57,"sho":34,"pas":50,"dri":47,"def":74,"phy":73,"color":"plata","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb),
  ('p31','{"id":"p31","nombre":"T. HALE","pos":"CB","grl":64,"pac":56,"sho":33,"pas":49,"dri":46,"def":68,"phy":72,"color":"bronce","nacionalidad":"EN","pais_codigo":"EN"}'::jsonb),
  ('p32','{"id":"p32","nombre":"E. VILLALBA","pos":"CB","grl":72,"pac":64,"sho":36,"pas":57,"dri":54,"def":76,"phy":80,"color":"plata","nacionalidad":"EC","pais_codigo":"EC"}'::jsonb),
  ('p33','{"id":"p33","nombre":"C. AQUINO","pos":"CB","grl":70,"pac":62,"sho":34,"pas":55,"dri":47,"def":74,"phy":78,"color":"plata","nacionalidad":"PY","pais_codigo":"PY"}'::jsonb),
  ('p34','{"id":"p34","nombre":"L. PALACIOS","pos":"LB","grl":69,"pac":74,"sho":43,"pas":68,"dri":68,"def":72,"phy":65,"color":"plata","nacionalidad":"VE","pais_codigo":"VE"}'::jsonb),
  ('p35','{"id":"p35","nombre":"G. RINALDI","pos":"LB","grl":73,"pac":79,"sho":48,"pas":68,"dri":73,"def":77,"phy":70,"color":"plata","nacionalidad":"IT","pais_codigo":"IT"}'::jsonb),
  ('p36','{"id":"p36","nombre":"A. MOREAU","pos":"LB","grl":67,"pac":74,"sho":43,"pas":63,"dri":68,"def":67,"phy":65,"color":"plata","nacionalidad":"FR","pais_codigo":"FR"}'::jsonb),
  ('p37','{"id":"p37","nombre":"N. BROOKS","pos":"LB","grl":66,"pac":73,"sho":37,"pas":62,"dri":67,"def":66,"phy":64,"color":"plata","nacionalidad":"US","pais_codigo":"US"}'::jsonb),
  ('p38','{"id":"p38","nombre":"E. CLARKE","pos":"RB","grl":71,"pac":79,"sho":43,"pas":68,"dri":68,"def":72,"phy":70,"color":"plata","nacionalidad":"CA","pais_codigo":"CA"}'::jsonb),
  ('p39','{"id":"p39","nombre":"K. ELIASEN","pos":"RB","grl":66,"pac":71,"sho":40,"pas":65,"dri":65,"def":69,"phy":62,"color":"plata","nacionalidad":"FO","pais_codigo":"FO"}'::jsonb),
  ('p40','{"id":"p40","nombre":"M. ROSSI","pos":"RB","grl":64,"pac":70,"sho":39,"pas":59,"dri":64,"def":68,"phy":61,"color":"bronce","nacionalidad":"VA","pais_codigo":"VA"}'::jsonb),
  ('p41','{"id":"p41","nombre":"A. ORLOV","pos":"RB","grl":72,"pac":79,"sho":48,"pas":68,"dri":73,"def":72,"phy":70,"color":"plata","nacionalidad":"RU","pais_codigo":"RU"}'::jsonb),
  ('p42','{"id":"p42","nombre":"R. SATO","pos":"CDM","grl":74,"pac":66,"sho":51,"pas":76,"dri":71,"def":76,"phy":77,"color":"plata","nacionalidad":"JP","pais_codigo":"JP"}'::jsonb),
  ('p43','{"id":"p43","nombre":"L. BIANCHI","pos":"CDM","grl":68,"pac":61,"sho":46,"pas":71,"dri":61,"def":71,"phy":72,"color":"plata","nacionalidad":"SM","pais_codigo":"SM"}'::jsonb),
  ('p44','{"id":"p44","nombre":"D. HUAMAN","pos":"CDM","grl":72,"pac":61,"sho":51,"pas":76,"dri":66,"def":76,"phy":72,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p45','{"id":"p45","nombre":"F. OJEDA","pos":"CDM","grl":75,"pac":66,"sho":56,"pas":76,"dri":71,"def":81,"phy":77,"color":"oro","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p46','{"id":"p46","nombre":"M. PEREIRA","pos":"CM","grl":74,"pac":73,"sho":71,"pas":80,"dri":80,"def":61,"phy":68,"color":"plata","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p47','{"id":"p47","nombre":"S. ROCHA","pos":"CM","grl":66,"pac":65,"sho":58,"pas":72,"dri":72,"def":53,"phy":60,"color":"plata","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p48','{"id":"p48","nombre":"E. MEJIA","pos":"CM","grl":70,"pac":71,"sho":64,"pas":78,"dri":73,"def":59,"phy":66,"color":"plata","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p49','{"id":"p49","nombre":"V. ALMEIDA","pos":"CM","grl":72,"pac":69,"sho":67,"pas":81,"dri":76,"def":62,"phy":64,"color":"plata","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p50','{"id":"p50","nombre":"H. NAVARRO","pos":"CM","grl":67,"pac":65,"sho":63,"pas":72,"dri":72,"def":58,"phy":60,"color":"plata","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb),
  ('p51','{"id":"p51","nombre":"J. REED","pos":"CM","grl":69,"pac":68,"sho":66,"pas":75,"dri":75,"def":56,"phy":63,"color":"plata","nacionalidad":"EN","pais_codigo":"EN"}'::jsonb),
  ('p52','{"id":"p52","nombre":"A. ZAMBRANO","pos":"CAM","grl":76,"pac":77,"sho":75,"pas":79,"dri":83,"def":39,"phy":60,"color":"oro","nacionalidad":"EC","pais_codigo":"EC"}'::jsonb),
  ('p53','{"id":"p53","nombre":"S. CABRERA","pos":"CAM","grl":71,"pac":73,"sho":71,"pas":75,"dri":74,"def":35,"phy":56,"color":"plata","nacionalidad":"PY","pais_codigo":"PY"}'::jsonb),
  ('p54','{"id":"p54","nombre":"R. MENDOZA","pos":"CAM","grl":74,"pac":72,"sho":75,"pas":79,"dri":78,"def":39,"phy":55,"color":"plata","nacionalidad":"VE","pais_codigo":"VE"}'::jsonb),
  ('p55','{"id":"p55","nombre":"F. CONTI","pos":"CAM","grl":69,"pac":68,"sho":71,"pas":70,"dri":74,"def":35,"phy":51,"color":"plata","nacionalidad":"IT","pais_codigo":"IT"}'::jsonb),
  ('p56','{"id":"p56","nombre":"L. DUVAL","pos":"LW","grl":73,"pac":83,"sho":72,"pas":67,"dri":79,"def":31,"phy":58,"color":"plata","nacionalidad":"FR","pais_codigo":"FR"}'::jsonb),
  ('p57','{"id":"p57","nombre":"M. CARTER","pos":"LW","grl":69,"pac":79,"sho":63,"pas":63,"dri":75,"def":27,"phy":54,"color":"plata","nacionalidad":"US","pais_codigo":"US"}'::jsonb),
  ('p58','{"id":"p58","nombre":"N. WILSON","pos":"LW","grl":71,"pac":83,"sho":67,"pas":67,"dri":74,"def":31,"phy":58,"color":"plata","nacionalidad":"CA","pais_codigo":"CA"}'::jsonb),
  ('p59','{"id":"p59","nombre":"J. HANSEN","pos":"RW","grl":70,"pac":78,"sho":67,"pas":67,"dri":74,"def":31,"phy":53,"color":"plata","nacionalidad":"FO","pais_codigo":"FO"}'::jsonb),
  ('p60','{"id":"p60","nombre":"A. LEONE","pos":"RW","grl":67,"pac":76,"sho":65,"pas":60,"dri":72,"def":29,"phy":51,"color":"plata","nacionalidad":"VA","pais_codigo":"VA"}'::jsonb),
  ('p61','{"id":"p61","nombre":"D. VOLKOV","pos":"RW","grl":74,"pac":84,"sho":73,"pas":68,"dri":80,"def":32,"phy":59,"color":"plata","nacionalidad":"RU","pais_codigo":"RU"}'::jsonb),
  ('p62','{"id":"p62","nombre":"K. MORI","pos":"LM","grl":69,"pac":78,"sho":59,"pas":70,"dri":75,"def":39,"phy":55,"color":"plata","nacionalidad":"JP","pais_codigo":"JP"}'::jsonb),
  ('p63','{"id":"p63","nombre":"P. VALENTI","pos":"RM","grl":68,"pac":78,"sho":59,"pas":70,"dri":70,"def":39,"phy":55,"color":"plata","nacionalidad":"SM","pais_codigo":"SM"}'::jsonb),
  ('p64','{"id":"p64","nombre":"S. TORRES","pos":"ST","grl":77,"pac":77,"sho":82,"pas":63,"dri":76,"def":38,"phy":74,"color":"oro","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p65','{"id":"p65","nombre":"G. ACOSTA","pos":"ST","grl":74,"pac":75,"sho":80,"pas":56,"dri":74,"def":36,"phy":72,"color":"plata","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p66','{"id":"p66","nombre":"A. SOSA","pos":"ST","grl":72,"pac":73,"sho":78,"pas":54,"dri":72,"def":29,"phy":70,"color":"plata","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p67','{"id":"p67","nombre":"J. FLORES","pos":"ST","grl":68,"pac":71,"sho":71,"pas":52,"dri":70,"def":27,"phy":68,"color":"plata","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb)
on conflict(id) do nothing;

create table if not exists thc_private.ut_inicial_entregas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  jugadores text[] not null check(cardinality(jugadores)=23 and array_position(jugadores,null) is null),
  legacy boolean not null default false,
  semilla uuid not null default gen_random_uuid(),
  entregado_en timestamptz not null default now()
);
alter table thc_private.ut_inicial_entregas add column if not exists cartas jsonb;
alter table thc_private.ut_inicial_entregas add column if not exists catalog_version smallint not null default 2;
alter table thc_private.ut_inicial_entregas add column if not exists calidades text[];
alter table thc_private.ut_inicial_entregas enable row level security;
revoke all on thc_private.ut_inicial_entregas from public,anon,authenticated;
revoke all on thc_private.ut_jugadores_base from public,anon,authenticated;

-- Sólo clubes ya creados: preserva sus activos originales y no toca JSON de las plantillas.
insert into thc_private.ut_inicial_entregas(user_id,jugadores,legacy,cartas,catalog_version,calidades)
select p.user_id,array(select 'p'||i from generate_series(1,23) i),true,
  (select jsonb_agg(b.datos order by i) from generate_series(1,23) i join thc_private.ut_jugadores_base b on b.id='p'||i),1,
  array(select b.datos->>'color' from generate_series(1,23) i join thc_private.ut_jugadores_base b on b.id='p'||i order by i)
from public.perfiles_ut p
where exists(select 1 from public.equipos_ut e where e.user_id=p.user_id)
   or exists(select 1 from public.plantillas_ut s where s.user_id=p.user_id and
      exists(select 1 from jsonb_array_elements(coalesce(s.titulares,'[]')||coalesce(s.suplentes,'[]')||coalesce(s.reservas,'[]')) item
             where item->>'id' ~ '^p([1-9]|1[0-9]|2[0-3])$'))
on conflict(user_id) do nothing;

-- Congela recibos anteriores antes de introducir las nuevas calidades. Ni una carta
-- recibida ni una plantilla guardada cambia de nombre, GRL, país o estadísticas.
update thc_private.ut_inicial_entregas r set cartas=(
  select jsonb_agg(b.datos order by item.ordinality)
  from unnest(r.jugadores) with ordinality item(id,ordinality)
  join thc_private.ut_jugadores_base b on b.id=item.id
) where r.cartas is null;
update thc_private.ut_inicial_entregas set catalog_version=1 where legacy;
update thc_private.ut_inicial_entregas r set calidades=array(
  select card->>'color' from jsonb_array_elements(r.cartas) with ordinality item(card,ordinality) order by item.ordinality
) where r.calidades is null;
alter table thc_private.ut_inicial_entregas alter column cartas set not null;
alter table thc_private.ut_inicial_entregas alter column calidades set not null;
alter table thc_private.ut_inicial_entregas drop constraint if exists ut_inicial_snapshot_valid;
alter table thc_private.ut_inicial_entregas add constraint ut_inicial_snapshot_valid
  check(jsonb_typeof(cartas)='array' and jsonb_array_length(cartas)=23);

create table if not exists thc_private.ut_inicial_catalogo(
  id text primary key, datos jsonb not null check(jsonb_typeof(datos)='object' and datos->>'id'=id)
);
create table if not exists thc_private.ut_inicial_pesos(
  rareza text primary key check(rareza in('bronce','plata','oro','plus')),
  peso_base numeric not null check(peso_base>0)
);
alter table thc_private.ut_inicial_catalogo enable row level security;
alter table thc_private.ut_inicial_pesos enable row level security;
revoke all on thc_private.ut_inicial_catalogo,thc_private.ut_inicial_pesos from public,anon,authenticated;
insert into thc_private.ut_inicial_catalogo(id,datos) values
  ('p1','{"id":"p1","nombre":"V. RIVERA","pos":"GK","grl":67,"gk_div":68,"gk_han":68,"gk_kic":61,"gk_ref":70,"gk_spd":52,"gk_pos":68,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p2','{"id":"p2","nombre":"M. SILVA","pos":"CB","grl":68,"pac":59,"sho":33,"pas":54,"dri":48,"def":72,"phy":76,"color":"plata","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p3','{"id":"p3","nombre":"J. CRUZ","pos":"CB","grl":56,"pac":48,"sho":22,"pas":40,"dri":37,"def":61,"phy":62,"color":"bronce","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p4','{"id":"p4","nombre":"A. GOMEZ","pos":"RB","grl":70,"pac":75,"sho":44,"pas":66,"dri":68,"def":72,"phy":67,"color":"plata","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p5','{"id":"p5","nombre":"C. REYES","pos":"LB","grl":71,"pac":77,"sho":43,"pas":68,"dri":70,"def":71,"phy":69,"color":"plata","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p6','{"id":"p6","nombre":"F. BLANCO","pos":"CDM","grl":72,"pac":65,"sho":52,"pas":74,"dri":69,"def":76,"phy":74,"color":"plata","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p7','{"id":"p7","nombre":"L. MENDES","pos":"CM","grl":73,"pac":71,"sho":69,"pas":80,"dri":77,"def":63,"phy":67,"color":"plata","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb),
  ('p8','{"id":"p8","nombre":"D. VEGA","pos":"CAM","grl":74,"pac":74,"sho":74,"pas":78,"dri":79,"def":37,"phy":58,"color":"plata","nacionalidad":"PY","pais_codigo":"PY"}'::jsonb),
  ('p9','{"id":"p9","nombre":"R. SANTOS","pos":"RW","grl":67,"pac":78,"sho":64,"pas":61,"dri":73,"def":27,"phy":51,"color":"plata","nacionalidad":"EN","pais_codigo":"EN"}'::jsonb),
  ('p10','{"id":"p10","nombre":"S. PINTO","pos":"LW","grl":68,"pac":77,"sho":66,"pas":63,"dri":72,"def":29,"phy":53,"color":"plata","nacionalidad":"EC","pais_codigo":"EC"}'::jsonb),
  ('p11','{"id":"p11","nombre":"T. COSTA","pos":"ST","grl":54,"pac":56,"sho":58,"pas":39,"dri":54,"def":13,"phy":54,"color":"bronce","nacionalidad":"VE","pais_codigo":"VE"}'::jsonb),
  ('p12','{"id":"p12","nombre":"E. LARA","pos":"GK","grl":70,"gk_div":73,"gk_han":70,"gk_kic":63,"gk_ref":75,"gk_spd":54,"gk_pos":70,"color":"plata","nacionalidad":"IT","pais_codigo":"IT"}'::jsonb),
  ('p13','{"id":"p13","nombre":"P. ROJAS","pos":"CB","grl":71,"pac":61,"sho":38,"pas":56,"dri":50,"def":77,"phy":78,"color":"plata","nacionalidad":"FR","pais_codigo":"FR"}'::jsonb),
  ('p14','{"id":"p14","nombre":"N. MORA","pos":"RB","grl":72,"pac":78,"sho":44,"pas":69,"dri":71,"def":72,"phy":70,"color":"plata","nacionalidad":"US","pais_codigo":"US"}'::jsonb),
  ('p15','{"id":"p15","nombre":"H. LUNA","pos":"CM","grl":73,"pac":73,"sho":68,"pas":79,"dri":79,"def":62,"phy":66,"color":"plata","nacionalidad":"CA","pais_codigo":"CA"}'::jsonb),
  ('p16','{"id":"p16","nombre":"K. DIAZ","pos":"RM","grl":74,"pac":81,"sho":67,"pas":75,"dri":77,"def":46,"phy":59,"color":"plata","nacionalidad":"FO","pais_codigo":"FO"}'::jsonb),
  ('p17','{"id":"p17","nombre":"I. RUIZ","pos":"LM","grl":60,"pac":68,"sho":51,"pas":62,"dri":64,"def":30,"phy":46,"color":"bronce","nacionalidad":"VA","pais_codigo":"VA"}'::jsonb),
  ('p18','{"id":"p18","nombre":"B. SOTO","pos":"ST","grl":68,"pac":71,"sho":73,"pas":51,"dri":69,"def":28,"phy":66,"color":"plata","nacionalidad":"RU","pais_codigo":"RU"}'::jsonb),
  ('p19','{"id":"p19","nombre":"O. PEÑA","pos":"CDM","grl":70,"pac":60,"sho":50,"pas":72,"dri":64,"def":74,"phy":72,"color":"plata","nacionalidad":"JP","pais_codigo":"JP"}'::jsonb),
  ('p20','{"id":"p20","nombre":"G. NINA","pos":"ST","grl":63,"pac":65,"sho":67,"pas":48,"dri":63,"def":22,"phy":63,"color":"bronce","nacionalidad":"SM","pais_codigo":"SM"}'::jsonb),
  ('p21','{"id":"p21","nombre":"A. VERA","pos":"LB","grl":71,"pac":78,"sho":44,"pas":66,"dri":71,"def":72,"phy":67,"color":"plata","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p22','{"id":"p22","nombre":"W. RIOS","pos":"CAM","grl":55,"pac":54,"sho":57,"pas":58,"dri":59,"def":20,"phy":38,"color":"bronce","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p23','{"id":"p23","nombre":"Y. CRUZ","pos":"CB","grl":56,"pac":47,"sho":21,"pas":42,"dri":36,"def":60,"phy":64,"color":"bronce","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p24','{"id":"p24","nombre":"M. QUISPE","pos":"GK","grl":80,"gk_div":83,"gk_han":80,"gk_kic":73,"gk_ref":85,"gk_spd":64,"gk_pos":80,"color":"oro","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p25','{"id":"p25","nombre":"A. FERRERO","pos":"GK","grl":67,"gk_div":68,"gk_han":68,"gk_kic":61,"gk_ref":70,"gk_spd":52,"gk_pos":68,"color":"plata","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p26','{"id":"p26","nombre":"I. SUAREZ","pos":"GK","grl":59,"gk_div":61,"gk_han":58,"gk_kic":54,"gk_ref":63,"gk_spd":42,"gk_pos":61,"color":"bronce","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p27','{"id":"p27","nombre":"D. MONTERO","pos":"GK","grl":60,"gk_div":63,"gk_han":60,"gk_kic":53,"gk_ref":65,"gk_spd":44,"gk_pos":60,"color":"bronce","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb),
  ('p28','{"id":"p28","nombre":"J. ARIAS","pos":"CB","grl":61,"pac":51,"sho":28,"pas":46,"dri":40,"def":67,"phy":68,"color":"bronce","nacionalidad":"PY","pais_codigo":"PY"}'::jsonb),
  ('p29','{"id":"p29","nombre":"R. LIMA","pos":"CB","grl":71,"pac":62,"sho":36,"pas":57,"dri":51,"def":75,"phy":79,"color":"plata","nacionalidad":"EN","pais_codigo":"EN"}'::jsonb),
  ('p30','{"id":"p30","nombre":"P. SERRANO","pos":"CB","grl":63,"pac":55,"sho":29,"pas":47,"dri":44,"def":68,"phy":69,"color":"bronce","nacionalidad":"EC","pais_codigo":"EC"}'::jsonb),
  ('p31','{"id":"p31","nombre":"T. HALE","pos":"CB","grl":54,"pac":44,"sho":21,"pas":39,"dri":33,"def":60,"phy":61,"color":"bronce","nacionalidad":"VE","pais_codigo":"VE"}'::jsonb),
  ('p32','{"id":"p32","nombre":"E. VILLALBA","pos":"CB","grl":81,"pac":72,"sho":46,"pas":67,"dri":61,"def":85,"phy":89,"color":"oro","nacionalidad":"IT","pais_codigo":"IT"}'::jsonb),
  ('p33','{"id":"p33","nombre":"C. AQUINO","pos":"CB","grl":56,"pac":48,"sho":22,"pas":40,"dri":37,"def":61,"phy":62,"color":"bronce","nacionalidad":"FR","pais_codigo":"FR"}'::jsonb),
  ('p34','{"id":"p34","nombre":"L. PALACIOS","pos":"LB","grl":57,"pac":62,"sho":31,"pas":53,"dri":55,"def":59,"phy":54,"color":"bronce","nacionalidad":"US","pais_codigo":"US"}'::jsonb),
  ('p35','{"id":"p35","nombre":"G. RINALDI","pos":"LB","grl":69,"pac":75,"sho":41,"pas":66,"dri":68,"def":69,"phy":67,"color":"plata","nacionalidad":"CA","pais_codigo":"CA"}'::jsonb),
  ('p36','{"id":"p36","nombre":"A. MOREAU","pos":"LB","grl":59,"pac":66,"sho":32,"pas":54,"dri":59,"def":60,"phy":55,"color":"bronce","nacionalidad":"FO","pais_codigo":"FO"}'::jsonb),
  ('p37','{"id":"p37","nombre":"N. BROOKS","pos":"LB","grl":60,"pac":65,"sho":34,"pas":56,"dri":58,"def":62,"phy":57,"color":"bronce","nacionalidad":"VA","pais_codigo":"VA"}'::jsonb),
  ('p38','{"id":"p38","nombre":"E. CLARKE","pos":"RB","grl":72,"pac":78,"sho":44,"pas":69,"dri":71,"def":72,"phy":70,"color":"plata","nacionalidad":"RU","pais_codigo":"RU"}'::jsonb),
  ('p39','{"id":"p39","nombre":"K. ELIASEN","pos":"RB","grl":62,"pac":69,"sho":35,"pas":57,"dri":62,"def":63,"phy":58,"color":"bronce","nacionalidad":"JP","pais_codigo":"JP"}'::jsonb),
  ('p40','{"id":"p40","nombre":"M. ROSSI","pos":"RB","grl":63,"pac":68,"sho":37,"pas":59,"dri":61,"def":65,"phy":60,"color":"bronce","nacionalidad":"SM","pais_codigo":"SM"}'::jsonb),
  ('p41','{"id":"p41","nombre":"A. ORLOV","pos":"RB","grl":54,"pac":60,"sho":26,"pas":51,"dri":53,"def":54,"phy":52,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p42','{"id":"p42","nombre":"R. SATO","pos":"CDM","grl":55,"pac":48,"sho":35,"pas":57,"dri":52,"def":59,"phy":57,"color":"bronce","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p43','{"id":"p43","nombre":"L. BIANCHI","pos":"CDM","grl":57,"pac":47,"sho":37,"pas":59,"dri":51,"def":61,"phy":59,"color":"bronce","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p44','{"id":"p44","nombre":"D. HUAMAN","pos":"CDM","grl":58,"pac":49,"sho":36,"pas":61,"dri":53,"def":60,"phy":61,"color":"bronce","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p45','{"id":"p45","nombre":"F. OJEDA","pos":"CDM","grl":71,"pac":64,"sho":51,"pas":73,"dri":68,"def":75,"phy":73,"color":"plata","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p46','{"id":"p46","nombre":"M. PEREIRA","pos":"CM","grl":81,"pac":79,"sho":77,"pas":88,"dri":85,"def":71,"phy":75,"color":"oro","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p47','{"id":"p47","nombre":"S. ROCHA","pos":"CM","grl":60,"pac":59,"sho":54,"pas":68,"dri":65,"def":48,"phy":55,"color":"bronce","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb),
  ('p48','{"id":"p48","nombre":"E. MEJIA","pos":"CM","grl":61,"pac":61,"sho":56,"pas":67,"dri":67,"def":50,"phy":54,"color":"bronce","nacionalidad":"PY","pais_codigo":"PY"}'::jsonb),
  ('p49','{"id":"p49","nombre":"V. ALMEIDA","pos":"CM","grl":67,"pac":65,"sho":63,"pas":74,"dri":71,"def":57,"phy":61,"color":"plata","nacionalidad":"EN","pais_codigo":"EN"}'::jsonb),
  ('p50','{"id":"p50","nombre":"H. NAVARRO","pos":"CM","grl":63,"pac":62,"sho":57,"pas":71,"dri":68,"def":51,"phy":58,"color":"bronce","nacionalidad":"EC","pais_codigo":"EC"}'::jsonb),
  ('p51','{"id":"p51","nombre":"J. REED","pos":"CM","grl":54,"pac":54,"sho":49,"pas":60,"dri":60,"def":43,"phy":47,"color":"bronce","nacionalidad":"VE","pais_codigo":"VE"}'::jsonb),
  ('p52','{"id":"p52","nombre":"A. ZAMBRANO","pos":"CAM","grl":70,"pac":69,"sho":72,"pas":73,"dri":74,"def":35,"phy":53,"color":"plata","nacionalidad":"IT","pais_codigo":"IT"}'::jsonb),
  ('p53','{"id":"p53","nombre":"S. CABRERA","pos":"CAM","grl":56,"pac":56,"sho":56,"pas":60,"dri":61,"def":19,"phy":40,"color":"bronce","nacionalidad":"FR","pais_codigo":"FR"}'::jsonb),
  ('p54','{"id":"p54","nombre":"R. MENDOZA","pos":"CAM","grl":57,"pac":58,"sho":58,"pas":59,"dri":63,"def":21,"phy":39,"color":"bronce","nacionalidad":"US","pais_codigo":"US"}'::jsonb),
  ('p55','{"id":"p55","nombre":"F. CONTI","pos":"CAM","grl":83,"pac":82,"sho":85,"pas":86,"dri":87,"def":48,"phy":66,"color":"oro","nacionalidad":"CA","pais_codigo":"CA"}'::jsonb),
  ('p56','{"id":"p56","nombre":"L. DUVAL","pos":"LW","grl":59,"pac":69,"sho":55,"pas":55,"dri":64,"def":18,"phy":45,"color":"bronce","nacionalidad":"FO","pais_codigo":"FO"}'::jsonb),
  ('p57','{"id":"p57","nombre":"M. CARTER","pos":"LW","grl":60,"pac":71,"sho":57,"pas":54,"dri":66,"def":20,"phy":44,"color":"bronce","nacionalidad":"VA","pais_codigo":"VA"}'::jsonb),
  ('p58','{"id":"p58","nombre":"N. WILSON","pos":"LW","grl":61,"pac":70,"sho":59,"pas":56,"dri":65,"def":22,"phy":46,"color":"bronce","nacionalidad":"RU","pais_codigo":"RU"}'::jsonb),
  ('p59','{"id":"p59","nombre":"J. HANSEN","pos":"RW","grl":80,"pac":90,"sho":76,"pas":76,"dri":85,"def":39,"phy":66,"color":"oro","nacionalidad":"JP","pais_codigo":"JP"}'::jsonb),
  ('p60','{"id":"p60","nombre":"A. LEONE","pos":"RW","grl":63,"pac":73,"sho":60,"pas":57,"dri":69,"def":23,"phy":47,"color":"bronce","nacionalidad":"SM","pais_codigo":"SM"}'::jsonb),
  ('p61','{"id":"p61","nombre":"D. VOLKOV","pos":"RW","grl":54,"pac":63,"sho":52,"pas":49,"dri":58,"def":15,"phy":39,"color":"bronce","nacionalidad":"PE","pais_codigo":"PE"}'::jsonb),
  ('p62','{"id":"p62","nombre":"K. MORI","pos":"LM","grl":55,"pac":63,"sho":46,"pas":57,"dri":59,"def":25,"phy":41,"color":"bronce","nacionalidad":"AR","pais_codigo":"AR"}'::jsonb),
  ('p63','{"id":"p63","nombre":"P. VALENTI","pos":"RM","grl":56,"pac":65,"sho":48,"pas":56,"dri":61,"def":27,"phy":40,"color":"bronce","nacionalidad":"UY","pais_codigo":"UY"}'::jsonb),
  ('p64','{"id":"p64","nombre":"S. TORRES","pos":"ST","grl":57,"pac":58,"sho":63,"pas":41,"dri":56,"def":18,"phy":56,"color":"bronce","nacionalidad":"BO","pais_codigo":"BO"}'::jsonb),
  ('p65','{"id":"p65","nombre":"G. ACOSTA","pos":"ST","grl":58,"pac":60,"sho":62,"pas":43,"dri":58,"def":17,"phy":58,"color":"bronce","nacionalidad":"CO","pais_codigo":"CO"}'::jsonb),
  ('p66','{"id":"p66","nombre":"A. SOSA","pos":"ST","grl":59,"pac":62,"sho":64,"pas":42,"dri":60,"def":19,"phy":57,"color":"bronce","nacionalidad":"BR","pais_codigo":"BR"}'::jsonb),
  ('p67','{"id":"p67","nombre":"J. FLORES","pos":"ST","grl":89,"pac":90,"sho":95,"pas":73,"dri":88,"def":50,"phy":88,"color":"plus","nacionalidad":"ES","pais_codigo":"ES"}'::jsonb)
on conflict(id) do update set datos=excluded.datos;
insert into thc_private.ut_inicial_pesos(rareza,peso_base) values ('bronce',5500),('plata',3450),('oro',1000),('plus',50)
on conflict(rareza) do update set peso_base=excluded.peso_base;

create or replace function thc_private.ut_inicial_calidades(p_seed uuid)
returns text[] language plpgsql stable security definer set search_path='' as $fn$
declare output text[]:='{}'; picked text; draw numeric; i integer;
begin
  for i in 1..23 loop
    draw:=('x'||substr(md5(p_seed::text||':quality:'||i::text),1,8))::bit(32)::bigint::numeric/4294967296;
    with available as (
      select p.rareza,p.peso_base from thc_private.ut_inicial_pesos p
      where (select count(*) from thc_private.ut_inicial_catalogo c where c.datos->>'color'=p.rareza)>
            (select count(*) from unnest(output) rarity where rarity=p.rareza)
    ), cumulative as (
      select rareza,sum(peso_base) over(order by rareza) ceiling,sum(peso_base) over() total from available
    ) select rareza into picked from cumulative where ceiling>draw*total order by ceiling limit 1;
    if picked is null then raise exception 'El catálogo no tiene cartas suficientes para el sobre.' using errcode='55000'; end if;
    output:=array_append(output,picked);
  end loop;
  return output;
end $fn$;

create or replace function thc_private.ut_inicial_pick_player(p_seed uuid,p_slot integer,p_rarity text,p_position text,p_selected text[])
returns text language sql stable security definer set search_path='' as $fn$
  select c.id from thc_private.ut_inicial_catalogo c
  where c.datos->>'color'=p_rarity and (p_position is null or c.datos->>'pos'=p_position)
    and not(c.id=any(p_selected))
  order by md5(p_seed::text||':player:'||p_slot::text||':'||c.id) limit 1
$fn$;

create or replace function thc_private.ut_inicial_build(p_seed uuid,p_calidades text[])
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare players text[]:='{}'; rarity text; target text; picked text; cards jsonb; i integer; n integer; quota record;
begin
  if cardinality(p_calidades) is distinct from 23 or array_position(p_calidades,null) is not null or
     not(p_calidades<@array['bronce','plata','oro','plus']::text[]) then
    raise exception 'Las calidades del sobre no son válidas.' using errcode='22023';
  end if;
  for rarity in select distinct value from unnest(p_calidades) value loop
    if (select count(*) from unnest(p_calidades) value where value=rarity)>
       (select count(*) from thc_private.ut_inicial_catalogo c where c.datos->>'color'=rarity) then
      raise exception 'Una calidad supera el catálogo disponible.' using errcode='22023';
    end if;
  end loop;
  -- Conserva siempre las Plus y Oro que salieron en los 23 sorteos globales.
  foreach rarity in array array['plus','oro'] loop
    select count(*) into n from unnest(p_calidades) value where value=rarity;
    for i in 1..n loop
      picked:=thc_private.ut_inicial_pick_player(p_seed,cardinality(players)+1,rarity,null,players);
      if picked is null then raise exception 'No se pudo completar la calidad extraída.' using errcode='55000'; end if;
      players:=array_append(players,picked);
    end loop;
  end loop;
  -- Bronce y Plata tienen individualmente todos los puestos del once + GK suplente.
  -- Quedan al menos17 de estas cartas; cubrir los12 puestos nunca cambia su calidad.
  for i in 1..cardinality(p_calidades) loop
    rarity:=p_calidades[i];
    if rarity not in('bronce','plata') then continue; end if;
    target:=null;
    select required.pos into target from (values('GK',2),('CB',2),('LB',1),('RB',1),('CM',2),('CAM',1),('LW',1),('RW',1),('ST',1)) required(pos,n)
    where (select count(*) from thc_private.ut_inicial_catalogo c where c.id=any(players) and c.datos->>'pos'=required.pos)<required.n
    order by md5(p_seed::text||':role:'||i::text||':'||required.pos) limit 1;
    picked:=thc_private.ut_inicial_pick_player(p_seed,cardinality(players)+1,rarity,target,players);
    if picked is null then raise exception 'No se pudo completar un equipo equilibrado con las calidades extraídas.' using errcode='55000'; end if;
    players:=array_append(players,picked);
  end loop;
  for quota in select * from (values('GK',2),('CB',2),('LB',1),('RB',1),('CM',2),('CAM',1),('LW',1),('RW',1),('ST',1)) required(pos,n) loop
    if (select count(*) from thc_private.ut_inicial_catalogo c where c.id=any(players) and c.datos->>'pos'=quota.pos)<quota.n then
      raise exception 'Faltan posiciones para el equipo inicial.' using errcode='55000';
    end if;
  end loop;
  select jsonb_agg(c.datos order by md5(p_seed::text||':reveal:'||c.id)) into cards
  from thc_private.ut_inicial_catalogo c where c.id=any(players);
  if jsonb_array_length(cards) is distinct from 23 then raise exception 'No se pudo confirmar la entrega de23 distintos.' using errcode='55000'; end if;
  return cards;
end $fn$;

create or replace function thc_private.ut_starter_canonical(p_user uuid,p_id text)
returns jsonb language sql stable security definer set search_path='' as $fn$
  select card from thc_private.ut_inicial_entregas r cross join lateral jsonb_array_elements(r.cartas) card
  where r.user_id=p_user and card->>'id'=p_id
$fn$;

create or replace function public.thc_ut_cartas_iniciales()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); cards jsonb;
begin
  if uid is null then raise exception 'Inicia sesión para ver tus cartas.' using errcode='42501'; end if;
  select r.cartas into cards from thc_private.ut_inicial_entregas r where r.user_id=uid;
  return coalesce(cards,'[]'::jsonb);
end $fn$;

create or replace function public.thc_ut_abrir_sobre_inicial()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); receipt thc_private.ut_inicial_entregas%rowtype;
  players text[]; qualities text[]; seed uuid:=gen_random_uuid(); cards jsonb;
begin
  if uid is null then raise exception 'Inicia sesión para abrir tu sobre inicial.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-starter:'||uid::text,0));
  -- El recibo depende de auth.users, no del club: un reset jamás sortea otra vez.
  select * into receipt from thc_private.ut_inicial_entregas where user_id=uid;
  if not found then
    if not exists(select 1 from public.perfiles_ut where user_id=uid) or
       not exists(select 1 from public.equipos_ut where user_id=uid) then
      raise exception 'Crea primero tu club para recibir el sobre inicial.' using errcode='42501';
    end if;
    if (select count(*) from thc_private.ut_inicial_catalogo where id ~ '^p([1-9]|[1-5][0-9]|6[0-7])$')<>67 then
      raise exception 'El catálogo inicial no está completo. Tu entrega sigue pendiente.' using errcode='55000';
    end if;
    qualities:=thc_private.ut_inicial_calidades(seed);
    cards:=thc_private.ut_inicial_build(seed,qualities);
    select array_agg(card->>'id' order by item.ordinality) into players
      from jsonb_array_elements(cards) with ordinality item(card,ordinality);
    insert into thc_private.ut_inicial_entregas(user_id,jugadores,semilla,cartas,catalog_version,calidades)
      values(uid,players,seed,cards,4,qualities) returning * into receipt;
  end if;
  cards:=public.thc_ut_cartas_iniciales();
  if jsonb_array_length(cards)<>23 then raise exception 'No se pudo recuperar tu entrega inicial completa.' using errcode='55000'; end if;
  return jsonb_build_object('version',receipt.catalog_version,'pool_size',67,'cartas',cards,'legacy',receipt.legacy,'entregado_en',receipt.entregado_en);
end $fn$;

-- Guardado y Online reciben estadísticas oficiales, sólo de los IDs que posee esta cuenta.
create or replace function thc_private.ut_online_canonical(p_user uuid,p_id text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare output jsonb; card public.ut_cartas%rowtype; copy_id uuid;
begin
  if p_id ~ '^p([1-9]|[1-5][0-9]|6[0-7])$' then
    output:=thc_private.ut_starter_canonical(p_user,p_id);
  elsif p_id ~ '^ut:[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then
    copy_id:=substring(p_id from 4)::uuid;
    select c.* into card from public.ut_cartas_club owned join public.ut_cartas c on c.id=owned.carta_id
      where owned.id=copy_id and owned.user_id=p_user;
    if found then output:=to_jsonb(card)||jsonb_build_object('id','ut:'||copy_id::text,'club_carta_id',copy_id,'pos',card.posicion,'color',card.rareza,
      'pac',card.ritmo,'sho',card.tiro,'pas',card.pase,'dri',card.regate,'def',card.defensa,'phy',card.fisico,
      'gk_div',card.estirada,'gk_han',card.paradas,'gk_kic',card.saque,'gk_ref',card.reflejos,'gk_spd',card.velocidad_por,'gk_pos',card.posicionamiento); end if;
  end if;
  return output;
end $fn$;

create or replace function public.thc_ut_guardar_plantilla(p_plantilla jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  uid uuid := auth.uid(); group_name text; player jsonb; canonical jsonb; player_id text;
  copy_id uuid; card public.ut_cartas%rowtype; output jsonb := '{}'::jsonb;
  players jsonb; seen text[] := '{}'; formation text; tactics jsonb;
  saved public.plantillas_ut%rowtype;
begin
  if uid is null then raise exception 'Inicia sesión para guardar tu plantilla.' using errcode='42501'; end if;
  if p_plantilla is null or jsonb_typeof(p_plantilla)<>'object' or octet_length(p_plantilla::text)>1048576 then
    raise exception 'La plantilla no es válida.' using errcode='22023';
  end if;
  formation := p_plantilla->>'formacion';
  if formation is null or formation not in ('4-3-3','4-4-2','4-2-3-1') then raise exception 'Elige una formación válida.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-squad:'||uid::text,0));
  tactics := p_plantilla->'tacticas';
  if tactics is null then
    select tacticas into tactics from public.plantillas_ut where user_id=uid;
    tactics := coalesce(tactics,'{}'::jsonb);
  end if;
  if jsonb_typeof(tactics)<>'object' or octet_length(tactics::text)>16384 then raise exception 'Las tácticas no son válidas.' using errcode='22023'; end if;
  foreach group_name in array array['titulares','suplentes','reservas'] loop
    if jsonb_typeof(p_plantilla->group_name) is distinct from 'array' then raise exception 'Falta una parte de la plantilla.' using errcode='22023'; end if;
    if jsonb_array_length(p_plantilla->group_name) > (case group_name when 'titulares' then 11 when 'suplentes' then 7 else 100 end) then
      raise exception 'La plantilla supera el límite de plazas.' using errcode='22023';
    end if;
    players := '[]'::jsonb;
    for player in select value from jsonb_array_elements(p_plantilla->group_name) loop
      if player='null'::jsonb then players := players || '[null]'::jsonb; continue; end if;
      if jsonb_typeof(player)<>'object' then raise exception 'Hay una carta no válida.' using errcode='22023'; end if;
      player_id := player->>'id';
      if player_id is null or player_id=any(seen) then raise exception 'No se puede repetir la misma copia de una carta.' using errcode='22023'; end if;
      canonical := null;
      if player_id ~ '^p([1-9]|[1-5][0-9]|6[0-7])$' then
        canonical:=thc_private.ut_starter_canonical(uid,player_id);
      elsif player_id ~ '^ut:[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then
        copy_id := substring(player_id from 4)::uuid;
        if player ? 'club_carta_id' and player->>'club_carta_id' is distinct from copy_id::text then
          raise exception 'La copia de la carta no coincide.' using errcode='22023';
        end if;
        select c.* into card from public.ut_cartas_club owned join public.ut_cartas c on c.id=owned.carta_id
          where owned.id=copy_id and owned.user_id=uid;
        if found then canonical := to_jsonb(card) || jsonb_build_object(
          'id','ut:'||copy_id::text,'club_carta_id',copy_id,'carta_id',card.id,'pos',card.posicion,
          'pac',card.ritmo,'sho',card.tiro,'pas',card.pase,'dri',card.regate,'def',card.defensa,'phy',card.fisico,'color',card.rareza,
          'gk_div',card.estirada,'gk_han',card.paradas,'gk_kic',card.saque,'gk_ref',card.reflejos,'gk_spd',card.velocidad_por,'gk_pos',card.posicionamiento,'ejemplo',card.es_ejemplo
        ); end if;
      end if;
      if canonical is null then raise exception 'Una de las cartas no pertenece a tu club.' using errcode='42501'; end if;
      if canonical->>'id'=any(seen) then raise exception 'No se puede repetir la misma copia de una carta.' using errcode='22023'; end if;
      seen := array_append(seen,canonical->>'id'); players := players || jsonb_build_array(canonical);
    end loop;
    output := output || jsonb_build_object(group_name,players);
  end loop;
  insert into public.plantillas_ut(user_id,formacion,titulares,suplentes,reservas,tacticas,actualizado_en)
    values(uid,formation,output->'titulares',output->'suplentes',output->'reservas',tactics,now())
    on conflict(user_id) do update set formacion=excluded.formacion,titulares=excluded.titulares,suplentes=excluded.suplentes,
      reservas=excluded.reservas,tacticas=excluded.tacticas,actualizado_en=excluded.actualizado_en
    returning * into saved;
  return to_jsonb(saved);
end $function$;

revoke all on function thc_private.ut_starter_canonical(uuid,text) from public,anon,authenticated;
revoke all on function thc_private.ut_inicial_calidades(uuid) from public,anon,authenticated;
revoke all on function thc_private.ut_inicial_pick_player(uuid,integer,text,text,text[]) from public,anon,authenticated;
revoke all on function thc_private.ut_inicial_build(uuid,text[]) from public,anon,authenticated;
drop function if exists thc_private.ut_inicial_pick(uuid,integer,text,text[]);
drop function if exists thc_private.ut_inicial_candidates(text,text[]);
revoke all on function thc_private.ut_online_canonical(uuid,text) from public,anon,authenticated;
revoke all on function public.thc_ut_abrir_sobre_inicial() from public,anon,authenticated;
revoke all on function public.thc_ut_cartas_iniciales() from public,anon,authenticated;
revoke all on function public.thc_ut_guardar_plantilla(jsonb) from public,anon,authenticated;
grant execute on function public.thc_ut_abrir_sobre_inicial(),public.thc_ut_cartas_iniciales(),public.thc_ut_guardar_plantilla(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
