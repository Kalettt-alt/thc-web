import { readFile, writeFile } from 'node:fs/promises';
import { LEGACY_STARTER_POOL_UT, STARTER_POOL_UT, STARTER_RARITY_PROBABILITIES } from '../src/pages/UltimateTeam/data/starterPoolUT.js';

const base=await readFile(new URL('../supabase/ultimate_team_cartas.sql',import.meta.url),'utf8');
const online=await readFile(new URL('../supabase/ut_online_matches.sql',import.meta.url),'utf8');
const seed=LEGACY_STARTER_POOL_UT.map(player=>`  ('${player.id}','${JSON.stringify(player).replaceAll("'","''")}'::jsonb)`).join(',\n');
const catalogSeed=STARTER_POOL_UT.map(player=>`  ('${player.id}','${JSON.stringify(player).replaceAll("'","''")}'::jsonb)`).join(',\n');
const probabilitySeed=Object.entries(STARTER_RARITY_PROBABILITIES).map(([rarity,probability])=>`('${rarity}',${probability*100})`).join(',');
const canonical=online.match(/create or replace function thc_private\.ut_online_canonical\(p_user uuid,p_id text\)[\s\S]*?end \$fn\$;/)?.[0]
  .replace("if p_id ~ '^p([1-9]|1[0-9]|2[0-3])$' then\n    select datos into output from thc_private.ut_jugadores_base where id=p_id;",
    () => "if p_id ~ '^p([1-9]|[1-5][0-9]|6[0-7])$' then\n    output:=thc_private.ut_starter_canonical(p_user,p_id);");
const save=base.match(/create or replace function public\.thc_ut_guardar_plantilla\(p_plantilla jsonb\)[\s\S]*?end \$function\$;/)?.[0]
  .replace("if player_id ~ '^p([1-9]|1[0-9]|2[0-3])$' then\n        select datos into canonical from thc_private.ut_jugadores_base where id=player_id;",
    () => "if player_id ~ '^p([1-9]|[1-5][0-9]|6[0-7])$' then\n        canonical:=thc_private.ut_starter_canonical(uid,player_id);");
if(!canonical?.includes('ut_starter_canonical(p_user,p_id)')||!save?.includes('ut_starter_canonical(uid,player_id)'))throw Error('No se encontraron los guardados canónicos que necesita el sobre inicial.');
const sql=`-- SOBRE INICIAL UT · POOL DE 67 JUGADORES · 13 OCTUBRE 2026
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
${seed}
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
${catalogSeed}
on conflict(id) do update set datos=excluded.datos;
insert into thc_private.ut_inicial_pesos(rareza,peso_base) values ${probabilitySeed}
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
${canonical}

${save}

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
`;
for(const name of ['../supabase/ut_starter_pool_v2.sql','../ComandosSQL_SobreInicialUT.txt']) {
  const path=new URL(name,import.meta.url);
  if(process.argv.includes('--check')) {
    if((await readFile(path,'utf8')).replace(/\r\n/g,'\n')!==sql)throw Error(`${name} no coincide con el catálogo inicial.`);
  } else await writeFile(path,sql,'utf8');
}
console.log(process.argv.includes('--check')?'SQL de sobre inicial coincide con el pool de 67.':'SQL de sobre inicial y archivo para copiar creados.');
