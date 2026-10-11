begin;

do $$
declare item text; columnas text;
begin
  foreach item in array array['perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios'] loop
    select string_agg(format('%I', attname), ', ') into columnas
    from pg_catalog.pg_attribute
    where attrelid = format('public.%I', item)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke all (%s) on table public.%I from public, anon, authenticated', columnas, item);
  end loop;
end;
$$;

create or replace function public.thc_es_moderador()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.perfiles where id = (select auth.uid()) and nivel_rol >= 40);
$$;
revoke all on function public.thc_es_moderador() from public, anon;
grant execute on function public.thc_es_moderador() to authenticated;

create or replace function public.thc_proteger_perfil()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') or auth.role() in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.id is distinct from auth.uid() or coalesce(new.nivel_rol, 0) <> 0 then
        raise exception 'La identidad y los roles se asignan en el servidor';
      end if;
    elsif new.id is distinct from old.id or new.nivel_rol is distinct from old.nivel_rol then
      raise exception 'No puedes modificar la identidad ni el rol administrativo';
    end if;
  end if;
  if current_user in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and coalesce(new.sobres_disponibles, 0) <> 0)
      or (tg_op = 'UPDATE' and new.sobres_disponibles is distinct from old.sobres_disponibles) then
      raise exception 'Los sobres se asignan en el servidor';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.thc_proteger_perfil() from public, anon, authenticated;
drop trigger if exists thc_proteger_perfil on public.perfiles;
create trigger thc_proteger_perfil before insert or update on public.perfiles
for each row execute function public.thc_proteger_perfil();

alter table public.perfiles enable row level security;
revoke all on public.perfiles from public, anon, authenticated;
revoke update(id, discord_nombre, nivel_rol, sobres_disponibles) on public.perfiles from public, anon, authenticated;
grant select on public.perfiles to authenticated;
grant insert(id, discord_nombre, apodo, avatar_url) on public.perfiles to authenticated;
grant update(discord_nombre, apodo, avatar_url, bio, posicion, ultimo_cambio_apodo, perfil_publico, banner_url,
  widget_1, widget_2, banner_pos_y, avatar_scale, avatar_pos_x, avatar_pos_y, cancion_url,
  tema_perfil, color_pixel) on public.perfiles to authenticated;
drop policy if exists thc_perfil_insert_guard on public.perfiles;
create policy thc_perfil_insert_guard on public.perfiles as restrictive for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists thc_perfil_update_guard on public.perfiles;
create policy thc_perfil_update_guard on public.perfiles as restrictive for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists thc_perfil_read_guard on public.perfiles;
create policy thc_perfil_read_guard on public.perfiles as restrictive for select to public
using (id = (select auth.uid()) or coalesce(perfil_publico, true) or (select case when auth.role() = 'authenticated' then public.thc_es_moderador() else false end));

drop policy if exists thc_perfil_read on public.perfiles;
create policy thc_perfil_read on public.perfiles for select to authenticated using (true);
drop policy if exists thc_perfil_insert on public.perfiles;
create policy thc_perfil_insert on public.perfiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists thc_perfil_update on public.perfiles;
create policy thc_perfil_update on public.perfiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.foro_publicaciones enable row level security;
alter table public.foro_comentarios enable row level security;
alter table public.votos_publicaciones enable row level security;
alter table public.votos_comentarios enable row level security;
revoke all on public.foro_publicaciones, public.foro_comentarios, public.votos_publicaciones, public.votos_comentarios from public, anon, authenticated;
revoke insert, update on public.foro_publicaciones, public.foro_comentarios from authenticated;
revoke update(puntuacion, autor_id, id) on public.foro_publicaciones, public.foro_comentarios from authenticated;
grant select, delete on public.foro_publicaciones, public.foro_comentarios to authenticated;
grant insert(autor_id, titulo, contenido, imagenes, etiqueta) on public.foro_publicaciones to authenticated;
grant update(titulo, contenido, imagenes, etiqueta, estado, actualizado_en) on public.foro_publicaciones to authenticated;
grant insert(publicacion_id, autor_id, contenido, imagenes, parent_id) on public.foro_comentarios to authenticated;
grant update(contenido, imagenes, estado) on public.foro_comentarios to authenticated;
grant select, delete on public.votos_publicaciones, public.votos_comentarios to authenticated;
grant insert(publicacion_id, usuario_id, valor) on public.votos_publicaciones to authenticated;
grant insert(comentario_id, usuario_id, valor) on public.votos_comentarios to authenticated;
grant update(publicacion_id, usuario_id, valor) on public.votos_publicaciones to authenticated;
grant update(comentario_id, usuario_id, valor) on public.votos_comentarios to authenticated;

