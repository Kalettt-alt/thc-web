begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $preflight$
declare
  item text;
  unsafe_functions text;
  legacy_active boolean;
  unsafe_triggers text;
begin
  foreach item in array array['perfiles', 'inventario_cromos', 'intercambios_album', 'album_pesos'] loop
    if pg_catalog.to_regclass('public.' || item) is null then
      raise exception 'Falta la tabla %; este archivo requiere el esquema existente del proyecto', item;
    end if;
  end loop;
  lock table public.inventario_cromos, public.intercambios_album, public.album_pesos in share row exclusive mode;
  if exists(select 1 from pg_catalog.pg_attribute where attrelid = 'public.intercambios_album'::regclass and attname = 'version_mercado' and not attisdropped) then
    execute 'select exists(select 1 from public.intercambios_album where estado = ''activo'' and version_mercado = 1)' into legacy_active;
  else
    select exists(select 1 from public.intercambios_album where estado = 'activo') into legacy_active;
  end if;
  if legacy_active then
    raise exception 'Hay ofertas activas del mercado anterior. Cancélalas con la versión anterior y verifica la devolución antes de migrar; también revisa las ofertas vencidas';
  end if;
  select pg_catalog.string_agg(pg_catalog.format('%s.%I', t.tgrelid::regclass, t.tgname), ', ')
  into unsafe_triggers from pg_catalog.pg_trigger t
  where t.tgrelid in ('public.inventario_cromos'::regclass, 'public.intercambios_album'::regclass, 'public.album_pesos'::regclass)
    and not t.tgisinternal and t.tgenabled <> 'D';
  if unsafe_triggers is not null then
    raise exception 'Revisa los triggers antiguos antes de cambiar el mercado o los sobres: %. Ejecuta album_audit.sql; no se desactivaron triggers', unsafe_triggers;
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and
      ((p.proname = 'abrir_sobre_album_v2' and pg_catalog.oidvectortypes(p.proargtypes) <> 'uuid')
       or (p.proname = 'pegar_cromo_v2' and pg_catalog.oidvectortypes(p.proargtypes) <> 'text')
       or (p.proname = 'crear_oferta_album_v2' and pg_catalog.oidvectortypes(p.proargtypes) <> 'text, text, uuid')
       or (p.proname in ('cancelar_oferta_album_v2', 'aceptar_oferta_album_v2') and pg_catalog.oidvectortypes(p.proargtypes) <> 'uuid, uuid'))
  ) then
    raise exception 'Hay una firma inesperada de RPC Álbum v2. Ejecuta album_audit.sql y revisa las funciones antes de continuar';
  end if;
  if exists (select 1 from public.inventario_cromos group by user_id, cromo_id having count(*) > 1) then
    raise exception 'Hay inventarios duplicados. Ejecuta album_audit.sql y revisa los registros; no se eliminaron cromos';
  end if;
  if exists (select 1 from public.inventario_cromos where cantidad is null or cantidad < 0 or pegada is null or (pegada and cantidad < 1)) then
    raise exception 'Hay cantidades o estados del inventario inválidos. Ejecuta album_audit.sql; no se modificaron registros';
  end if;
  if exists (select 1 from public.perfiles where sobres_disponibles is null or sobres_disponibles < 0) then
    raise exception 'Hay saldos de sobres inválidos. Ejecuta album_audit.sql; no se modificaron perfiles';
  end if;
  if exists (select 1 from public.album_pesos where peso is null or peso < 0) then
    raise exception 'Hay pesos inválidos. Se admite cero para desactivar un cromo; no se cambiaron los pesos personalizados';
  end if;
  select pg_catalog.string_agg(pg_catalog.format('%I.%I(%s)', n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)), ', ')
  into unsafe_functions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
    and (pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') or pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE'))
    and p.proname not in ('abrir_sobre_album', 'pegar_cromo', 'crear_oferta_mercado', 'cancelar_oferta_mercado', 'aceptar_oferta_mercado',
      'abrir_sobre_album_v2', 'pegar_cromo_v2', 'crear_oferta_album_v2', 'cancelar_oferta_album_v2', 'aceptar_oferta_album_v2')
    and pg_catalog.pg_get_functiondef(p.oid) ~* '(inventario_cromos|intercambios_album|sobres_disponibles|abrir_sobre_album|pegar_cromo|crear_oferta_mercado|cancelar_oferta_mercado|aceptar_oferta_mercado)';
  if unsafe_functions is not null then
    raise exception 'Revisa las RPC antiguas expuestas antes de instalar Álbum v2: %', unsafe_functions;
  end if;
