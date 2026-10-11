-- THC · Perfiles VIP, 9 de octubre de 2026.
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Admite diez estilos. Solo el dueño con nivel_rol >= 10 puede personalizar el tema/color.
-- Los datos normales del perfil, las políticas RLS existentes y los sobres se conservan.
-- Las operaciones de administración desde SQL Editor/service_role siguen disponibles.
-- Sustituye el parche anterior de apariencia; se puede ejecutar más de una vez.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  field_name text;
  current_marker text;
  constraints_found text;
begin
  if pg_catalog.to_regclass('public.perfiles') is null then
    raise exception 'Falta public.perfiles; este parche requiere el esquema existente';
  end if;
  if not exists (select 1 from pg_catalog.pg_class where oid = 'public.perfiles'::regclass and relrowsecurity) then
    raise exception 'Activa y revisa primero el RLS de perfiles. Este parche no cambia tus políticas';
  end if;
  foreach field_name in array array['id', 'nivel_rol', 'tema_perfil', 'color_pixel', 'avatar_scale', 'avatar_pos_x', 'avatar_pos_y', 'banner_pos_y'] loop
    if not exists (select 1 from pg_catalog.pg_attribute where attrelid = 'public.perfiles'::regclass and attname = field_name and attnum > 0 and not attisdropped) then
      raise exception 'Falta la columna perfiles.%; no se cambió el esquema', field_name;
    end if;
  end loop;
  if pg_catalog.to_regprocedure('public.thc_profile_appearance_guard()') is not null then
    select pg_catalog.obj_description(pg_catalog.to_regprocedure('public.thc_profile_appearance_guard()'), 'pg_proc') into current_marker;
    if current_marker is null or current_marker not in ('THC profile appearance guard v1: isolated invoker validation; existing RLS and pack balances are preserved.', 'THC profile appearance guard v2: ten themes, owner VIP 10; ordinary edits, existing RLS and pack balances preserved.') then
      raise exception 'Ya existe una función thc_profile_appearance_guard ajena a este parche. Revísala antes de continuar';
    end if;
  end if;
  if exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.perfiles'::regclass and tgname = 'thc_profile_appearance_guard'
      and tgfoid is distinct from pg_catalog.to_regprocedure('public.thc_profile_appearance_guard()')
  ) then
    raise exception 'Ya existe un trigger thc_profile_appearance_guard con otra función. No se reemplazó';
  end if;
  select pg_catalog.string_agg(pg_catalog.format('%I: %s', conname, pg_catalog.pg_get_constraintdef(oid)), E'\n')
  into constraints_found from pg_catalog.pg_constraint
  where conrelid = 'public.perfiles'::regclass and contype = 'c'
    and pg_catalog.pg_get_constraintdef(oid) ~* '(tema_perfil|color_pixel|avatar_scale|avatar_pos_x|avatar_pos_y|banner_pos_y)';
  if constraints_found is not null then
    raise notice 'Hay CHECK existentes que siguen vigentes. Verifica que admitan los diez temas y los rangos del formulario: %', constraints_found;
  end if;
end;
$preflight$;

create or replace function public.thc_profile_appearance_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $guard$
declare
  web_request boolean := current_user in ('anon', 'authenticated') or coalesce(auth.role() in ('anon', 'authenticated'), false);
  theme_changed boolean;
  color_changed boolean;
  scale_changed boolean;
  x_changed boolean;
  y_changed boolean;
  banner_changed boolean;
  eligible boolean;
  restoring_default boolean := false;
