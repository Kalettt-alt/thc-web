import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2] || '.qa/sql-oct10-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const first = '33333333-3333-4333-8333-333333333333';
const second = '44444444-4444-4444-8444-444444444444';
const sql = await readFile(new URL('../supabase/playlist_ut_policies.sql', import.meta.url), 'utf8');
const query = async (statement, values = []) => (await db.query(statement, values)).rows;
const asRole = async (name, id = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${name}`);
};
let scenarios = 0;
const check = async (label, callback) => { await callback(); scenarios++; console.log(`OK ${label}`); };
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to public;
    create table public."PlaylistUT" (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      url text not null, title text not null, artist text not null,
      thumbnail text, created_at timestamptz not null default now(), source text default 'youtube'
    );
    grant all on public."PlaylistUT" to authenticated, anon, service_role;
    alter table public."PlaylistUT" enable row level security;
    create policy old_overly_permissive on public."PlaylistUT" for all to public using (true) with check (true);
  `);
  await query('insert into public."PlaylistUT" (id,user_id,url,title,artist) values ($1,$2,\'https://youtu.be/dQw4w9WgXcQ\',\'Own song\',\'Artist\'),($3,$4,\'https://youtu.be/M7lc1UVf-VE\',\'Other song\',\'Other artist\')', [first, owner, second, other]);
  await check('migration is idempotent and preserves existing data', async () => {
    await db.exec(sql);
    await db.exec(sql);
    assert.equal((await query('select count(*) from public."PlaylistUT"'))[0].count, 2);
    assert.equal((await query("select relrowsecurity from pg_class where oid='public.\"PlaylistUT\"'::regclass"))[0].relrowsecurity, true);
  });
  await asRole('authenticated', owner);
  await check('owner reads its own songs even with an old permissive policy', async () => {
    const rows = await query('select id from public."PlaylistUT"');
    assert.deepEqual(rows.map(row => row.id), [first]);
  });
  await check('owner can update its own title but cannot change owner', async () => {
    assert.equal((await query('update public."PlaylistUT" set title=\'New title\' where id=$1 returning id', [first]))[0].id, first);
    await assert.rejects(query('update public."PlaylistUT" set user_id=$1 where id=$2', [other, first]), error => error.code === '42501');
  });
  await check('cross-user delete/update return zero and forged insert is rejected', async () => {
    assert.equal((await query('delete from public."PlaylistUT" where id=$1 returning id', [second])).length, 0);
    assert.equal((await query('update public."PlaylistUT" set title=\'Forged\' where id=$1 returning id', [second])).length, 0);
    await assert.rejects(query('insert into public."PlaylistUT" (user_id,url,title,artist) values ($1,\'x\',\'x\',\'x\')', [other]), error => error.code === '42501');
  });
  await check('owner insert and DELETE RETURNING confirm exactly its own row', async () => {
    const inserted = await query('insert into public."PlaylistUT" (user_id,url,title,artist) values ($1,\'https://youtu.be/dQw4w9WgXcQ\',\'New song\',\'Artist\') returning id', [owner]);
    assert.equal(inserted.length, 1);
    const removed = await query('delete from public."PlaylistUT" where id=$1 and user_id=$2 returning id', [first, owner]);
    assert.deepEqual(removed.map(row => row.id), [first]);
  });
  await asRole('anon');
  await check('anonymous access cannot read or delete playlist data', async () => {
    await assert.rejects(query('select * from public."PlaylistUT"'), error => error.code === '42501');
    await assert.rejects(query('delete from public."PlaylistUT"'), error => error.code === '42501');
  });
  await asRole('service_role');
  await check('server administration retains access and foreign songs survive', async () => {
    assert.equal((await query('select title from public."PlaylistUT" where id=$1', [second]))[0].title, 'Other song');
  });
  console.log(`Verified ${scenarios} playlist RLS scenarios.`);
} finally {
  await db.close();
}
