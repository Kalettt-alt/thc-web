import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2];
if (!runtime) throw new Error('Uso: node scripts/test-muro-weekly-quota-sql.mjs RUTA_AL_RUNTIME_PGLITE');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const own = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const old = '33333333-3333-4333-8333-333333333333';
let checks = 0;

await db.exec(`
create role authenticated nologin; create role anon nologin;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table auth.users(id uuid primary key);
insert into auth.users values('${own}'),('${other}'),('${old}');
create table public.perfiles(id uuid primary key references auth.users(id),discord_nombre text);
insert into public.perfiles values('${own}','Ana'),('${other}','Pedro'),('${old}','Antiguo');
create table public.muro_publicaciones(id uuid default gen_random_uuid() primary key,autor_id uuid not null references public.perfiles(id),titulo text not null,descripcion text not null,imagen_url text not null,creado_en timestamptz default now());
alter table public.muro_publicaciones enable row level security;
grant all on public.muro_publicaciones to authenticated,anon;
create policy old_wide_policy on public.muro_publicaciones for all to public using(true) with check(true);
create table public.muro_votos(id uuid default gen_random_uuid() primary key,publicacion_id uuid not null,
  usuario_id uuid not null references public.perfiles(id),tipo smallint not null,
  constraint muro_votes_existing foreign key(publicacion_id) references public.muro_publicaciones(id) on update cascade deferrable initially deferred);
comment on constraint muro_votes_existing on public.muro_votos is 'Se conserva este comentario';
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated,anon;
create policy old_wide_media on storage.objects for all to public using(true) with check(true);
insert into public.muro_publicaciones(autor_id,titulo,descripcion,imagen_url,creado_en)
  select '${old}','Histórica','Se conserva','https://example.com/image.jpg',clock_timestamp()-interval '1 day'+n*interval '1 hour' from generate_series(0,4)n;
`);
const patch = await readFile(new URL('../supabase/muro_weekly_quota.sql', import.meta.url), 'utf8');
await db.exec(patch); await db.exec(patch); checks++;

async function as(user, sql, role = 'authenticated') {
  try {
    await db.exec(`set role ${role}; set request.jwt.claim.sub = '${user || ''}';`);
    return await db.query(sql);
  } finally { await db.exec('reset role; reset request.jwt.claim.sub;'); }
}
const insert = (user, count = 1) => `insert into public.muro_publicaciones(autor_id,titulo,descripcion,imagen_url) select '${user}','Momento','Prueba','https://example.com/${crypto.randomUUID()}.jpg' from generate_series(1,${count}) returning id,creado_en,cuota_ciclo`;
const quota = async (user = own) => (await as(user, 'select public.thc_muro_cupo() as quota')).rows[0].quota;
async function denied(user, sql, pattern = /permission denied|row-level security|Solo puedes/i, role = 'authenticated') {
  await assert.rejects(as(user, sql, role), pattern); checks++;
}

assert.equal((await quota()).disponibles, 3); checks++;
assert.equal((await quota(old)).usadas, 5); checks++;
assert.equal((await db.query(`select count(*)::integer n from public.muro_publicaciones where autor_id='${old}'`)).rows[0].n, 5); checks++;
await denied(old, insert(old), /THC_MURO_WEEKLY_LIMIT/);
await denied(own, insert(other));
await denied('', insert(own), undefined, 'anon');
await denied('', 'select public.thc_muro_cupo()', /permission denied|Inicia sesión/, 'anon');
await denied(own, 'select * from thc_muro_private.ciclos', /permission denied/);
await denied(own, "select thc_muro_private.guard_publicacion()", /permission denied/);
await denied(own, `insert into public.muro_publicaciones(autor_id,titulo,descripcion,imagen_url,creado_en) values('${own}','No','No','https://example.com/no.jpg',now()-interval '10 days')`);
await denied(own, `insert into public.muro_publicaciones(autor_id,titulo,descripcion,imagen_url,cuota_ciclo) values('${own}','No','No','https://example.com/no.jpg',gen_random_uuid())`);

