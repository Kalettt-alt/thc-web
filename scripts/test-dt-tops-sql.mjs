import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2] || '.qa/sql-muro-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const sql = await readFile(new URL('../ComandosSQL_DTFantasyTOPS.txt', import.meta.url), 'utf8');
assert.equal((sql.match(/^begin;\s*$/gim) || []).length, 1, 'copy/paste migration has one outer transaction');
assert.equal((sql.match(/^commit;\s*$/gim) || []).length, 1, 'copy/paste migration commits once after both modules');
const normal = '11111111-1111-4111-8111-111111111111';
const staff = '22222222-2222-4222-8222-222222222222';
const legacy = '33333333-3333-4333-8333-333333333333';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const p = name => ({ id: name, name, pos: 'MID', grl: 75, energia: 85 });
const fresh = (partida_id = id) => ({ partida_id, club_id: 'a', club_nombre: 'A', liga: 'ARG', jornada_actual: 0, tactica: '4-3-3 OFENSIVO', titulares: { mc: p('one') }, reservas: [p('two')], energia_revision: 0,
  standings: Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, { id: key, name: key.toUpperCase(), pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, dg: 0 }])),
  fixture: [[['a', 'b'], ['c', 'd']], [['c', 'a'], ['b', 'd']], [['a', 'd'], ['b', 'c']]].map(round => round.map(([local, visitante]) => ({ local, visitante, gl: null, gv: null, jugado: false }))) });
const finish = (snapshot, ours, theirs) => {
  const result = structuredClone(snapshot);
  for (const game of result.fixture[result.jornada_actual]) {
    game.gl = game.local === 'a' ? ours : game.visitante === 'a' ? theirs : 0;
    game.gv = game.visitante === 'a' ? ours : game.local === 'a' ? theirs : 0;
    game.jugado = true;
  }
  return result;
};
const query = async (text, args = []) => (await db.query(text, args)).rows;
const role = async (who, user = '') => {
  await db.exec('reset role;');
  await query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`set role ${who};`);
};
const save = async snapshot => (await query('select public.thc_fantasy_guardar($1::jsonb,$2::bigint) as value', [JSON.stringify(snapshot), snapshot.energia_revision || 0]))[0].value;
const tops = async (offset = 0, limit = 25) => (await query('select public.thc_fantasy_tops($1,$2) as value', [offset, limit]))[0].value;
const rejected = async (action, code) => assert.rejects(action, error => !code || error.code === code);
let passed = 0;
const check = async (name, test) => { await test(); passed++; console.log(`OK ${name}`); };
let state = fresh();

