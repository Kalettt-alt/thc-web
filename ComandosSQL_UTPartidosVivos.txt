-- UT · 20 JUGADAS Y CIERRE NATURAL DE LAS MITADES · 15 OCTUBRE 2026
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
 select '[{"id":"one_two","label":"Pared por dentro","attribute":"pas","bonus":0.008,"roles":["CM","CAM","ST"],"route":[[0.43,0.5],[0.62,0.43],[0.73,0.55],[0.86,0.48]]},{"id":"through_ball","label":"Pase entre centrales","attribute":"pas","bonus":0.01,"roles":["CM","CAM","ST"],"route":[[0.4,0.57],[0.61,0.5],[0.82,0.43],[0.89,0.47]]},{"id":"right_cross","label":"Centro desde la derecha","attribute":"pas","bonus":0,"roles":["RB","RW","ST"],"route":[[0.35,0.81],[0.65,0.86],[0.87,0.83],[0.86,0.48]]},{"id":"left_cross","label":"Centro desde la izquierda","attribute":"pas","bonus":0,"roles":["LB","LW","ST"],"route":[[0.35,0.19],[0.65,0.14],[0.87,0.17],[0.86,0.52]]},{"id":"right_cutback","label":"Desborde y pase atrás al punto penal","attribute":"dri","bonus":0.012,"roles":["RM","RW","CAM"],"route":[[0.48,0.78],[0.76,0.87],[0.93,0.8],[0.85,0.53]]},{"id":"left_cutback","label":"Línea de fondo por la izquierda","attribute":"dri","bonus":0.012,"roles":["LM","LW","CAM"],"route":[[0.48,0.22],[0.76,0.13],[0.93,0.2],[0.85,0.47]]},{"id":"switch","label":"Cambio de orientación","attribute":"pas","bonus":-0.004,"roles":["LB","CM","RW","ST"],"route":[[0.36,0.17],[0.53,0.33],[0.69,0.82],[0.88,0.56]]},{"id":"counter_centre","label":"Contraataque por el centro","attribute":"pac","bonus":0.014,"roles":["CDM","CAM","ST"],"route":[[0.3,0.48],[0.55,0.5],[0.76,0.44],[0.9,0.49]]},{"id":"counter_left","label":"Contraataque por la izquierda","attribute":"pac","bonus":0.008,"roles":["LB","LW","ST"],"route":[[0.26,0.25],[0.52,0.16],[0.78,0.24],[0.89,0.44]]},{"id":"counter_right","label":"Contraataque por la derecha","attribute":"pac","bonus":0.008,"roles":["RB","RW","ST"],"route":[[0.26,0.75],[0.52,0.84],[0.78,0.76],[0.89,0.56]]},{"id":"overlap_left","label":"Lateral doblando por fuera","attribute":"pac","bonus":-0.003,"roles":["CM","LW","LB","ST"],"route":[[0.47,0.46],[0.62,0.2],[0.84,0.12],[0.88,0.5]]},{"id":"overlap_right","label":"Superioridad por la banda derecha","attribute":"pac","bonus":-0.003,"roles":["CM","RW","RB","ST"],"route":[[0.47,0.54],[0.62,0.8],[0.84,0.88],[0.88,0.5]]},{"id":"corner_near","label":"Córner al primer palo","attribute":"phy","bonus":-0.008,"roles":["LW","CB","ST"],"route":[[0.98,0.05],[0.95,0.21],[0.9,0.4],[0.94,0.45]]},{"id":"corner_far","label":"Córner al segundo palo","attribute":"phy","bonus":-0.008,"roles":["RW","CB","ST"],"route":[[0.98,0.95],[0.95,0.78],[0.88,0.42],[0.93,0.49]]},{"id":"corner_short","label":"Córner corto y pared","attribute":"pas","bonus":-0.01,"roles":["LW","CAM","ST"],"route":[[0.98,0.05],[0.86,0.17],[0.82,0.27],[0.9,0.48]]},{"id":"free_kick","label":"Tiro libre ensayado","attribute":"sho","bonus":-0.016,"roles":["CAM","ST"],"route":[[0.72,0.35],[0.76,0.39],[0.83,0.45],[0.88,0.49]]},{"id":"high_press","label":"Robo con presión alta","attribute":"def","bonus":0.009,"roles":["CM","CAM","ST"],"route":[[0.63,0.56],[0.69,0.53],[0.8,0.46],[0.89,0.5]]},{"id":"escape_press","label":"Salida de la presión por fuera","attribute":"pas","bonus":-0.006,"roles":["CB","LB","CM","LW"],"route":[[0.23,0.5],[0.34,0.17],[0.57,0.26],[0.84,0.28]]},{"id":"solo_run","label":"Conducción rompiendo líneas","attribute":"dri","bonus":0.002,"roles":["CM","CAM","ST"],"route":[[0.45,0.47],[0.59,0.58],[0.73,0.4],[0.89,0.51]]},{"id":"second_ball","label":"Rebote y segunda jugada","attribute":"phy","bonus":0.003,"roles":["ST","CM","CAM"],"route":[[0.78,0.46],[0.74,0.58],[0.83,0.61],[0.89,0.54]]}]'::jsonb ->mod(floor(thc_private.ut_online_random(p_seed,0,'home','play-deck')*20)::integer+p_index*7,20);
