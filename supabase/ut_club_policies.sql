begin;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon, authenticated;
create table if not exists thc_private.ut_bonus_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table thc_private.ut_bonus_claims enable row level security;
revoke all on thc_private.ut_bonus_claims from public, anon, authenticated;
insert into thc_private.ut_bonus_claims(user_id)
select user_id from public.perfiles_ut on conflict(user_id) do nothing;

do $ut_club_access$
declare target text; columns_sql text;
begin
  foreach target in array array['equipos_ut','perfiles_ut','club_ut'] loop
    execute format('alter table public.%I enable row level security',target);
    execute format('revoke all on public.%I from public,anon,authenticated',target);
    select string_agg(quote_ident(attname),',') into columns_sql from pg_attribute
    where attrelid = format('public.%I',target)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke select (%s),insert (%s),update (%s),references (%s) on public.%I from public,anon,authenticated',columns_sql,columns_sql,columns_sql,columns_sql,target);
    execute format('grant select on public.%I to authenticated',target);
    execute format('drop policy if exists thc_ut_club_owner_boundary on public.%I',target);
    execute format('create policy thc_ut_club_owner_boundary on public.%I as restrictive for all to public using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',target);
    execute format('drop policy if exists thc_ut_club_owner_read on public.%I',target);
    execute format('create policy thc_ut_club_owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',target);
  end loop;
end $ut_club_access$;

grant insert,update,delete on public.equipos_ut to authenticated;
drop policy if exists thc_ut_club_owner_write on public.equipos_ut;
create policy thc_ut_club_owner_write on public.equipos_ut for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function public.thc_ut_initialize()
returns uuid language plpgsql security definer set search_path = ''
as $ut_initialize$
declare uid uuid := auth.uid(); rewarded uuid;
begin
  if uid is null then raise exception 'Inicia sesión para crear tu club.' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  insert into thc_private.ut_bonus_claims(user_id) values(uid)
  on conflict(user_id) do nothing returning user_id into rewarded;
  insert into public.perfiles_ut(user_id,monedas,thc_points)
  values(uid,case when rewarded is not null then 500 else 0 end,0)
  on conflict(user_id) do nothing;
  return uid;
end $ut_initialize$;
revoke all on function public.thc_ut_initialize() from public,anon,authenticated;
grant execute on function public.thc_ut_initialize() to authenticated;

commit;
