begin;

create table if not exists public.tierlist_envios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ultimo_envio timestamptz not null,
  dia date not null,
  cantidad integer not null check (cantidad between 1 and 10)
);
alter table public.tierlist_envios enable row level security;
revoke all on public.tierlist_envios from public, anon, authenticated;

create or replace function public.reservar_envio_tierlist()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  request_time timestamptz := pg_catalog.clock_timestamp();
  request_day date := (request_time at time zone 'UTC')::date;
  reserved uuid;
begin
  if caller is null then raise exception 'Sesión requerida' using errcode = '42501'; end if;
  insert into public.tierlist_envios as quota(user_id, ultimo_envio, dia, cantidad)
  values (caller, request_time, request_day, 1)
  on conflict (user_id) do update set
    ultimo_envio = excluded.ultimo_envio,
    dia = excluded.dia,
    cantidad = case when quota.dia = excluded.dia then quota.cantidad + 1 else 1 end
  where quota.ultimo_envio <= request_time - interval '1 minute'
    and (quota.dia <> request_day or quota.cantidad < 10)
  returning quota.user_id into reserved;
  return reserved is not null;
end;
$$;
revoke all on function public.reservar_envio_tierlist() from public, anon;
grant execute on function public.reservar_envio_tierlist() to authenticated;
commit;