$fn$;

create or replace function thc_private.ut_online_advance_legacy_v3(p_match uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path='' as $fn$
declare game public.ut_online_partidas%rowtype; upto integer; tick integer; side text; other text; team jsonb; rival jsonb;
  output jsonb; home_team jsonb; away_team jsonb; hgoals integer; agoals integer; opportunity integer; offset_tick integer;
  diff numeric; chance numeric; roll numeric; goals integer; event_type text; shooter text; player text; pattern text;
  total_duration integer; half_duration integer; opportunity_step integer;
  patterns text[]:=array['Pared por dentro','Cambio de frente','Salida por la banda','Pase entre líneas','Centro al área','Contraataque','Llegada desde atrás','Pelota detenida'];
begin
  select * into game from public.ut_online_partidas where id=p_match for update;
  if not found or game.simulation_version not in (2,3) or game.estado='finished' then return; end if;
  total_duration:=thc_private.ut_online_duration(game.simulation_version); half_duration:=total_duration/2;
  opportunity_step:=case when game.simulation_version>=3 then 16 else 23 end;
  upto:=thc_private.ut_online_elapsed(game.started_at,p_now,game.simulation_version);
  if upto<=game.active_seconds then return; end if;
  output:=game.events; home_team:=game.home; away_team:=game.away; hgoals:=game.home_goals; agoals:=game.away_goals;
  for tick in game.active_seconds+1..upto loop
    home_team:=thc_private.ut_online_fatigue_duration(home_team,1,total_duration); away_team:=thc_private.ut_online_fatigue_duration(away_team,1,total_duration);
    if tick=half_duration then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',45,'side','home','type','halftime','pattern','Entretiempo')); end if;
    if tick=half_duration+1 then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',45,'side','away','type','kickoff','pattern','Comienza el segundo tiempo')); end if;
    foreach side in array array['home','away'] loop
      other:=case when side='home' then 'away' else 'home' end;
      team:=case when side='home' then home_team else away_team end; rival:=case when side='home' then away_team else home_team end;
      offset_tick:=case when side='home' then 8 else 14 end;
      if mod(tick+4-offset_tick,opportunity_step)=0 and tick+4>=offset_tick and (tick+4-offset_tick)/opportunity_step<7 then
        player:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,tick,side,'pass-player'));
        pattern:=patterns[1+floor(thc_private.ut_online_random(game.simulation_seed,tick,side,'pattern')*8)::integer];
        output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick*90.0/total_duration),'side',side,'type','pass','player',player,'pattern',pattern));
      end if;
      if mod(tick-offset_tick,opportunity_step)<>0 or tick<offset_tick then continue; end if;
      opportunity:=(tick-offset_tick)/opportunity_step; if opportunity>=7 then continue; end if;
      diff:=(team->>'grl')::numeric*(.72+.28*(team->>'stamina')::numeric/100)-(rival->>'grl')::numeric*(.72+.28*(rival->>'stamina')::numeric/100);
      chance:=greatest(.05,least(.43,.19+diff*.009+
        case team->>'mentalidad' when 'ofensiva' then .045 when 'defensiva' then -.045 else 0 end+
        case rival->>'mentalidad' when 'ofensiva' then .035 when 'defensiva' then -.035 else 0 end));
      goals:=case when side='home' then hgoals else agoals end; if goals>=4 then chance:=chance*.2; end if;
      roll:=thc_private.ut_online_random(game.simulation_seed,tick,side,'chance');
      event_type:=case when roll<chance and goals<6 then 'goal' when roll<chance+.34 then 'save' when roll<chance+.43 then 'post' else 'shot' end;
      shooter:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,tick,side,'shooter'));
      player:=case when event_type='save' then thc_private.ut_online_pick(rival,0,true) else shooter end;
      output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick*90.0/total_duration),'side',side,'type',event_type,'player',player,'shooter',shooter));
      if event_type='goal' then
        if side='home' then hgoals:=hgoals+1; else agoals:=agoals+1; end if;
        output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick*90.0/total_duration),'side',other,'type','kickoff','pattern','Saque desde el medio'));
      end if;
    end loop;
    if tick=total_duration then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',90,'side','home','type','fulltime','pattern','Final del partido')); end if;
  end loop;
  update public.ut_online_partidas set home=home_team,away=away_team,events=output,home_goals=hgoals,away_goals=agoals,active_seconds=upto where id=p_match;
