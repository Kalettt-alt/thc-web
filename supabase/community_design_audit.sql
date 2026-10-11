select c.relname as tabla, c.relrowsecurity as rls_activo, c.relforcerowsecurity as rls_forzado
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos')
  and c.relkind in ('r', 'p')
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where (schemaname = 'public' and tablename in ('perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.role_column_grants
where table_schema = 'public'
  and table_name in ('perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, column_name, grantee, privilege_type;

select c.relname as tabla, t.tgname as trigger_nombre, t.tgenabled as habilitado,
       p.proname as funcion, p.prosecdef as security_definer, p.proconfig as configuracion_funcion,
       pg_catalog.pg_get_triggerdef(t.oid) as definicion
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname in ('perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos')
  and not t.tgisinternal
order by c.relname, t.tgname;

select tablename, indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename in ('foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos')
order by tablename, indexname;

select publicacion_id, usuario_id, count(*) as filas
from public.muro_votos
group by publicacion_id, usuario_id
having count(*) > 1
order by filas desc;

select c.conname, c.convalidated as validada, pg_catalog.pg_get_constraintdef(c.oid) as definicion
from pg_catalog.pg_constraint c
where c.conrelid = 'public.muro_votos'::regclass
  and c.contype = 'f'
order by c.conname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'muro_media';