const first = (await as(own, insert(own, 3))).rows;
assert.equal(first.length, 3); checks++;
assert.equal((await quota()).disponibles, 0); checks++;
await denied(own, insert(own), /THC_MURO_WEEKLY_LIMIT/);
await denied(own, `update public.muro_publicaciones set creado_en=now()-interval '9 days' where id='${first[0].id}'`);
assert.equal((await as(other, `delete from public.muro_publicaciones where id='${first[0].id}' returning id`)).rows.length, 0); checks++;
await db.exec(`insert into public.muro_votos(publicacion_id,usuario_id,tipo) values('${first[0].id}','${other}',1);`);
await as(own, `delete from public.muro_publicaciones where id='${first[0].id}'`);
assert.equal((await db.query(`select count(*)::integer n from public.muro_votos where publicacion_id='${first[0].id}'`)).rows[0].n, 0); checks++;
const fk = (await db.query("select confdeltype,confupdtype,condeferrable,condeferred,obj_description(oid,'pg_constraint') as comment from pg_constraint where conname='muro_votes_existing'")).rows[0];
assert.equal(fk.confdeltype, 'c'); assert.equal(fk.confupdtype, 'c'); assert.equal(fk.condeferrable, true); assert.equal(fk.condeferred, true); assert.equal(fk.comment, 'Se conserva este comentario'); checks++;
const remaining = await quota();
assert.equal(remaining.usadas, 2); checks++;
assert.equal(new Date(remaining.inicio).getTime(), new Date(first[1].creado_en).getTime()); checks++;
assert.equal(Date.parse(remaining.reinicio) - Date.parse(remaining.inicio), 168 * 60 * 60 * 1000); checks++;
await as(own, insert(own));
assert.equal((await quota()).usadas, 3); checks++;
await as(own, `delete from public.muro_publicaciones where autor_id='${own}'`);
assert.equal((await quota()).disponibles, 3); checks++;
assert.equal((await quota()).inicio, null); checks++;

// A multi-row statement is atomic: a fourth row rolls back its earlier rows.
await denied(own, insert(own, 4), /THC_MURO_WEEKLY_LIMIT/);
assert.equal((await quota()).usadas, 0); checks++;

// Emulate an expired cycle with privileged SQL; no client can edit these dates.
await as(own, insert(own, 3));
await db.exec(`update public.muro_publicaciones set creado_en=clock_timestamp()-interval '8 days' where autor_id='${own}';`);
assert.equal((await quota()).disponibles, 3); checks++;
const nextCycle = (await as(own, insert(own))).rows[0].cuota_ciclo;
assert.equal((await quota()).usadas, 1); checks++;
assert.equal((await as(own, `select count(*)::integer n from public.muro_publicaciones where autor_id='${own}'`)).rows[0].n, 4); checks++;
const historical = (await db.query(`select id from public.muro_publicaciones where autor_id='${own}' and cuota_ciclo<>'${nextCycle}' limit 1`)).rows[0].id;
await as(own, `delete from public.muro_publicaciones where id='${historical}'`);
assert.equal((await quota()).usadas, 1); checks++;
await as(own, insert(own, 2));
await denied(own, insert(own), /THC_MURO_WEEKLY_LIMIT/);
await as(other, insert(other, 3));
assert.equal((await quota(other)).usadas, 3); checks++;
assert.equal((await quota(own)).usadas, 3); checks++;

// Guard remains installed after re-running and does not reset active quotas.
await db.exec(patch);
assert.equal((await quota(own)).usadas, 3); checks++;
assert.equal((await quota(other)).usadas, 3); checks++;
const guard = (await db.query("select proconfig,provolatile,prosecdef from pg_proc where oid='thc_muro_private.guard_publicacion()'::regprocedure")).rows[0];
assert.equal(guard.provolatile, 'v'); assert.equal(guard.prosecdef, true); assert.ok(guard.proconfig.includes('search_path=""')); checks++;
const source = (await db.query("select prosrc from pg_proc where oid='thc_muro_private.guard_publicacion()'::regprocedure")).rows[0].prosrc;
assert.match(source, /update thc_muro_private\.ciclos set revision = revision \+ 1[\s\S]*returning ciclo into ciclo_id/i); checks++;

const file = `${own}_44444444-4444-4444-8444-444444444444.jpg`;
await as(own, `insert into storage.objects(bucket_id,name) values('muro_media','${file}')`); checks++;
await denied(other, `insert into storage.objects(bucket_id,name) values('muro_media','${file}')`);
await denied(own, `insert into storage.objects(bucket_id,name) values('muro_media','${own}_wrong.svg')`);
assert.equal((await as(other, "select * from storage.objects where bucket_id='muro_media'")).rows.length, 0); checks++;
assert.equal((await as(other, "delete from storage.objects where bucket_id='muro_media' returning id")).rows.length, 0); checks++;
assert.equal((await as(own, "update storage.objects set name='replaced.jpg' where bucket_id='muro_media' returning id")).rows.length, 0); checks++;
assert.equal((await as(own, "delete from storage.objects where bucket_id='muro_media' returning id")).rows.length, 1); checks++;
await as(own, "insert into storage.objects(bucket_id,name) values('other_bucket','unchanged.txt')");
assert.equal((await as(other, "update storage.objects set name='still_allowed.txt' where bucket_id='other_bucket' returning id")).rows.length, 1); checks++;
await db.close();
console.log(`Muro SQL: ${checks} verificaciones PostgreSQL/RLS correctas. PGlite usa una sola conexión; el bloqueo por usuario se verifica en la función, sin simular una prueba de carga real de Supabase.`);
