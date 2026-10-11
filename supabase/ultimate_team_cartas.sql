-- Ejecutar completo en Supabase SQL Editor. No asigna sobres ni reinicia saldos.
begin;

create schema if not exists thc_private;
revoke all on schema thc_private from public, anon, authenticated;

create table if not exists public.ut_cartas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[a-zA-Z0-9_-]{1,60}$'),
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  posicion text not null check (posicion in ('GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST')),
  posiciones_secundarias text[] not null default '{}' check (
    posiciones_secundarias <@ array['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST']::text[]
    and cardinality(posiciones_secundarias) <= 5 and array_position(posiciones_secundarias,null) is null
  ),
  ritmo smallint not null default 50 check (ritmo between 0 and 99),
  tiro smallint not null default 50 check (tiro between 0 and 99),
  pase smallint not null default 50 check (pase between 0 and 99),
  regate smallint not null default 50 check (regate between 0 and 99),
  defensa smallint not null default 50 check (defensa between 0 and 99),
  fisico smallint not null default 50 check (fisico between 0 and 99),
  estirada smallint not null default 50 check (estirada between 0 and 99),
  paradas smallint not null default 50 check (paradas between 0 and 99),
  saque smallint not null default 50 check (saque between 0 and 99),
  reflejos smallint not null default 50 check (reflejos between 0 and 99),
  velocidad_por smallint not null default 50 check (velocidad_por between 0 and 99),
  posicionamiento smallint not null default 50 check (posicionamiento between 0 and 99),
  grl smallint generated always as (round(case
    when posicion = 'GK' then estirada*.22+paradas*.22+saque*.10+reflejos*.24+velocidad_por*.06+posicionamiento*.16
    when posicion = 'CB' then ritmo*.10+tiro*.02+pase*.10+regate*.06+defensa*.45+fisico*.27
    when posicion in ('LB','RB','LWB','RWB') then ritmo*.22+tiro*.03+pase*.17+regate*.13+defensa*.30+fisico*.15
    when posicion = 'CDM' then ritmo*.08+tiro*.05+pase*.25+regate*.12+defensa*.30+fisico*.20
    when posicion = 'CM' then ritmo*.10+tiro*.13+pase*.30+regate*.23+defensa*.14+fisico*.10
    when posicion = 'CAM' then ritmo*.12+tiro*.22+pase*.28+regate*.28+defensa*.03+fisico*.07
    when posicion in ('LM','RM','LW','RW') then ritmo*.25+tiro*.18+pase*.20+regate*.27+defensa*.03+fisico*.07
    else ritmo*.18+tiro*.40+pase*.08+regate*.22+defensa*.02+fisico*.10
  end)::smallint) stored,
  imagen_url text check (imagen_url is null or length(imagen_url) <= 2048),
  diseno_url text check (diseno_url is null or length(diseno_url) <= 2048),
  rareza text not null default 'bronce' check (rareza in ('oro','plata','bronce','especial')),
  club text not null default '' check (length(club) <= 80),
  nacionalidad text not null default '' check (length(nacionalidad) <= 60),
  activa boolean not null default false,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create table if not exists public.ut_sobres_catalogo (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,60}$'),
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  cantidad_cartas smallint not null default 5 check (cantidad_cartas between 1 and 30),
  activo boolean not null default false
);
create table if not exists public.ut_sobres_pool (
  sobre_tipo text not null references public.ut_sobres_catalogo(id),
  carta_id uuid not null references public.ut_cartas(id),
  peso integer not null default 100 check (peso between 1 and 1000000),
  primary key(sobre_tipo,carta_id)
);
create table if not exists public.ut_sobres_inventario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo_id text not null references public.ut_sobres_catalogo(id),
  estado text not null default 'disponible' check (estado in ('disponible','abierto')),
  adquirido_en timestamptz not null default now(),
  abierto_en timestamptz,
  check ((estado='disponible' and abierto_en is null) or (estado='abierto' and abierto_en is not null))
);
create table if not exists public.ut_cartas_club (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  carta_id uuid not null references public.ut_cartas(id),
  sobre_id uuid references public.ut_sobres_inventario(id),
  adquirido_en timestamptz not null default now()
);
create table if not exists thc_private.ut_aperturas (
  user_id uuid not null references auth.users(id) on delete cascade,
  solicitud_id uuid not null,
  sobre_id uuid not null unique references public.ut_sobres_inventario(id),
  resultado jsonb not null,
  creado_en timestamptz not null default now(),
  primary key(user_id,solicitud_id)
);
create table if not exists thc_private.ut_jugadores_base (
  id text primary key,
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and datos->>'id' = id)
);
create index if not exists ut_sobres_usuario_estado on public.ut_sobres_inventario(user_id,estado,adquirido_en);
create index if not exists ut_cartas_club_usuario on public.ut_cartas_club(user_id,adquirido_en);
create index if not exists ut_cartas_club_sobre on public.ut_cartas_club(sobre_id);
create index if not exists ut_cartas_club_carta on public.ut_cartas_club(carta_id,user_id);
revoke all on thc_private.ut_aperturas,thc_private.ut_jugadores_base from public,anon,authenticated;
alter table thc_private.ut_aperturas enable row level security;
alter table thc_private.ut_jugadores_base enable row level security;

