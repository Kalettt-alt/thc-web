-- THC · Amigos, 12 de octubre de 2026. Incluido en ComandosSQL_PerfilesAmigos.txt.
-- Las solicitudes son privadas; solo se publican amistades aceptadas entre perfiles públicos.
-- No se borran filas antiguas ni se modifican nombres, apodos, IDs o rangos.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
begin
  if pg_catalog.to_regclass('public.perfiles') is null or pg_catalog.to_regclass('public.amigos') is null
    or pg_catalog.to_regclass('public.notificaciones') is null then
    raise exception 'Este parche requiere las tablas existentes perfiles, amigos y notificaciones';
  end if;
end;
$preflight$;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon;
grant usage on schema thc_private to authenticated;
alter table public.amigos add column if not exists thc_archivada boolean not null default false;

-- Conserva las referencias históricas (notificaciones.enlace_id). Una pareja tiene una sola fila activa.
with ordenadas as (
  select id, row_number() over (
    partition by least(user_id_1, user_id_2), greatest(user_id_1, user_id_2)
    order by (estado = 'aceptado') desc, creado_en asc nulls last, id
  ) as orden
  from public.amigos where not thc_archivada and estado in ('pendiente', 'aceptado') and user_id_1 <> user_id_2
)
update public.amigos a set thc_archivada = true from ordenadas o where a.id = o.id and o.orden > 1;
update public.amigos set thc_archivada = true
where not thc_archivada and (user_id_1 = user_id_2 or estado is null or estado not in ('pendiente', 'aceptado'));

do $index_upgrade$
declare definition text;
begin
  if pg_catalog.to_regclass('public.thc_friends_pair_unique') is not null then
    select pg_catalog.pg_get_indexdef(indexrelid) into definition from pg_catalog.pg_index
    where indexrelid = 'public.thc_friends_pair_unique'::regclass and indrelid = 'public.amigos'::regclass and indisunique;
    if definition is null or definition not ilike '%LEAST(user_id_1, user_id_2)%'
      or definition not ilike '%GREATEST(user_id_1, user_id_2)%' then
      raise exception 'El índice thc_friends_pair_unique pertenece a otra definición; no se reemplazó';
    end if;
    drop index public.thc_friends_pair_unique;
  end if;
end;
$index_upgrade$;
create unique index thc_friends_pair_unique on public.amigos(least(user_id_1, user_id_2), greatest(user_id_1, user_id_2))
where not thc_archivada and estado in ('pendiente', 'aceptado');
create index if not exists thc_friends_sender_active on public.amigos(user_id_1, estado) where not thc_archivada;
create index if not exists thc_friends_receiver_active on public.amigos(user_id_2, estado) where not thc_archivada;

