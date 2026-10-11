begin;

do $$
declare
  tabla text;
  operacion text;
  nombre text;
begin
  foreach tabla in array array[
    'votos_publicaciones', 'votos_comentarios', 'muro_votos'
  ] loop
    if not exists (
      select 1 from pg_catalog.pg_class
      where oid = pg_catalog.to_regclass(format('public.%I', tabla))
        and relrowsecurity
    ) then
      raise exception 'La tabla public.% debe tener RLS activo', tabla;
    end if;

    foreach operacion in array array['insert', 'update', 'delete'] loop
      nombre := 'thc_votes_write_owner_' || operacion;
      if exists (
        select 1 from pg_catalog.pg_policies
        where schemaname = 'public' and tablename = tabla
          and policyname = nombre
      ) then
        raise exception 'La política % ya existe en %. Revisa su definición; no se reemplazó.', nombre, tabla;
      end if;

      if operacion = 'insert' then
        execute format(
          'create policy %I on public.%I as restrictive for insert to public with check (usuario_id = (select auth.uid()))',
          nombre, tabla
        );
      elsif operacion = 'update' then
        execute format(
          'create policy %I on public.%I as restrictive for update to public using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()))',
          nombre, tabla
        );
      else
        execute format(
          'create policy %I on public.%I as restrictive for delete to public using (usuario_id = (select auth.uid()))',
          nombre, tabla
        );
      end if;
    end loop;
  end loop;
end;
$$;

commit;