do $permissions$
declare target text; columns_sql text;
begin
  foreach target in array array['ut_cartas','ut_sobres_catalogo','ut_sobres_pool','ut_sobres_inventario','ut_cartas_club','plantillas_ut'] loop
    execute format('alter table public.%I enable row level security',target);
    execute format('revoke all on public.%I from public,anon,authenticated',target);
    select string_agg(quote_ident(attname),',') into columns_sql from pg_attribute
      where attrelid = format('public.%I',target)::regclass and attnum>0 and not attisdropped;
    execute format('revoke select (%s),insert (%s),update (%s),references (%s) on public.%I from public,anon,authenticated',columns_sql,columns_sql,columns_sql,columns_sql,target);
  end loop;
end $permissions$;

grant select on public.ut_cartas,public.ut_sobres_catalogo,public.ut_sobres_inventario,public.ut_cartas_club,public.plantillas_ut to authenticated;
grant delete on public.plantillas_ut to authenticated;

drop policy if exists thc_ut_catalog_read on public.ut_cartas;
create policy thc_ut_catalog_read on public.ut_cartas for select to authenticated using (true);
drop policy if exists thc_ut_catalog_read on public.ut_sobres_catalogo;
create policy thc_ut_catalog_read on public.ut_sobres_catalogo for select to authenticated using (true);

do $owners$
declare target text;
begin
  foreach target in array array['ut_sobres_inventario','ut_cartas_club','plantillas_ut'] loop
    execute format('drop policy if exists thc_ut_owner_boundary on public.%I',target);
    execute format('create policy thc_ut_owner_boundary on public.%I as restrictive for all to public using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',target);
    execute format('drop policy if exists thc_ut_owner_read on public.%I',target);
    execute format('create policy thc_ut_owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',target);
  end loop;
end $owners$;
drop policy if exists thc_ut_squad_reset on public.plantillas_ut;
create policy thc_ut_squad_reset on public.plantillas_ut for delete to authenticated using ((select auth.uid())=user_id);

insert into public.ut_cartas(codigo,nombre,posicion,ritmo,tiro,pase,regate,defensa,fisico,rareza,activa,es_ejemplo)
values ('ejemplo-cm','Jugador de ejemplo','CM',70,65,75,72,62,68,'plata',false,true)
on conflict(codigo) do nothing;
insert into public.ut_sobres_catalogo(id,nombre,cantidad_cartas,activo)
values('thc-base','Sobre THC',5,false) on conflict(id) do nothing;

