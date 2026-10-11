begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $$
declare
  tabla text;
  publicacion_col smallint;
  usuario_col smallint;
begin
  foreach tabla in array array['perfiles', 'foro_publicaciones', 'foro_comentarios', 'votos_publicaciones', 'votos_comentarios', 'muro_publicaciones', 'muro_votos'] loop
    if not exists (
      select 1 from pg_catalog.pg_class
      where oid = pg_catalog.to_regclass(format('public.%I', tabla)) and relrowsecurity
    ) then
      raise exception 'Falta la tabla public.% o no tiene RLS activo. No se aplicó la mejora.', tabla;
    end if;
  end loop;

  if exists (
    select 1 from public.muro_votos
    group by publicacion_id, usuario_id
    having count(*) > 1
  ) then
    raise exception 'Hay votos duplicados en muro_votos. Revisa community_design_audit.sql; no se borró ninguna fila.';
  end if;

  select attnum into publicacion_col from pg_catalog.pg_attribute
  where attrelid = 'public.muro_votos'::regclass and attname = 'publicacion_id' and not attisdropped and attnotnull;
  select attnum into usuario_col from pg_catalog.pg_attribute
  where attrelid = 'public.muro_votos'::regclass and attname = 'usuario_id' and not attisdropped and attnotnull;

  if publicacion_col is null or usuario_col is null then
    raise exception 'muro_votos.publicacion_id y usuario_id deben existir y conservar NOT NULL. No se cambió el esquema.';
  end if;

  if pg_catalog.to_regclass('public.thc_muro_vote_unique') is not null and not exists (
    select 1 from pg_catalog.pg_index i
    where i.indexrelid = pg_catalog.to_regclass('public.thc_muro_vote_unique')
      and i.indrelid = 'public.muro_votos'::regclass
      and i.indisunique and i.indisvalid and i.indisready
      and i.indnkeyatts = 2 and i.indnatts = 2
      and i.indpred is null and i.indexprs is null
      and ((i.indkey[0] = publicacion_col and i.indkey[1] = usuario_col)
        or (i.indkey[0] = usuario_col and i.indkey[1] = publicacion_col))
  ) then
    raise exception 'El nombre thc_muro_vote_unique ya existe con una definición incompatible. Revisa la auditoría; no se reemplazó.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_index i
    where i.indrelid = 'public.muro_votos'::regclass
      and i.indisunique and i.indisvalid and i.indisready
      and i.indnkeyatts = 2 and i.indnatts = 2
      and i.indpred is null and i.indexprs is null
      and ((i.indkey[0] = publicacion_col and i.indkey[1] = usuario_col)
        or (i.indkey[0] = usuario_col and i.indkey[1] = publicacion_col))
  ) then
    execute 'create unique index thc_muro_vote_unique on public.muro_votos(publicacion_id, usuario_id)';
  end if;
end;
$$;

create index if not exists thc_foro_feed_v2
  on public.foro_publicaciones(estado, creado_en desc, id desc);
create index if not exists thc_foro_popular
  on public.foro_publicaciones(estado, puntuacion desc, creado_en desc, id desc);
create index if not exists thc_foro_comments_active
  on public.foro_comentarios(publicacion_id, estado, creado_en, id);
create index if not exists thc_foro_author
  on public.foro_publicaciones(autor_id);
create index if not exists thc_foro_comments_author
  on public.foro_comentarios(autor_id);
create index if not exists thc_foro_votes_user
  on public.votos_publicaciones(usuario_id, publicacion_id);
create index if not exists thc_foro_comment_votes_user
  on public.votos_comentarios(usuario_id, comentario_id);
create index if not exists thc_muro_feed
  on public.muro_publicaciones(creado_en desc, id desc);
create index if not exists thc_muro_author
  on public.muro_publicaciones(autor_id);
create index if not exists thc_muro_votes_user
  on public.muro_votos(usuario_id, publicacion_id);

commit;

select tablename, indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and indexname in ('thc_foro_feed_v2', 'thc_foro_popular', 'thc_foro_comments_active',
    'thc_foro_author', 'thc_foro_comments_author', 'thc_foro_votes_user',
    'thc_foro_comment_votes_user', 'thc_muro_feed', 'thc_muro_author', 'thc_muro_votes_user')
order by tablename, indexname;
