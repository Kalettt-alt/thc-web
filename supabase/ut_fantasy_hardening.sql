begin;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon, authenticated;

create table if not exists thc_private.ut_bonus_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table thc_private.ut_bonus_claims enable row level security;
revoke all on thc_private.ut_bonus_claims from public, anon, authenticated;
insert into thc_private.ut_bonus_claims (user_id)
select user_id from public.perfiles_ut
on conflict (user_id) do nothing;

do $ownership$
declare
  target_table text;
begin
  foreach target_table in array array['fantasy_partidas', 'equipos_ut', 'plantillas_ut', 'PlaylistUT', 'perfiles_ut', 'club_ut'] loop
    execute format('alter table public.%I enable row level security', target_table);
    if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = target_table and policyname = 'thc_owner_boundary') then
      execute format('create policy thc_owner_boundary on public.%I as restrictive for all to public using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target_table);
    end if;
    if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = target_table and policyname = 'thc_owner_read') then
      execute format('create policy thc_owner_read on public.%I for select to authenticated using ((select auth.uid()) = user_id)', target_table);
    end if;
    execute format('revoke all on public.%I from public, anon, authenticated', target_table);
    execute format('grant select on public.%I to authenticated', target_table);
  end loop;
  foreach target_table in array array['fantasy_partidas', 'equipos_ut', 'plantillas_ut', 'PlaylistUT'] loop
    if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = target_table and policyname = 'thc_owner_write') then
      execute format('create policy thc_owner_write on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target_table);
    end if;
    execute format('grant insert, update, delete on public.%I to authenticated', target_table);
  end loop;
end;
$ownership$;

create or replace function public.thc_ut_initialize()
returns uuid
language plpgsql
security definer
set search_path = ''
as $initialize$
declare
  current_user_id uuid := auth.uid();
  rewarded_user_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  insert into thc_private.ut_bonus_claims (user_id) values (current_user_id)
    on conflict (user_id) do nothing returning user_id into rewarded_user_id;
  insert into public.perfiles_ut (user_id, monedas, thc_points)
    values (current_user_id, case when rewarded_user_id is not null then 500 else 0 end, 0)
    on conflict (user_id) do nothing;
  return current_user_id;
end;
$initialize$;
revoke all on function public.thc_ut_initialize() from public, anon;
grant execute on function public.thc_ut_initialize() to authenticated;

create or replace function public.thc_ut_reset()
returns uuid
language plpgsql
security definer
set search_path = ''
as $reset$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  if not exists (select 1 from public.perfiles_ut where user_id = current_user_id) then
    raise exception 'Club profile not found' using errcode = 'P0002';
  end if;
  delete from public.club_ut where user_id = current_user_id;
  delete from public.plantillas_ut where user_id = current_user_id;
  delete from public."PlaylistUT" where user_id = current_user_id;
  delete from public.equipos_ut where user_id = current_user_id;
  delete from public.perfiles_ut where user_id = current_user_id;
  return current_user_id;
end;
$reset$;
revoke all on function public.thc_ut_reset() from public, anon;
grant execute on function public.thc_ut_reset() to authenticated;

do $constraints$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.perfiles_ut'::regclass and conname = 'thc_ut_balances_nonnegative') then
    alter table public.perfiles_ut add constraint thc_ut_balances_nonnegative check (monedas >= 0 and thc_points >= 0 and monedas is not null and thc_points is not null) not valid;
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.equipos_ut'::regclass and conname = 'thc_ut_club_shape') then
    alter table public.equipos_ut add constraint thc_ut_club_shape check (coalesce((
      length(btrim(nombre)) between 1 and 20 and abreviatura ~ '^[A-Z]{3}$' and length(btrim(estadio)) between 1 and 30
      and jsonb_typeof(colores) = 'array' and jsonb_array_length(colores) between 2 and 4
      and jsonb_typeof(apodos) = 'array' and jsonb_array_length(apodos) between 1 and 3
    ), false)) not valid;
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.plantillas_ut'::regclass and conname = 'thc_ut_squad_shape') then
    alter table public.plantillas_ut add constraint thc_ut_squad_shape check (coalesce((
      jsonb_typeof(titulares) = 'array' and jsonb_array_length(titulares) <= 11
      and jsonb_typeof(suplentes) = 'array' and jsonb_array_length(suplentes) <= 7
      and jsonb_typeof(reservas) = 'array' and jsonb_array_length(reservas) <= 100
      and jsonb_typeof(tacticas) = 'object'
      and octet_length(titulares::text) + octet_length(suplentes::text) + octet_length(reservas::text) <= 262144
    ), false)) not valid;
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.fantasy_partidas'::regclass and conname = 'thc_fantasy_save_shape') then
    alter table public.fantasy_partidas add constraint thc_fantasy_save_shape check (coalesce((
      jornada_actual >= 0 and jornada_actual <= 64 and jsonb_typeof(titulares) = 'object'
      and jsonb_typeof(reservas) = 'array' and jsonb_array_length(reservas) <= 100
      and jsonb_typeof(fixture) = 'array' and jsonb_array_length(fixture) <= 64
      and jsonb_typeof(standings) = 'object'
      and octet_length(titulares::text) + octet_length(reservas::text) + octet_length(fixture::text) + octet_length(standings::text) <= 1048576
    ), false)) not valid;
  end if;
end;
$constraints$;

update storage.buckets
set file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg']
where id = 'logos_clubes';

do $logo_policies$
declare
  operation text;
begin
  foreach operation in array array['insert', 'update', 'delete'] loop
    if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'thc_logo_boundary_' || operation) then
      if operation = 'insert' then
        execute 'create policy thc_logo_boundary_insert on storage.objects as restrictive for insert to public with check (bucket_id <> ''logos_clubes'' or name in ((select auth.uid())::text || ''_logo.png'', (select auth.uid())::text || ''_logo.jpg''))';
      elsif operation = 'update' then
        execute 'create policy thc_logo_boundary_update on storage.objects as restrictive for update to public using (bucket_id <> ''logos_clubes'' or name in ((select auth.uid())::text || ''_logo.png'', (select auth.uid())::text || ''_logo.jpg'')) with check (bucket_id <> ''logos_clubes'' or name in ((select auth.uid())::text || ''_logo.png'', (select auth.uid())::text || ''_logo.jpg''))';
      else
        execute 'create policy thc_logo_boundary_delete on storage.objects as restrictive for delete to public using (bucket_id <> ''logos_clubes'' or name in ((select auth.uid())::text || ''_logo.png'', (select auth.uid())::text || ''_logo.jpg''))';
      end if;
    end if;
  end loop;
  if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'thc_logo_owner_access') then
    create policy thc_logo_owner_access on storage.objects for all to authenticated
      using (bucket_id = 'logos_clubes' and name in ((select auth.uid())::text || '_logo.png', (select auth.uid())::text || '_logo.jpg'))
      with check (bucket_id = 'logos_clubes' and name in ((select auth.uid())::text || '_logo.png', (select auth.uid())::text || '_logo.jpg'));
  end if;
end;
$logo_policies$;

commit;
