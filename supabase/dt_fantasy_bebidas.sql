begin;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon, authenticated;

alter table public.fantasy_partidas add column if not exists energia_revision bigint not null default 0;

create table if not exists thc_private.fantasy_bebidas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bebidas smallint not null default 2 check (bebidas between 0 and 2),
  creado_en timestamptz not null default now()
);
create table if not exists thc_private.fantasy_bebida_usos (
  user_id uuid not null references auth.users(id) on delete cascade,
  solicitud_id uuid not null,
  partida_id uuid not null,
  creado_en timestamptz not null default now(),
  primary key (user_id, solicitud_id)
);
create table if not exists thc_private.fantasy_energy_patches (
  nombre text primary key,
  aplicado_en timestamptz not null default now()
);
alter table thc_private.fantasy_bebidas enable row level security;
alter table thc_private.fantasy_bebida_usos enable row level security;
alter table thc_private.fantasy_energy_patches enable row level security;
revoke all on thc_private.fantasy_bebidas, thc_private.fantasy_bebida_usos, thc_private.fantasy_energy_patches from public, anon, authenticated;

create or replace function thc_private.fantasy_squad_full(p_titulares jsonb, p_reservas jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $squad$
  select pg_catalog.jsonb_build_object(
    'titulares', coalesce((select pg_catalog.jsonb_object_agg(key, case when value = 'null'::jsonb then value else pg_catalog.jsonb_set(value, '{energia}', '100'::jsonb) end) from pg_catalog.jsonb_each(p_titulares)), '{}'::jsonb),
    'reservas', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_set(value, '{energia}', '100'::jsonb) order by ord) from pg_catalog.jsonb_array_elements(p_reservas) with ordinality as items(value, ord)), '[]'::jsonb)
  );
$squad$;
revoke all on function thc_private.fantasy_squad_full(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.thc_fantasy_bebidas_estado()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $status$
declare
  actor uuid := auth.uid();
  balance smallint;
begin
  if actor is null then raise exception 'Inicia sesion para consultar las Bebidas THC.' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 456710));
  insert into thc_private.fantasy_bebidas (user_id) values (actor) on conflict (user_id) do nothing;
  select bebidas into balance from thc_private.fantasy_bebidas where user_id = actor;
  return pg_catalog.jsonb_build_object('bebidas', balance);
end;
$status$;

