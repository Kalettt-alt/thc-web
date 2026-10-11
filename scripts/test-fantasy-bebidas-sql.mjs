import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2] || '.qa/fantasy-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const firstUse = '33333333-3333-4333-8333-333333333333';
const secondUse = '44444444-4444-4444-8444-444444444444';
const thirdUse = '55555555-5555-4555-8555-555555555555';
const sql = await readFile(new URL('../supabase/dt_fantasy_bebidas.sql', import.meta.url), 'utf8');
const player = (id, energia) => ({ id, name: id, pos: 'MID', grl: 84, energia });
const snapshot = (energia = 40, round = 1) => ({ club_id: 'ours', club_nombre: 'Club de prueba', liga: 'ARG', jornada_actual: round, tactica: '4-3-3 OFENSIVO', titulares: { mc1: player('starter', energia), dfc1: player('starter2', energia), gk: null }, reservas: [player('reserve', energia)], standings: { ours: { id: 'ours', name: 'Club de prueba', pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 } }, fixture: [[{ local: 'ours', visitante: 'rival', jugado: false }], [{ local: 'rival', visitante: 'ours', jugado: false }]] });
const query = async (text, args = []) => (await db.query(text, args)).rows;
const role = async (name, id = '') => {
  await db.exec('reset role;');
  await query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`set role ${name};`);
};
const status = async () => (await query('select public.thc_fantasy_bebidas_estado() as value'))[0].value;
const save = async (data, revision) => (await query('select public.thc_fantasy_guardar($1::jsonb, $2::bigint) as value', [JSON.stringify(data), revision]))[0].value;
const use = async (id, revision) => (await query('select public.thc_fantasy_usar_bebida($1::uuid, $2::bigint) as value', [id, revision]))[0].value;
const career = async () => (await query('select * from public.fantasy_partidas where user_id = $1', [user]))[0];
const rejected = async (action, code) => assert.rejects(action, error => error.code === code);
let checks = 0;
const check = async (name, action) => { await action(); console.log(`OK ${name}`); checks++; };

try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    create table public.fantasy_partidas (
      id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id),
      club_id text not null, club_nombre text not null, liga text not null, jornada_actual integer default 0,
      tactica text default '4-3-3 OFENSIVO', titulares jsonb default '{}', reservas jsonb default '[]', fixture jsonb default '[]', standings jsonb default '{}',
      creado_en timestamptz default now(), actualizado_en timestamptz default now()
    );
    alter table public.fantasy_partidas enable row level security;
    grant select, insert, update, delete on public.fantasy_partidas to authenticated;
    create policy thc_owner_boundary on public.fantasy_partidas for all to authenticated using (true) with check (true);
    create policy existing_legacy_read on public.fantasy_partidas for select to authenticated using (true);`);
  await query('insert into auth.users values ($1),($2)', [user, other]);
  const old = snapshot(30, 0);
  await query('insert into public.fantasy_partidas(user_id, club_id,club_nombre,liga,titulares,reservas,fixture,standings) values($1,$2,$3,$4,$5,$6,$7,$8)', [user, old.club_id, old.club_nombre, old.liga, JSON.stringify(old.titulares), JSON.stringify(old.reservas), JSON.stringify(old.fixture), JSON.stringify(old.standings)]);
  await check('migration compiles and resets the unplayed opening round once', async () => {
    await db.exec(sql);
    const data = await career();
    assert.equal(data.titulares.mc1.energia, 100);
    assert.equal(data.reservas[0].energia, 100);
    assert.equal(data.energia_revision, 1);
  });
  await role('authenticated', user);
  await check('initial gift is exactly two and repeated status does not add drinks', async () => {
    assert.equal((await status()).bebidas, 2);
    assert.equal((await status()).bebidas, 2);
    await rejected(() => use(firstUse, 1), 'P0001');
    assert.equal((await status()).bebidas, 2);
    await save(snapshot(), 1);
  });
  await check('consumption restores all starters and reserves, preserves empty slots and costs one', async () => {
    const data = await use(firstUse, 1);
    assert.equal(data.bebidas, 1);
    assert.equal(data.energia_revision, 2);
    assert.ok(Object.values(data.titulares).filter(Boolean).every(p => p.energia === 100));
    assert.ok(data.reservas.every(p => p.energia === 100));
    assert.equal(data.titulares.gk, null);
  });
  await check('replay neither double charges nor restores old energy after later play', async () => {
    assert.equal((await use(firstUse, 1)).bebidas, 1);
    await save(snapshot(61), 2);
    const replay = await use(firstUse, 1);
    assert.equal(replay.bebidas, 1);
    assert.equal(replay.titulares.mc1.energia, 61);
    assert.equal(replay.reintentado, true);
  });
  await check('a stale autosave cannot overwrite recovery', async () => {
    await rejected(() => save(snapshot(20), 1), '40001');
    assert.equal((await career()).titulares.mc1.energia, 61);
  });
  await check('no overdraw and no restoration when the balance is empty', async () => {
    assert.equal((await use(secondUse, 2)).bebidas, 0);
    await save(snapshot(50), 3);
    await rejected(() => use(thirdUse, 3), 'P0001');
    assert.equal((await status()).bebidas, 0);
    assert.equal((await career()).titulares.mc1.energia, 50);
  });
  await check('authenticated clients cannot edit energy directly or access private resources', async () => {
    await rejected(() => query('update public.fantasy_partidas set energia_revision=0 where user_id=$1', [user]), '42501');
    await rejected(() => query('select * from thc_private.fantasy_bebidas'), '42501');
  });
  await check('another account cannot read the career and receives its independent gift', async () => {
    await role('authenticated', other);
    assert.equal((await query('select * from public.fantasy_partidas')).length, 0);
    assert.equal((await status()).bebidas, 2);
  });
  await check('anonymous requests cannot call any resource RPC', async () => {
    await role('anon');
    await rejected(status, '42501');
    await rejected(() => use(thirdUse, 0), '42501');
    await rejected(() => save(snapshot(), 0), '42501');
  });
  await check('restarting a career never repeats the initial gift or accepts an old receipt', async () => {
    await role('authenticated', user);
    const oldId = (await career()).id;
    await query('delete from public.fantasy_partidas where user_id=$1', [user]);
    await save(snapshot(45, 0), 0);
    assert.notEqual((await career()).id, oldId);
    assert.equal((await status()).bebidas, 0);
    await rejected(() => use(firstUse, 0), 'P0001');
  });
  await check('reapplying SQL neither refills drinks nor restores the squad again', async () => {
    await role('postgres');
    await db.exec(sql);
    assert.equal((await career()).titulares.mc1.energia, 45);
    await role('authenticated', user);
    assert.equal((await status()).bebidas, 0);
  });
  console.log(`${checks} SQL scenarios passed using isolated PostgreSQL. No remote data modified.`);
} catch (error) {
  console.error({ message: error.message, code: error.code, position: error.position, detail: error.detail });
  process.exitCode = 1;
} finally {
  await db.close();
}