create or replace function thc_private.thc_perfil_visible(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $visible$
  select exists(select 1 from public.perfiles p where p.id = p_id and (p.id = auth.uid() or coalesce(p.perfil_publico, true)));
$visible$;
revoke all on function thc_private.thc_perfil_visible(uuid) from public, anon, authenticated;
-- La política pública llama solo a este comprobador booleano, nunca devuelve datos del perfil.
grant usage on schema thc_private to anon;
grant execute on function thc_private.thc_perfil_visible(uuid) to anon, authenticated;

alter table public.amigos enable row level security;
revoke all on table public.amigos from public, anon, authenticated;
do $column_grants$
declare columns_sql text;
begin
  select pg_catalog.string_agg(pg_catalog.format('%I', attname), ', ') into columns_sql
  from pg_catalog.pg_attribute where attrelid = 'public.amigos'::regclass and attnum > 0 and not attisdropped;
  execute pg_catalog.format('revoke all (%s) on table public.amigos from public, anon, authenticated', columns_sql);
end;
$column_grants$;
grant select on public.amigos to anon, authenticated;
-- Reemplaza las políticas THC anteriores; las ajenas quedan, limitadas por el guard restrictivo.
drop policy if exists thc_friends_read_guard on public.amigos;
drop policy if exists thc_friends_read on public.amigos;
drop policy if exists thc_friends_insert_guard on public.amigos;
drop policy if exists thc_friends_insert on public.amigos;
drop policy if exists thc_friends_update_guard on public.amigos;
drop policy if exists thc_friends_update on public.amigos;
drop policy if exists thc_friends_delete_guard on public.amigos;
drop policy if exists thc_friends_delete on public.amigos;
create policy thc_friends_read_guard on public.amigos as restrictive for select to public using (
  not thc_archivada and estado in ('pendiente', 'aceptado') and (
    user_id_1 = (select auth.uid()) or user_id_2 = (select auth.uid()) or (
      estado = 'aceptado' and thc_private.thc_perfil_visible(user_id_1) and thc_private.thc_perfil_visible(user_id_2)
    )
  )
);
create policy thc_friends_read on public.amigos for select to anon, authenticated using (true);
-- Aun si se concede INSERT/UPDATE/DELETE por error después, las políticas antiguas no habilitan mutaciones directas.
create policy thc_friends_insert_guard on public.amigos as restrictive for insert to public with check (false);
create policy thc_friends_update_guard on public.amigos as restrictive for update to public using (false) with check (false);
create policy thc_friends_delete_guard on public.amigos as restrictive for delete to public using (false);

create or replace function public.thc_perfil_amistad_estado(p_perfil_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $state$
declare me uuid := auth.uid(); friendship public.amigos%rowtype;
begin
  if me is null then return pg_catalog.jsonb_build_object('estado', 'none', 'solicitud_id', null); end if;
  if me = p_perfil_id then return pg_catalog.jsonb_build_object('estado', 'self', 'solicitud_id', null); end if;
  select * into friendship from public.amigos a where not a.thc_archivada and a.estado in ('pendiente', 'aceptado')
    and least(a.user_id_1, a.user_id_2) = least(me, p_perfil_id)
    and greatest(a.user_id_1, a.user_id_2) = greatest(me, p_perfil_id);
  if not found then return pg_catalog.jsonb_build_object('estado', 'none', 'solicitud_id', null); end if;
  return pg_catalog.jsonb_build_object('estado', case when friendship.estado = 'aceptado' then 'friends'
    when friendship.user_id_1 = me then 'sent' else 'received' end, 'solicitud_id', friendship.id);
end;
$state$;

create or replace function public.thc_perfil_amigos(p_perfil_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $list$
declare me uuid := auth.uid(); friends jsonb; incoming jsonb := '[]'::jsonb; outgoing jsonb := '[]'::jsonb;
begin
  if not thc_private.thc_perfil_visible(p_perfil_id) then
    return pg_catalog.jsonb_build_object('amigos', '[]'::jsonb, 'recibidas', incoming, 'enviadas', outgoing);
  end if;
  select coalesce(pg_catalog.jsonb_agg(entry order by lower(entry->>'nombre'), entry->>'id'), '[]'::jsonb) into friends
  from (
    select pg_catalog.jsonb_build_object('id', p.id, 'nombre', coalesce(nullif(btrim(p.apodo), ''), p.discord_nombre),
      'discord_nombre', p.discord_nombre, 'apodo', p.apodo, 'avatar_url', p.avatar_url, 'nivel_rol', p.nivel_rol) as entry
    from public.amigos a join public.perfiles p on p.id = case when a.user_id_1 = p_perfil_id then a.user_id_2 else a.user_id_1 end
    where not a.thc_archivada and a.estado = 'aceptado' and p_perfil_id in (a.user_id_1, a.user_id_2)
      and (p_perfil_id = me or coalesce(p.perfil_publico, true) or p.id = me)
  ) entries;
  if me = p_perfil_id then
    select coalesce(pg_catalog.jsonb_agg(entry order by created desc, entry->>'id'), '[]'::jsonb) into incoming from (
      select a.creado_en as created, pg_catalog.jsonb_build_object('id', p.id,
        'nombre', coalesce(nullif(btrim(p.apodo), ''), p.discord_nombre), 'discord_nombre', p.discord_nombre,
        'apodo', p.apodo, 'avatar_url', p.avatar_url, 'nivel_rol', p.nivel_rol, 'solicitud_id', a.id) as entry
      from public.amigos a join public.perfiles p on p.id = a.user_id_1
      where not a.thc_archivada and a.estado = 'pendiente' and a.user_id_2 = me
    ) entries;
    select coalesce(pg_catalog.jsonb_agg(entry order by created desc, entry->>'id'), '[]'::jsonb) into outgoing from (
      select a.creado_en as created, pg_catalog.jsonb_build_object('id', p.id,
        'nombre', coalesce(nullif(btrim(p.apodo), ''), p.discord_nombre), 'discord_nombre', p.discord_nombre,
        'apodo', p.apodo, 'avatar_url', p.avatar_url, 'nivel_rol', p.nivel_rol, 'solicitud_id', a.id) as entry
      from public.amigos a join public.perfiles p on p.id = a.user_id_2
      where not a.thc_archivada and a.estado = 'pendiente' and a.user_id_1 = me
    ) entries;
  end if;
  return pg_catalog.jsonb_build_object('amigos', friends, 'recibidas', incoming, 'enviadas', outgoing);
end;
$list$;

create or replace function public.thc_perfil_amistad_accion(p_perfil_id uuid, p_accion text)
returns jsonb language plpgsql security definer set search_path = '' as $action$
declare me uuid := auth.uid(); friendship public.amigos%rowtype; event_id uuid;
begin
  if me is null or not exists(select 1 from public.perfiles where id = me) then
    raise exception 'Inicia sesión para gestionar amistades' using errcode = '42501';
  end if;
  if p_perfil_id is null or me = p_perfil_id or not exists(select 1 from public.perfiles where id = p_perfil_id) then
    raise exception 'Elige otro perfil válido' using errcode = '22023';
  end if;
  if p_accion is null or p_accion not in ('enviar', 'cancelar', 'aceptar', 'rechazar', 'eliminar') then
    raise exception 'Acción de amistad inválida' using errcode = '22023';
  end if;
  -- Bloqueo simétrico: A->B y B->A comparten transacción lógica y no crean solicitudes cruzadas.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me, p_perfil_id)::text || ':' || greatest(me, p_perfil_id)::text, 0));
  select * into friendship from public.amigos a where not a.thc_archivada and a.estado in ('pendiente', 'aceptado')
    and least(a.user_id_1, a.user_id_2) = least(me, p_perfil_id)
    and greatest(a.user_id_1, a.user_id_2) = greatest(me, p_perfil_id) for update;
  if p_accion = 'enviar' then
    if friendship.id is null then
      if not thc_private.thc_perfil_visible(p_perfil_id) then
        raise exception 'Este perfil es privado' using errcode = '42501';
      end if;
      insert into public.amigos(user_id_1, user_id_2, estado) values(me, p_perfil_id, 'pendiente') returning id into event_id;
      -- Si un trigger previo ya creó la notificación, no se añade una segunda.
      insert into public.notificaciones(usuario_id, actor_id, tipo, enlace_id, contenido)
        select p_perfil_id, me, 'solicitud_amistad', event_id, 'te ha enviado una solicitud de amistad.'
        where not exists(select 1 from public.notificaciones where usuario_id = p_perfil_id and actor_id = me
          and tipo = 'solicitud_amistad' and enlace_id = event_id);
    end if;
  elsif friendship.id is not null then
    if p_accion in ('aceptar', 'rechazar') then
      if friendship.estado = 'pendiente' and friendship.user_id_2 <> me then
        raise exception 'Solo el destinatario puede responder' using errcode = '42501';
      end if;
      if friendship.estado = 'pendiente' then
        if p_accion = 'aceptar' then update public.amigos set estado = 'aceptado' where id = friendship.id;
        else update public.amigos set thc_archivada = true where id = friendship.id; end if;
      end if;
    elsif p_accion = 'cancelar' then
      if friendship.estado = 'pendiente' and friendship.user_id_1 <> me then
        raise exception 'Solo el remitente puede cancelar' using errcode = '42501';
      end if;
      if friendship.estado = 'pendiente' then update public.amigos set thc_archivada = true where id = friendship.id; end if;
    elsif p_accion = 'eliminar' and friendship.estado = 'aceptado' then
      update public.amigos set thc_archivada = true where id = friendship.id;
    end if;
    if not (friendship.estado = 'pendiente' and p_accion = 'eliminar') then
      -- Retira también alertas antiguas de la misma pareja; no borra historial ni otras notificaciones.
      update public.notificaciones n set leida = true
      where n.tipo = 'solicitud_amistad' and n.enlace_id in (
        select a.id from public.amigos a where least(a.user_id_1, a.user_id_2) = least(me, p_perfil_id)
          and greatest(a.user_id_1, a.user_id_2) = greatest(me, p_perfil_id)
      ) and n.usuario_id in (me, p_perfil_id);
    end if;
  end if;
  return public.thc_perfil_amistad_estado(p_perfil_id);