do $$
declare item text;
begin
  foreach item in array array['foro_publicaciones', 'foro_comentarios'] loop
    execute format('drop policy if exists thc_foro_read_guard on public.%I', item);
    execute format('create policy thc_foro_read_guard on public.%I as restrictive for select to authenticated using (estado = ''activo'' or autor_id = (select auth.uid()) or (select public.thc_es_moderador()))', item);
    execute format('drop policy if exists thc_foro_read on public.%I', item);
    execute format('create policy thc_foro_read on public.%I for select to authenticated using (true)', item);
    execute format('drop policy if exists thc_foro_insert_guard on public.%I', item);
    execute format('create policy thc_foro_insert_guard on public.%I as restrictive for insert to authenticated with check (autor_id = (select auth.uid()))', item);
    execute format('drop policy if exists thc_foro_insert on public.%I', item);
    execute format('create policy thc_foro_insert on public.%I for insert to authenticated with check (autor_id = (select auth.uid()))', item);
    execute format('drop policy if exists thc_foro_update_guard on public.%I', item);
    execute format('create policy thc_foro_update_guard on public.%I as restrictive for update to authenticated using (autor_id = (select auth.uid()) or (select public.thc_es_moderador())) with check (autor_id = (select auth.uid()) or (select public.thc_es_moderador()))', item);
    execute format('drop policy if exists thc_foro_update on public.%I', item);
    execute format('create policy thc_foro_update on public.%I for update to authenticated using (autor_id = (select auth.uid()) or (select public.thc_es_moderador())) with check (autor_id = (select auth.uid()) or (select public.thc_es_moderador()))', item);
    execute format('drop policy if exists thc_foro_delete_guard on public.%I', item);
    execute format('create policy thc_foro_delete_guard on public.%I as restrictive for delete to authenticated using (autor_id = (select auth.uid()) or (select public.thc_es_moderador()))', item);
    execute format('drop policy if exists thc_foro_delete on public.%I', item);
    execute format('create policy thc_foro_delete on public.%I for delete to authenticated using (autor_id = (select auth.uid()) or (select public.thc_es_moderador()))', item);
  end loop;
  foreach item in array array['votos_publicaciones', 'votos_comentarios'] loop
    execute format('drop policy if exists thc_votos_guard on public.%I', item);
    execute format('create policy thc_votos_guard on public.%I as restrictive for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()))', item);
    execute format('drop policy if exists thc_votos_own on public.%I', item);
    execute format('create policy thc_votos_own on public.%I for all to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()))', item);
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid = t.tgfoid
    where t.tgrelid in ('public.votos_publicaciones'::regclass, 'public.votos_comentarios'::regclass)
      and not t.tgisinternal and t.tgname <> 'thc_votos_puntuacion'
      and pg_catalog.pg_get_functiondef(p.oid) ilike '%puntuacion%'
  ) then
    raise exception 'Ya existen triggers de puntuación: revisa audit_security.sql antes de reemplazarlos';
  end if;
end;
$$;

drop policy if exists thc_comment_post_guard on public.foro_comentarios;
create policy thc_comment_post_guard on public.foro_comentarios as restrictive for select to authenticated
using (exists (select 1 from public.foro_publicaciones p where p.id = foro_comentarios.publicacion_id));
create or replace function public.thc_actualizar_puntuacion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'votos_publicaciones' then
    if tg_op <> 'INSERT' then update public.foro_publicaciones set puntuacion = coalesce(puntuacion, 0) - old.valor where id = old.publicacion_id; end if;
    if tg_op <> 'DELETE' then update public.foro_publicaciones set puntuacion = coalesce(puntuacion, 0) + new.valor where id = new.publicacion_id; end if;
  else
    if tg_op <> 'INSERT' then update public.foro_comentarios set puntuacion = coalesce(puntuacion, 0) - old.valor where id = old.comentario_id; end if;
    if tg_op <> 'DELETE' then update public.foro_comentarios set puntuacion = coalesce(puntuacion, 0) + new.valor where id = new.comentario_id; end if;
  end if;
  return null;
end;
$$;
revoke all on function public.thc_actualizar_puntuacion() from public, anon, authenticated;
drop trigger if exists thc_votos_puntuacion on public.votos_publicaciones;
create trigger thc_votos_puntuacion after insert or update or delete on public.votos_publicaciones for each row execute function public.thc_actualizar_puntuacion();
drop trigger if exists thc_votos_puntuacion on public.votos_comentarios;
create trigger thc_votos_puntuacion after insert or update or delete on public.votos_comentarios for each row execute function public.thc_actualizar_puntuacion();

update public.foro_publicaciones p set puntuacion = coalesce((select sum(valor) from public.votos_publicaciones v where v.publicacion_id = p.id), 0);
update public.foro_comentarios c set puntuacion = coalesce((select sum(valor) from public.votos_comentarios v where v.comentario_id = c.id), 0);


create or replace function public.thc_validar_hilo_comentario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.publicacion_id is distinct from old.publicacion_id or new.parent_id is distinct from old.parent_id then
    if auth.role() in ('anon', 'authenticated') and not exists (
      select 1 from public.foro_publicaciones where id = new.publicacion_id and estado = 'activo'
    ) then raise exception 'La publicación no está disponible para comentar'; end if;
    if new.parent_id is not null and not exists (
      select 1 from public.foro_comentarios where id = new.parent_id and publicacion_id = new.publicacion_id and estado = 'activo'
    ) then raise exception 'La respuesta debe pertenecer a la misma publicación'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.thc_validar_hilo_comentario() from public, anon, authenticated;
drop trigger if exists thc_validar_hilo_comentario on public.foro_comentarios;
create trigger thc_validar_hilo_comentario before insert or update of publicacion_id, parent_id on public.foro_comentarios
for each row execute function public.thc_validar_hilo_comentario();

create index if not exists thc_foro_feed on public.foro_publicaciones(estado, creado_en desc);
create index if not exists thc_foro_comentarios_post on public.foro_comentarios(publicacion_id, creado_en);
commit;