insert into thc_private.ut_jugadores_base(id,datos) values
  ('p1','{"id":"p1","nombre":"V. RIVERA","pos":"GK","grl":72,"pac":72,"sho":68,"pas":65,"dri":73,"def":30,"phy":68,"color":"plata"}'::jsonb),
  ('p2','{"id":"p2","nombre":"M. SILVA","pos":"CB","grl":74,"pac":62,"sho":38,"pas":55,"dri":50,"def":75,"phy":78,"color":"plata"}'::jsonb),
  ('p3','{"id":"p3","nombre":"J. CRUZ","pos":"CB","grl":70,"pac":65,"sho":32,"pas":50,"dri":48,"def":72,"phy":74,"color":"plata"}'::jsonb),
  ('p4','{"id":"p4","nombre":"A. GOMEZ","pos":"RB","grl":68,"pac":78,"sho":45,"pas":58,"dri":64,"def":65,"phy":62,"color":"plata"}'::jsonb),
  ('p5','{"id":"p5","nombre":"C. REYES","pos":"LB","grl":69,"pac":76,"sho":42,"pas":60,"dri":65,"def":66,"phy":64,"color":"plata"}'::jsonb),
  ('p6','{"id":"p6","nombre":"F. BLANCO","pos":"CDM","grl":75,"pac":65,"sho":55,"pas":72,"dri":68,"def":74,"phy":78,"color":"oro"}'::jsonb),
  ('p7','{"id":"p7","nombre":"L. MENDES","pos":"CM","grl":71,"pac":68,"sho":62,"pas":72,"dri":70,"def":60,"phy":65,"color":"plata"}'::jsonb),
  ('p8','{"id":"p8","nombre":"D. VEGA","pos":"CAM","grl":77,"pac":75,"sho":76,"pas":78,"dri":79,"def":42,"phy":60,"color":"oro"}'::jsonb),
  ('p9','{"id":"p9","nombre":"R. SANTOS","pos":"RW","grl":73,"pac":84,"sho":68,"pas":65,"dri":75,"def":32,"phy":55,"color":"plata"}'::jsonb),
  ('p10','{"id":"p10","nombre":"S. PINTO","pos":"LW","grl":70,"pac":82,"sho":64,"pas":60,"dri":72,"def":28,"phy":50,"color":"plata"}'::jsonb),
  ('p11','{"id":"p11","nombre":"T. COSTA","pos":"ST","grl":74,"pac":78,"sho":75,"pas":55,"dri":72,"def":30,"phy":74,"color":"plata"}'::jsonb),
  ('p12','{"id":"p12","nombre":"E. LARA","pos":"GK","grl":65,"pac":66,"sho":62,"pas":60,"dri":68,"def":25,"phy":60,"color":"plata"}'::jsonb),
  ('p13','{"id":"p13","nombre":"P. ROJAS","pos":"CB","grl":66,"pac":58,"sho":28,"pas":45,"dri":40,"def":68,"phy":72,"color":"plata"}'::jsonb),
  ('p14','{"id":"p14","nombre":"N. MORA","pos":"RB","grl":64,"pac":74,"sho":38,"pas":55,"dri":60,"def":62,"phy":60,"color":"bronce"}'::jsonb),
  ('p15','{"id":"p15","nombre":"H. LUNA","pos":"CM","grl":67,"pac":65,"sho":58,"pas":68,"dri":66,"def":55,"phy":60,"color":"plata"}'::jsonb),
  ('p16','{"id":"p16","nombre":"K. DIAZ","pos":"RM","grl":65,"pac":78,"sho":55,"pas":60,"dri":68,"def":35,"phy":45,"color":"plata"}'::jsonb),
  ('p17','{"id":"p17","nombre":"I. RUIZ","pos":"LM","grl":63,"pac":76,"sho":52,"pas":58,"dri":64,"def":40,"phy":48,"color":"bronce"}'::jsonb),
  ('p18','{"id":"p18","nombre":"B. SOTO","pos":"ST","grl":66,"pac":72,"sho":68,"pas":50,"dri":64,"def":30,"phy":68,"color":"plata"}'::jsonb),
  ('p19','{"id":"p19","nombre":"O. PEÑA","pos":"CDM","grl":62,"pac":55,"sho":40,"pas":58,"dri":54,"def":62,"phy":65,"color":"bronce"}'::jsonb),
  ('p20','{"id":"p20","nombre":"G. NINA","pos":"ST","grl":61,"pac":68,"sho":60,"pas":45,"dri":58,"def":25,"phy":58,"color":"bronce"}'::jsonb),
  ('p21','{"id":"p21","nombre":"A. VERA","pos":"LB","grl":61,"pac":70,"sho":32,"pas":48,"dri":52,"def":58,"phy":55,"color":"bronce"}'::jsonb),
  ('p22','{"id":"p22","nombre":"W. RIOS","pos":"CAM","grl":60,"pac":62,"sho":50,"pas":60,"dri":60,"def":32,"phy":45,"color":"bronce"}'::jsonb),
  ('p23','{"id":"p23","nombre":"Y. CRUZ","pos":"CB","grl":60,"pac":52,"sho":22,"pas":35,"dri":35,"def":60,"phy":64,"color":"bronce"}'::jsonb)
