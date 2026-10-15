-- THC · Muro · 3 fotos por ciclo de 7 días · 13 de octubre de 2026.
-- Copia TODO este archivo en el SQL Editor de Supabase, como postgres.
-- El muro conserva todas las fotos históricas. Solo cuentan las fotos que
-- siguen publicadas en el ciclo actual de cada usuario.
-- Borrar libera un cupo. Si se borra la primera, los 7 días empiezan en la
-- siguiente foto de ese ciclo. Si se borran todas, se puede empezar de nuevo.
-- Al vencer el ciclo, la próxima foto abre otro; las fotos anteriores siguen
-- visibles y nunca vuelven a consumir los cupos del nuevo ciclo.
-- Incluye RLS, bloqueo por usuario, fecha del servidor y Storage propio.
-- Borrar una foto propia también borra sus votos mediante ON DELETE CASCADE.
-- No borra publicaciones ni cambia perfiles, nombres, rangos o amigos.
-- Puede ejecutarse otra vez. Publica también el frontend actualizado.
-- Referencias: https://supabase.com/docs/guides/database/postgres/row-level-security
-- https://www.postgresql.org/docs/current/trigger-datachanges.html
begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $preflight$
begin
  if pg_catalog.to_regclass('public.muro_publicaciones') is null or pg_catalog.to_regclass('public.muro_votos') is null
    or pg_catalog.to_regclass('auth.users') is null then
    raise exception 'Faltan muro_publicaciones, muro_votos o auth.users. Este parche requiere el Muro existente.';
  end if;
  if pg_catalog.to_regclass('storage.buckets') is null or pg_catalog.to_regclass('storage.objects') is null then
    raise exception 'Falta Supabase Storage. No se cambió el Muro.';
  end if;
  if not exists (select 1 from pg_catalog.pg_class where oid = 'storage.objects'::regclass and relrowsecurity) then
    raise exception 'Storage debe conservar RLS activo.';
  end if;
  if exists(select 1 from public.muro_publicaciones where creado_en is null or autor_id is null) then
    raise exception 'Hay fotos sin autor o fecha en el Muro. Revísalas antes de instalar el límite; no se borró nada.';
  end if;
end;
$preflight$;

create schema if not exists thc_muro_private;
revoke all on schema thc_muro_private from public, anon, authenticated;
create table if not exists thc_muro_private.ciclos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciclo uuid not null default gen_random_uuid(),
  revision bigint not null default 0
);
alter table thc_muro_private.ciclos enable row level security;
revoke all on thc_muro_private.ciclos from public, anon, authenticated;
alter table public.muro_publicaciones add column if not exists cuota_ciclo uuid;
create index if not exists thc_muro_quota_cycle on public.muro_publicaciones(autor_id, cuota_ciclo, creado_en);
create index if not exists thc_muro_feed on public.muro_publicaciones(creado_en desc, id desc);

-- Asigna las fotos existentes sin borrar ni alterar sus fechas. El bloqueo
-- evita que una subida concurrente quede fuera de la asignación inicial.
lock table public.muro_publicaciones in share row exclusive mode;
do $bootstrap$
declare
  autor uuid;
  foto record;
  inicio timestamptz;
  ciclo_id uuid;
begin
  for autor in select distinct autor_id from public.muro_publicaciones where cuota_ciclo is null loop
    inicio := null;
    ciclo_id := gen_random_uuid();
    for foto in select id, creado_en from public.muro_publicaciones
      where autor_id = autor and cuota_ciclo is null order by creado_en, id loop
      if inicio is null or foto.creado_en >= inicio + interval '168 hours' then
        inicio := foto.creado_en;
        ciclo_id := gen_random_uuid();
      end if;
      update public.muro_publicaciones set cuota_ciclo = ciclo_id where id = foto.id;
    end loop;
    insert into thc_muro_private.ciclos(user_id, ciclo) values (autor, ciclo_id)
    on conflict(user_id) do update set ciclo = excluded.ciclo, revision = thc_muro_private.ciclos.revision + 1;
  end loop;
end;
$bootstrap$;