end;
$action$;

create or replace function public.thc_perfil_amistad_notificacion(p_solicitud_id uuid, p_accion text)
returns jsonb language plpgsql security definer set search_path = '' as $notification$
declare me uuid := auth.uid(); friendship public.amigos%rowtype; other_id uuid;
begin
  if me is null then raise exception 'Inicia sesión' using errcode = '42501'; end if;
  if p_accion is null or p_accion not in ('aceptar', 'rechazar') then
    raise exception 'Acción de solicitud inválida' using errcode = '22023';
  end if;
  select * into friendship from public.amigos where id = p_solicitud_id;
  if not found or friendship.user_id_2 <> me then
    raise exception 'La solicitud no te pertenece' using errcode = '42501';
  end if;
  other_id := friendship.user_id_1;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me, other_id)::text || ':' || greatest(me, other_id)::text, 0));
  select * into friendship from public.amigos where id = p_solicitud_id for update;
  -- Una notificación histórica nunca acepta una solicitud nueva de la misma pareja.
  if not friendship.thc_archivada then
    perform public.thc_perfil_amistad_accion(other_id, p_accion);
  end if;
  update public.notificaciones set leida = true where usuario_id = me and tipo = 'solicitud_amistad' and enlace_id = p_solicitud_id;
  return public.thc_perfil_amistad_estado(other_id);