end;
$preflight$;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon, authenticated;

create table if not exists thc_private.album_v2_catalogo (
  cromo_id text primary key
);
alter table thc_private.album_v2_catalogo enable row level security;
revoke all on thc_private.album_v2_catalogo from public, anon, authenticated;

insert into thc_private.album_v2_catalogo(cromo_id)
select categorias.prefijo || '_' || pg_catalog.lpad(numero::text, 3, '0')
from (values ('U', 80), ('V', 10), ('JR', 10), ('BL', 20), ('ES', 20), ('S', 20), ('M', 30)) as categorias(prefijo, total)
cross join lateral pg_catalog.generate_series(1, categorias.total) as serie(numero)
on conflict (cromo_id) do nothing;

do $catalogue$
begin
  if (select count(*) from thc_private.album_v2_catalogo) <> 190 then
    raise exception 'El catálogo v2 no coincide con los 190 cromos del proyecto';
  end if;
  if exists (select 1 from public.inventario_cromos i where not exists (select 1 from thc_private.album_v2_catalogo c where c.cromo_id = i.cromo_id)) then
    raise exception 'Hay cromos fuera del catálogo. Ejecuta album_audit.sql y revísalos; no se borró el inventario';
  end if;
end;
$catalogue$;

insert into public.album_pesos(cromo_id, peso)
select cromo_id, 100 from thc_private.album_v2_catalogo
on conflict (cromo_id) do nothing;

do $weights$
begin
  if not exists (select 1 from public.album_pesos p join thc_private.album_v2_catalogo c using(cromo_id) where p.peso > 0) then
    raise exception 'Al menos un cromo del catálogo debe tener peso mayor que cero';
  end if;
end;
$weights$;

do $unique_index$
begin
  if pg_catalog.to_regclass('public.thc_album_v2_inventory_unique') is not null and not exists(
    select 1 from pg_catalog.pg_index i
    where i.indexrelid = pg_catalog.to_regclass('public.thc_album_v2_inventory_unique')
      and i.indrelid = 'public.inventario_cromos'::regclass and i.indisunique and i.indisvalid and i.indisready
      and i.indnkeyatts = 2 and i.indnatts = 2 and i.indexprs is null and i.indpred is null
      and i.indkey[0] = (select attnum from pg_catalog.pg_attribute where attrelid = 'public.inventario_cromos'::regclass and attname = 'user_id')
      and i.indkey[1] = (select attnum from pg_catalog.pg_attribute where attrelid = 'public.inventario_cromos'::regclass and attname = 'cromo_id')
  ) then
    raise exception 'El índice thc_album_v2_inventory_unique tiene otra definición; revísalo antes de instalar';
  end if;
end;
$unique_index$;
create unique index if not exists thc_album_v2_inventory_unique on public.inventario_cromos(user_id, cromo_id);
create index if not exists thc_album_v2_market_owner on public.intercambios_album(user_id_ofrece, estado, fecha_expiracion);

alter table public.intercambios_album add column if not exists version_mercado smallint not null default 1;
comment on column public.intercambios_album.version_mercado is 'THC album v2: 1 conserva el mercado anterior; 2 reserva lógica sin descontar el inventario al publicar';
create index if not exists thc_album_v2_market_live on public.intercambios_album(version_mercado, estado, fecha_expiracion, fecha_creacion desc);

