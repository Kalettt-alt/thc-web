-- ULTIMATE TEAM · PARTIDOS DE DOS MINUTOS · 13 OCTUBRE 2026
-- Copia TODO en Supabase SQL Editor. Requiere Online v2 ya instalado.
-- Los nuevos encuentros duran 60 + 12 de descanso + 60 segundos.
-- Los partidos v1/v2 en curso conservan su reloj y resultados.
-- Conserva RLS, GRL ±3, energía, cinco cambios y peticiones idempotentes.
begin;
do $requirements$
begin
  if to_regprocedure('thc_private.ut_online_advance(uuid,timestamp with time zone)') is null then
    raise exception 'Instala primero ComandosSQL_OnlineUT.txt o ComandosSQL_ActualizacionUT.txt.';
  end if;
end $requirements$;
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_duration;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_duration;
alter table public.ut_online_partidas add constraint ut_online_v3_duration check(
  case when simulation_version=4 then extract(epoch from ends_at-started_at) in(140,142,144,146,148) else ends_at=started_at+case simulation_version when 3 then interval '132 seconds' when 2 then interval '192 seconds' else interval '180 seconds' end end);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_cursor;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_cursor;
alter table public.ut_online_partidas add constraint ut_online_v3_cursor check(
  simulation_version in (1,2,3,4) and active_seconds between 0 and case when simulation_version=4 then 136 when simulation_version=3 then 120 else 180 end);
create or replace function thc_private.ut_online_duration(p_version integer)
returns integer language sql immutable set search_path='' as $fn$
  select case when p_version>=3 then 120 else 180 end;
$fn$;

create or replace function thc_private.ut_online_elapsed(p_start timestamptz,p_now timestamptz,p_version integer)
returns integer language sql immutable set search_path='' as $fn$
  select greatest(0,least(thc_private.ut_online_duration(p_version),
    case when p_version<2 then floor(extract(epoch from p_now-p_start))::integer
      when p_now<p_start+(thc_private.ut_online_duration(p_version)/2)*interval '1 second' then floor(extract(epoch from p_now-p_start))::integer
      when p_now<p_start+(thc_private.ut_online_duration(p_version)/2+12)*interval '1 second' then thc_private.ut_online_duration(p_version)/2
      else floor(extract(epoch from p_now-p_start))::integer-12 end));
$fn$;

create or replace function thc_private.ut_online_fatigue_duration(p_team jsonb,p_seconds integer,p_duration integer)
returns jsonb language plpgsql immutable set search_path='' as $fn$
declare roster jsonb:='[]'; card jsonb; ids text[]; off_ids text[];
begin
  select array_agg(value->>'id' order by ordinality) into ids from jsonb_array_elements(p_team->'titulares') with ordinality;
  for card in select value from jsonb_array_elements(p_team->'roster') loop
    if card->>'id'=any(ids) then
      card:=card||jsonb_build_object('stamina',greatest(least((card->>'initial_stamina')::numeric,40),
        (card->>'initial_stamina')::numeric-((card->>'played_seconds')::integer+p_seconds)/p_duration::numeric*(18+(100-(card->>'base_grl')::integer)*.08)),
        'played_seconds',(card->>'played_seconds')::integer+p_seconds);
    end if;
    roster:=roster||jsonb_build_array(card);
  end loop;
  select coalesce(array_agg(value),'{}') into off_ids from jsonb_array_elements_text(p_team->'subbed_off');
  return thc_private.ut_online_arrange(p_team||jsonb_build_object('roster',roster),ids,p_team->>'formacion',p_team->>'mentalidad',
    (p_team->>'revision')::integer,(p_team->>'substitutions')::integer,off_ids);
end $fn$;

create or replace function thc_private.ut_online_advance(p_match uuid,p_now timestamptz)
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

