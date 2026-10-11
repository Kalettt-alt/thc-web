begin;

do $$
declare item text; columnas text;
begin
  foreach item in array array['mensajes', 'amigos', 'notificaciones', 'muro_publicaciones', 'muro_votos'] loop
    select string_agg(format('%I', attname), ', ') into columnas
    from pg_catalog.pg_attribute
    where attrelid = format('public.%I', item)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke all (%s) on table public.%I from public, anon, authenticated', columnas, item);
  end loop;
end;
$$;

alter table public.mensajes enable row level security;
revoke all on public.mensajes from public, anon, authenticated;
grant select, delete on public.mensajes to authenticated;
grant insert(emisor_id, receptor_id, contenido, imagen_url) on public.mensajes to authenticated;
grant update(leido) on public.mensajes to authenticated;
drop policy if exists thc_chat_read_guard on public.mensajes;
create policy thc_chat_read_guard on public.mensajes as restrictive for select to public using (emisor_id = (select auth.uid()) or receptor_id = (select auth.uid()));
drop policy if exists thc_chat_read on public.mensajes;
create policy thc_chat_read on public.mensajes for select to authenticated using (emisor_id = (select auth.uid()) or receptor_id = (select auth.uid()));
drop policy if exists thc_chat_insert_guard on public.mensajes;
create policy thc_chat_insert_guard on public.mensajes as restrictive for insert to public with check (
  emisor_id = (select auth.uid()) and emisor_id <> receptor_id
  and coalesce(length(contenido), 0) <= 10000
  and (length(btrim(coalesce(contenido, ''))) > 0 or imagen_url is not null)
  and (imagen_url is null or (imagen_url ~ '^https://[^[:space:]]+$' and length(imagen_url) <= 2048))
);
drop policy if exists thc_chat_insert on public.mensajes;
create policy thc_chat_insert on public.mensajes for insert to authenticated with check (emisor_id = (select auth.uid()) and emisor_id <> receptor_id);
drop policy if exists thc_chat_update_guard on public.mensajes;
create policy thc_chat_update_guard on public.mensajes as restrictive for update to public using (receptor_id = (select auth.uid())) with check (receptor_id = (select auth.uid()));
drop policy if exists thc_chat_update on public.mensajes;
create policy thc_chat_update on public.mensajes for update to authenticated using (receptor_id = (select auth.uid())) with check (receptor_id = (select auth.uid()));
drop policy if exists thc_chat_delete_guard on public.mensajes;
create policy thc_chat_delete_guard on public.mensajes as restrictive for delete to public using (emisor_id = (select auth.uid()));
drop policy if exists thc_chat_delete on public.mensajes;
create policy thc_chat_delete on public.mensajes for delete to authenticated using (emisor_id = (select auth.uid()));
create index if not exists thc_chat_receiver on public.mensajes(receptor_id, creado_en desc);
create index if not exists thc_chat_sender on public.mensajes(emisor_id, creado_en desc);

alter table public.amigos enable row level security;
revoke all on public.amigos from public, anon, authenticated;
grant select, delete on public.amigos to authenticated;
grant insert(user_id_1, user_id_2, estado) on public.amigos to authenticated;
grant update(estado) on public.amigos to authenticated;
drop policy if exists thc_friends_read_guard on public.amigos;
create policy thc_friends_read_guard on public.amigos as restrictive for select to public using (user_id_1 = (select auth.uid()) or user_id_2 = (select auth.uid()));
drop policy if exists thc_friends_read on public.amigos;
create policy thc_friends_read on public.amigos for select to authenticated using (user_id_1 = (select auth.uid()) or user_id_2 = (select auth.uid()));
drop policy if exists thc_friends_insert_guard on public.amigos;
create policy thc_friends_insert_guard on public.amigos as restrictive for insert to public with check (user_id_1 = (select auth.uid()) and user_id_1 <> user_id_2 and estado = 'pendiente');
drop policy if exists thc_friends_insert on public.amigos;
create policy thc_friends_insert on public.amigos for insert to authenticated with check (user_id_1 = (select auth.uid()) and user_id_1 <> user_id_2 and estado = 'pendiente');
drop policy if exists thc_friends_update_guard on public.amigos;
create policy thc_friends_update_guard on public.amigos as restrictive for update to public using (user_id_2 = (select auth.uid()) and estado = 'pendiente') with check (user_id_2 = (select auth.uid()) and estado = 'aceptado');
drop policy if exists thc_friends_update on public.amigos;
create policy thc_friends_update on public.amigos for update to authenticated using (user_id_2 = (select auth.uid()) and estado = 'pendiente') with check (user_id_2 = (select auth.uid()) and estado = 'aceptado');
drop policy if exists thc_friends_delete_guard on public.amigos;
create policy thc_friends_delete_guard on public.amigos as restrictive for delete to public using (user_id_1 = (select auth.uid()) or user_id_2 = (select auth.uid()));
drop policy if exists thc_friends_delete on public.amigos;
create policy thc_friends_delete on public.amigos for delete to authenticated using (user_id_1 = (select auth.uid()) or user_id_2 = (select auth.uid()));
create unique index if not exists thc_friends_pair_unique on public.amigos(least(user_id_1, user_id_2), greatest(user_id_1, user_id_2));