begin
  if tg_op = 'INSERT' then
    theme_changed := true;
    color_changed := true;
    scale_changed := true;
    x_changed := true;
    y_changed := true;
    banner_changed := true;
    eligible := false;
    if web_request and (new.id is distinct from auth.uid() or new.nivel_rol is distinct from 0) then
      raise exception 'La identidad y el rol se asignan en el servidor' using errcode = '42501', detail = 'PROFILE_IDENTITY_PROTECTED';
    end if;
  else
    theme_changed := new.tema_perfil is distinct from old.tema_perfil;
    color_changed := new.color_pixel is distinct from old.color_pixel;
    scale_changed := new.avatar_scale is distinct from old.avatar_scale;
    x_changed := new.avatar_pos_x is distinct from old.avatar_pos_x;
    y_changed := new.avatar_pos_y is distinct from old.avatar_pos_y;
    banner_changed := new.banner_pos_y is distinct from old.banner_pos_y;
    eligible := coalesce(old.nivel_rol, 0) >= 10;
    restoring_default := theme_changed and new.tema_perfil = 'default';
    if web_request and (new.id is distinct from old.id or new.nivel_rol is distinct from old.nivel_rol) then
      raise exception 'La identidad y el rol se modifican desde el servidor' using errcode = '42501', detail = 'PROFILE_IDENTITY_PROTECTED';
    end if;
    if web_request and (theme_changed or color_changed or scale_changed or x_changed or y_changed or banner_changed)
      and old.id is distinct from auth.uid() then
      raise exception 'Solo puedes personalizar tu propio perfil' using errcode = '42501', detail = 'PROFILE_APPEARANCE_OWNER_REQUIRED';
    end if;
  end if;

  if theme_changed and (new.tema_perfil is null or new.tema_perfil <> all(array['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal', 'estadio', 'vinilo', 'eclipse'])) then
    raise exception 'Elige un estilo de la colección THC' using errcode = '22023', detail = 'PROFILE_INVALID_THEME';
  end if;
  if color_changed and (new.color_pixel is null or new.color_pixel !~ '^#[0-9A-Fa-f]{6}$') then
    raise exception 'El color debe tener formato hexadecimal de seis caracteres' using errcode = '22023', detail = 'PROFILE_INVALID_COLOR';
  end if;
  if scale_changed and (new.avatar_scale is null or not (new.avatar_scale between 1 and 2.5)) then
    raise exception 'El tamaño del avatar debe estar entre 1 y 2.5' using errcode = '22023', detail = 'PROFILE_INVALID_CROP';
  end if;
  if x_changed and (new.avatar_pos_x is null or not (new.avatar_pos_x between 0 and 100)) then
    raise exception 'La posición horizontal del avatar debe estar entre 0 y 100' using errcode = '22023', detail = 'PROFILE_INVALID_CROP';
  end if;
  if y_changed and (new.avatar_pos_y is null or not (new.avatar_pos_y between 0 and 100)) then
    raise exception 'La posición vertical del avatar debe estar entre 0 y 100' using errcode = '22023', detail = 'PROFILE_INVALID_CROP';
  end if;
  if banner_changed and (new.banner_pos_y is null or not (new.banner_pos_y between 0 and 100)) then
    raise exception 'La posición del banner debe estar entre 0 y 100' using errcode = '22023', detail = 'PROFILE_INVALID_CROP';
  end if;

  if web_request and not eligible then
    if theme_changed and new.tema_perfil <> 'default' then
      raise exception 'Los estilos personalizados requieren VIP (nivel 10 o superior)' using errcode = '42501', detail = 'PROFILE_VIP_REQUIRED';
    end if;
    if color_changed and not (restoring_default and new.color_pixel = '#A855F7')
      and not (tg_op = 'INSERT' and new.tema_perfil = 'default' and new.color_pixel = '#A855F7') then
      raise exception 'La personalización de color requiere VIP (nivel 10 o superior)' using errcode = '42501', detail = 'PROFILE_VIP_REQUIRED';
    end if;
  end if;

  return new;
end;
$guard$;

comment on function public.thc_profile_appearance_guard() is 'THC profile appearance guard v2: ten themes, owner VIP 10; ordinary edits, existing RLS and pack balances preserved.';
revoke all on function public.thc_profile_appearance_guard() from public, anon, authenticated;

drop trigger if exists thc_profile_appearance_guard on public.perfiles;
create trigger thc_profile_appearance_guard before insert or update on public.perfiles
for each row execute function public.thc_profile_appearance_guard();

commit;

select t.tgname, pg_catalog.pg_get_triggerdef(t.oid) as definicion, p.prosecdef as security_definer
from pg_catalog.pg_trigger t join pg_catalog.pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.perfiles'::regclass and t.tgname = 'thc_profile_appearance_guard';