create or replace function thc_muro_private.guard_publicacion()
returns trigger language plpgsql volatile security definer set search_path = '' as $function$
declare
  usuario uuid;
  ciclo_id uuid;
  inicio timestamptz;
  cantidad integer;
  ahora timestamptz;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and (new.id, new.autor_id, new.creado_en, new.cuota_ciclo)
      is distinct from (old.id, old.autor_id, old.creado_en, old.cuota_ciclo) then
      raise exception using errcode = '42501', message = 'No se puede alterar el autor, la fecha o el ciclo de una foto.';
    end if;
    return new;
  end if;
  usuario := case when tg_op = 'DELETE' then old.autor_id else new.autor_id end;
  if auth.uid() is not null and auth.uid() <> usuario then
    raise exception using errcode = '42501', message = 'Solo puedes modificar tus fotos del Muro.';
  end if;
  insert into thc_muro_private.ciclos(user_id) values(usuario) on conflict(user_id) do nothing;
  -- Una actualización de la misma fila serializa subidas y borrados del autor.
  -- También provoca un conflicto de serialización en REPEATABLE READ, evitando
  -- aprobar cupos con una instantánea antigua después de esperar el bloqueo.
  update thc_muro_private.ciclos set revision = revision + 1 where user_id = usuario returning ciclo into ciclo_id;
  if tg_op = 'DELETE' then return old; end if;
  ahora := clock_timestamp();
  select min(creado_en), count(*) into inicio, cantidad
    from public.muro_publicaciones where autor_id = usuario and cuota_ciclo = ciclo_id;
  if inicio is null or ahora >= inicio + interval '168 hours' then
    ciclo_id := gen_random_uuid();
    update thc_muro_private.ciclos set ciclo = ciclo_id where user_id = usuario;
    cantidad := 0;
  end if;
  if cantidad >= 3 then
    raise exception using errcode = 'P0001', message = 'THC_MURO_WEEKLY_LIMIT',
      detail = 'Puedes mantener hasta 3 fotos en este ciclo de 7 días. Borra una o espera al próximo ciclo.';
  end if;
  new.creado_en := ahora;
  new.cuota_ciclo := ciclo_id;
  return new;
end;
$function$;
revoke all on function thc_muro_private.guard_publicacion() from public, anon, authenticated;
drop trigger if exists thc_muro_weekly_guard on public.muro_publicaciones;
create trigger thc_muro_weekly_guard before insert or delete or update on public.muro_publicaciones
  for each row execute function thc_muro_private.guard_publicacion();

create or replace function public.thc_muro_cupo()
returns jsonb language plpgsql volatile security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  inicio timestamptz;
  cantidad integer := 0;
  ahora timestamptz := clock_timestamp();
begin
  if usuario is null then raise exception using errcode = '42501', message = 'Inicia sesión para consultar tus cupos.'; end if;
  select min(p.creado_en), count(p.id) into inicio, cantidad
    from public.muro_publicaciones p join thc_muro_private.ciclos c
      on c.user_id = p.autor_id and c.ciclo = p.cuota_ciclo where p.autor_id = usuario;
  if inicio is null or ahora >= inicio + interval '168 hours' then
    inicio := null;
    cantidad := 0;
  end if;
  return jsonb_build_object('limite', 3, 'usadas', cantidad, 'disponibles', greatest(0, 3 - cantidad),
    'inicio', inicio, 'reinicio', case when inicio is null then null else inicio + interval '168 hours' end, 'ahora', ahora);
end;
$function$;
revoke all on function public.thc_muro_cupo() from public, anon, authenticated;
grant execute on function public.thc_muro_cupo() to authenticated;

alter table public.muro_publicaciones enable row level security;
alter table public.muro_votos enable row level security;
-- Reutiliza la corrección del Muro existente, conservando nombre, ON UPDATE,
-- MATCH, DEFERRABLE y comentario de la FK. Evita que los votos bloqueen el
-- borrado de una foto y, por tanto, impidan liberar su cupo.
do $vote_cascade$
declare
  publicacion_col smallint;
  id_col smallint;
  cantidad integer;
  fk record;
  actualizacion text;
  coincidencia text;
  diferible text;
  comentario text;
begin
  select attnum into publicacion_col from pg_catalog.pg_attribute
    where attrelid = 'public.muro_votos'::regclass and attname = 'publicacion_id' and not attisdropped;
  select attnum into id_col from pg_catalog.pg_attribute
    where attrelid = 'public.muro_publicaciones'::regclass and attname = 'id' and not attisdropped;
  if publicacion_col is null or id_col is null then raise exception 'Faltan las columnas de la FK de votos del Muro.'; end if;
  select count(*) into cantidad from pg_catalog.pg_constraint
    where conrelid = 'public.muro_votos'::regclass and contype = 'f' and publicacion_col = any(conkey);
  if cantidad <> 1 then raise exception 'Se esperaba una sola FK para muro_votos.publicacion_id; se encontraron %.', cantidad; end if;
  select c.* into fk from pg_catalog.pg_constraint c
    where c.conrelid = 'public.muro_votos'::regclass and c.contype = 'f'
    and c.confrelid = 'public.muro_publicaciones'::regclass
    and c.conkey = array[publicacion_col] and c.confkey = array[id_col];
  if not found then raise exception 'La FK de votos no apunta exactamente al ID de muro_publicaciones.'; end if;
  if fk.confdeltype = 'c' then return; end if;
  if not fk.convalidated or not fk.conislocal or fk.coninhcount <> 0 or fk.conparentid <> 0
    or coalesce((to_jsonb(fk)->>'conperiod')::boolean, false)
    or not coalesce((to_jsonb(fk)->>'conenforced')::boolean, true) then
    raise exception 'La FK tiene propiedades especiales que necesitan revisión. No se cambió nada.';
  end if;
  actualizacion := case fk.confupdtype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end;
  coincidencia := case fk.confmatchtype when 's' then 'SIMPLE' when 'f' then 'FULL' end;
  diferible := case when fk.condeferrable then case when fk.condeferred then 'DEFERRABLE INITIALLY DEFERRED'
    else 'DEFERRABLE INITIALLY IMMEDIATE' end else 'NOT DEFERRABLE' end;
  if actualizacion is null or coincidencia is null or (fk.condeferred and not fk.condeferrable) then
    raise exception 'La FK tiene acciones desconocidas. No se cambió nada.';
  end if;
  comentario := pg_catalog.obj_description(fk.oid, 'pg_constraint');
  execute format('alter table public.muro_votos drop constraint %I', fk.conname);
  execute format('alter table public.muro_votos add constraint %I foreign key (publicacion_id) references public.muro_publicaciones(id) match %s on update %s on delete cascade %s',
    fk.conname, coincidencia, actualizacion, diferible);
  if comentario is not null then execute format('comment on constraint %I on public.muro_votos is %L', fk.conname, comentario); end if;