end $fn$;


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

create or replace function thc_private.ut_online_payload(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare session public.ut_online_sesiones%rowtype; game public.ut_online_partidas%rowtype; v_now timestamptz:=clock_timestamp();
  elapsed integer; visible jsonb; output jsonb:=null; own_team jsonb; online_count integer; home_score integer; away_score integer; phase text; raw_seconds numeric; total_duration integer; half_duration integer;
begin
  select * into session from public.ut_online_sesiones where user_id=p_user;
  select count(*)::integer into online_count from public.ut_online_sesiones where estado in ('waiting','playing') and last_seen>v_now-interval '30 seconds';
  begin own_team:=thc_private.ut_online_snapshot(p_user); exception when sqlstate '22023' then own_team:=null; end;
  if session.match_id is not null then
    perform thc_private.ut_online_advance(session.match_id,v_now);
    select * into game from public.ut_online_partidas where id=session.match_id and p_user in(home_user,away_user);
    if found then
      elapsed:=thc_private.ut_online_live_elapsed(game,v_now);
      raw_seconds:=extract(epoch from v_now-game.started_at);
      total_duration:=thc_private.ut_online_duration(game.simulation_version); half_duration:=thc_private.ut_online_live_half(game);
      phase:=case when raw_seconds<0 then 'pre' when elapsed>=half_duration*2 then 'finished' when raw_seconds<half_duration then 'first'
        when game.simulation_version>=2 and raw_seconds<half_duration+12 then 'halftime' else 'second' end;
      select coalesce(jsonb_agg(value order by (value->>'second')::integer,ordinality),'[]') into visible
        from jsonb_array_elements(game.events) with ordinality where (value->>'second')::integer<=elapsed;
      select count(*) filter(where value->>'type'='goal' and value->>'side'='home')::integer,
        count(*) filter(where value->>'type'='goal' and value->>'side'='away')::integer into home_score,away_score from jsonb_array_elements(visible);
      output:=jsonb_build_object('id',game.id,'home',game.home,'away',game.away,'started_at',game.started_at,'ends_at',game.ends_at,
        'events',visible,'home_goals',home_score,'away_goals',away_score,'duration_seconds',total_duration,'halftime_seconds',case when game.simulation_version>=2 then 12 else 0 end,
        'active_duration_seconds',half_duration*2,'first_half_seconds',half_duration,'simulation_version',game.simulation_version,'active_seconds',elapsed,'phase',phase,'halftime_remaining',case when phase='halftime' then ceil(half_duration+12-raw_seconds) else 0 end);
    end if;
  end if;
  return jsonb_build_object('server_now',v_now,'online_count',online_count,'status',coalesce(session.estado,'idle'),'queue_grl',session.grl,'match',output,'team',own_team);
end $fn$;


create or replace function public.thc_ut_online_buscar(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); v_snapshot jsonb; session public.ut_online_sesiones%rowtype;
  opponent public.ut_online_sesiones%rowtype; v_match_id uuid; begins timestamptz; half_seconds integer;
begin
  if uid is null then raise exception 'Inicia sesión para buscar un rival.' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Falta identificar la búsqueda.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  perform thc_private.ut_online_cleanup();
  select * into session from public.ut_online_sesiones where user_id=uid;
  if found and session.estado in('waiting','playing') then
    insert into thc_private.ut_online_solicitudes(user_id,request_id) values(uid,p_request_id) on conflict(user_id,request_id) do nothing;
    update public.ut_online_sesiones set last_seen=clock_timestamp() where user_id=uid;
    return thc_private.ut_online_payload(uid);
  end if;
  if exists(select 1 from thc_private.ut_online_solicitudes where user_id=uid and request_id=p_request_id) then return thc_private.ut_online_payload(uid); end if;
  v_snapshot:=thc_private.ut_online_snapshot(uid);
  insert into thc_private.ut_online_solicitudes(user_id,request_id) values(uid,p_request_id);
  insert into public.ut_online_sesiones(user_id,estado,request_id,grl,snapshot,joined_at,last_seen,match_id)
    values(uid,'waiting',p_request_id,(v_snapshot->>'grl')::smallint,v_snapshot,clock_timestamp(),clock_timestamp(),null)
    on conflict(user_id) do update set estado='waiting',request_id=excluded.request_id,grl=excluded.grl,snapshot=excluded.snapshot,joined_at=excluded.joined_at,last_seen=excluded.last_seen,match_id=null;
  select * into opponent from public.ut_online_sesiones where user_id<>uid and estado='waiting'
    and last_seen>clock_timestamp()-interval '30 seconds' and abs(grl-(v_snapshot->>'grl')::integer)<=3 order by joined_at,user_id limit 1 for update;
  if found then
    begins:=clock_timestamp()+interval '4 seconds'; half_seconds:=64+floor(random()*5)::integer;
    insert into public.ut_online_partidas(home_user,away_user,home,away,events,home_goals,away_goals,started_at,ends_at,simulation_version,home_initial_grl,away_initial_grl)
      values(opponent.user_id,uid,opponent.snapshot,v_snapshot,jsonb_build_array(jsonb_build_object('second',0,'minute',0,'side','home','type','kickoff')),0,0,
        begins,begins+(half_seconds*2+12)*interval '1 second',4,(opponent.snapshot->>'grl')::smallint,(v_snapshot->>'grl')::smallint) returning id into v_match_id;
    update public.ut_online_sesiones set estado='playing',match_id=v_match_id where user_id in(uid,opponent.user_id);
  end if;
  return thc_private.ut_online_payload(uid);
end $fn$;


create or replace function public.thc_ut_online_tactica(p_match_id uuid,p_revision integer,p_request_id uuid,p_titulares text[],p_formacion text,p_mentalidad text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); game public.ut_online_partidas%rowtype; team jsonb; side text; previous text[]; outgoing text[]; off_ids text[]; incoming integer; v_now timestamptz;
begin
  if uid is null then raise exception 'Inicia sesión para dirigir el partido.' using errcode='42501'; end if;
  if p_request_id is null or p_match_id is null or p_revision is null then raise exception 'Falta identificar el cambio táctico.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  perform thc_private.ut_online_cleanup();
  select * into game from public.ut_online_partidas where id=p_match_id for update;
  if not found or uid not in(game.home_user,game.away_user) then raise exception 'No puedes dirigir este partido.' using errcode='42501'; end if;
  if exists(select 1 from thc_private.ut_online_tactical_requests where user_id=uid and request_id=p_request_id) then
    if exists(select 1 from thc_private.ut_online_tactical_requests where user_id=uid and request_id=p_request_id and match_id=p_match_id) then return thc_private.ut_online_payload(uid); end if;
    raise exception 'Este cambio táctico pertenece a otro partido.' using errcode='22023';
  end if;
  if game.estado<>'playing' or game.simulation_version not in (2,3,4) then raise exception 'Este partido ya terminó o usa la simulación anterior.' using errcode='55000'; end if;
  v_now:=clock_timestamp(); perform thc_private.ut_online_advance(p_match_id,v_now);
  select * into game from public.ut_online_partidas where id=p_match_id;
  if game.active_seconds>=thc_private.ut_online_live_half(game)*2 then raise exception 'El partido ya terminó.' using errcode='55000'; end if;
  side:=case when uid=game.home_user then 'home' else 'away' end; team:=case when side='home' then game.home else game.away end;
  if p_revision<>(team->>'revision')::integer then raise exception 'La alineación cambió. Revisa el once y vuelve a aplicar.' using errcode='55000'; end if;
  if thc_private.ut_online_positions(p_formacion) is null or p_mentalidad is null or p_mentalidad not in('defensiva','neutral','ofensiva') or
    p_titulares is null or cardinality(p_titulares)<>11 or array_position(p_titulares,null) is not null or
    (select count(distinct value) from unnest(p_titulares) value)<>11 then raise exception 'La alineación no es válida.' using errcode='22023'; end if;
  select array_agg(value->>'id') into previous from jsonb_array_elements(team->'titulares');
  select coalesce(array_agg(value),'{}') into off_ids from jsonb_array_elements_text(team->'subbed_off');
  if exists(select 1 from unnest(p_titulares) id where id=any(off_ids) or not exists(select 1 from jsonb_array_elements(team->'roster') card where card->>'id'=id)) then
    raise exception 'Una carta no está disponible para este partido.' using errcode='22023';
  end if;
  select count(*)::integer into incoming from unnest(p_titulares) id where not(id=any(previous));
  if (team->>'substitutions')::integer+incoming>5 then raise exception 'Solo se permiten cinco cambios por partido.' using errcode='22023'; end if;
  select coalesce(array_agg(id),'{}') into outgoing from unnest(previous) id where not(id=any(p_titulares));
  team:=thc_private.ut_online_arrange(team,p_titulares,p_formacion,p_mentalidad,p_revision+1,(team->>'substitutions')::integer+incoming,off_ids||outgoing);
  update public.ut_online_partidas set home=case when side='home' then team else home end,away=case when side='away' then team else away end,
    events=events||jsonb_build_array(thc_private.ut_online_live_minute(ut_online_partidas,active_seconds)||jsonb_build_object('second',active_seconds,'side',side,'type','tactics',
      'pattern',case when incoming>0 then incoming::text||' cambio(s)' else 'Ajuste táctico' end)) where id=p_match_id;
  insert into thc_private.ut_online_tactical_requests(user_id,request_id,match_id) values(uid,p_request_id,p_match_id);
  update public.ut_online_sesiones set last_seen=clock_timestamp() where user_id=uid;
  return thc_private.ut_online_payload(uid);
end $fn$;


do $functions$ declare target record;begin
 for target in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='thc_private' and p.proname like 'ut_online_%') or (n.nspname='public' and p.proname like 'thc_ut_online_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',target.signature);end loop;
end $functions$;
grant execute on function public.thc_ut_online_estado(),public.thc_ut_online_heartbeat(),public.thc_ut_online_cancelar(uuid),public.thc_ut_online_buscar(uuid),
 public.thc_ut_online_tactica(uuid,integer,uuid,text[],text,text) to authenticated;
notify pgrst,'reload schema';
commit;
