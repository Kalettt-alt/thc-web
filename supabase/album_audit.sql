select c.relname as tabla, c.relrowsecurity as rls_activado, c.relforcerowsecurity as rls_forzado
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('perfiles', 'inventario_cromos', 'intercambios_album', 'album_pesos');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename in ('perfiles', 'inventario_cromos', 'intercambios_album', 'album_pesos')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('perfiles', 'inventario_cromos', 'intercambios_album', 'album_pesos')
order by table_name, grantee, privilege_type;

select grantee, table_name, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public' and table_name in ('perfiles', 'inventario_cromos', 'intercambios_album', 'album_pesos')
order by table_name, column_name, grantee;

select user_id, cromo_id, count(*) as filas, sum(cantidad) as cantidad_total, bool_or(pegada) as tiene_pegada
from public.inventario_cromos group by user_id, cromo_id having count(*) > 1 order by user_id, cromo_id;

select id, user_id, cromo_id, cantidad, pegada
from public.inventario_cromos where cantidad is null or cantidad < 0 or pegada is null or (pegada and cantidad < 1)
order by user_id, cromo_id;

with catalogo as (
  select categorias.prefijo || '_' || pg_catalog.lpad(serie.numero::text, 3, '0') as cromo_id
  from (values ('U', 80), ('V', 10), ('JR', 10), ('BL', 20), ('ES', 20), ('S', 20), ('M', 30)) as categorias(prefijo, total)
  cross join lateral pg_catalog.generate_series(1, categorias.total) as serie(numero)
)
select i.id, i.user_id, i.cromo_id, i.cantidad, i.pegada
from public.inventario_cromos i where not exists(select 1 from catalogo c where c.cromo_id = i.cromo_id)
order by i.user_id, i.cromo_id;

select id, sobres_disponibles from public.perfiles where sobres_disponibles is null or sobres_disponibles < 0;
select cromo_id, peso from public.album_pesos where peso is null or peso < 0 order by cromo_id;

select id, user_id_ofrece, cromo_ofrece, cromo_pide, estado, user_id_acepta, fecha_creacion, fecha_expiracion,
  coalesce(pg_catalog.to_jsonb(i)->>'version_mercado', '1') as version_mercado,
  fecha_expiracion <= pg_catalog.now() as vencida
from public.intercambios_album i
where estado = 'activo' and coalesce(pg_catalog.to_jsonb(i)->>'version_mercado', '1') = '1'
order by user_id_ofrece, fecha_creacion;

select coalesce(pg_catalog.to_jsonb(i)->>'version_mercado', '1') as version_mercado,
  estado, count(*) as cantidad,
  count(*) filter(where fecha_expiracion <= pg_catalog.now()) as vencidas
from public.intercambios_album i group by coalesce(pg_catalog.to_jsonb(i)->>'version_mercado', '1'), estado
order by version_mercado, estado;

select p.oid::regprocedure as funcion, p.prosecdef as security_definer,
  pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as ejecutable_anon,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as ejecutable_authenticated,
  pg_catalog.pg_get_functiondef(p.oid) as definicion
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname in ('abrir_sobre_album', 'pegar_cromo', 'crear_oferta_mercado', 'cancelar_oferta_mercado', 'aceptar_oferta_mercado',
      'abrir_sobre_album_v2', 'pegar_cromo_v2', 'crear_oferta_album_v2', 'cancelar_oferta_album_v2', 'aceptar_oferta_album_v2')
    or pg_catalog.pg_get_functiondef(p.oid) ~* '(inventario_cromos|intercambios_album|sobres_disponibles|abrir_sobre_album|pegar_cromo|crear_oferta_mercado|cancelar_oferta_mercado|aceptar_oferta_mercado)')
order by p.proname, p.oid;

select c.relname as tabla, t.tgname as trigger, pg_catalog.pg_get_triggerdef(t.oid) as definicion,
  pg_catalog.pg_get_functiondef(t.tgfoid) as funcion
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
where t.tgrelid in ('public.perfiles'::regclass, 'public.inventario_cromos'::regclass, 'public.intercambios_album'::regclass, 'public.album_pesos'::regclass)
  and not t.tgisinternal order by c.relname, t.tgname;

select tablename, indexname, indexdef from pg_catalog.pg_indexes
where schemaname = 'public' and tablename in ('inventario_cromos', 'intercambios_album', 'album_pesos')
order by tablename, indexname;