create or replace function public.thc_fantasy_guardar(p_partida jsonb, p_energia_revision bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $save$
declare
  actor uuid := auth.uid();
  previous public.fantasy_partidas%rowtype;
  saved public.fantasy_partidas%rowtype;
  player jsonb;
  squad_count integer := 0;
  player_ids text[] := array[]::text[];
  first_round integer;
begin
  if actor is null then raise exception 'Inicia sesion para guardar tu carrera.' using errcode = '42501'; end if;
  if p_energia_revision is null or p_energia_revision < 0 then raise exception 'Revision de energia invalida.' using errcode = '22023'; end if;
  if p_partida is null or pg_catalog.jsonb_typeof(p_partida) <> 'object' or pg_catalog.octet_length(p_partida::text) > 1048576 then raise exception 'Partida invalida.' using errcode = '22023'; end if;
  if not coalesce(
    pg_catalog.jsonb_typeof(p_partida->'titulares') = 'object'
    and pg_catalog.jsonb_typeof(p_partida->'reservas') = 'array'
    and pg_catalog.jsonb_typeof(p_partida->'fixture') = 'array'
    and pg_catalog.jsonb_typeof(p_partida->'standings') = 'object'
    and pg_catalog.jsonb_typeof(p_partida->'jornada_actual') = 'number'
    and (p_partida->>'jornada_actual') ~ '^[0-9]+$'
    and pg_catalog.length(pg_catalog.btrim(p_partida->>'club_id')) between 1 and 100
    and pg_catalog.length(pg_catalog.btrim(p_partida->>'club_nombre')) between 1 and 150
    and pg_catalog.length(pg_catalog.btrim(p_partida->>'liga')) between 1 and 50
    and (p_partida->>'tactica') in ('4-3-3 OFENSIVO', '4-4-2 CLASICO', '4-4-2 CLÁSICO', '3-5-2 POSESION', '3-5-2 POSESIÓN', '3-4-3 TOTAL'), false
  ) then raise exception 'La estructura de la carrera no es valida.' using errcode = '22023'; end if;
  first_round := (p_partida->>'jornada_actual')::integer;
  if pg_catalog.jsonb_array_length(p_partida->'fixture') not between 1 and 64 or first_round >= pg_catalog.jsonb_array_length(p_partida->'fixture') or pg_catalog.jsonb_array_length(p_partida->'reservas') > 100 then raise exception 'Calendario o plantilla invalidos.' using errcode = '22023'; end if;
  for player in select value from pg_catalog.jsonb_each(p_partida->'titulares') where value <> 'null'::jsonb union all select value from pg_catalog.jsonb_array_elements(p_partida->'reservas') loop
    if not coalesce(
      pg_catalog.jsonb_typeof(player) = 'object'
      and pg_catalog.jsonb_typeof(player->'id') = 'string'
      and pg_catalog.length(player->>'id') between 1 and 100
      and pg_catalog.jsonb_typeof(player->'name') = 'string'
      and pg_catalog.length(player->>'name') between 1 and 150
      and pg_catalog.jsonb_typeof(player->'pos') = 'string'
      and pg_catalog.jsonb_typeof(player->'grl') = 'number'
      and pg_catalog.jsonb_typeof(player->'energia') = 'number', false
    ) then raise exception 'Jugador invalido.' using errcode = '22023'; end if;
    if (player->>'grl')::numeric not between 0 and 100 or (player->>'energia')::numeric not between 0 and 100 or (player->>'id') = any(player_ids) then raise exception 'Energia o jugador duplicado invalido.' using errcode = '22023'; end if;
    player_ids := pg_catalog.array_append(player_ids, player->>'id');
    squad_count := squad_count + 1;
  end loop;
  if squad_count not between 1 and 100 then raise exception 'Plantilla vacia o demasiado grande.' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 456710));
  select * into previous from public.fantasy_partidas where user_id = actor for update;
  if found and previous.energia_revision <> p_energia_revision then raise exception 'La energia cambio en otra pestana. Recarga tu carrera.' using errcode = '40001'; end if;
  if previous.id is null and p_energia_revision <> 0 then raise exception 'La carrera cambio. Recarga antes de continuar.' using errcode = '40001'; end if;
  insert into public.fantasy_partidas (user_id, club_id, club_nombre, liga, jornada_actual, tactica, titulares, reservas, fixture, standings, actualizado_en)
  values (actor, p_partida->>'club_id', p_partida->>'club_nombre', p_partida->>'liga', first_round, p_partida->>'tactica', p_partida->'titulares', p_partida->'reservas', p_partida->'fixture', p_partida->'standings', now())
  on conflict (user_id) do update set club_id = excluded.club_id, club_nombre = excluded.club_nombre, liga = excluded.liga, jornada_actual = excluded.jornada_actual, tactica = excluded.tactica, titulares = excluded.titulares, reservas = excluded.reservas, fixture = excluded.fixture, standings = excluded.standings, actualizado_en = excluded.actualizado_en
  returning * into saved;
  return pg_catalog.jsonb_build_object('id', saved.id, 'energia_revision', saved.energia_revision);
end;
$save$;