do $constraints$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.inventario_cromos'::regclass and conname = 'thc_album_v2_inventory_shape') then
    alter table public.inventario_cromos add constraint thc_album_v2_inventory_shape check (cantidad is not null and cantidad >= 0 and pegada is not null and (not pegada or cantidad >= 1)) not valid;
  end if;
  alter table public.inventario_cromos validate constraint thc_album_v2_inventory_shape;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.intercambios_album'::regclass and conname = 'thc_album_v2_offer_shape') then
    alter table public.intercambios_album add constraint thc_album_v2_offer_shape check (coalesce(version_mercado = 1 or (version_mercado = 2 and cromo_ofrece <> cromo_pide and fecha_expiracion is not null and fecha_creacion is not null and fecha_expiracion > fecha_creacion and estado in ('activo', 'cancelado', 'completado')), false)) not valid;
  end if;
  alter table public.intercambios_album validate constraint thc_album_v2_offer_shape;
end;
$constraints$;

create table if not exists thc_private.album_v2_recibos (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  solicitud_id uuid not null,
  operacion text not null,
  entrada jsonb not null,
  resultado jsonb not null,
  creado_en timestamptz not null default pg_catalog.now(),
  primary key (usuario_id, solicitud_id)
);
alter table thc_private.album_v2_recibos enable row level security;
revoke all on thc_private.album_v2_recibos from public, anon, authenticated;

create table if not exists thc_private.album_v2_config (
  singleton boolean primary key default true check (singleton),
  cartas_por_sobre smallint not null check (cartas_por_sobre between 1 and 20)
);
alter table thc_private.album_v2_config enable row level security;
revoke all on thc_private.album_v2_config from public, anon, authenticated;

create or replace function thc_private.album_v2_recibo(p_usuario uuid, p_solicitud uuid, p_operacion text, p_entrada jsonb)
returns jsonb language plpgsql set search_path = '' as $function$
declare
  recibo thc_private.album_v2_recibos%rowtype;
begin
  if p_solicitud is null then raise exception 'La operación requiere una identificación' using detail = 'ALBUM_REQUEST_REQUIRED'; end if;
  select * into recibo from thc_private.album_v2_recibos where usuario_id = p_usuario and solicitud_id = p_solicitud;
  if not found then return null; end if;
  if recibo.operacion is distinct from p_operacion or recibo.entrada is distinct from p_entrada then
    raise exception 'Este intento pertenece a otra operación. Actualiza antes de continuar' using detail = 'ALBUM_REQUEST_CONFLICT';
  end if;
  return recibo.resultado;