create or replace function thc_private.ut_online_cleanup()
returns void language plpgsql security definer set search_path='' as $fn$
declare game public.ut_online_partidas%rowtype; side jsonb; player jsonb; target uuid; v_now timestamptz:=clock_timestamp(); final_energy numeric;
begin
  update public.ut_online_sesiones set estado='idle',snapshot='{}',grl=null,match_id=null
    where estado='waiting' and last_seen<=v_now-interval '30 seconds';
  for game in select * from public.ut_online_partidas where estado='playing' and ends_at<=v_now order by id for update loop
    perform thc_private.ut_online_advance(game.id,v_now);
    select * into game from public.ut_online_partidas where id=game.id;
    for side in select value from jsonb_array_elements(jsonb_build_array(game.home,game.away)) loop
      target:=(side->>'id')::uuid;
      for player in select value from jsonb_array_elements(case when game.simulation_version>=2 then side->'roster' else side->'titulares' end) loop
        if game.simulation_version>=2 and coalesce((player->>'played_seconds')::integer,0)=0 then continue; end if;
        final_energy:=case when game.simulation_version>=2 then (player->>'stamina')::numeric
          else greatest(40,(player->>'stamina')::numeric-(18+(100-coalesce(player->>'base_grl',player->>'grl')::numeric)*.08)) end;
        insert into public.ut_online_energia(user_id,player_id,stamina,actualizado_en)
          values(target,player->>'id',round(final_energy,3),game.ends_at)
          on conflict(user_id,player_id) do update set stamina=excluded.stamina,actualizado_en=excluded.actualizado_en;
      end loop;
    end loop;
    update public.ut_online_partidas set estado='finished',finished_at=game.ends_at where id=game.id;
    update public.ut_online_sesiones set estado='finished' where match_id=game.id and estado='playing';
  end loop;
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
      elapsed:=thc_private.ut_online_elapsed(game.started_at,v_now,game.simulation_version);
      raw_seconds:=extract(epoch from v_now-game.started_at);
      total_duration:=thc_private.ut_online_duration(game.simulation_version); half_duration:=total_duration/2;
      phase:=case when raw_seconds<0 then 'pre' when elapsed>=total_duration then 'finished' when raw_seconds<half_duration then 'first'
        when game.simulation_version>=2 and raw_seconds<half_duration+12 then 'halftime' else 'second' end;
      select coalesce(jsonb_agg(value order by (value->>'second')::integer,ordinality),'[]') into visible
        from jsonb_array_elements(game.events) with ordinality where (value->>'second')::integer<=elapsed;
      select count(*) filter(where value->>'type'='goal' and value->>'side'='home')::integer,
        count(*) filter(where value->>'type'='goal' and value->>'side'='away')::integer into home_score,away_score from jsonb_array_elements(visible);
      output:=jsonb_build_object('id',game.id,'home',game.home,'away',game.away,'started_at',game.started_at,'ends_at',game.ends_at,
        'events',visible,'home_goals',home_score,'away_goals',away_score,'duration_seconds',total_duration,'halftime_seconds',case when game.simulation_version>=2 then 12 else 0 end,
        'simulation_version',game.simulation_version,'active_seconds',elapsed,'phase',phase,'halftime_remaining',case when phase='halftime' then ceil(half_duration+12-raw_seconds) else 0 end);
    end if;
  end if;
  return jsonb_build_object('server_now',v_now,'online_count',online_count,'status',coalesce(session.estado,'idle'),'queue_grl',session.grl,'match',output,'team',own_team);
end $fn$;

create or replace function public.thc_ut_online_buscar(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); v_snapshot jsonb; session public.ut_online_sesiones%rowtype;
  opponent public.ut_online_sesiones%rowtype; v_match_id uuid; begins timestamptz;
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
    begins:=clock_timestamp()+interval '4 seconds';
    insert into public.ut_online_partidas(home_user,away_user,home,away,events,home_goals,away_goals,started_at,ends_at,simulation_version,home_initial_grl,away_initial_grl)
      values(opponent.user_id,uid,opponent.snapshot,v_snapshot,jsonb_build_array(jsonb_build_object('second',0,'minute',0,'side','home','type','kickoff')),0,0,
        begins,begins+interval '132 seconds',3,(opponent.snapshot->>'grl')::smallint,(v_snapshot->>'grl')::smallint) returning id into v_match_id;
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
  if game.estado<>'playing' or game.simulation_version not in (2,3) then raise exception 'Este partido ya terminó o usa la simulación anterior.' using errcode='55000'; end if;
  v_now:=clock_timestamp(); perform thc_private.ut_online_advance(p_match_id,v_now);
  select * into game from public.ut_online_partidas where id=p_match_id;
  if game.active_seconds>=thc_private.ut_online_duration(game.simulation_version) then raise exception 'El partido ya terminó.' using errcode='55000'; end if;
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
    events=events||jsonb_build_array(jsonb_build_object('second',active_seconds,'minute',floor(active_seconds*90.0/thc_private.ut_online_duration(simulation_version)),'side',side,'type','tactics',
      'pattern',case when incoming>0 then incoming::text||' cambio(s)' else 'Ajuste táctico' end)) where id=p_match_id;
  insert into thc_private.ut_online_tactical_requests(user_id,request_id,match_id) values(uid,p_request_id,p_match_id);
  update public.ut_online_sesiones set last_seen=clock_timestamp() where user_id=uid;
  return thc_private.ut_online_payload(uid);
end $fn$;

do $functions$
declare target record;
begin
  for target in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='thc_private' and p.proname like 'ut_online_%') or (n.nspname='public' and p.proname like 'thc_ut_online_%') loop
    execute format('revoke all on function %s from public,anon,authenticated',target.signature);
  end loop;
end $functions$;
grant execute on function public.thc_ut_online_estado(),public.thc_ut_online_heartbeat(),public.thc_ut_online_cancelar(uuid),public.thc_ut_online_buscar(uuid),
  public.thc_ut_online_tactica(uuid,integer,uuid,text[],text,text) to authenticated;
notify pgrst,'reload schema';
commit;
