import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const runtimePath = process.argv[2];
if (!runtimePath) throw new Error('Uso: node scripts/test-forum-image-storage-sql.mjs RUTA_AL_RUNTIME_PGLITE');
const { PGlite } = await import(pathToFileURL(runtimePath).href);

const db = new PGlite();
const own = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const image = '33333333-3333-4333-8333-333333333333';
let checks = 0;
await db.exec(`
create role authenticated nologin; create role anon nologin;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated, anon;
create policy old_wide_policy on storage.objects for all to public using (true) with check (true);
create table public.foro_publicaciones (id uuid default gen_random_uuid() primary key, autor_id uuid, titulo text, contenido text, imagenes text[] default '{}');
create table public.foro_comentarios (id uuid default gen_random_uuid() primary key, autor_id uuid, contenido text, imagenes text[] default '{}');
alter table public.foro_publicaciones enable row level security;
alter table public.foro_comentarios enable row level security;
grant select, insert on public.foro_publicaciones, public.foro_comentarios to authenticated;
create policy forum_existing on public.foro_publicaciones for all to authenticated using (true) with check (true);
create policy comment_existing on public.foro_comentarios for all to authenticated using (true) with check (true);
`);
const patch = await readFile(new URL('../supabase/forum_image_storage.sql', import.meta.url), 'utf8');
await db.exec(patch); await db.exec(patch); checks++;
const bucket = (await db.query("select * from storage.buckets where id='foro_media'")).rows[0];
assert.equal(bucket.file_size_limit, 5242880); assert.equal(bucket.public, true); assert.equal(bucket.allowed_mime_types.length, 4); checks++;
const insert = (user, extension='png', folder='foro') => `insert into storage.objects (bucket_id,name) values ('foro_media','${user}/${folder}/${image}.${extension}')`;
async function as(user, sql, role='authenticated') {
  try { await db.exec(`set role ${role}; set request.jwt.claim.sub = '${user || ''}';`); return await db.query(sql); }
  finally { await db.exec('reset role; reset request.jwt.claim.sub;'); }
}
async function denied(sql, user=own, role='authenticated') { await assert.rejects(as(user, sql, role), /row-level security/i); checks++; }
await as(own, insert(own)); checks++;
await denied(insert(other));
await denied(insert(own, 'svg'));
await denied(insert(own, 'png', 'wrong'));
await denied(insert(own), '', 'anon');
assert.equal((await as(other, "select * from storage.objects where bucket_id='foro_media'")).rows.length, 0); checks++;
assert.equal((await as(own, "select * from storage.objects where bucket_id='foro_media'")).rows.length, 1); checks++;
assert.equal((await as(own, "update storage.objects set name='changed.png' where bucket_id='foro_media' returning id")).rows.length, 0); checks++;
assert.equal((await as(other, "delete from storage.objects where bucket_id='foro_media' returning id")).rows.length, 0); checks++;
assert.equal((await as(own, "delete from storage.objects where bucket_id='foro_media' returning id")).rows.length, 1); checks++;
await as(own, "insert into storage.objects(bucket_id,name) values ('other_bucket','untouched.txt')");
assert.equal((await as(other, "update storage.objects set name='still_allowed.txt' where bucket_id='other_bucket' returning id")).rows.length, 1); checks++;
for (const table of ['foro_publicaciones','foro_comentarios']) {
  await as(own, `insert into public.${table}(autor_id,contenido,imagenes) values('${own}','Prueba','{}')`); checks++;
  await denied(`insert into public.${table}(autor_id,contenido) values('${other}','No')`);
}
await db.close();
console.log(`Foro SQL: ${checks} verificaciones PostgreSQL/RLS correctas, incluido parche repetido y políticas amplias anteriores.`);