end;
$notification$;

revoke all on function public.thc_perfil_amistad_estado(uuid) from public, anon, authenticated;
revoke all on function public.thc_perfil_amigos(uuid) from public, anon, authenticated;
revoke all on function public.thc_perfil_amistad_accion(uuid, text) from public, anon, authenticated;
revoke all on function public.thc_perfil_amistad_notificacion(uuid, text) from public, anon, authenticated;
grant execute on function public.thc_perfil_amistad_estado(uuid) to anon, authenticated;
grant execute on function public.thc_perfil_amigos(uuid) to anon, authenticated;
grant execute on function public.thc_perfil_amistad_accion(uuid, text) to authenticated;
grant execute on function public.thc_perfil_amistad_notificacion(uuid, text) to authenticated;

-- Lectura y marcado de notificaciones propias. No cambia los permisos de insertar eventos del foro.
alter table public.notificaciones enable row level security;
drop policy if exists thc_profile_notifications_read_guard on public.notificaciones;
create policy thc_profile_notifications_read_guard on public.notificaciones as restrictive for select to public using (usuario_id = (select auth.uid()));
drop policy if exists thc_profile_notifications_update_guard on public.notificaciones;
create policy thc_profile_notifications_update_guard on public.notificaciones as restrictive for update to public
using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_profile_notifications_read on public.notificaciones;
create policy thc_profile_notifications_read on public.notificaciones for select to authenticated using (usuario_id = (select auth.uid()));
drop policy if exists thc_profile_notifications_update on public.notificaciones;
create policy thc_profile_notifications_update on public.notificaciones for update to authenticated
using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_profile_notifications_delete_guard on public.notificaciones;
create policy thc_profile_notifications_delete_guard on public.notificaciones as restrictive for delete to public using (usuario_id = (select auth.uid()));
drop policy if exists thc_profile_notifications_request_guard on public.notificaciones;
create policy thc_profile_notifications_request_guard on public.notificaciones as restrictive for insert to public
with check (tipo <> 'solicitud_amistad');
revoke update on public.notificaciones from public, anon, authenticated;
do $notification_columns$
declare columns_sql text;
begin
  select pg_catalog.string_agg(pg_catalog.format('%I', attname), ', ') into columns_sql
  from pg_catalog.pg_attribute where attrelid = 'public.notificaciones'::regclass and attnum > 0 and not attisdropped;
  execute pg_catalog.format('revoke update (%s) on table public.notificaciones from public, anon, authenticated', columns_sql);
end;
$notification_columns$;
grant select on public.notificaciones to authenticated;
grant update(leida) on public.notificaciones to authenticated;

-- Solicitudes duplicadas históricas quedan leídas, conservando su contenido y enlace.
update public.notificaciones n set leida = true
from public.amigos a where n.tipo = 'solicitud_amistad' and n.enlace_id = a.id and (a.thc_archivada or a.estado = 'aceptado');

notify pgrst, 'reload schema';
commit;