create or replace function public.thc_fantasy_usar_bebida(p_solicitud_id uuid, p_energia_revision bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $consume$
declare
  actor uuid := auth.uid();
  career public.fantasy_partidas%rowtype;
  previous_use thc_private.fantasy_bebida_usos%rowtype;
  balance smallint;
  recovered jsonb;
  player jsonb;
  tired boolean := false;
begin
  if actor is null then raise exception 'Inicia sesion para usar una Bebida THC.' using errcode = '42501'; end if;
  if p_solicitud_id is null or p_energia_revision is null or p_energia_revision < 0 then raise exception 'Solicitud invalida.' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 456710));
  insert into thc_private.fantasy_bebidas (user_id) values (actor) on conflict (user_id) do nothing;
  select bebidas into balance from thc_private.fantasy_bebidas where user_id = actor for update;
  select * into career from public.fantasy_partidas where user_id = actor for update;
  if not found then raise exception 'Guarda tu carrera antes de usar la bebida.' using errcode = 'P0002'; end if;
  select * into previous_use from thc_private.fantasy_bebida_usos where user_id = actor and solicitud_id = p_solicitud_id;
  if found then
    if previous_use.partida_id <> career.id then raise exception 'Ese uso pertenece a tu carrera anterior. Consulta tu saldo actual.' using errcode = 'P0001'; end if;
    return pg_catalog.jsonb_build_object('bebidas', balance, 'energia_revision', career.energia_revision, 'titulares', career.titulares, 'reservas', career.reservas, 'reintentado', true);
  end if;
  if career.energia_revision <> p_energia_revision then raise exception 'La energia cambio en otra pestana. Recarga tu carrera.' using errcode = '40001'; end if;
  if balance < 1 then raise exception 'Ya no tienes Bebidas THC.' using errcode = 'P0001'; end if;
  if pg_catalog.jsonb_typeof(career.titulares) <> 'object' or pg_catalog.jsonb_typeof(career.reservas) <> 'array' then raise exception 'La plantilla guardada no es valida.' using errcode = '22023'; end if;
  for player in select value from pg_catalog.jsonb_each(career.titulares) where value <> 'null'::jsonb union all select value from pg_catalog.jsonb_array_elements(career.reservas) loop
    if pg_catalog.jsonb_typeof(player->'energia') = 'number' and (player->>'energia')::numeric < 100 then tired := true; end if;
  end loop;
  if not tired then raise exception 'Tu plantilla ya esta al 100%%. Conserva la bebida.' using errcode = 'P0001'; end if;
  recovered := thc_private.fantasy_squad_full(career.titulares, career.reservas);
  update public.fantasy_partidas set titulares = recovered->'titulares', reservas = recovered->'reservas', energia_revision = energia_revision + 1, actualizado_en = now() where user_id = actor returning * into career;
  update thc_private.fantasy_bebidas set bebidas = bebidas - 1 where user_id = actor returning bebidas into balance;
  insert into thc_private.fantasy_bebida_usos (user_id, solicitud_id, partida_id) values (actor, p_solicitud_id, career.id);
  return pg_catalog.jsonb_build_object('bebidas', balance, 'energia_revision', career.energia_revision, 'titulares', career.titulares, 'reservas', career.reservas, 'reintentado', false);
end;
$consume$;

revoke all on function public.thc_fantasy_bebidas_estado() from public, anon;
revoke all on function public.thc_fantasy_guardar(jsonb, bigint) from public, anon;
revoke all on function public.thc_fantasy_usar_bebida(uuid, bigint) from public, anon;
grant execute on function public.thc_fantasy_bebidas_estado() to authenticated;
grant execute on function public.thc_fantasy_guardar(jsonb, bigint) to authenticated;
grant execute on function public.thc_fantasy_usar_bebida(uuid, bigint) to authenticated;

alter table public.fantasy_partidas enable row level security;
drop policy if exists thc_owner_boundary on public.fantasy_partidas;
create policy thc_owner_boundary on public.fantasy_partidas as restrictive for all to public
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
do $permissions$
declare
  target_column text;
begin
  if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'fantasy_partidas' and policyname = 'thc_owner_read') then
    create policy thc_owner_read on public.fantasy_partidas for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'fantasy_partidas' and policyname = 'thc_fantasy_owner_delete') then
    create policy thc_fantasy_owner_delete on public.fantasy_partidas for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
  revoke insert, update on public.fantasy_partidas from public, anon, authenticated;
  for target_column in select attname from pg_catalog.pg_attribute where attrelid = 'public.fantasy_partidas'::regclass and attnum > 0 and not attisdropped loop
    execute pg_catalog.format('revoke insert (%I), update (%I) on public.fantasy_partidas from public, anon, authenticated', target_column, target_column);
  end loop;
end;
$permissions$;
grant select, delete on public.fantasy_partidas to authenticated;

do $fitness_patch$
declare
  applied text;
begin
  insert into thc_private.fantasy_energy_patches (nombre) values ('fitness_2026_10_06') on conflict (nombre) do nothing returning nombre into applied;
  if applied is not null then
    update public.fantasy_partidas career
    set titulares = (thc_private.fantasy_squad_full(career.titulares, career.reservas))->'titulares',
        reservas = (thc_private.fantasy_squad_full(career.titulares, career.reservas))->'reservas',
        energia_revision = energia_revision + 1
    where jornada_actual = 0
      and pg_catalog.jsonb_typeof(titulares) = 'object'
      and pg_catalog.jsonb_typeof(reservas) = 'array'
      and pg_catalog.jsonb_typeof(fixture->0) = 'array'
      and exists (select 1 from pg_catalog.jsonb_array_elements(career.fixture->0) match where (match->>'local' = career.club_id or match->>'visitante' = career.club_id) and coalesce(match->>'jugado', 'false') <> 'true');
  end if;
end;
$fitness_patch$;

commit;
notify pgrst, 'reload schema';
