begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $$
declare
  tabla text;
  publicacion_col smallint;
  id_col smallint;
  cantidad integer;
  fk record;
  actualizacion text;
  coincidencia text;
  diferible text;
  comentario text;
begin
  foreach tabla in array array['muro_publicaciones', 'muro_votos'] loop
    if not exists (
      select 1 from pg_catalog.pg_class
      where oid = pg_catalog.to_regclass(format('public.%I', tabla))
        and relrowsecurity and relkind = 'r' and not relispartition
    ) then
      raise exception 'La tabla public.% debe existir, tener RLS activo y ser una tabla normal sin particiones. No se cambió la FK.', tabla;
    end if;
  end loop;

  select attnum into publicacion_col from pg_catalog.pg_attribute
  where attrelid = 'public.muro_votos'::regclass and attname = 'publicacion_id' and not attisdropped;
  select attnum into id_col from pg_catalog.pg_attribute
  where attrelid = 'public.muro_publicaciones'::regclass and attname = 'id' and not attisdropped;

  if publicacion_col is null or id_col is null then
    raise exception 'Faltan las columnas esperadas para la FK del Muro. No se cambió nada.';
  end if;

  select count(*) into cantidad from pg_catalog.pg_constraint
  where conrelid = 'public.muro_votos'::regclass and contype = 'f'
    and publicacion_col = any(conkey);
  if cantidad <> 1 then
    raise exception 'Se esperaba una sola FK para muro_votos.publicacion_id; se encontraron %. Revisa la auditoría.', cantidad;
  end if;

  select c.* into fk from pg_catalog.pg_constraint c
  where c.conrelid = 'public.muro_votos'::regclass and c.contype = 'f'
    and c.confrelid = 'public.muro_publicaciones'::regclass
    and c.conkey = array[publicacion_col] and c.confkey = array[id_col];
  if not found then
    raise exception 'La FK no enlaza exactamente muro_votos.publicacion_id con muro_publicaciones.id. No se reemplazó.';
  end if;

  if fk.confdeltype = 'c' then
    raise notice 'La FK % ya usa ON DELETE CASCADE; se conserva.', fk.conname;
    return;
  end if;

  if not fk.convalidated or not fk.conislocal or fk.coninhcount <> 0 or fk.conparentid <> 0
    or coalesce((to_jsonb(fk)->>'conperiod')::boolean, false)
    or not coalesce((to_jsonb(fk)->>'conenforced')::boolean, true) then
    raise exception 'La FK tiene atributos que requieren revisión manual (validación, herencia, periodo o enforcement). No se reemplazó.';
  end if;

  actualizacion := case fk.confupdtype
    when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
    when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end;
  coincidencia := case fk.confmatchtype when 's' then 'SIMPLE' when 'f' then 'FULL' end;
  diferible := case when fk.condeferrable
    then case when fk.condeferred then 'DEFERRABLE INITIALLY DEFERRED' else 'DEFERRABLE INITIALLY IMMEDIATE' end
    else 'NOT DEFERRABLE' end;
  if actualizacion is null or coincidencia is null or (fk.condeferred and not fk.condeferrable) then
    raise exception 'La FK tiene acciones o atributos desconocidos. No se reemplazó.';
  end if;

  comentario := pg_catalog.obj_description(fk.oid, 'pg_constraint');
  execute format('alter table public.muro_votos drop constraint %I', fk.conname);
  execute format(
    'alter table public.muro_votos add constraint %I foreign key (publicacion_id) references public.muro_publicaciones(id) match %s on update %s on delete cascade %s',
    fk.conname, coincidencia, actualizacion, diferible
  );
  if comentario is not null then
    execute format('comment on constraint %I on public.muro_votos is %L', fk.conname, comentario);
  end if;
end;
$$;

commit;

select conname, convalidated as validada, pg_catalog.pg_get_constraintdef(oid) as definicion
from pg_catalog.pg_constraint
where conrelid = 'public.muro_votos'::regclass and contype = 'f'
  and confrelid = 'public.muro_publicaciones'::regclass;