create or replace function public.thc_notificacion_valida(p_usuario uuid, p_actor uuid, p_tipo text, p_enlace uuid, p_comentario text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare texto text; apodo_destino text;
begin
  if p_actor is distinct from auth.uid() or p_usuario is null or p_usuario = p_actor then return false; end if;
  if p_tipo = 'solicitud_amistad' then
    return p_comentario is null and exists (
      select 1 from public.amigos where id = p_enlace and user_id_1 = p_actor and user_id_2 = p_usuario and estado = 'pendiente'
    );
  elsif p_tipo = 'comentario' then
    return exists (
      select 1 from public.foro_comentarios c join public.foro_publicaciones p on p.id = c.publicacion_id
      where c.id::text = p_comentario and c.publicacion_id = p_enlace and c.autor_id = p_actor
        and c.parent_id is null and c.estado = 'activo' and p.estado = 'activo' and p.autor_id = p_usuario
    );
  elsif p_tipo = 'respuesta' then
    return exists (
      select 1 from public.foro_comentarios c join public.foro_comentarios padre on padre.id = c.parent_id
      join public.foro_publicaciones p on p.id = c.publicacion_id
      where c.id::text = p_comentario and c.publicacion_id = p_enlace and padre.publicacion_id = p_enlace
        and c.autor_id = p_actor and padre.autor_id = p_usuario and padre.estado = 'activo' and c.estado = 'activo' and p.estado = 'activo'
    );
  elsif p_tipo = 'voto_post' then
    return p_comentario is null and exists (
      select 1 from public.votos_publicaciones v join public.foro_publicaciones p on p.id = v.publicacion_id
      where v.publicacion_id = p_enlace and v.usuario_id = p_actor and v.valor = 1 and p.autor_id = p_usuario and p.estado = 'activo'
    );
  elsif p_tipo = 'voto_comentario' then
    return exists (
      select 1 from public.votos_comentarios v join public.foro_comentarios c on c.id = v.comentario_id
      join public.foro_publicaciones p on p.id = c.publicacion_id
      where c.id::text = p_comentario and c.publicacion_id = p_enlace and v.usuario_id = p_actor and v.valor = 1
        and c.autor_id = p_usuario and c.estado = 'activo' and p.estado = 'activo'
    );
  elsif p_tipo = 'mencion' then
    if p_comentario is null then
      select contenido into texto from public.foro_publicaciones where id = p_enlace and autor_id = p_actor and estado = 'activo';
    else
      select c.contenido into texto from public.foro_comentarios c join public.foro_publicaciones p on p.id = c.publicacion_id
      where c.id::text = p_comentario and c.publicacion_id = p_enlace and c.autor_id = p_actor and c.estado = 'activo' and p.estado = 'activo';
    end if;
    select lower(regexp_replace(coalesce(nullif(apodo, ''), discord_nombre), '\s+', '', 'g')) into apodo_destino from public.perfiles where id = p_usuario;
    return coalesce(exists (select 1 from regexp_matches(texto, '@([A-Za-z0-9_!.]+)', 'g') as m(partes) where lower(m.partes[1]) = apodo_destino), false);
  end if;
  return false;
end;
$$;
revoke all on function public.thc_notificacion_valida(uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.thc_notificacion_valida(uuid, uuid, text, uuid, text) to authenticated;

alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from public, anon, authenticated;
grant select, delete on public.notificaciones to authenticated;
grant insert(usuario_id, actor_id, tipo, enlace_id, comentario_id, contenido) on public.notificaciones to authenticated;
grant update(leida) on public.notificaciones to authenticated;
drop policy if exists thc_notifications_guard on public.notificaciones;
create policy thc_notifications_guard on public.notificaciones as restrictive for select to public using (usuario_id = (select auth.uid()));
drop policy if exists thc_notifications_own on public.notificaciones;
drop policy if exists thc_notifications_read on public.notificaciones;
create policy thc_notifications_read on public.notificaciones for select to authenticated using (usuario_id = (select auth.uid()));
drop policy if exists thc_notifications_insert_guard on public.notificaciones;
create policy thc_notifications_insert_guard on public.notificaciones as restrictive for insert to authenticated with check (
  public.thc_notificacion_valida(usuario_id, actor_id, tipo, enlace_id, comentario_id)
  and (contenido is null or (tipo = 'solicitud_amistad' and contenido = 'te ha enviado una solicitud de amistad.'))
);
drop policy if exists thc_notifications_insert on public.notificaciones;
create policy thc_notifications_insert on public.notificaciones for insert to authenticated with check (actor_id = (select auth.uid()) and usuario_id <> (select auth.uid()));
drop policy if exists thc_notifications_update_guard on public.notificaciones;
create policy thc_notifications_update_guard on public.notificaciones as restrictive for update to public using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_notifications_update on public.notificaciones;
create policy thc_notifications_update on public.notificaciones for update to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_notifications_delete_guard on public.notificaciones;
create policy thc_notifications_delete_guard on public.notificaciones as restrictive for delete to public using (usuario_id = (select auth.uid()));
drop policy if exists thc_notifications_delete on public.notificaciones;
create policy thc_notifications_delete on public.notificaciones for delete to authenticated using (usuario_id = (select auth.uid()));
create index if not exists thc_notifications_receiver on public.notificaciones(usuario_id, creado_en desc);
create unique index if not exists thc_notifications_event_unique on public.notificaciones(usuario_id, actor_id, tipo, enlace_id, coalesce(comentario_id, ''));

alter table public.muro_publicaciones enable row level security;
alter table public.muro_votos enable row level security;
revoke all on public.muro_publicaciones, public.muro_votos from public, anon, authenticated;
grant select, delete on public.muro_publicaciones, public.muro_votos to authenticated;
grant insert(autor_id, titulo, descripcion, imagen_url) on public.muro_publicaciones to authenticated;
grant insert(publicacion_id, usuario_id, tipo) on public.muro_votos to authenticated;
grant update(tipo) on public.muro_votos to authenticated;
drop policy if exists thc_muro_read on public.muro_publicaciones;
create policy thc_muro_read on public.muro_publicaciones for select to authenticated using (true);
drop policy if exists thc_muro_own on public.muro_publicaciones;
create policy thc_muro_own on public.muro_publicaciones for all to authenticated using (autor_id = (select auth.uid())) with check (autor_id = (select auth.uid()));
drop policy if exists thc_muro_insert_guard on public.muro_publicaciones;
create policy thc_muro_insert_guard on public.muro_publicaciones as restrictive for insert to public with check (
  autor_id = (select auth.uid()) and length(btrim(titulo)) between 1 and 30 and length(btrim(descripcion)) between 1 and 100
  and imagen_url ~ '^https://[^[:space:]]+$' and length(imagen_url) <= 2048
);
drop policy if exists thc_muro_delete_guard on public.muro_publicaciones;
create policy thc_muro_delete_guard on public.muro_publicaciones as restrictive for delete to public using (autor_id = (select auth.uid()));
drop policy if exists thc_muro_votes_read on public.muro_votos;
create policy thc_muro_votes_read on public.muro_votos for select to authenticated using (true);
drop policy if exists thc_muro_votes_own on public.muro_votos;
create policy thc_muro_votes_own on public.muro_votos for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_muro_votes_insert_guard on public.muro_votos;
create policy thc_muro_votes_insert_guard on public.muro_votos as restrictive for insert to public with check (usuario_id = (select auth.uid()));
drop policy if exists thc_muro_votes_update_guard on public.muro_votos;
create policy thc_muro_votes_update_guard on public.muro_votos as restrictive for update to public using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy if exists thc_muro_votes_delete_guard on public.muro_votos;
create policy thc_muro_votes_delete_guard on public.muro_votos as restrictive for delete to public using (usuario_id = (select auth.uid()));
create unique index if not exists thc_muro_vote_unique on public.muro_votos(publicacion_id, usuario_id);
alter table public.muro_votos drop constraint if exists muro_votos_publicacion_id_fkey;
alter table public.muro_votos add constraint muro_votos_publicacion_id_fkey foreign key (publicacion_id) references public.muro_publicaciones(id) on delete cascade;

create or replace function public.thc_puede_leer_media(p_bucket text, p_nombre text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_bucket <> 'chat_media' or (
    auth.uid() is not null and (
      left(p_nombre, 37) in (auth.uid()::text || '_', auth.uid()::text || '/')
      or exists (
        select 1 from public.mensajes m
        where (m.emisor_id = auth.uid() or m.receptor_id = auth.uid())
          and left(p_nombre, 37) in (m.emisor_id::text || '_', m.emisor_id::text || '/')
          and right(m.imagen_url, length('/chat_media/' || p_nombre)) = '/chat_media/' || p_nombre
      )
    )
  );
$$;
revoke all on function public.thc_puede_leer_media(text, text) from public;
grant execute on function public.thc_puede_leer_media(text, text) to anon, authenticated;

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id in ('avatars', 'banners', 'muro_media', 'chat_media');
drop policy if exists thc_media_read_guard on storage.objects;
create policy thc_media_read_guard on storage.objects as restrictive for select to public using (public.thc_puede_leer_media(bucket_id, name));
drop policy if exists thc_chat_media_read on storage.objects;
create policy thc_chat_media_read on storage.objects for select to authenticated using (bucket_id = 'chat_media' and public.thc_puede_leer_media(bucket_id, name));
do $$
declare operation text;
begin
  foreach operation in array array['insert', 'update', 'delete'] loop
    execute format('drop policy if exists %I on storage.objects', 'thc_media_guard_' || operation);
    if operation = 'insert' then
      execute 'create policy thc_media_guard_insert on storage.objects as restrictive for insert to public with check (bucket_id not in (''avatars'', ''banners'', ''muro_media'', ''chat_media'') or ((select auth.uid()) is not null and left(name, 37) in ((select auth.uid())::text || ''_'', (select auth.uid())::text || ''/'')))';
    elsif operation = 'update' then
      execute 'create policy thc_media_guard_update on storage.objects as restrictive for update to public using (bucket_id not in (''avatars'', ''banners'', ''muro_media'', ''chat_media'') or ((select auth.uid()) is not null and left(name, 37) in ((select auth.uid())::text || ''_'', (select auth.uid())::text || ''/''))) with check (bucket_id not in (''avatars'', ''banners'', ''muro_media'', ''chat_media'') or ((select auth.uid()) is not null and left(name, 37) in ((select auth.uid())::text || ''_'', (select auth.uid())::text || ''/'')))';
    else
      execute 'create policy thc_media_guard_delete on storage.objects as restrictive for delete to public using (bucket_id not in (''avatars'', ''banners'', ''muro_media'', ''chat_media'') or ((select auth.uid()) is not null and left(name, 37) in ((select auth.uid())::text || ''_'', (select auth.uid())::text || ''/'')))';
    end if;
  end loop;
end;
$$;
drop policy if exists thc_media_owner on storage.objects;
create policy thc_media_owner on storage.objects for all to authenticated
using (bucket_id in ('avatars', 'banners', 'muro_media', 'chat_media') and left(name, 37) in ((select auth.uid())::text || '_', (select auth.uid())::text || '/'))
with check (bucket_id in ('avatars', 'banners', 'muro_media', 'chat_media') and left(name, 37) in ((select auth.uid())::text || '_', (select auth.uid())::text || '/'));

commit;

