select p.oid::regprocedure as funcion, pg_catalog.pg_get_functiondef(p.oid) as definicion
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'abrir_sobre_album' and p.prokind = 'f';

do $configurar_sobre$
declare
  cantidad_confirmada smallint := 5;
begin
  if cantidad_confirmada is null then
    raise notice 'Configuración de sobres sin cambios. Revisa la definición anterior de abrir_sobre_album, sustituye NULL por la cantidad real de cartas y ejecuta nuevamente este bloque.';
    return;
  end if;
  if cantidad_confirmada not between 1 and 20 then
    raise exception 'La cantidad confirmada de cartas por sobre debe estar entre 1 y 20';
  end if;
  insert into thc_private.album_v2_config(singleton, cartas_por_sobre)
  values(true, cantidad_confirmada)
  on conflict(singleton) do update set cartas_por_sobre = excluded.cartas_por_sobre;
  raise notice 'Sobres configurados: % cartas por sobre.', cantidad_confirmada;
end;
$configurar_sobre$;