on conflict(id) do nothing;

create or replace function public.thc_ut_abrir_sobre(p_sobre_id uuid,p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  uid uuid := auth.uid();
  owned public.ut_sobres_inventario%rowtype;
  catalog public.ut_sobres_catalogo%rowtype;
  receipt thc_private.ut_aperturas%rowtype;
  pool jsonb; total numeric; picked jsonb; draw numeric; copy_id uuid;
  cards jsonb := '[]'::jsonb; result jsonb; i integer;
begin
  if uid is null then raise exception 'Inicia sesión para abrir un sobre.' using errcode='42501'; end if;
  if p_sobre_id is null or p_solicitud_id is null then raise exception 'Falta identificar el sobre o el envío.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-open:'||uid::text,0));
  select * into receipt from thc_private.ut_aperturas where user_id=uid and solicitud_id=p_solicitud_id;
  if found then
    if receipt.sobre_id<>p_sobre_id then raise exception 'Este envío corresponde a otro sobre.' using errcode='22023'; end if;
    return receipt.resultado;
  end if;
  select * into owned from public.ut_sobres_inventario where id=p_sobre_id and user_id=uid for update;
  if not found then raise exception 'Ese sobre no está en tu club.' using errcode='42501'; end if;
  if owned.estado='abierto' then
    select * into receipt from thc_private.ut_aperturas where sobre_id=p_sobre_id and user_id=uid;
    if not found then raise exception 'El sobre ya fue abierto. Actualiza tu club.'; end if;
    return receipt.resultado;
  end if;
  select * into catalog from public.ut_sobres_catalogo where id=owned.tipo_id for share;
  if not found or not catalog.activo then raise exception 'Este sobre todavía no está disponible para abrir.'; end if;
  select jsonb_agg(jsonb_build_object('carta',to_jsonb(c),'peso',p.peso) order by c.id),sum(p.peso)::numeric
    into pool,total from public.ut_sobres_pool p join public.ut_cartas c on c.id=p.carta_id
    where p.sobre_tipo=owned.tipo_id and c.activa and not c.es_ejemplo;
  if pool is null or total<=0 then raise exception 'Este sobre aún no tiene jugadores disponibles. Tu sobre sigue intacto.'; end if;
  for i in 1..catalog.cantidad_cartas loop
    draw := random() * total;
    select candidate->'carta' into picked from (
      select value as candidate, sum((value->>'peso')::numeric) over(order by value->'carta'->>'id') as cumulative
      from jsonb_array_elements(pool)
    ) weights where cumulative>draw order by cumulative limit 1;
    if picked is null then raise exception 'No pudimos completar el sobre. Inténtalo de nuevo.'; end if;
    insert into public.ut_cartas_club(user_id,carta_id,sobre_id) values(uid,(picked->>'id')::uuid,p_sobre_id) returning id into copy_id;
    cards := cards || jsonb_build_array(jsonb_build_object('id',copy_id,'carta',picked));
  end loop;
  result := jsonb_build_object('sobre_id',p_sobre_id,'cartas',cards);
  update public.ut_sobres_inventario set estado='abierto',abierto_en=now() where id=p_sobre_id;
  insert into thc_private.ut_aperturas(user_id,solicitud_id,sobre_id,resultado) values(uid,p_solicitud_id,p_sobre_id,result);
  return result;
end $function$;
revoke all on function public.thc_ut_abrir_sobre(uuid,uuid) from public,anon,authenticated;
grant execute on function public.thc_ut_abrir_sobre(uuid,uuid) to authenticated;

