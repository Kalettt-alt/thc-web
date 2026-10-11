begin;

alter table public."PlaylistUT" enable row level security;

drop policy if exists thc_playlist_owner_boundary on public."PlaylistUT";
create policy thc_playlist_owner_boundary on public."PlaylistUT"
  as restrictive for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists thc_playlist_owner_select on public."PlaylistUT";
create policy thc_playlist_owner_select on public."PlaylistUT"
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists thc_playlist_owner_insert on public."PlaylistUT";
create policy thc_playlist_owner_insert on public."PlaylistUT"
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists thc_playlist_owner_update on public."PlaylistUT";
create policy thc_playlist_owner_update on public."PlaylistUT"
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists thc_playlist_owner_delete on public."PlaylistUT";
create policy thc_playlist_owner_delete on public."PlaylistUT"
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public."PlaylistUT" from public, anon;
grant select, insert, update, delete on public."PlaylistUT" to authenticated;

create index if not exists thc_playlist_owner_created_idx
  on public."PlaylistUT" (user_id, created_at);

commit;

