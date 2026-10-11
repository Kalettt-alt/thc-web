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
commit;