end;
$vote_cascade$;
-- El cliente no puede enviar una fecha antigua ni elegir un ciclo ajeno.
do $column_grants$
declare columnas text;
begin
  select string_agg(format('%I', attname), ', ') into columnas from pg_catalog.pg_attribute
    where attrelid = 'public.muro_publicaciones'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke insert (%s), update (%s) on public.muro_publicaciones from public, anon, authenticated', columnas, columnas);
end;
$column_grants$;
revoke insert, update, delete on public.muro_publicaciones from public, anon, authenticated;
grant select, delete on public.muro_publicaciones to authenticated;
grant insert(autor_id, titulo, descripcion, imagen_url) on public.muro_publicaciones to authenticated;
drop policy if exists thc_muro_quota_read on public.muro_publicaciones;
create policy thc_muro_quota_read on public.muro_publicaciones for select to authenticated using(true);
drop policy if exists thc_muro_quota_insert_guard on public.muro_publicaciones;
create policy thc_muro_quota_insert_guard on public.muro_publicaciones as restrictive for insert to public with check(
  autor_id = (select auth.uid()) and length(btrim(titulo)) between 1 and 30
  and length(btrim(descripcion)) between 1 and 100 and length(imagen_url) <= 2048 and imagen_url ~ '^https://[^[:space:]]+$'
);
drop policy if exists thc_muro_quota_insert on public.muro_publicaciones;
create policy thc_muro_quota_insert on public.muro_publicaciones for insert to authenticated with check(autor_id = (select auth.uid()));
drop policy if exists thc_muro_quota_delete_guard on public.muro_publicaciones;
create policy thc_muro_quota_delete_guard on public.muro_publicaciones as restrictive for delete to public using(autor_id = (select auth.uid()));
drop policy if exists thc_muro_quota_delete on public.muro_publicaciones;
create policy thc_muro_quota_delete on public.muro_publicaciones for delete to authenticated using(autor_id = (select auth.uid()));
drop policy if exists thc_muro_quota_update_guard on public.muro_publicaciones;
create policy thc_muro_quota_update_guard on public.muro_publicaciones as restrictive for update to public using(false) with check(false);

-- Mantiene el formato de archivos ya utilizado por la web: <uid>_<uuid>.<ext>.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('muro_media', 'muro_media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists thc_muro_media_insert_guard on storage.objects;
create policy thc_muro_media_insert_guard on storage.objects as restrictive for insert to public with check(
  bucket_id <> 'muro_media' or ((select auth.uid()) is not null and name ~
    ('^' || (select auth.uid())::text || '_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](png|jpg|webp|gif)$'))
);
drop policy if exists thc_muro_media_insert on storage.objects;
create policy thc_muro_media_insert on storage.objects for insert to authenticated with check(
  bucket_id = 'muro_media' and left(name,37) = (select auth.uid())::text || '_'
);
drop policy if exists thc_muro_media_read on storage.objects;
drop policy if exists thc_muro_media_read_guard on storage.objects;
create policy thc_muro_media_read_guard on storage.objects as restrictive for select to public using(
  bucket_id <> 'muro_media' or left(name,37) = (select auth.uid())::text || '_'
);
create policy thc_muro_media_read on storage.objects for select to authenticated using(
  bucket_id = 'muro_media' and left(name,37) = (select auth.uid())::text || '_'
);
drop policy if exists thc_muro_media_delete_guard on storage.objects;
create policy thc_muro_media_delete_guard on storage.objects as restrictive for delete to public using(
  bucket_id <> 'muro_media' or left(name,37) = (select auth.uid())::text || '_'
);
drop policy if exists thc_muro_media_delete on storage.objects;
create policy thc_muro_media_delete on storage.objects for delete to authenticated using(
  bucket_id = 'muro_media' and left(name,37) = (select auth.uid())::text || '_'
);
drop policy if exists thc_muro_media_update_guard on storage.objects;
create policy thc_muro_media_update_guard on storage.objects as restrictive for update to public
  using(bucket_id <> 'muro_media') with check(bucket_id <> 'muro_media');
commit;

-- Verificación opcional: aparece una fila con el trigger de límite instalado.
select tgname, tgenabled from pg_catalog.pg_trigger where tgrelid = 'public.muro_publicaciones'::regclass
  and tgname = 'thc_muro_weekly_guard';
