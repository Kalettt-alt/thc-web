begin;

do $check_installation$
begin
  if to_regclass('public.ut_cartas') is null or to_regclass('thc_private.ut_jugadores_base') is null then
    raise exception 'Ejecuta primero ComandosSQL_UltimateTeam.txt completo y después este archivo.';
  end if;
end $check_installation$;

do $card_rarities$
declare constraint_name text; rarity_column smallint;
begin
  select attnum into rarity_column from pg_attribute
  where attrelid = 'public.ut_cartas'::regclass and attname = 'rareza' and not attisdropped;
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.ut_cartas'::regclass and contype = 'c'
      and conkey = array[rarity_column]::smallint[]
  loop
    execute format('alter table public.ut_cartas drop constraint %I', constraint_name);
  end loop;
end $card_rarities$;

alter table public.ut_cartas add constraint ut_cartas_rareza_check
  check (rareza in ('bronce','plata','oro','plus','ultimate','especial'));

alter table public.ut_cartas drop constraint if exists ut_cartas_grl_limite;
alter table public.ut_cartas add constraint ut_cartas_grl_limite check (grl between 0 and 99);

update thc_private.ut_jugadores_base
set datos = datos || jsonb_build_object('nacionalidad','PE','pais_codigo','PE')
where id = any(array['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23'])
  and coalesce(datos->>'nacionalidad','') = '';

commit;