create or replace function public.thc_ut_guardar_plantilla(p_plantilla jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  uid uuid := auth.uid(); group_name text; player jsonb; canonical jsonb; player_id text;
  copy_id uuid; card public.ut_cartas%rowtype; output jsonb := '{}'::jsonb;
  players jsonb; seen text[] := '{}'; formation text; tactics jsonb;
  saved public.plantillas_ut%rowtype;
begin
  if uid is null then raise exception 'Inicia sesión para guardar tu plantilla.' using errcode='42501'; end if;
  if p_plantilla is null or jsonb_typeof(p_plantilla)<>'object' or octet_length(p_plantilla::text)>1048576 then
    raise exception 'La plantilla no es válida.' using errcode='22023';
  end if;
  formation := p_plantilla->>'formacion';
  if formation is null or formation not in ('4-3-3','4-4-2','4-2-3-1') then raise exception 'Elige una formación válida.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('thc-ut-squad:'||uid::text,0));
  tactics := p_plantilla->'tacticas';
  if tactics is null then
    select tacticas into tactics from public.plantillas_ut where user_id=uid;
    tactics := coalesce(tactics,'{}'::jsonb);
  end if;
  if jsonb_typeof(tactics)<>'object' or octet_length(tactics::text)>16384 then raise exception 'Las tácticas no son válidas.' using errcode='22023'; end if;
  foreach group_name in array array['titulares','suplentes','reservas'] loop
    if jsonb_typeof(p_plantilla->group_name) is distinct from 'array' then raise exception 'Falta una parte de la plantilla.' using errcode='22023'; end if;
    if jsonb_array_length(p_plantilla->group_name) > (case group_name when 'titulares' then 11 when 'suplentes' then 7 else 100 end) then
      raise exception 'La plantilla supera el límite de plazas.' using errcode='22023';
    end if;
    players := '[]'::jsonb;
    for player in select value from jsonb_array_elements(p_plantilla->group_name) loop
      if player='null'::jsonb then players := players || '[null]'::jsonb; continue; end if;
      if jsonb_typeof(player)<>'object' then raise exception 'Hay una carta no válida.' using errcode='22023'; end if;
      player_id := player->>'id';
      if player_id is null or player_id=any(seen) then raise exception 'No se puede repetir la misma copia de una carta.' using errcode='22023'; end if;
      canonical := null;
      if player_id ~ '^p([1-9]|1[0-9]|2[0-3])$' then
        select datos into canonical from thc_private.ut_jugadores_base where id=player_id;
      elsif player_id ~ '^ut:[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then
        copy_id := substring(player_id from 4)::uuid;
        if player ? 'club_carta_id' and player->>'club_carta_id' is distinct from copy_id::text then
          raise exception 'La copia de la carta no coincide.' using errcode='22023';
        end if;
        select c.* into card from public.ut_cartas_club owned join public.ut_cartas c on c.id=owned.carta_id
          where owned.id=copy_id and owned.user_id=uid;
        if found then canonical := to_jsonb(card) || jsonb_build_object(
          'id','ut:'||copy_id::text,'club_carta_id',copy_id,'carta_id',card.id,'pos',card.posicion,
          'pac',card.ritmo,'sho',card.tiro,'pas',card.pase,'dri',card.regate,'def',card.defensa,'phy',card.fisico,'color',card.rareza,
          'gk_div',card.estirada,'gk_han',card.paradas,'gk_kic',card.saque,'gk_ref',card.reflejos,'gk_spd',card.velocidad_por,'gk_pos',card.posicionamiento,'ejemplo',card.es_ejemplo
        ); end if;
      end if;
      if canonical is null then raise exception 'Una de las cartas no pertenece a tu club.' using errcode='42501'; end if;
      if canonical->>'id'=any(seen) then raise exception 'No se puede repetir la misma copia de una carta.' using errcode='22023'; end if;
      seen := array_append(seen,canonical->>'id'); players := players || jsonb_build_array(canonical);
    end loop;
    output := output || jsonb_build_object(group_name,players);
  end loop;
  insert into public.plantillas_ut(user_id,formacion,titulares,suplentes,reservas,tacticas,actualizado_en)
    values(uid,formation,output->'titulares',output->'suplentes',output->'reservas',tactics,now())
    on conflict(user_id) do update set formacion=excluded.formacion,titulares=excluded.titulares,suplentes=excluded.suplentes,
      reservas=excluded.reservas,tacticas=excluded.tacticas,actualizado_en=excluded.actualizado_en
    returning * into saved;
  return to_jsonb(saved);
end $function$;
revoke all on function public.thc_ut_guardar_plantilla(jsonb) from public,anon,authenticated;
grant execute on function public.thc_ut_guardar_plantilla(jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
