-- THC · Imágenes del Foro · 12 de octubre de 2026.
-- Copia TODO el archivo en el SQL Editor de Supabase y ejecútalo como postgres.
-- Crea foro_media: imágenes públicas de hasta 5 MiB, PNG/JPEG/WebP/GIF.
-- La web sube con sesión a <auth.uid()>/foro/<uuid>.<ext>, sin sobrescribir.
-- Solo el dueño puede subir y borrar sus archivos; otros buckets conservan sus políticas.
-- No modifica datos de perfiles, nombres, amigos, publicaciones, comentarios ni votos.
-- Permite IDs UUID enviados por la web para recuperar un envío sin crear duplicados.
-- Las URLs públicas sirven las imágenes sin dar acceso al listado de borradores ajenos.
-- Puede ejecutarse otra vez. Publica también el frontend actualizado.
-- Referencia: https://supabase.com/docs/guides/storage/security/access-control
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  item text;
begin
  if pg_catalog.to_regclass('storage.buckets') is null or pg_catalog.to_regclass('storage.objects') is null then
    raise exception 'Falta Supabase Storage. Este parche requiere storage.buckets y storage.objects';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class where oid = 'storage.objects'::regclass and relrowsecurity
  ) then
    raise exception 'Storage debe tener RLS activo antes de instalar este parche';
  end if;
  foreach item in array array['foro_publicaciones', 'foro_comentarios'] loop
    if pg_catalog.to_regclass('public.' || item) is null then
      raise exception 'Falta public.%; este parche requiere el Foro existente', item;
    end if;
    if not exists (
      select 1 from pg_catalog.pg_class where oid = pg_catalog.to_regclass('public.' || item) and relrowsecurity
    ) then
      raise exception 'Activa y revisa primero el RLS de public.% antes de subir imágenes', item;
    end if;
  end loop;
end;
$preflight$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foro_media', 'foro_media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Los guards restrictivos se aplican solamente a foro_media. Una política amplia anterior
-- no puede permitir subir, sobrescribir o borrar archivos de otro usuario en este bucket.
drop policy if exists thc_forum_media_insert_guard on storage.objects;
create policy thc_forum_media_insert_guard on storage.objects
as restrictive for insert to public
with check (
  bucket_id <> 'foro_media'
  or (
    (select auth.uid()) is not null
    and name ~ ('^' || (select auth.uid())::text || '/foro/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp|gif)$')
  )
);

drop policy if exists thc_forum_media_insert on storage.objects;
create policy thc_forum_media_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'foro_media'
  and name ~ ('^' || (select auth.uid())::text || '/foro/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp|gif)$')
);

-- Cada subida recibe una ruta nueva: no se permite UPDATE, upsert ni mover otra imagen aquí.
drop policy if exists thc_forum_media_update_guard on storage.objects;
create policy thc_forum_media_update_guard on storage.objects
as restrictive for update to public
using (bucket_id <> 'foro_media')
with check (bucket_id <> 'foro_media');

drop policy if exists thc_forum_media_delete_guard on storage.objects;
create policy thc_forum_media_delete_guard on storage.objects
as restrictive for delete to public
using (
  bucket_id <> 'foro_media'
  or ((select auth.uid()) is not null and split_part(name, '/', 1) = (select auth.uid())::text)
);

drop policy if exists thc_forum_media_delete on storage.objects;
create policy thc_forum_media_delete on storage.objects
for delete to authenticated
using (bucket_id = 'foro_media' and split_part(name, '/', 1) = (select auth.uid())::text);

-- Storage DELETE requiere SELECT sobre los objetos propios; las URLs públicas no requieren
-- una policy SELECT pública ni dejan consultar metadatos de archivos pendientes de otros.
drop policy if exists thc_forum_media_select_guard on storage.objects;
create policy thc_forum_media_select_guard on storage.objects
as restrictive for select to public
using (
  bucket_id <> 'foro_media'
  or ((select auth.uid()) is not null and split_part(name, '/', 1) = (select auth.uid())::text)
);

drop policy if exists thc_forum_media_select on storage.objects;
create policy thc_forum_media_select on storage.objects
for select to authenticated
using (bucket_id = 'foro_media' and split_part(name, '/', 1) = (select auth.uid())::text);

-- Los otros permisos del Foro siguen vigentes. Se conceden únicamente las columnas usadas
-- para imágenes y el UUID de recuperación, nunca roles, puntuaciones ni autoría de otros.
grant insert (id, imagenes) on public.foro_publicaciones to authenticated;
grant insert (id, imagenes) on public.foro_comentarios to authenticated;

drop policy if exists thc_forum_upload_author_guard on public.foro_publicaciones;
create policy thc_forum_upload_author_guard on public.foro_publicaciones
as restrictive for insert to authenticated
with check (autor_id = (select auth.uid()));

drop policy if exists thc_forum_upload_author_guard on public.foro_comentarios;
create policy thc_forum_upload_author_guard on public.foro_comentarios
as restrictive for insert to authenticated
with check (autor_id = (select auth.uid()));

commit;
