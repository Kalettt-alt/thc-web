import {readFile,writeFile} from 'node:fs/promises';
import {UT_MATCH_PLAYS} from '../src/pages/UltimateTeam/matchPlaysUT.js';

const source=(await readFile(new URL('../supabase/ut_simulation_v3.sql',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
function extract(name){const start=source.indexOf(`create or replace function ${name}(`);if(start<0)throw new Error(`Falta ${name}`);const end=source.indexOf('end $fn$;',start);if(end<0)throw new Error(`Cierre de ${name}`);return source.slice(start,end+10);}
function replace(text,from,to){if(!text.includes(from))throw new Error(`Contrato SQL cambió: ${from}`);return text.replaceAll(from,to);}
const legacy=extract('thc_private.ut_online_advance').replace('function thc_private.ut_online_advance(','function thc_private.ut_online_advance_legacy_v3(');
let payload=extract('thc_private.ut_online_payload');
payload=replace(payload,'thc_private.ut_online_elapsed(game.started_at,v_now,game.simulation_version)','thc_private.ut_online_live_elapsed(game,v_now)');
payload=replace(payload,'half_duration:=total_duration/2;','half_duration:=thc_private.ut_online_live_half(game);');
payload=replace(payload,"when elapsed>=total_duration then 'finished'","when elapsed>=half_duration*2 then 'finished'");
payload=replace(payload,"'simulation_version',game.simulation_version,","'active_duration_seconds',half_duration*2,'first_half_seconds',half_duration,'simulation_version',game.simulation_version,");
let search=extract('public.thc_ut_online_buscar');
search=replace(search,'v_match_id uuid; begins timestamptz;','v_match_id uuid; begins timestamptz; half_seconds integer;');
search=replace(search,"begins:=clock_timestamp()+interval '4 seconds';","begins:=clock_timestamp()+interval '4 seconds'; half_seconds:=64+floor(random()*5)::integer;");
search=replace(search,"begins,begins+interval '132 seconds',3,","begins,begins+(half_seconds*2+12)*interval '1 second',4,");
let tactics=extract('public.thc_ut_online_tactica');
tactics=replace(tactics,'game.simulation_version not in (2,3)','game.simulation_version not in (2,3,4)');
tactics=replace(tactics,'game.active_seconds>=thc_private.ut_online_duration(game.simulation_version)','game.active_seconds>=thc_private.ut_online_live_half(game)*2');
tactics=replace(tactics,"jsonb_build_object('second',active_seconds,'minute',floor(active_seconds*90.0/thc_private.ut_online_duration(simulation_version)),'side',side,'type','tactics',", "thc_private.ut_online_live_minute(ut_online_partidas,active_seconds)||jsonb_build_object('second',active_seconds,'side',side,'type','tactics',");
// The active game is authoritative; a public request never supplies a play or result.
const sql=`-- UT · 20 JUGADAS Y CIERRE NATURAL DE LAS MITADES · 15 OCTUBRE 2026
-- Requiere Online v3; incluido en ComandosSQL_ActualizacionUT.txt actualizado.
-- Base: 60 s por mitad, más 4–8 s para cerrar la acción; descanso fijo de 12 s.
-- Conserva partidos antiguos, RLS, GRL ±3, cinco cambios y energía proporcional.
begin;
do $requirements$ begin
  if to_regprocedure('thc_private.ut_online_duration(integer)') is null then
    raise exception 'Instala primero la actualización completa de UT.';
  end if;
end $requirements$;
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_duration;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_duration;
alter table public.ut_online_partidas drop constraint if exists ut_online_v4_duration;
alter table public.ut_online_partidas add constraint ut_online_v4_duration check(
  case when simulation_version=4 then extract(epoch from ends_at-started_at) in(140,142,144,146,148)
  else ends_at=started_at+case simulation_version when 3 then interval '132 seconds' when 2 then interval '192 seconds' else interval '180 seconds' end end);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_cursor;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_cursor;
alter table public.ut_online_partidas drop constraint if exists ut_online_v4_cursor;
alter table public.ut_online_partidas add constraint ut_online_v4_cursor check(simulation_version in(1,2,3,4) and active_seconds between 0 and
  case when simulation_version=4 then extract(epoch from ends_at-started_at)::integer-12 when simulation_version=3 then 120 else 180 end);

create or replace function thc_private.ut_online_live_half(p_game public.ut_online_partidas)
returns integer language sql immutable set search_path='' as $fn$
  select case when p_game.simulation_version=4 then (extract(epoch from p_game.ends_at-p_game.started_at)::integer-12)/2
    else thc_private.ut_online_duration(p_game.simulation_version)/2 end;
$fn$;
create or replace function thc_private.ut_online_live_elapsed(p_game public.ut_online_partidas,p_now timestamptz)
returns integer language sql immutable set search_path='' as $fn$
 select case when p_game.simulation_version<>4 then thc_private.ut_online_elapsed(p_game.started_at,p_now,p_game.simulation_version)
 else greatest(0,least(thc_private.ut_online_live_half(p_game)*2,
 case when p_now<p_game.started_at+thc_private.ut_online_live_half(p_game)*interval '1 second' then floor(extract(epoch from p_now-p_game.started_at))::integer
 when p_now<p_game.started_at+(thc_private.ut_online_live_half(p_game)+12)*interval '1 second' then thc_private.ut_online_live_half(p_game)
 else floor(extract(epoch from p_now-p_game.started_at))::integer-12 end)) end;
$fn$;
create or replace function thc_private.ut_online_live_minute(p_game public.ut_online_partidas,p_second integer)
returns jsonb language plpgsql immutable set search_path='' as $fn$
declare half integer:=thc_private.ut_online_live_half(p_game); local_second integer; base integer; minute integer;
begin
 if p_game.simulation_version<>4 then return jsonb_build_object('minute',floor(p_second*90.0/(half*2))); end if;
 if p_second=half then return jsonb_build_object('minute',45,'minuteLabel','45'); end if;
 base:=case when p_second>half then 45 else 0 end;
 local_second:=case when p_second>half then p_second-half else p_second end;
 minute:=base+least(45,floor(local_second*.75)::integer);
 return jsonb_build_object('minute',minute,'minuteLabel',case when local_second>60 then (base+45)::text||'+'||ceil((local_second-60)*.75)::text else minute::text end);
end $fn$;
create or replace function thc_private.ut_online_live_schedule(p_game public.ut_online_partidas)
returns table(action_side text,opportunity integer,action_tick integer) language sql immutable set search_path='' as $fn$
 with h as(select thc_private.ut_online_live_half(p_game) half)
 select s.side,i.n,(case s.side when 'home' then array[8,24,40,h.half-10,h.half+8,h.half+30,h.half*2-4]
 else array[14,30,46,h.half-4,h.half+14,h.half+36,h.half*2-10] end)[i.n+1]
 from h cross join (values('home'),('away')) s(side) cross join generate_series(0,6) i(n);
$fn$;
create or replace function thc_private.ut_online_live_play(p_seed uuid,p_index integer)
returns jsonb language sql immutable set search_path='' as $fn$
 select '${JSON.stringify(UT_MATCH_PLAYS).replaceAll("'","''")}'::jsonb ->mod(floor(thc_private.ut_online_random(p_seed,0,'home','play-deck')*20)::integer+p_index*7,20);
$fn$;

${legacy}

create or replace function thc_private.ut_online_advance(p_match uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path='' as $fn$
declare game public.ut_online_partidas%rowtype; upto integer; clock_tick integer; half integer; action record;
  output jsonb; home_team jsonb; away_team jsonb; team jsonb; rival jsonb; play jsonb; shot jsonb;
  side text; other text; hgoals integer; agoals integer; goals integer; diff numeric; chance numeric; roll numeric;
  attribute numeric; event_type text; shooter text; player text;
begin
 select * into game from public.ut_online_partidas where id=p_match for update;
 if not found or game.estado='finished' then return; end if;
 if game.simulation_version<>4 then perform thc_private.ut_online_advance_legacy_v3(p_match,p_now); return; end if;
 half:=thc_private.ut_online_live_half(game); upto:=thc_private.ut_online_live_elapsed(game,p_now);
 if upto<=game.active_seconds then return; end if;
 output:=game.events;home_team:=game.home;away_team:=game.away;hgoals:=game.home_goals;agoals:=game.away_goals;
 for clock_tick in game.active_seconds+1..upto loop
  home_team:=thc_private.ut_online_fatigue_duration(home_team,1,120);away_team:=thc_private.ut_online_fatigue_duration(away_team,1,120);
  if clock_tick=half then output:=output||jsonb_build_array(jsonb_build_object('second',clock_tick,'minute',45,'side','home','type','halftime','pattern','Entretiempo')); end if;
  if clock_tick=half+1 then output:=output||jsonb_build_array(jsonb_build_object('second',clock_tick,'minute',45,'side','away','type','kickoff','pattern','Comienza el segundo tiempo')); end if;
  for action in select * from thc_private.ut_online_live_schedule(game) where action_tick=clock_tick or action_tick-4=clock_tick order by action_side loop
   side:=action.action_side;other:=case side when 'home' then 'away' else 'home' end;
   team:=case side when 'home' then home_team else away_team end;rival:=case side when 'home' then away_team else home_team end;
   play:=thc_private.ut_online_live_play(game.simulation_seed,action.opportunity*2+case side when 'away' then 1 else 0 end);
   if action.action_tick-4=clock_tick then
    player:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,clock_tick,side,'pass-player'));
    output:=output||jsonb_build_array(thc_private.ut_online_live_minute(game,clock_tick)||jsonb_build_object('second',clock_tick,'side',side,'type','pass','player',player,'pattern',play->>'label','play_id',play->>'id'));
    continue;
   end if;
   diff:=(team->>'grl')::numeric*(.72+.28*(team->>'stamina')::numeric/100)-(rival->>'grl')::numeric*(.72+.28*(rival->>'stamina')::numeric/100);
   select avg(coalesce((card->>(play->>'attribute'))::numeric,(card->>'base_grl')::numeric,(card->>'grl')::numeric)) into attribute from jsonb_array_elements(team->'titulares') card;
   chance:=greatest(.05,least(.43,.19+diff*.009+(play->>'bonus')::numeric+greatest(-.025,least(.025,(attribute-(team->>'grl')::numeric)*.001))+
    case team->>'mentalidad' when 'ofensiva' then .045 when 'defensiva' then -.045 else 0 end+
    case rival->>'mentalidad' when 'ofensiva' then .035 when 'defensiva' then -.035 else 0 end));
   goals:=case side when 'home' then hgoals else agoals end;if goals>=4 then chance:=chance*.2;end if;
   roll:=thc_private.ut_online_random(game.simulation_seed,clock_tick,side,'chance');
   event_type:=case when roll<chance and goals<6 then 'goal' when roll<chance+.34 then 'save' when roll<chance+.43 then 'post' else 'shot' end;
   shooter:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,clock_tick,side,'shooter'));
   player:=case when event_type='save' then thc_private.ut_online_pick(rival,0,true) else shooter end;
   output:=output||jsonb_build_array(thc_private.ut_online_live_minute(game,clock_tick)||jsonb_build_object('second',clock_tick,'side',side,'type',event_type,'player',player,'shooter',shooter,'pattern',play->>'label','play_id',play->>'id'));
   if event_type='goal' then
    if side='home' then hgoals:=hgoals+1;else agoals:=agoals+1;end if;
    output:=output||jsonb_build_array(thc_private.ut_online_live_minute(game,clock_tick)||jsonb_build_object('second',clock_tick,'side',other,'type','kickoff','pattern','Saque desde el medio'));
   end if;
  end loop;
  if clock_tick in(half-1,half*2-1) then
   select value into shot from jsonb_array_elements(output) where (value->>'second')::integer=clock_tick-3 and value->>'type' in('goal','shot','save','post') limit 1;
   other:=case shot->>'side' when 'home' then 'away' else 'home' end;
   output:=output||jsonb_build_array(thc_private.ut_online_live_minute(game,clock_tick)||jsonb_build_object('second',clock_tick,'side',other,'type',case when shot->>'type'='post' then 'clearance' else 'settled' end,
    'pattern',case shot->>'type' when 'post' then 'Despeje fuera del área' when 'save' then 'El arquero controla la pelota' when 'goal' then 'Balón en el centro' else 'Balón fuera. Saque de meta' end,
    'safe_end',true,'resume',case when shot->>'type'='goal' then 'middle' else 'keeper' end));
  end if;
  if clock_tick=half*2 then output:=output||jsonb_build_array(thc_private.ut_online_live_minute(game,clock_tick)||jsonb_build_object('second',clock_tick,'minute',90,'side','home','type','fulltime','pattern','Final del partido'));end if;
 end loop;
 update public.ut_online_partidas set home=home_team,away=away_team,events=output,home_goals=hgoals,away_goals=agoals,active_seconds=upto where id=p_match;
end $fn$;

${payload}

${search}

${tactics}

do $functions$ declare target record;begin
 for target in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='thc_private' and p.proname like 'ut_online_%') or (n.nspname='public' and p.proname like 'thc_ut_online_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',target.signature);end loop;
end $functions$;
grant execute on function public.thc_ut_online_estado(),public.thc_ut_online_heartbeat(),public.thc_ut_online_cancelar(uuid),public.thc_ut_online_buscar(uuid),
 public.thc_ut_online_tactica(uuid,integer,uuid,text[],text,text) to authenticated;
notify pgrst,'reload schema';
commit;
`;
const targets=['../supabase/ut_live_match_v4.sql','../ComandosSQL_UTPartidosVivos.txt'];
for(const path of targets){const url=new URL(path,import.meta.url);if(process.argv.includes('--check')){if((await readFile(url,'utf8')).replace(/\r\n/g,'\n')!==sql)throw new Error(`${path} desactualizado`);}else await writeFile(url,sql,'utf8');}
console.log(process.argv.includes('--check')?'SQL UT v4 y copia coinciden.':'SQL UT v4 generado.');