try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.perfiles(id uuid primary key references auth.users(id),discord_nombre text not null,apodo text,avatar_url text,perfil_publico boolean default true,nivel_rol integer default 0);
    create table public.fantasy_partidas(id uuid primary key default gen_random_uuid(), user_id uuid unique not null references auth.users(id), club_id text not null,club_nombre text not null,liga text not null,jornada_actual integer default 0,tactica text default '4-3-3 OFENSIVO',titulares jsonb default '{}',reservas jsonb default '[]',fixture jsonb default '[]',standings jsonb default '{}',creado_en timestamptz default now(),actualizado_en timestamptz default now());
    grant select,insert,update,delete on public.fantasy_partidas to authenticated;
    alter table public.fantasy_partidas enable row level security;
    create policy old_overbroad on public.fantasy_partidas for all to authenticated using(true) with check(true);`);
  await query('insert into auth.users values($1),($2),($3)', [normal, staff, legacy]);
  await query("insert into public.perfiles(id,discord_nombre,avatar_url,perfil_publico,nivel_rol) values($1,'Normal','normal.png',true,0),($2,'Staff secreto','private.png',false,100),($3,'Antiguo',null,true,10)", [normal, staff, legacy]);
  const old = finish(fresh('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 2, 0);
  old.jornada_actual = 1;
  await query('insert into public.fantasy_partidas(id,user_id,club_id,club_nombre,liga,jornada_actual,tactica,titulares,reservas,fixture,standings) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [old.partida_id, legacy, old.club_id, old.club_nombre, old.liga, old.jornada_actual, old.tactica, JSON.stringify(old.titulares), JSON.stringify(old.reservas), JSON.stringify(old.fixture), JSON.stringify(old.standings)]);
  await check('standalone SQL compiles and preserves existing career and historical rayos at zero', async () => {
    await db.exec(sql);
    await role('authenticated', legacy);
    assert.equal((await tops()).yo.rayos, 0);
    assert.equal((await query('select fixture from public.fantasy_partidas where user_id=$1', [legacy]))[0].fixture[0][0].gl, 2);
  });
  await check('a new career creates one independent ranking entry and keeps the client career identity', async () => {
    await role('authenticated', normal);
    const saved = await save(state);
    assert.equal(saved.id, id);
    assert.equal(saved.rayos, 0);
    assert.equal(saved.rayos_delta, 0);
    assert.equal((await tops()).total, 2);
  });
  await check('victory stores fixture and +2 exactly once; retry/reload cannot claim again', async () => {
    state = finish(state, 3, 1);
    state.standings.a.pts = 99999;
    const result = await save(state);
    assert.equal(result.rayos_delta, 2);
    assert.equal(result.rayos, 2);
    const stored = (await query('select fixture,standings from public.fantasy_partidas where user_id=$1', [normal]))[0];
    assert.equal(stored.fixture[0][0].gl, 3);
    assert.equal(stored.standings.a.pts, 3);
    assert.equal((await save(state)).rayos_delta, 0);
    assert.equal((await save(state)).rayos, 2);
  });
  await check('completed results cannot change, rewind, or be replaced by a new calendar', async () => {
    const changed = structuredClone(state); changed.fixture[0][0].gl = 9;
    await rejected(() => save(changed), '40001');
    await rejected(() => save(fresh()), '40001');
    const swapped = structuredClone(state); swapped.fixture[1][0].local = 'b';
    await rejected(() => save(swapped), '22023');
    assert.equal((await tops()).yo.rayos, 2);
  });
  await check('cannot skip ahead or complete future rounds for bulk credit', async () => {
    const skip = structuredClone(state); skip.jornada_actual = 2;
    await rejected(() => save(skip), '40001');
    const ahead = structuredClone(state); ahead.fixture[1][0] = { ...ahead.fixture[1][0], jugado: true, gl: 0, gv: 1 };
    await rejected(() => save(ahead), '22023');
  });
  await check('advance then draw grants +1; defeat grants -1', async () => {
    state.jornada_actual = 1; await save(state);
    state = finish(state, 1, 1);
    assert.equal((await save(state)).rayos, 3);
    state.jornada_actual = 2; await save(state);
    state = finish(state, 0, 2);
    const result = await save(state);
    assert.equal(result.rayos_delta, -1);
    assert.equal(result.rayos, 2);
    assert.deepEqual((( { victorias, empates, derrotas }) => ({ victorias, empates, derrotas }))((await tops()).yo), { victorias: 1, empates: 1, derrotas: 1 });
  });
  await check('rescind preserves rayos and old career identity can never be reused', async () => {
    await query('delete from public.fantasy_partidas where user_id=$1', [normal]);
    await rejected(() => save(fresh()), '40001');
    state = fresh(id2);
    assert.equal((await save(state)).rayos, 2);
    const oldTab = structuredClone(state); oldTab.partida_id = id;
    await rejected(() => save(oldTab), '40001');
    assert.equal((await tops()).yo.rayos, 2);
  });
  await check('new careers cannot import preplayed matches and defeat can produce a negative balance', async () => {
    await role('authenticated', staff);
    let staffState = fresh('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    await rejected(() => save(finish(staffState, 1, 0)), '22023');
    await save(staffState);
    staffState = finish(staffState, 0, 1);
    assert.equal((await save(staffState)).rayos, -1);
  });
  await check('VIP/owner/admin roles have exactly the same +2 / +1 / -1 rules', async () => {
    let staffState = (await query('select * from public.fantasy_partidas where user_id=$1', [staff]))[0];
    staffState = { ...staffState, partida_id: staffState.id, jornada_actual: 1 };
    await save(staffState);
    staffState = finish(staffState, 2, 1);
    const result = await save(staffState);
    assert.equal(result.rayos_delta, 2);
    assert.equal(result.rayos, 1);
  });
  await check('ranking hides private profile identity/avatar and uses stable global pagination', async () => {
    await role('authenticated', normal);
    const all = await tops();
    const privateRow = all.jugadores.find(person => person.nombre === 'Perfil privado');
    assert.equal(privateRow.perfil_id, null);
    assert.equal(privateRow.avatar_url, null);
    assert.equal(JSON.stringify(all).includes('Staff secreto'), false);
    assert.equal(JSON.stringify(all).includes(staff), false);
    const first = await tops(0, 1); const second = await tops(1, 1);
    assert.equal(first.jugadores[0].posicion, 1);
    assert.equal(second.jugadores[0].posicion, 2);
    assert.equal(second.yo.posicion, 1);
    await rejected(() => tops(-1, 25), '22023');
    await rejected(() => tops(0, 1000), '22023');
  });
  await check('direct writes, private ledgers, foreign careers and anonymous RPCs remain denied', async () => {
    await rejected(() => query('update public.fantasy_partidas set fixture=\'[]\''), '42501');
    await rejected(() => query('select * from thc_private.fantasy_rayos'), '42501');
    assert.equal((await query('select * from public.fantasy_partidas')).length, 1);
    await role('anon');
    await rejected(() => tops(), '42501');
    await rejected(() => save(state), '42501');
    await role('authenticated');
    await rejected(() => tops(), '42501');
  });
  await check('energy revisions continue preventing stale saves after a recovery', async () => {
    await role('authenticated', normal);
    const used = (await query('select public.thc_fantasy_usar_bebida($1,0) as value', ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee']))[0].value;
    assert.equal(used.energia_revision, 1);
    await rejected(() => save(state), '40001');
    assert.equal((await tops()).yo.rayos, 2);
  });
  await check('reapplying the entire copy/paste file never resets points, ledger, drinks or progress', async () => {
    await role('postgres');
    await query("update public.fantasy_partidas set titulares=jsonb_set(titulares,'{mc,energia}','43') where user_id=$1", [normal]);
    await db.exec(sql); await db.exec(sql);
    assert.equal((await query('select count(*)::int as total from thc_private.fantasy_resultados_rayos'))[0].total, 5);
    await role('authenticated', normal);
    assert.equal((await tops()).yo.rayos, 2);
    const stored = (await query('select energia_revision,titulares from public.fantasy_partidas where user_id=$1', [normal]))[0];
    assert.equal(stored.energia_revision, 1);
    assert.equal(stored.titulares.mc.energia, 43);
    assert.equal((await query('select public.thc_fantasy_bebidas_estado() as value'))[0].value.bebidas, 1);
  });
  console.log(`${passed} isolated PostgreSQL scenarios passed. No Supabase connection used.`);
} catch (error) {
  console.error({ message: error.message, code: error.code, position: error.position, detail: error.detail, stack: error.stack?.split('\n').slice(0, 3).join('\n') });
  process.exitCode = 1;
} finally { await db.close(); }
