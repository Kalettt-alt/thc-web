begin;

do $prerequisites$
begin
  if to_regclass('public.ut_cartas') is null or to_regclass('public.ut_cartas_club') is null
    or to_regclass('thc_private.ut_jugadores_base') is null
    or to_regprocedure('public.thc_ut_guardar_plantilla(jsonb)') is null then
    raise exception 'Ejecuta primero ComandosSQL_UltimateTeam.txt y su actualización de cartas.';
  end if;
end $prerequisites$;

create schema if not exists thc_private;
revoke all on schema thc_private from public,anon,authenticated;

create table if not exists public.ut_online_partidas (
  id uuid primary key default gen_random_uuid(),
  home_user uuid not null references auth.users(id) on delete cascade,
  away_user uuid not null references auth.users(id) on delete cascade,
  home jsonb not null,
  away jsonb not null,
  events jsonb not null,
  home_goals smallint not null check(home_goals between 0 and 6),
  away_goals smallint not null check(away_goals between 0 and 6),
  estado text not null default 'playing' check(estado in ('playing','finished')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  finished_at timestamptz,
  check(home_user<>away_user),
  check(ends_at=started_at+interval '180 seconds'),
  check(abs((home->>'grl')::integer-(away->>'grl')::integer)<=3)
);
create table if not exists public.ut_online_sesiones (
  user_id uuid primary key references auth.users(id) on delete cascade,
  estado text not null check(estado in ('idle','waiting','playing','finished')),
  request_id uuid,
  grl smallint check(grl between 0 and 99),
  snapshot jsonb not null default '{}',
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  match_id uuid references public.ut_online_partidas(id) on delete set null
);
create table if not exists public.ut_online_energia (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id text not null,
  stamina numeric not null default 100 check(stamina between 0 and 100),
  actualizado_en timestamptz not null default now(),
  primary key(user_id,player_id)
);
create table if not exists thc_private.ut_online_solicitudes (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  creado_en timestamptz not null default now(),
  primary key(user_id,request_id)
);
create index if not exists ut_online_cola_grl on public.ut_online_sesiones(estado,grl,joined_at);
create index if not exists ut_online_partidas_finalizar on public.ut_online_partidas(ends_at) where estado='playing';
create index if not exists ut_online_partidas_home on public.ut_online_partidas(home_user,started_at);
create index if not exists ut_online_partidas_away on public.ut_online_partidas(away_user,started_at);
alter table thc_private.ut_online_solicitudes enable row level security;
revoke all on thc_private.ut_online_solicitudes from public,anon,authenticated;

do $permissions$
declare target text; cols text;
begin
  foreach target in array array['ut_online_partidas','ut_online_sesiones','ut_online_energia'] loop
    execute format('alter table public.%I enable row level security',target);
    execute format('revoke all on public.%I from public,anon,authenticated',target);
    select string_agg(quote_ident(attname),',') into cols from pg_attribute
      where attrelid=format('public.%I',target)::regclass and attnum>0 and not attisdropped;
    execute format('revoke select (%s),insert (%s),update (%s),references (%s) on public.%I from public,anon,authenticated',cols,cols,cols,cols,target);
    execute format('drop policy if exists thc_ut_online_read on public.%I',target);
    execute format('drop policy if exists thc_ut_online_boundary on public.%I',target);
    if target='ut_online_partidas' then
      execute format('create policy thc_ut_online_read on public.%I for select to authenticated using ((select auth.uid()) in (home_user,away_user))',target);
      execute format('create policy thc_ut_online_boundary on public.%I as restrictive for all to public using ((select auth.uid()) in (home_user,away_user)) with check (false)',target);
    else
      execute format('create policy thc_ut_online_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',target);
      execute format('create policy thc_ut_online_boundary on public.%I as restrictive for all to public using ((select auth.uid())=user_id) with check (false)',target);
    end if;
  end loop;
end $permissions$;
grant select(id,home_user,away_user,estado,started_at,ends_at,finished_at) on public.ut_online_partidas to authenticated;
grant select on public.ut_online_sesiones,public.ut_online_energia to authenticated;

create or replace function thc_private.ut_online_canonical(p_user uuid,p_id text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare output jsonb; card public.ut_cartas%rowtype; copy_id uuid;
begin
  if p_id ~ '^p([1-9]|1[0-9]|2[0-3])$' then
    select datos into output from thc_private.ut_jugadores_base where id=p_id;
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

create or replace function thc_private.ut_online_positions(p_formacion text)
returns text[] language sql immutable set search_path='' as $fn$
  select case p_formacion
    when '4-3-3' then array['LW','ST','RW','CM','CAM','CM','LB','CB','CB','RB','GK']
    when '4-4-2' then array['ST','ST','LM','CM','CM','RM','LB','CB','CB','RB','GK']
    when '4-2-3-1' then array['ST','LM','CAM','RM','CDM','CDM','LB','CB','CB','RB','GK']
    else null end;
$fn$;

alter table public.plantillas_ut add column if not exists version_posiciones smallint not null default 0;

create or replace function thc_private.ut_online_squad_guard()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare positions text[]; player jsonb; card jsonb; i integer:=0; v_now timestamptz:=clock_timestamp();
begin
  new.version_posiciones:=1;
  positions:=thc_private.ut_online_positions(new.formacion);
  if positions is null or jsonb_typeof(new.titulares) is distinct from 'array' or jsonb_array_length(new.titulares)>11 then
    raise exception 'La alineación no es válida.' using errcode='22023';
  end if;
  for player in select value from jsonb_array_elements(new.titulares) loop
    i:=i+1;
    if player='null'::jsonb then continue; end if;
    card:=thc_private.ut_online_canonical(new.user_id,player->>'id');
    if card is null then raise exception 'Una carta no pertenece al club.' using errcode='42501'; end if;
  end loop;
  if exists(select 1 from public.ut_online_sesiones s left join public.ut_online_partidas m on m.id=s.match_id where s.user_id=new.user_id
    and ((s.estado='waiting' and s.last_seen>v_now-interval '30 seconds') or (s.estado='playing' and m.ends_at>v_now))) then
    raise exception 'Cancela la búsqueda o termina el partido antes de cambiar la plantilla.' using errcode='55000';
  end if;
  return new;
end $fn$;
drop trigger if exists thc_ut_online_squad_guard on public.plantillas_ut;
create trigger thc_ut_online_squad_guard before insert or update of titulares,formacion on public.plantillas_ut
for each row execute function thc_private.ut_online_squad_guard();

create or replace function thc_private.ut_online_position_penalty(p_player jsonb,p_target text)
returns integer language plpgsql immutable set search_path='' as $fn$
declare source text:=p_player->>'pos'; source_family text; target_family text;
begin
  if source=p_target or coalesce(p_player->'posiciones_secundarias' @> to_jsonb(array[p_target]),false) then return 0; end if;
  if source='GK' or p_target='GK' then return 40; end if;
  source_family:=case when source in ('CB','LB','RB','LWB','RWB') then 'DEF' when source in ('CM','CDM','CAM') then 'MID'
    when source in ('ST','CF') then 'ATT' when source in ('LW','RW','LM','RM') then 'WIDE' else null end;
  target_family:=case when p_target in ('CB','LB','RB','LWB','RWB') then 'DEF' when p_target in ('CM','CDM','CAM') then 'MID'
    when p_target in ('ST','CF') then 'ATT' when p_target in ('LW','RW','LM','RM') then 'WIDE' else null end;
  if (source in ('LW','LM') and p_target in ('LW','LM')) or (source in ('RW','RM') and p_target in ('RW','RM')) then return 2; end if;
  if source_family='WIDE' and target_family='WIDE' then return 6; end if;
  if source_family=target_family then
    if source_family='DEF' and ((source in ('LB','LWB') and p_target in ('RB','RWB')) or (source in ('RB','RWB') and p_target in ('LB','LWB'))) then return 6; end if;
    return 3;
  end if;
  if (source_family='DEF' and target_family in ('ATT','WIDE')) or (target_family='DEF' and source_family in ('ATT','WIDE')) then return 18; end if;
  if (source_family='DEF' and target_family='MID') or (source_family='MID' and target_family='DEF') then return 10; end if;
  if (source_family='MID' and target_family='ATT') or (source_family='ATT' and target_family='MID') then return 9; end if;
  if (source_family='MID' and target_family='WIDE') or (source_family='WIDE' and target_family='MID') then return 6; end if;
  if (source_family='WIDE' and target_family='ATT') or (source_family='ATT' and target_family='WIDE') then return 5; end if;
  return 18;
end $fn$;

create or replace function thc_private.ut_online_snapshot(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare club public.equipos_ut%rowtype; squad public.plantillas_ut%rowtype; positions text[]; player jsonb; card jsonb;
  output jsonb:='[]'; seen text[]:='{}'; i integer:=0; rating numeric:=0; penalty integer; base_rating integer; energy numeric; total_energy numeric:=0; v_now timestamptz:=clock_timestamp();
begin
  select * into club from public.equipos_ut where user_id=p_user;
  if not found then raise exception 'Crea tu club antes de buscar un rival.' using errcode='22023'; end if;
  select * into squad from public.plantillas_ut where user_id=p_user;
  if not found then raise exception 'Guarda tu plantilla antes de buscar un rival.' using errcode='22023'; end if;
  positions:=thc_private.ut_online_positions(squad.formacion);
  if positions is null or jsonb_typeof(squad.titulares) is distinct from 'array' or jsonb_array_length(squad.titulares)<>11 then
    raise exception 'Completa y guarda los once puestos antes de jugar online.' using errcode='22023';
  end if;
  for player in select value from jsonb_array_elements(squad.titulares) loop
    i:=i+1;
    card:=thc_private.ut_online_canonical(p_user,player->>'id');
    if card is null or card->>'id'=any(seen) then raise exception 'La plantilla tiene un puesto vacío o una copia no válida.' using errcode='22023'; end if;
    seen:=array_append(seen,card->>'id');
    penalty:=thc_private.ut_online_position_penalty(card,positions[i]);
    base_rating:=(card->>'grl')::integer;
    select least(100,stamina+greatest(0,extract(epoch from v_now-actualizado_en))/3600*12) into energy
      from public.ut_online_energia where user_id=p_user and player_id=card->>'id';
    energy:=coalesce(energy,100);
    card:=card||jsonb_build_object('stamina',round(energy,1),'puesto',positions[i],'base_grl',base_rating,
      'grl',greatest(0,least(99,base_rating-penalty)),'penalizacion_grl',penalty);
    output:=output||jsonb_build_array(card); rating:=rating+(card->>'grl')::numeric; total_energy:=total_energy+energy;
  end loop;
  return jsonb_build_object('id',p_user,'nombre',club.nombre,'abreviatura',club.abreviatura,'logo_url',club.logo_url,
    'grl',round(rating/11),'stamina',round(total_energy/11,1),'titulares',output,'formacion',squad.formacion);
end $fn$;

create or replace function thc_private.ut_online_timeline(p_home jsonb,p_away jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare output jsonb:='[]'; side text; team jsonb; rival jsonb; i integer; tick integer; chance numeric; outcome numeric;
  event_type text; goals integer; player text; keeper text; home_effective numeric; away_effective numeric;
begin
  home_effective:=(p_home->>'grl')::numeric*(.65+.35*(p_home->>'stamina')::numeric/100);
  away_effective:=(p_away->>'grl')::numeric*(.65+.35*(p_away->>'stamina')::numeric/100);
  output:=jsonb_build_array(jsonb_build_object('second',0,'side','home','type','kickoff','minute',0),
    jsonb_build_object('second',90,'side','away','type','halftime','minute',45),
    jsonb_build_object('second',93,'side','away','type','kickoff','minute',46),
    jsonb_build_object('second',180,'side','home','type','fulltime','minute',90));
  foreach side in array array['home','away'] loop
    team:=case when side='home' then p_home else p_away end;
    rival:=case when side='home' then p_away else p_home end;
    select value->>'nombre' into keeper from jsonb_array_elements(rival->'titulares') where value->>'puesto'='GK' limit 1;
    chance:=greatest(.08,least(.30,.18+(case when side='home' then home_effective-away_effective else away_effective-home_effective end)*.007));
    goals:=0;
    for i in 0..6 loop
      tick:=8+i*23+floor(random()*12)::integer;
      select value->>'nombre' into player from jsonb_array_elements(team->'titulares')
        where value->>'puesto' in ('ST','CF','LW','RW','LM','RM','CAM','CM') order by random() limit 1;
      player:=coalesce(player,team->'titulares'->0->>'nombre');
      output:=output||jsonb_build_array(jsonb_build_object('second',tick-5,'side',side,'type','pass','minute',floor((tick-5)/2.0),'player',player));
      outcome:=random();
      event_type:=case when outcome<chance and goals<6 then 'goal' when outcome<chance+.34 then 'save' when outcome<chance+.43 then 'post' else 'shot' end;
      if event_type='goal' then goals:=goals+1; end if;
      output:=output||jsonb_build_array(jsonb_build_object('second',tick,'side',side,'type',event_type,'minute',floor(tick/2.0),
        'player',case when event_type='save' then coalesce(keeper,'Arquero rival') else player end,'shooter',player));
      if event_type='goal' then output:=output||jsonb_build_array(jsonb_build_object('second',tick+2,'side',case when side='home' then 'away' else 'home' end,'type','kickoff','minute',floor((tick+2)/2.0))); end if;
    end loop;
  end loop;
  select jsonb_agg(value order by (value->>'second')::integer,value->>'side',value->>'type') into output from jsonb_array_elements(output);
  return output;
end $fn$;

create or replace function thc_private.ut_online_cleanup()
returns void language plpgsql security definer set search_path='' as $fn$
declare game public.ut_online_partidas%rowtype; side jsonb; player jsonb; target uuid; v_now timestamptz:=clock_timestamp(); final_energy numeric;
begin
  update public.ut_online_sesiones set estado='idle',snapshot='{}',grl=null,match_id=null
    where estado='waiting' and last_seen<=v_now-interval '30 seconds';
  for game in select * from public.ut_online_partidas where estado='playing' and ends_at<=v_now for update loop
    for side in select value from jsonb_array_elements(jsonb_build_array(game.home,game.away)) loop
      target:=(side->>'id')::uuid;
      for player in select value from jsonb_array_elements(side->'titulares') loop
        final_energy:=greatest(40,(player->>'stamina')::numeric-(18+(100-coalesce(player->>'base_grl',player->>'grl')::numeric)*.08));
        insert into public.ut_online_energia(user_id,player_id,stamina,actualizado_en)
          values(target,player->>'id',round(final_energy,1),game.ends_at)
          on conflict(user_id,player_id) do update set stamina=excluded.stamina,actualizado_en=excluded.actualizado_en;
      end loop;
    end loop;
    update public.ut_online_partidas set estado='finished',finished_at=game.ends_at where id=game.id;
    update public.ut_online_sesiones set estado='finished' where match_id=game.id and estado='playing';
  end loop;
end $fn$;

create or replace function thc_private.ut_online_payload(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare session public.ut_online_sesiones%rowtype; game public.ut_online_partidas%rowtype;
  v_now timestamptz:=clock_timestamp(); elapsed integer; visible jsonb; output jsonb:=null; own_team jsonb; online_count integer; home_score integer; away_score integer;
begin
  select * into session from public.ut_online_sesiones where user_id=p_user;
  select count(*)::integer into online_count from public.ut_online_sesiones
    where estado in ('waiting','playing') and last_seen>v_now-interval '30 seconds';
  begin
    own_team:=thc_private.ut_online_snapshot(p_user);
  exception when sqlstate '22023' then own_team:=null;
  end;
  if session.match_id is not null then
    select * into game from public.ut_online_partidas where id=session.match_id and p_user in (home_user,away_user);
    if found then
      elapsed:=greatest(0,least(180,floor(extract(epoch from v_now-game.started_at))::integer));
      select coalesce(jsonb_agg(value order by (value->>'second')::integer,value->>'side',value->>'type'),'[]') into visible
        from jsonb_array_elements(game.events) where (value->>'second')::integer<=elapsed;
      select count(*) filter(where value->>'type'='goal' and value->>'side'='home')::integer,
        count(*) filter(where value->>'type'='goal' and value->>'side'='away')::integer into home_score,away_score from jsonb_array_elements(visible);
      output:=jsonb_build_object('id',game.id,'home',game.home,'away',game.away,'started_at',game.started_at,'ends_at',game.ends_at,
        'events',visible,'home_goals',home_score,'away_goals',away_score,'duration_seconds',180);
    end if;
  end if;
  return jsonb_build_object('server_now',v_now,'online_count',online_count,'status',coalesce(session.estado,'idle'),
    'queue_grl',session.grl,'match',output,'team',own_team);
end $fn$;

create or replace function public.thc_ut_online_estado()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión para entrar a Online UT.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  perform thc_private.ut_online_cleanup();
  update public.ut_online_sesiones set last_seen=clock_timestamp() where user_id=uid and estado in ('waiting','playing');
  return thc_private.ut_online_payload(uid);
end $fn$;

create or replace function public.thc_ut_online_heartbeat()
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin return public.thc_ut_online_estado(); end $fn$;

drop function if exists public.thc_ut_online_cancelar();
create or replace function public.thc_ut_online_cancelar(p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Inicia sesión para cancelar la búsqueda.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  if p_request_id is not null then
    insert into thc_private.ut_online_solicitudes(user_id,request_id) values(uid,p_request_id) on conflict(user_id,request_id) do nothing;
  end if;
  perform thc_private.ut_online_cleanup();
  update public.ut_online_sesiones set estado='idle',snapshot='{}',grl=null,match_id=null where user_id=uid and estado='waiting';
  return thc_private.ut_online_payload(uid);
end $fn$;

create or replace function public.thc_ut_online_buscar(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); v_snapshot jsonb; session public.ut_online_sesiones%rowtype;
  opponent public.ut_online_sesiones%rowtype; timeline jsonb; v_match_id uuid; begins timestamptz;
  home_score integer; away_score integer;
begin
  if uid is null then raise exception 'Inicia sesión para buscar un rival.' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Falta identificar la búsqueda.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  perform thc_private.ut_online_cleanup();
  select * into session from public.ut_online_sesiones where user_id=uid;
  if found and session.estado in ('waiting','playing') then
    insert into thc_private.ut_online_solicitudes(user_id,request_id) values(uid,p_request_id) on conflict(user_id,request_id) do nothing;
    update public.ut_online_sesiones set last_seen=clock_timestamp() where user_id=uid;
    return thc_private.ut_online_payload(uid);
  end if;
  if exists(select 1 from thc_private.ut_online_solicitudes where user_id=uid and request_id=p_request_id) then
    return thc_private.ut_online_payload(uid);
  end if;
  v_snapshot:=thc_private.ut_online_snapshot(uid);
  insert into thc_private.ut_online_solicitudes(user_id,request_id) values(uid,p_request_id);
  insert into public.ut_online_sesiones(user_id,estado,request_id,grl,snapshot,joined_at,last_seen,match_id)
    values(uid,'waiting',p_request_id,(v_snapshot->>'grl')::smallint,v_snapshot,clock_timestamp(),clock_timestamp(),null)
    on conflict(user_id) do update set estado='waiting',request_id=excluded.request_id,grl=excluded.grl,snapshot=excluded.snapshot,
      joined_at=excluded.joined_at,last_seen=excluded.last_seen,match_id=null;
  select * into opponent from public.ut_online_sesiones where user_id<>uid and estado='waiting'
    and last_seen>clock_timestamp()-interval '30 seconds' and abs(grl-(v_snapshot->>'grl')::integer)<=3
    order by joined_at,user_id limit 1 for update;
  if found then
    timeline:=thc_private.ut_online_timeline(opponent.snapshot,v_snapshot);
    select count(*) filter(where value->>'type'='goal' and value->>'side'='home')::integer,
      count(*) filter(where value->>'type'='goal' and value->>'side'='away')::integer into home_score,away_score from jsonb_array_elements(timeline);
    begins:=clock_timestamp()+interval '4 seconds';
    insert into public.ut_online_partidas(home_user,away_user,home,away,events,home_goals,away_goals,started_at,ends_at)
      values(opponent.user_id,uid,opponent.snapshot,v_snapshot,timeline,home_score,away_score,begins,begins+interval '180 seconds') returning id into v_match_id;
    update public.ut_online_sesiones set estado='playing',match_id=v_match_id where user_id in (uid,opponent.user_id);
  end if;
  return thc_private.ut_online_payload(uid);
end $fn$;

create or replace function public.thc_ut_reset()
returns uuid language plpgsql security definer set search_path='' as $fn$
declare uid uuid:=auth.uid(); v_now timestamptz:=clock_timestamp();
begin
  if uid is null then raise exception 'Inicia sesión para eliminar tu club.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-online-matchmaking-v1',0));
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  perform thc_private.ut_online_cleanup();
  if exists(select 1 from public.ut_online_partidas where uid in (home_user,away_user) and estado='playing' and ends_at>v_now) then
    raise exception 'Termina el partido online antes de eliminar tu club.' using errcode='55000';
  end if;
  if not exists(select 1 from public.perfiles_ut where user_id=uid) then
    raise exception 'No se encontró el registro del club.' using errcode='P0002';
  end if;
  update public.ut_online_sesiones set estado='idle',snapshot='{}',grl=null,match_id=null,last_seen=clock_timestamp() where user_id=uid;
  delete from public.club_ut where user_id=uid;
  delete from public.plantillas_ut where user_id=uid;
  delete from public."PlaylistUT" where user_id=uid;
  delete from public.equipos_ut where user_id=uid;
  delete from public.perfiles_ut where user_id=uid;
  return uid;
end $fn$;
revoke all on function public.thc_ut_reset() from public,anon,authenticated;
grant execute on function public.thc_ut_reset() to authenticated;

do $functions$
declare target record;
begin
  for target in select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='thc_private' and p.proname like 'ut_online_%') or (n.nspname='public' and p.proname like 'thc_ut_online_%') loop
    execute format('revoke all on function %s from public,anon,authenticated',target.signature);
  end loop;
end $functions$;
grant execute on function public.thc_ut_online_estado(),public.thc_ut_online_heartbeat(),public.thc_ut_online_cancelar(uuid),public.thc_ut_online_buscar(uuid) to authenticated;
notify pgrst,'reload schema';

-- BEGIN UT SIMULATION V2
-- UT: dos tiempos de 90 s activos y descanso fijo de 12 s.
-- Ejecuta después de Online UT v1. No modifica cuentas, apodos, saldos ni sobres.


do $requirements$
begin
  if to_regclass('public.ut_online_partidas') is null or to_regprocedure('thc_private.ut_online_canonical(uuid,text)') is null then
    raise exception 'Ejecuta primero ComandosSQL_OnlineUT.txt o ComandosSQL_ActualizacionUT.txt.';
  end if;
end $requirements$;

alter table public.ut_online_partidas add column if not exists simulation_version smallint not null default 1;
alter table public.ut_online_partidas add column if not exists active_seconds smallint not null default 0;
alter table public.ut_online_partidas add column if not exists simulation_seed uuid not null default gen_random_uuid();
alter table public.ut_online_partidas add column if not exists home_initial_grl smallint;
alter table public.ut_online_partidas add column if not exists away_initial_grl smallint;
update public.ut_online_partidas set home_initial_grl=(home->>'grl')::smallint,away_initial_grl=(away->>'grl')::smallint
  where home_initial_grl is null or away_initial_grl is null;
alter table public.ut_online_partidas alter column home_initial_grl set not null;
alter table public.ut_online_partidas alter column away_initial_grl set not null;

-- La igualdad se comprueba al emparejar, no después de una sustitución táctica.
do $constraints$
declare item record;
begin
  for item in select conname,pg_get_constraintdef(oid) as definition from pg_constraint
    where conrelid='public.ut_online_partidas'::regclass and contype='c' loop
    if item.definition like '%ends_at%started_at%' or item.definition like '%abs(%home%away%' then
      execute format('alter table public.ut_online_partidas drop constraint %I',item.conname);
    end if;
  end loop;
end $constraints$;
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_duration;
alter table public.ut_online_partidas add constraint ut_online_v2_duration
  check(ends_at=started_at+case when simulation_version=3 then interval '132 seconds' when simulation_version=2 then interval '192 seconds' else interval '180 seconds' end);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_matching;
alter table public.ut_online_partidas add constraint ut_online_v2_matching
  check(home_initial_grl between 0 and 99 and away_initial_grl between 0 and 99 and abs(home_initial_grl-away_initial_grl)<=3);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_cursor;
alter table public.ut_online_partidas add constraint ut_online_v2_cursor check(active_seconds between 0 and case when simulation_version=3 then 120 else 180 end and simulation_version in (1,2,3));

create table if not exists thc_private.ut_online_tactical_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  match_id uuid not null references public.ut_online_partidas(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key(user_id,request_id)
);
alter table thc_private.ut_online_tactical_requests enable row level security;
revoke all on thc_private.ut_online_tactical_requests from public,anon,authenticated;
-- Las columnas nuevas contienen estado interno: no se exponen por REST directo.
revoke select(simulation_version,active_seconds,simulation_seed,home_initial_grl,away_initial_grl),
  insert(simulation_version,active_seconds,simulation_seed,home_initial_grl,away_initial_grl),
  update(simulation_version,active_seconds,simulation_seed,home_initial_grl,away_initial_grl)
  on public.ut_online_partidas from public,anon,authenticated;

create or replace function thc_private.ut_online_elapsed(p_start timestamptz,p_now timestamptz,p_version integer)
returns integer language sql immutable set search_path='' as $fn$
  select greatest(0,least(180,case when p_version<>2 then floor(extract(epoch from p_now-p_start))::integer
    when p_now<p_start+interval '90 seconds' then floor(extract(epoch from p_now-p_start))::integer
    when p_now<p_start+interval '102 seconds' then 90
    else floor(extract(epoch from p_now-p_start))::integer-12 end));
$fn$;

create or replace function thc_private.ut_online_random(p_seed uuid,p_second integer,p_side text,p_tag text)
returns numeric language sql immutable set search_path='' as $fn$
  select (('x'||substring(md5(p_seed::text||':'||p_second::text||':'||p_side||':'||p_tag) from 1 for 8))::bit(32)::bigint)::numeric/4294967296;
$fn$;

create or replace function thc_private.ut_online_arrange(p_team jsonb,p_ids text[],p_formation text,p_mentality text,p_revision integer,p_subs integer,p_off text[])
returns jsonb language plpgsql immutable set search_path='' as $fn$
declare roles text[]; card jsonb; players jsonb:='[]'; bench jsonb; i integer; penalty integer; total_grl numeric:=0; total_energy numeric:=0;
begin
  roles:=thc_private.ut_online_positions(p_formation);
  if roles is null or cardinality(p_ids)<>11 or p_mentality not in ('defensiva','neutral','ofensiva') then
    raise exception 'La alineación no es válida.' using errcode='22023';
  end if;
  for i in 1..11 loop
    select value into card from jsonb_array_elements(p_team->'roster') where value->>'id'=p_ids[i];
    if card is null then raise exception 'Una carta no está disponible para este partido.' using errcode='22023'; end if;
    penalty:=thc_private.ut_online_position_penalty(card,roles[i]);
    card:=card||jsonb_build_object('puesto',roles[i],'grl',greatest(0,(card->>'base_grl')::integer-penalty),'penalizacion_grl',penalty);
    players:=players||jsonb_build_array(card); total_grl:=total_grl+(card->>'grl')::numeric; total_energy:=total_energy+(card->>'stamina')::numeric;
  end loop;
  select coalesce(jsonb_agg(value),'[]') into bench from jsonb_array_elements(p_team->'roster')
    where not(value->>'id'=any(p_ids)) and not(value->>'id'=any(p_off));
  return p_team||jsonb_build_object('titulares',players,'bench',bench,'formacion',p_formation,'mentalidad',p_mentality,
    'revision',p_revision,'substitutions',p_subs,'subbed_off',to_jsonb(p_off),'grl',round(total_grl/11),'stamina',round(total_energy/11,1));
end $fn$;

create or replace function thc_private.ut_online_snapshot(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare club public.equipos_ut%rowtype; squad public.plantillas_ut%rowtype; roles text[]; raw jsonb; card jsonb;
  roster jsonb:='[]'; seen text[]:='{}'; ids text[]:='{}'; energy numeric; v_now timestamptz:=clock_timestamp(); i integer:=0;
begin
  select * into club from public.equipos_ut where user_id=p_user;
  if not found then raise exception 'Crea tu club antes de buscar un rival.' using errcode='22023'; end if;
  select * into squad from public.plantillas_ut where user_id=p_user;
  if not found then raise exception 'Guarda tu plantilla antes de buscar un rival.' using errcode='22023'; end if;
  roles:=thc_private.ut_online_positions(squad.formacion);
  if roles is null or jsonb_typeof(squad.titulares) is distinct from 'array' or jsonb_array_length(squad.titulares)<>11 then
    raise exception 'Completa y guarda los once puestos antes de jugar online.' using errcode='22023';
  end if;
  for raw in select value from jsonb_array_elements(squad.titulares||coalesce(squad.suplentes,'[]')) loop
    i:=i+1; if i>18 then exit; end if;
    if i>11 and raw='null'::jsonb then continue; end if;
    card:=thc_private.ut_online_canonical(p_user,raw->>'id');
    if card is null or card->>'id'=any(seen) then raise exception 'La plantilla tiene un puesto vacío o una copia no válida.' using errcode='22023'; end if;
    seen:=array_append(seen,card->>'id'); if i<=11 then ids:=array_append(ids,card->>'id'); end if;
    select least(100,stamina+greatest(0,extract(epoch from v_now-actualizado_en))/3600*12) into energy
      from public.ut_online_energia where user_id=p_user and player_id=card->>'id';
    roster:=roster||jsonb_build_array(card||jsonb_build_object('base_grl',(card->>'grl')::integer,'stamina',round(coalesce(energy,100),3),'initial_stamina',round(coalesce(energy,100),3),'played_seconds',0));
  end loop;
  return thc_private.ut_online_arrange(jsonb_build_object('id',p_user,'nombre',club.nombre,'abreviatura',club.abreviatura,'logo_url',club.logo_url,'roster',roster),
    ids,squad.formacion,'neutral',0,0,'{}');
end $fn$;

create or replace function thc_private.ut_online_fatigue(p_team jsonb,p_seconds integer)
returns jsonb language plpgsql immutable set search_path='' as $fn$
declare roster jsonb:='[]'; card jsonb; ids text[]; off_ids text[];
begin
  select array_agg(value->>'id' order by ordinality) into ids from jsonb_array_elements(p_team->'titulares') with ordinality;
  for card in select value from jsonb_array_elements(p_team->'roster') loop
    if card->>'id'=any(ids) then
      card:=card||jsonb_build_object('stamina',greatest(least((card->>'initial_stamina')::numeric,40),
        (card->>'initial_stamina')::numeric-((card->>'played_seconds')::integer+p_seconds)/180.0*(18+(100-(card->>'base_grl')::integer)*.08)),
        'played_seconds',(card->>'played_seconds')::integer+p_seconds);
    end if;
    roster:=roster||jsonb_build_array(card);
  end loop;
  select coalesce(array_agg(value),'{}') into off_ids from jsonb_array_elements_text(p_team->'subbed_off');
  return thc_private.ut_online_arrange(p_team||jsonb_build_object('roster',roster),ids,p_team->>'formacion',p_team->>'mentalidad',
    (p_team->>'revision')::integer,(p_team->>'substitutions')::integer,off_ids);
end $fn$;

create or replace function thc_private.ut_online_pick(p_team jsonb,p_random numeric,p_keeper boolean default false)
returns text language plpgsql immutable set search_path='' as $fn$
declare card jsonb; candidates jsonb; chosen integer;
begin
  if p_keeper then select value into card from jsonb_array_elements(p_team->'titulares') where value->>'puesto'='GK';
  else
    select jsonb_agg(value) into candidates from jsonb_array_elements(p_team->'titulares') where value->>'puesto' in ('ST','CF','LW','RW','LM','RM','CAM','CM');
    candidates:=coalesce(candidates,p_team->'titulares'); chosen:=floor(p_random*jsonb_array_length(candidates))::integer;
    card:=candidates->chosen;
  end if;
  return coalesce(card->>'nombre',card->>'name','Jugador');
end $fn$;

create or replace function thc_private.ut_online_advance(p_match uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path='' as $fn$
declare game public.ut_online_partidas%rowtype; upto integer; tick integer; side text; other text; team jsonb; rival jsonb;
  output jsonb; home_team jsonb; away_team jsonb; hgoals integer; agoals integer; opportunity integer; offset_tick integer;
  diff numeric; chance numeric; roll numeric; goals integer; event_type text; shooter text; player text; pattern text;
  patterns text[]:=array['Pared por dentro','Cambio de frente','Salida por la banda','Pase entre líneas','Centro al área','Contraataque','Llegada desde atrás','Pelota detenida'];
begin
  select * into game from public.ut_online_partidas where id=p_match for update;
  if not found or game.simulation_version<>2 or game.estado='finished' then return; end if;
  upto:=thc_private.ut_online_elapsed(game.started_at,p_now,2);
  if upto<=game.active_seconds then return; end if;
  output:=game.events; home_team:=game.home; away_team:=game.away; hgoals:=game.home_goals; agoals:=game.away_goals;
  for tick in game.active_seconds+1..upto loop
    home_team:=thc_private.ut_online_fatigue(home_team,1); away_team:=thc_private.ut_online_fatigue(away_team,1);
    if tick=90 then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',45,'side','home','type','halftime','pattern','Entretiempo')); end if;
    if tick=91 then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',45,'side','away','type','kickoff','pattern','Comienza el segundo tiempo')); end if;
    foreach side in array array['home','away'] loop
      other:=case when side='home' then 'away' else 'home' end;
      team:=case when side='home' then home_team else away_team end; rival:=case when side='home' then away_team else home_team end;
      offset_tick:=case when side='home' then 8 else 14 end;
      if mod(tick+4-offset_tick,23)=0 and tick+4>=offset_tick and (tick+4-offset_tick)/23<7 then
        player:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,tick,side,'pass-player'));
        pattern:=patterns[1+floor(thc_private.ut_online_random(game.simulation_seed,tick,side,'pattern')*8)::integer];
        output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick/2.0),'side',side,'type','pass','player',player,'pattern',pattern));
      end if;
      if mod(tick-offset_tick,23)<>0 or tick<offset_tick then continue; end if;
      opportunity:=(tick-offset_tick)/23; if opportunity>=7 then continue; end if;
      diff:=(team->>'grl')::numeric*(.72+.28*(team->>'stamina')::numeric/100)-(rival->>'grl')::numeric*(.72+.28*(rival->>'stamina')::numeric/100);
      chance:=greatest(.05,least(.43,.19+diff*.009+
        case team->>'mentalidad' when 'ofensiva' then .045 when 'defensiva' then -.045 else 0 end+
        case rival->>'mentalidad' when 'ofensiva' then .035 when 'defensiva' then -.035 else 0 end));
      goals:=case when side='home' then hgoals else agoals end; if goals>=4 then chance:=chance*.2; end if;
      roll:=thc_private.ut_online_random(game.simulation_seed,tick,side,'chance');
      event_type:=case when roll<chance and goals<6 then 'goal' when roll<chance+.34 then 'save' when roll<chance+.43 then 'post' else 'shot' end;
      shooter:=thc_private.ut_online_pick(team,thc_private.ut_online_random(game.simulation_seed,tick,side,'shooter'));
      player:=case when event_type='save' then thc_private.ut_online_pick(rival,0,true) else shooter end;
      output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick/2.0),'side',side,'type',event_type,'player',player,'shooter',shooter));
      if event_type='goal' then
        if side='home' then hgoals:=hgoals+1; else agoals:=agoals+1; end if;
        output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',floor(tick/2.0),'side',other,'type','kickoff','pattern','Saque desde el medio'));
      end if;
    end loop;
    if tick=180 then output:=output||jsonb_build_array(jsonb_build_object('second',tick,'minute',90,'side','home','type','fulltime','pattern','Final del partido')); end if;
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
      for player in select value from jsonb_array_elements(case when game.simulation_version=2 then side->'roster' else side->'titulares' end) loop
        if game.simulation_version=2 and coalesce((player->>'played_seconds')::integer,0)=0 then continue; end if;
        final_energy:=case when game.simulation_version=2 then (player->>'stamina')::numeric
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
  elapsed integer; visible jsonb; output jsonb:=null; own_team jsonb; online_count integer; home_score integer; away_score integer; phase text; raw_seconds numeric;
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
      phase:=case when raw_seconds<0 then 'pre' when elapsed>=180 then 'finished' when raw_seconds<90 then 'first'
        when game.simulation_version=2 and raw_seconds<102 then 'halftime' else 'second' end;
      select coalesce(jsonb_agg(value order by (value->>'second')::integer,ordinality),'[]') into visible
        from jsonb_array_elements(game.events) with ordinality where (value->>'second')::integer<=elapsed;
      select count(*) filter(where value->>'type'='goal' and value->>'side'='home')::integer,
        count(*) filter(where value->>'type'='goal' and value->>'side'='away')::integer into home_score,away_score from jsonb_array_elements(visible);
      output:=jsonb_build_object('id',game.id,'home',game.home,'away',game.away,'started_at',game.started_at,'ends_at',game.ends_at,
        'events',visible,'home_goals',home_score,'away_goals',away_score,'duration_seconds',180,'halftime_seconds',case when game.simulation_version=2 then 12 else 0 end,
        'simulation_version',game.simulation_version,'active_seconds',elapsed,'phase',phase,'halftime_remaining',case when phase='halftime' then ceil(102-raw_seconds) else 0 end);
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
        begins,begins+interval '192 seconds',2,(opponent.snapshot->>'grl')::smallint,(v_snapshot->>'grl')::smallint) returning id into v_match_id;
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
  if game.estado<>'playing' or game.simulation_version<>2 then raise exception 'Este partido ya terminó o usa la simulación anterior.' using errcode='55000'; end if;
  v_now:=clock_timestamp(); perform thc_private.ut_online_advance(p_match_id,v_now);
  select * into game from public.ut_online_partidas where id=p_match_id;
  if game.active_seconds>=180 then raise exception 'El partido ya terminó.' using errcode='55000'; end if;
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
    events=events||jsonb_build_array(jsonb_build_object('second',active_seconds,'minute',floor(active_seconds/2.0),'side',side,'type','tactics',
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

-- BEGIN UT SIMULATION V3
-- ULTIMATE TEAM · PARTIDOS DE DOS MINUTOS · 13 OCTUBRE 2026
-- Copia TODO en Supabase SQL Editor. Requiere Online v2 ya instalado.
-- Los nuevos encuentros duran 60 + 12 de descanso + 60 segundos.
-- Los partidos v1/v2 en curso conservan su reloj y resultados.
-- Conserva RLS, GRL ±3, energía, cinco cambios y peticiones idempotentes.

do $requirements$
begin
  if to_regprocedure('thc_private.ut_online_advance(uuid,timestamp with time zone)') is null then
    raise exception 'Instala primero ComandosSQL_OnlineUT.txt o ComandosSQL_ActualizacionUT.txt.';
  end if;
end $requirements$;
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_duration;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_duration;
alter table public.ut_online_partidas add constraint ut_online_v3_duration check(
  ends_at=started_at+case simulation_version when 3 then interval '132 seconds' when 2 then interval '192 seconds' else interval '180 seconds' end);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_cursor;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_cursor;
alter table public.ut_online_partidas add constraint ut_online_v3_cursor check(
  simulation_version in (1,2,3) and active_seconds between 0 and case when simulation_version=3 then 120 else 180 end);
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