end;
$function$;
revoke all on function thc_private.album_v2_recibo(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function thc_private.album_v2_disponibles(p_usuario uuid, p_cromo text, p_excluir uuid default null)
returns bigint language sql volatile set search_path = '' as $function$
  select greatest(0::bigint, coalesce((select cantidad::bigint from public.inventario_cromos where user_id = p_usuario and cromo_id = p_cromo), 0)
    - 1 - (select count(*) from public.intercambios_album where user_id_ofrece = p_usuario and cromo_ofrece = p_cromo
      and version_mercado = 2 and estado = 'activo' and fecha_expiracion > pg_catalog.clock_timestamp()
      and (p_excluir is null or id <> p_excluir)));
$function$;
revoke all on function thc_private.album_v2_disponibles(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.abrir_sobre_album_v2(p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  saldo integer;
  resultado jsonb;
  cartas jsonb := '[]'::jsonb;
  detalles jsonb := '[]'::jsonb;
  total_peso bigint;
  cromos_sorteo text[];
  pesos_acumulados bigint[];
  cartas_por_sobre integer;
  punto double precision;
  cromo text;
  cantidad_anterior integer;
  cantidad_actual integer;
  numero integer;
  candidato integer;
begin
  if usuario is null then raise exception 'Inicia sesión para abrir sobres' using errcode = '42501', detail = 'ALBUM_AUTH_REQUIRED'; end if;
  select sobres_disponibles into saldo from public.perfiles where id = usuario for update;
  if not found then raise exception 'No se encontró tu perfil' using detail = 'ALBUM_PROFILE_MISSING'; end if;
  resultado := thc_private.album_v2_recibo(usuario, p_solicitud_id, 'sobre', '{}'::jsonb);
  if resultado is not null then return resultado; end if;
  select config.cartas_por_sobre into cartas_por_sobre from thc_private.album_v2_config config where singleton;
  if cartas_por_sobre is null then raise exception 'Falta verificar cuántas cartas entrega cada sobre' using detail = 'ALBUM_PACK_SIZE_UNCONFIGURED'; end if;
  if saldo is null or saldo <= 0 then raise exception 'No tienes sobres disponibles' using detail = 'ALBUM_NO_PACKS'; end if;
  select pg_catalog.array_agg(distribucion.cromo_id order by distribucion.cromo_id),
    pg_catalog.array_agg(distribucion.acumulado::bigint order by distribucion.cromo_id)
  into cromos_sorteo, pesos_acumulados from (
    select p.cromo_id, sum(p.peso::bigint) over (order by p.cromo_id) as acumulado
    from public.album_pesos p join thc_private.album_v2_catalogo c using(cromo_id) where p.peso > 0
  ) as distribucion;
  total_peso := pesos_acumulados[pg_catalog.array_length(pesos_acumulados, 1)];
  if total_peso is null or total_peso <= 0 then raise exception 'Los sobres no están configurados' using detail = 'ALBUM_WEIGHTS_UNAVAILABLE'; end if;
  for numero in 1..cartas_por_sobre loop
    punto := pg_catalog.random() * total_peso;
    cromo := null;
    for candidato in 1..pg_catalog.array_length(cromos_sorteo, 1) loop
      if pesos_acumulados[candidato] > punto then cromo := cromos_sorteo[candidato]; exit; end if;
    end loop;
    if cromo is null then raise exception 'No se pudo resolver el sobre' using detail = 'ALBUM_WEIGHTS_UNAVAILABLE'; end if;
    select cantidad into cantidad_anterior from public.inventario_cromos where user_id = usuario and cromo_id = cromo for update;
    cantidad_anterior := coalesce(cantidad_anterior, 0);
    insert into public.inventario_cromos as inventario(user_id, cromo_id, cantidad, pegada)
    values(usuario, cromo, 1, false)
    on conflict(user_id, cromo_id) do update set cantidad = inventario.cantidad + 1
    returning cantidad into cantidad_actual;
    cartas := cartas || pg_catalog.jsonb_build_array(cromo);
    detalles := detalles || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id', cromo, 'isNew', cantidad_anterior = 0, 'cantidad', cantidad_actual));
  end loop;
  update public.perfiles set sobres_disponibles = sobres_disponibles - 1 where id = usuario returning sobres_disponibles into saldo;
  resultado := pg_catalog.jsonb_build_object('success', true, 'cartas', cartas, 'detalles', detalles, 'sobres_restantes', saldo);
  insert into thc_private.album_v2_recibos(usuario_id, solicitud_id, operacion, entrada, resultado) values(usuario, p_solicitud_id, 'sobre', '{}'::jsonb, resultado);
  return resultado;
end;
$function$;
revoke all on function public.abrir_sobre_album_v2(uuid) from public, anon, authenticated;
grant execute on function public.abrir_sobre_album_v2(uuid) to authenticated;

create or replace function public.pegar_cromo_v2(p_cromo_id text)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  item public.inventario_cromos%rowtype;
begin
  if usuario is null then raise exception 'Inicia sesión para pegar cromos' using errcode = '42501', detail = 'ALBUM_AUTH_REQUIRED'; end if;
  perform 1 from public.perfiles where id = usuario for update;
  if not found then raise exception 'No se encontró tu perfil' using detail = 'ALBUM_PROFILE_MISSING'; end if;
  if not exists (select 1 from thc_private.album_v2_catalogo where cromo_id = p_cromo_id) then
    raise exception 'Ese cromo no pertenece al álbum' using detail = 'ALBUM_INVALID_CARD';
  end if;
  select * into item from public.inventario_cromos where user_id = usuario and cromo_id = p_cromo_id for update;
  if not found or item.cantidad < 1 then raise exception 'No tienes este cromo' using detail = 'ALBUM_NO_COPIES'; end if;
  if not item.pegada then update public.inventario_cromos set pegada = true where id = item.id; end if;
  return pg_catalog.jsonb_build_object('success', true, 'cromo_id', p_cromo_id, 'cantidad', item.cantidad, 'pegada', true);
end;
$function$;
revoke all on function public.pegar_cromo_v2(text) from public, anon, authenticated;
grant execute on function public.pegar_cromo_v2(text) to authenticated;

create or replace function public.crear_oferta_album_v2(p_ofrece text, p_pide text, p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  entrada jsonb := pg_catalog.jsonb_build_object('ofrece', p_ofrece, 'pide', p_pide);
  resultado jsonb;
  oferta uuid;
begin
  if usuario is null then raise exception 'Inicia sesión para publicar ofertas' using errcode = '42501', detail = 'ALBUM_AUTH_REQUIRED'; end if;
  perform 1 from public.perfiles where id = usuario for update;
  if not found then raise exception 'No se encontró tu perfil' using detail = 'ALBUM_PROFILE_MISSING'; end if;
  resultado := thc_private.album_v2_recibo(usuario, p_solicitud_id, 'crear', entrada);
  if resultado is not null then return resultado; end if;
  if p_ofrece is null or p_pide is null or p_ofrece = p_pide
    or not exists(select 1 from thc_private.album_v2_catalogo where cromo_id = p_ofrece)
    or not exists(select 1 from thc_private.album_v2_catalogo where cromo_id = p_pide) then
    raise exception 'Elige dos cromos diferentes del catálogo' using detail = 'ALBUM_INVALID_CARD';
  end if;
  if (select count(*) from public.intercambios_album where user_id_ofrece = usuario and version_mercado = 2 and estado = 'activo' and fecha_expiracion > pg_catalog.clock_timestamp()) >= 2 then
    raise exception 'Puedes tener hasta dos ofertas activas' using detail = 'ALBUM_OFFER_LIMIT';
  end if;
  if thc_private.album_v2_disponibles(usuario, p_ofrece) < 1 then
    raise exception 'No tienes una repetida disponible para ofrecer' using detail = 'ALBUM_NO_COPIES';
  end if;
  insert into public.intercambios_album(user_id_ofrece, cromo_ofrece, cromo_pide, estado, fecha_creacion, fecha_expiracion, version_mercado)
  values(usuario, p_ofrece, p_pide, 'activo', pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp() + interval '3 days', 2)
  returning id into oferta;
  resultado := pg_catalog.jsonb_build_object('success', true, 'oferta_id', oferta, 'estado', 'activo', 'version_mercado', 2);
  insert into thc_private.album_v2_recibos(usuario_id, solicitud_id, operacion, entrada, resultado) values(usuario, p_solicitud_id, 'crear', entrada, resultado);
  return resultado;
end;
$function$;
revoke all on function public.crear_oferta_album_v2(text, text, uuid) from public, anon, authenticated;
grant execute on function public.crear_oferta_album_v2(text, text, uuid) to authenticated;

create or replace function public.cancelar_oferta_album_v2(p_oferta_id uuid, p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  entrada jsonb := pg_catalog.jsonb_build_object('oferta_id', p_oferta_id);
  resultado jsonb;
  oferta public.intercambios_album%rowtype;
begin
  if usuario is null then raise exception 'Inicia sesión para cancelar ofertas' using errcode = '42501', detail = 'ALBUM_AUTH_REQUIRED'; end if;
  perform 1 from public.perfiles where id = usuario for update;
  if not found then raise exception 'No se encontró tu perfil' using detail = 'ALBUM_PROFILE_MISSING'; end if;
  resultado := thc_private.album_v2_recibo(usuario, p_solicitud_id, 'cancelar', entrada);
  if resultado is not null then return resultado; end if;
  select * into oferta from public.intercambios_album where id = p_oferta_id for update;
  if not found or oferta.user_id_ofrece <> usuario then
    raise exception 'Esta oferta no te pertenece' using errcode = '42501', detail = 'ALBUM_OFFER_UNAVAILABLE';
  end if;
  if oferta.version_mercado <> 2 then
    raise exception 'Esta oferta pertenece al mercado anterior y requiere revisión' using detail = 'ALBUM_LEGACY_OFFER';
  end if;
  if oferta.estado not in ('activo', 'cancelado') then
    raise exception 'La oferta ya no puede cancelarse' using detail = 'ALBUM_OFFER_UNAVAILABLE';
  end if;
  update public.intercambios_album set estado = 'cancelado' where id = oferta.id;
  resultado := pg_catalog.jsonb_build_object('success', true, 'oferta_id', oferta.id, 'estado', 'cancelado', 'version_mercado', 2);
  insert into thc_private.album_v2_recibos(usuario_id, solicitud_id, operacion, entrada, resultado) values(usuario, p_solicitud_id, 'cancelar', entrada, resultado);
  return resultado;
end;
$function$;
revoke all on function public.cancelar_oferta_album_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancelar_oferta_album_v2(uuid, uuid) to authenticated;

create or replace function public.aceptar_oferta_album_v2(p_oferta_id uuid, p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  usuario uuid := auth.uid();
  entrada jsonb := pg_catalog.jsonb_build_object('oferta_id', p_oferta_id);
  resultado jsonb;
  oferta public.intercambios_album%rowtype;
  vendedor uuid;
  perfiles_bloqueados integer;
begin
  if usuario is null then raise exception 'Inicia sesión para intercambiar cromos' using errcode = '42501', detail = 'ALBUM_AUTH_REQUIRED'; end if;
  resultado := thc_private.album_v2_recibo(usuario, p_solicitud_id, 'aceptar', entrada);
  if resultado is not null then return resultado; end if;
  select user_id_ofrece into vendedor from public.intercambios_album where id = p_oferta_id;
  if not found or vendedor = usuario then raise exception 'Esta oferta no está disponible' using detail = 'ALBUM_OFFER_UNAVAILABLE'; end if;
  perform id from public.perfiles where id in (usuario, vendedor) order by id for update;
  get diagnostics perfiles_bloqueados = row_count;
  if perfiles_bloqueados <> 2 then raise exception 'No se encontró uno de los perfiles' using detail = 'ALBUM_PROFILE_MISSING'; end if;
  resultado := thc_private.album_v2_recibo(usuario, p_solicitud_id, 'aceptar', entrada);
  if resultado is not null then return resultado; end if;
  select * into oferta from public.intercambios_album where id = p_oferta_id for update;
  if not found or oferta.user_id_ofrece <> vendedor or oferta.user_id_ofrece = usuario then
    raise exception 'Esta oferta no está disponible' using detail = 'ALBUM_OFFER_UNAVAILABLE';
  end if;
  if oferta.version_mercado <> 2 then
    raise exception 'Esta oferta pertenece al mercado anterior y requiere revisión' using detail = 'ALBUM_LEGACY_OFFER';
  end if;
  if oferta.estado <> 'activo' or oferta.fecha_expiracion <= pg_catalog.clock_timestamp() then
    raise exception 'La oferta ya fue aceptada, cancelada o venció' using detail = 'ALBUM_OFFER_UNAVAILABLE';
  end if;
  if thc_private.album_v2_disponibles(vendedor, oferta.cromo_ofrece, oferta.id) < 1
    or thc_private.album_v2_disponibles(usuario, oferta.cromo_pide) < 1 then
    raise exception 'Uno de los cromos ya no tiene una repetida disponible' using detail = 'ALBUM_NO_COPIES';
  end if;
  perform id from public.inventario_cromos where user_id in (usuario, vendedor)
    and cromo_id in (oferta.cromo_ofrece, oferta.cromo_pide) order by user_id, cromo_id for update;
  if oferta.fecha_expiracion <= pg_catalog.clock_timestamp() then
    raise exception 'La oferta venció antes de completar el intercambio' using detail = 'ALBUM_OFFER_UNAVAILABLE';
  end if;
  if thc_private.album_v2_disponibles(vendedor, oferta.cromo_ofrece, oferta.id) < 1
    or thc_private.album_v2_disponibles(usuario, oferta.cromo_pide) < 1 then
    raise exception 'Uno de los cromos ya no tiene una repetida disponible' using detail = 'ALBUM_NO_COPIES';
  end if;
  update public.inventario_cromos set cantidad = cantidad - 1 where user_id = vendedor and cromo_id = oferta.cromo_ofrece;
  update public.inventario_cromos set cantidad = cantidad - 1 where user_id = usuario and cromo_id = oferta.cromo_pide;
  insert into public.inventario_cromos as inventario(user_id, cromo_id, cantidad, pegada)
  values(usuario, oferta.cromo_ofrece, 1, false), (vendedor, oferta.cromo_pide, 1, false)
  on conflict(user_id, cromo_id) do update set cantidad = inventario.cantidad + 1;
  update public.intercambios_album set estado = 'completado', user_id_acepta = usuario where id = oferta.id;
  resultado := pg_catalog.jsonb_build_object('success', true, 'oferta_id', oferta.id, 'estado', 'completado', 'version_mercado', 2, 'cromo_recibido', oferta.cromo_ofrece);
  insert into thc_private.album_v2_recibos(usuario_id, solicitud_id, operacion, entrada, resultado) values(usuario, p_solicitud_id, 'aceptar', entrada, resultado);
  return resultado;
end;
$function$;
revoke all on function public.aceptar_oferta_album_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aceptar_oferta_album_v2(uuid, uuid) to authenticated;

create or replace function public.thc_album_v2_proteger_sobres()
returns trigger language plpgsql set search_path = '' as $function$
begin
  if current_user in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and new.sobres_disponibles is distinct from 0)
      or (tg_op = 'UPDATE' and new.sobres_disponibles is distinct from old.sobres_disponibles) then
      raise exception 'Los sobres se asignan en el servidor' using errcode = '42501', detail = 'ALBUM_BALANCE_PROTECTED';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.thc_album_v2_proteger_sobres() from public, anon, authenticated;
drop trigger if exists thc_album_v2_proteger_sobres on public.perfiles;
create trigger thc_album_v2_proteger_sobres before insert or update of sobres_disponibles on public.perfiles for each row execute function public.thc_album_v2_proteger_sobres();

do $legacy_rpc$
declare
  routine record;
begin
  for routine in select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('abrir_sobre_album', 'pegar_cromo', 'crear_oferta_mercado', 'cancelar_oferta_mercado', 'aceptar_oferta_mercado')
  loop
    execute pg_catalog.format('revoke execute on function %s from public, anon, authenticated', routine.oid::regprocedure);
  end loop;
end;
$legacy_rpc$;

do $table_permissions$
declare
  item text;
  columns_list text;
begin
  foreach item in array array['inventario_cromos', 'intercambios_album', 'album_pesos'] loop
    execute pg_catalog.format('alter table public.%I enable row level security', item);
    execute pg_catalog.format('revoke insert, update, delete, truncate, references, trigger on public.%I from public, anon, authenticated', item);
    select pg_catalog.string_agg(pg_catalog.format('%I', attname), ', ') into columns_list
    from pg_catalog.pg_attribute where attrelid = ('public.' || item)::regclass and attnum > 0 and not attisdropped;
    execute pg_catalog.format('revoke insert (%s), update (%s), references (%s) on public.%I from public, anon, authenticated', columns_list, columns_list, columns_list, item);
    execute pg_catalog.format('grant select on public.%I to authenticated', item);
  end loop;
end;
$table_permissions$;

drop policy if exists thc_album_v2_inventory_boundary on public.inventario_cromos;
create policy thc_album_v2_inventory_boundary on public.inventario_cromos as restrictive for select to public using (user_id = (select auth.uid()));
drop policy if exists thc_album_v2_inventory_read on public.inventario_cromos;
create policy thc_album_v2_inventory_read on public.inventario_cromos for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists thc_album_v2_offers_boundary on public.intercambios_album;
create policy thc_album_v2_offers_boundary on public.intercambios_album as restrictive for select to public
using ((select auth.uid()) is not null and (user_id_ofrece = (select auth.uid()) or user_id_acepta = (select auth.uid()) or (version_mercado = 2 and estado = 'activo' and fecha_expiracion > pg_catalog.now())));
drop policy if exists thc_album_v2_offers_read on public.intercambios_album;
create policy thc_album_v2_offers_read on public.intercambios_album for select to authenticated
using (user_id_ofrece = (select auth.uid()) or user_id_acepta = (select auth.uid()) or (version_mercado = 2 and estado = 'activo' and fecha_expiracion > pg_catalog.now()));
drop policy if exists thc_album_v2_weights_read on public.album_pesos;
create policy thc_album_v2_weights_read on public.album_pesos for select to authenticated using (true);

revoke update(sobres_disponibles) on public.perfiles from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
