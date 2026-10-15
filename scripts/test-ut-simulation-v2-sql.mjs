import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2] || '.qa/sql-online-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const base = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const complete = await readFile(new URL('../supabase/ut_online_matches.sql', import.meta.url), 'utf8');
const patch = await readFile(new URL('../supabase/ut_simulation_v2.sql', import.meta.url), 'utf8');
const legacy = complete.split('-- BEGIN UT SIMULATION V2')[0] + '\ncommit;';
const users = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const squad = { formacion: '4-3-3', titulares: ['p10','p11','p9','p7','p8','p15','p5','p2','p3','p4','p1'].map(id => ({ id, grl: 99, stamina: 999, pos: 'GK' })), suplentes: ['p6','p12','p13','p14','p16','p17','p18'].map(id => ({ id, stamina: 999, grl: 99 })), reservas: [] };
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const role = async (name = null, user = '') => { await db.exec('reset role'); await query("select set_config('request.jwt.claim.sub',$1,false)", [user]); if (name) await db.exec(`set role ${name}`); };
const state = async () => (await query('select public.thc_ut_online_estado() as value'))[0].value;
const join = async () => (await query('select public.thc_ut_online_buscar($1) as value', [crypto.randomUUID()]))[0].value;
const coach = async (id, team, extra = {}) => (await query('select public.thc_ut_online_tactica($1::uuid,$2::integer,$3::uuid,$4::text[],$5::text,$6::text) as value',
  [id, extra.revision ?? team.revision, extra.requestId || crypto.randomUUID(), extra.ids || team.titulares.map(player => player.id), extra.formacion || '4-3-3', extra.mentalidad || 'neutral']))[0].value;
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const time = async (id, seconds) => { await role(null); await query("update public.ut_online_partidas set started_at=now()-$2::integer*interval '1 second',ends_at=now()+(192-$2::integer)*interval '1 second' where id=$1", [id, seconds]); };
let checks = 0, legacyId, gameId, team, at80, events80, initialHome, initialAway;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre text not null,abreviatura text not null,logo_url text,liga text,colores jsonb default '[]',estadio text,apodos jsonb default '[]');
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion text default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());`);
  for (const user of users) { await query('insert into auth.users values($1)', [user]); await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,'Mi club','THC')", [user]); }
  await db.exec(base); await db.exec(legacy);
  for (const user of users.slice(0,2)) { await role('authenticated', user); await query('select public.thc_ut_guardar_plantilla($1::jsonb)', [JSON.stringify(squad)]); await join(); }
  legacyId = (await state()).match.id;
  await role(null);
  await check('patch v2 se aplica dos veces y conserva partido v1 activo, con su duración de180 s', async () => {
    const original = (await query('select * from public.ut_online_partidas'))[0];
    await db.exec(patch); await db.exec(patch);
    const migrated = (await query('select * from public.ut_online_partidas'))[0];
    assert.deepEqual(migrated.events, original.events); assert.equal(migrated.simulation_version, 1);
    assert.equal(Date.parse(migrated.ends_at)-Date.parse(migrated.started_at), 180000);
    await role('authenticated', users[0]); const current = await state(); assert.equal(current.match.simulation_version, 1);
    await reject(() => coach(legacyId, { revision: 0, titulares: [] }), '55000');
    await role(null); await query("update public.ut_online_partidas set started_at=now()-interval '181 seconds',ends_at=now()-interval '1 second' where id=$1", [legacyId]);
    await role('authenticated', users[0]); assert.equal((await state()).status, 'finished');
  });
  await check('nuevo partido v2 arranca sin resultados futuros, con18 cartas canonical y banca7', async () => {
    await role('authenticated', users[0]); await join(); await role('authenticated', users[1]); const result = await join();
    gameId = result.match.id; team = result.match.home;
    initialHome = structuredClone(result.match.home); initialAway = structuredClone(result.match.away);
    assert.equal(result.match.simulation_version, 2); assert.equal(result.match.duration_seconds, 180); assert.equal(result.match.halftime_seconds, 12);
    assert.equal(Date.parse(result.match.ends_at)-Date.parse(result.match.started_at), 192000);
    assert.equal(result.match.events.length, 1); assert.equal(result.match.home_goals, 0); assert.equal(result.match.away_goals, 0);
    assert.equal(team.roster.length, 18); assert.equal(team.bench.length, 7);
    assert.ok(team.roster.every(player => player.base_grl < 99 && player.stamina <= 100));
  });
  await check('RPC exige participante propio, cartas únicas y revisión actual; helpers privados', async () => {
    await role('authenticated', users[2]); await reject(() => coach(gameId, team), '42501');
    await reject(() => query('select thc_private.ut_online_advance($1,now())', [gameId]), '42501');
    await role('authenticated', users[0]);
    await reject(() => coach(gameId, team, { ids: Array(11).fill('p1') }), '22023');
    await reject(() => coach(gameId, team, { revision: 99 }), '55000');
    await reject(() => coach(gameId, team, { ids: ['ut:ffffffff-ffff-4fff-8fff-ffffffffffff', ...team.titulares.slice(1).map(player => player.id)] }), '22023');
  });
  await check('reloj de90+12+90 congela el avance durante el descanso, sin inventar eventos', async () => {
    await role(null);
    for (const [wall, elapsed] of [[89,89],[90,90],[95,90],[101,90],[102,90],[103,91],[191,179],[192,180]]) {
      assert.equal((await query("select thc_private.ut_online_elapsed('2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'::timestamptz+($1::text||' seconds')::interval,2) as elapsed", [wall]))[0].elapsed, elapsed);
    }
    await time(gameId, 80); await role('authenticated', users[0]); at80 = await state(); events80 = structuredClone(at80.match.events);
    assert.equal(at80.match.active_seconds, 80); assert.ok(events80.every(event => event.second <= 80));
    team = at80.match.home;
  });
  await check('coaching manual GK aLW penaliza40, no reescribe eventos anteriores ni restringe GRL posterior', async () => {
    const ids = team.titulares.map(player => player.id); [ids[0],ids[10]] = [ids[10],ids[0]];
    const requestId = crypto.randomUUID();
    const result = await coach(gameId, team, { ids, mentalidad: 'ofensiva', requestId });
    const updated = result.match.home;
    assert.equal(updated.revision, 1); assert.equal(updated.mentalidad, 'ofensiva'); assert.equal(updated.substitutions, 0);
    assert.equal(updated.titulares[0].grl, updated.titulares[0].base_grl-40);
    assert.deepEqual(result.match.events.slice(0,events80.length), events80);
    const replay = await coach(gameId, team, { ids, mentalidad: 'ofensiva', requestId });
    assert.equal(replay.match.home.revision, 1); assert.equal(replay.match.events.filter(event => event.type==='tactics').length, 1);
    team = updated;
  });
  await check('banca reemplaza titulares hasta cinco; salientes no reingresan y forma/mentalidad son válidas', async () => {
    const ids = team.titulares.map(player => player.id); ids[3] = team.bench[0].id;
    const result = await coach(gameId, team, { ids, formacion: '4-4-2', mentalidad: 'defensiva' });
    const updated = result.match.home;
    assert.equal(updated.substitutions, 1); assert.equal(updated.formacion, '4-4-2'); assert.equal(updated.subbed_off.length, 1);
    const reentry = [...ids]; reentry[3] = updated.subbed_off[0]; await reject(() => coach(gameId, updated, { ids: reentry }), '22023');
    const fiveMore = ids.map((id,index) => index<5 ? updated.bench[index].id : id);
    await reject(() => coach(gameId, updated, { ids: fiveMore }), '22023');
    await reject(() => coach(gameId, updated, { mentalidad: 'hack' }), '22023');
    const fourMore = [...ids];
    for (const [benchIndex,slot] of [0,1,2,4].entries()) fourMore[slot] = updated.bench[benchIndex].id;
    const fifth = (await coach(gameId,updated,{ ids: fourMore })).match.home;
    assert.equal(fifth.substitutions,5); assert.equal(fifth.subbed_off.length,5);
    const sixth = [...fourMore]; sixth[5] = fifth.bench[0].id;
    await reject(() => coach(gameId,fifth,{ids:sixth}), '22023');
    team = fifth;
  });
  await check('estado en entretiempo mantiene active90 y descuenta cero stamina extra al consultar', async () => {
    await time(gameId, 94); await role('authenticated', users[0]); const first = await state();
    assert.equal(first.match.phase, 'halftime'); assert.equal(first.match.active_seconds, 90);
    await time(gameId, 100); await role('authenticated', users[0]); const second = await state();
    assert.equal(second.match.active_seconds, 90); assert.deepEqual(second.match.home, first.match.home);
    assert.deepEqual(second.match.events, first.match.events);
  });
  await check('marcador final persiste una vez; fatiga proporcional también del saliente y suplente', async () => {
    await time(gameId, 193); await role('authenticated', users[0]); const result = await state();
    assert.equal(result.status, 'finished'); assert.equal(result.match.active_seconds, 180);
    assert.ok(result.match.home_goals<=6 && result.match.away_goals<=6);
    for (const side of ['home','away']) assert.equal(result.match.events.filter(event => ['goal','save','post','shot'].includes(event.type) && event.side===side).length, 7);
    assert.deepEqual(result.match.events.slice(0,events80.length), events80);
    const off = result.match.home.roster.find(player => player.id===team.subbed_off[0]);
    const incoming = result.match.home.roster.find(player => player.id==='p6');
    assert.equal(off.played_seconds,80); assert.equal(incoming.played_seconds,100);
    assert.ok(result.match.home.roster.some(player => player.played_seconds===0));
    const energy = await query('select * from public.ut_online_energia order by player_id');
    await state(); assert.deepEqual(await query('select * from public.ut_online_energia order by player_id'),energy);
    await reject(() => coach(gameId,result.match.home), '55000');
  });
  await check('patch no borra historia ni energía y todos los RPC conservan RLS y search_path fijo', async () => {
    await role(null); const energy = await query('select * from public.ut_online_energia order by user_id,player_id');
    await db.exec(patch); assert.equal((await query('select count(*)::int n from public.ut_online_partidas'))[0].n,2);
    assert.deepEqual(await query('select * from public.ut_online_energia order by user_id,player_id'),energy);
    await role('authenticated',users[2]); await reject(() => query('select events,simulation_seed from public.ut_online_partidas'), '42501');
    await reject(() => query('select * from thc_private.ut_online_tactical_requests'), '42501');
  });
  await check('con la misma semilla, mentalidad ofensiva modifica la ocasión futura en el servidor', async () => {
    await role(null);
    let seed;
    for (let index=1;index<=100;index++) {
      const candidate = `00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
      const roll = Number((await query("select thc_private.ut_online_random($1::uuid,8,'home','chance') as roll",[candidate]))[0].roll);
      if(roll>.192 && roll<.23) { seed=candidate; break; }
    }
    assert.ok(seed); const goals=[]; const shadowIds=[];
    for(const mentalidad of ['defensiva','ofensiva']) {
      const id=(await query("insert into public.ut_online_partidas(home_user,away_user,home,away,events,home_goals,away_goals,started_at,ends_at,simulation_version,simulation_seed,home_initial_grl,away_initial_grl) values($1,$2,$3,$4,'[]',0,0,now(),now()+interval '192 seconds',2,$5,$6,$7) returning id",[users[0],users[1],JSON.stringify({...initialHome,mentalidad}),JSON.stringify(initialAway),seed,initialHome.grl,initialAway.grl]))[0].id;
      shadowIds.push(id); await query("select thc_private.ut_online_advance($1, (select started_at+interval '8 seconds' from public.ut_online_partidas where id=$1))",[id]);
      goals.push((await query('select home_goals from public.ut_online_partidas where id=$1',[id]))[0].home_goals);
    }
    assert.deepEqual(goals,[0,1]);
    await query('delete from public.ut_online_partidas where id=any($1::uuid[])',[shadowIds]);
  });
  console.log(`${checks} escenarios SQL de simulaciónv2 aprobados.`);
} catch(error) { console.error(error.code || error.name,error.message,error.where || ''); process.exitCode=1; }
finally { await db.close(); }
