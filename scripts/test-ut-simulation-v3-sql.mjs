import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// An isolated PostgreSQL-compatible database; never reads production credentials.
const runtime = process.argv[2] || '.qa/sql-muro-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const base = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const complete = await readFile(new URL('../supabase/ut_online_matches.sql', import.meta.url), 'utf8');
const v2 = await readFile(new URL('../supabase/ut_simulation_v2.sql', import.meta.url), 'utf8');
const v3 = await readFile(new URL('../supabase/ut_simulation_v3.sql', import.meta.url), 'utf8');
assert.ok(complete.includes('-- BEGIN UT SIMULATION V2'), 'The v1 source boundary must remain explicit.');
const v1 = complete.split('-- BEGIN UT SIMULATION V2')[0] + '\ncommit;';
const users = Array.from({ length: 10 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
const starter = {
  formacion: '4-3-3',
  titulares: ['p10', 'p11', 'p9', 'p7', 'p8', 'p15', 'p5', 'p2', 'p3', 'p4', 'p1'].map(id => ({ id, grl: 99, stamina: 999, pos: 'GK' })),
  suplentes: ['p6', 'p12', 'p13', 'p14', 'p16', 'p17', 'p18'].map(id => ({ id, grl: 99, stamina: 999 })),
  reservas: [],
};
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const role = async (name = null, user = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  if (name) await db.exec(`set role ${name}`);
};
const state = async () => (await query('select public.thc_ut_online_estado() as value'))[0].value;
const join = async (requestId = crypto.randomUUID()) => (await query('select public.thc_ut_online_buscar($1::uuid) as value', [requestId]))[0].value;
const save = async squad => query('select public.thc_ut_guardar_plantilla($1::jsonb)', [JSON.stringify(squad)]);
const coach = async (id, team, extra = {}) => (await query('select public.thc_ut_online_tactica($1::uuid,$2::integer,$3::uuid,$4::text[],$5::text,$6::text) as value', [
  id, extra.revision ?? team.revision, extra.requestId || crypto.randomUUID(),
  extra.ids || team.titulares.map(player => player.id), extra.formacion || team.formacion, extra.mentalidad || 'neutral',
]))[0].value;
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const row = async id => (await query('select * from public.ut_online_partidas where id=$1', [id]))[0];
const time = async (id, seconds, version = 3) => {
  await role(null);
  const duration = version === 3 ? 132 : version === 2 ? 192 : 180;
  await query("update public.ut_online_partidas set started_at=now()-$2::integer*interval '1 second',ends_at=now()+($3::integer-$2::integer)*interval '1 second' where id=$1", [id, seconds, duration]);
};
const pair = async (home, away) => {
  await role('authenticated', home); await join();
  await role('authenticated', away); return join();
};
const catalogSquad = async (user, rating) => {
  const ids = [];
  for (const [index, position] of ['LW', 'ST', 'RW', 'CM', 'CAM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK'].entries()) {
    const id = (await query(`insert into public.ut_cartas(codigo,nombre,posicion,ritmo,tiro,pase,regate,defensa,fisico,estirada,paradas,saque,reflejos,velocidad_por,posicionamiento)
      values($1,$2,$3,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4) returning id`, [`duration-${user.slice(-12)}-${index}`, `Prueba ${index}`, position, rating]))[0].id;
    const copy = (await query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2) returning id', [user, id]))[0].id;
    ids.push({ id: `ut:${copy}`, grl: 1, stamina: 999, pos: 'GK' });
  }
  return { formacion: '4-3-3', titulares: ids, suplentes: [], reservas: [] };
};
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
let legacyId, olderId, gameId, olderBefore, legacyBefore, firstTeam, firstAway, team, past30, switchedId, offId;

try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre text not null,abreviatura text not null,logo_url text,liga text,colores jsonb default '[]',estadio text,apodos jsonb default '[]');
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion text default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());`);
  for (const user of users) {
    await query('insert into auth.users values($1)', [user]);
    await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,'Club de prueba','THC')", [user]);
  }
  await db.exec(base); await db.exec(v1);
  for (const user of users) { await role('authenticated', user); await save(starter); }
  legacyId = (await pair(users[0], users[1])).match.id;
  await role(null); await db.exec(v2);
  olderId = (await pair(users[2], users[3])).match.id;
  await time(olderId, 80, 2); await role('authenticated', users[2]); await state();
  await role(null); olderBefore = await row(olderId); legacyBefore = await row(legacyId);

  await check('v3 compila dos veces y conserva íntegros partidos v1/v2 activos', async () => {
    await db.exec(v3); await db.exec(v3);
    assert.deepEqual(await row(legacyId), legacyBefore); assert.deepEqual(await row(olderId), olderBefore);
    assert.equal(legacyBefore.simulation_version, 1); assert.equal(olderBefore.simulation_version, 2);
    assert.equal(Date.parse(legacyBefore.ends_at) - Date.parse(legacyBefore.started_at), 180000);
    assert.equal(Date.parse(olderBefore.ends_at) - Date.parse(olderBefore.started_at), 192000);
    assert.equal(olderBefore.active_seconds, 80);
  });
  await check('reloj v3 congela exactamente 60→72 y termina en 132; v1/v2 conservan sus límites', async () => {
    const cases = [
      [3, [[-1, 0], [0, 0], [59, 59], [60, 60], [61, 60], [65, 60], [71, 60], [72, 60], [73, 61], [131, 119], [132, 120], [999, 120]]],
      [2, [[89, 89], [90, 90], [95, 90], [101, 90], [102, 90], [103, 91], [191, 179], [192, 180]]],
      [1, [[89, 89], [90, 90], [95, 95], [179, 179], [180, 180], [999, 180]]],
    ];
    for (const [version, samples] of cases) {
      for (const [wall, active] of samples) {
        const found = (await query("select thc_private.ut_online_elapsed('2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'::timestamptz+($1::text||' seconds')::interval,$2::integer) as elapsed", [wall, version]))[0].elapsed;
        assert.equal(found, active, `v${version}, wall=${wall}`);
      }
    }
  });
  await check('v1 sigue rechazando coaching y finaliza a sus 180 s; no se acorta durante la migración', async () => {
    await time(legacyId, 179, 1); await role('authenticated', users[0]);
    const live = await state(); assert.equal(live.status, 'playing'); assert.equal(live.match.duration_seconds, 180);
    await reject(() => coach(legacyId, { revision: 0, titulares: [] }), '55000');
    await time(legacyId, 181, 1); await role('authenticated', users[0]); assert.equal((await state()).status, 'finished');
  });
  await check('coaching v2 funciona después del parche v3, conserva eventos y fatiga a 180 s', async () => {
    await role('authenticated', users[2]); const before = await state();
    const ids = before.match.home.titulares.map(player => player.id);
    const outgoing = ids[3]; const incoming = before.match.home.bench[0].id; ids[3] = incoming;
    const result = await coach(olderId, before.match.home, { ids, mentalidad: 'ofensiva' });
    assert.equal(result.match.simulation_version, 2); assert.equal(result.match.duration_seconds, 180);
    assert.deepEqual(result.match.events.slice(0, olderBefore.events.length), olderBefore.events);
    await time(olderId, 94, 2); await role('authenticated', users[2]); assert.equal((await state()).match.phase, 'halftime');
    await time(olderId, 193, 2); await role('authenticated', users[2]); const final = await state();
    assert.equal(final.status, 'finished'); assert.equal(final.match.active_seconds, 180);
    const off = final.match.home.roster.find(player => player.id === outgoing);
    const on = final.match.home.roster.find(player => player.id === incoming);
    assert.equal(off.played_seconds, 80); assert.equal(on.played_seconds, 100);
    assert.ok(Math.abs(off.stamina - (off.initial_stamina - 80 / 180 * (18 + (100 - off.base_grl) * .08))) < .000001);
  });
  await check('nuevos partidos v3 duran 132 s de reloj y 120 activos con 18 cartas canonical', async () => {
    const result = await pair(users[4], users[5]); gameId = result.match.id; team = result.match.home;
    firstTeam = structuredClone(team); firstAway = structuredClone(result.match.away);
    assert.equal(result.match.simulation_version, 3); assert.equal(result.match.duration_seconds, 120); assert.equal(result.match.halftime_seconds, 12);
    assert.equal(Date.parse(result.match.ends_at) - Date.parse(result.match.started_at), 132000);
    assert.equal(team.roster.length, 18); assert.equal(team.bench.length, 7);
    assert.ok(team.roster.every(player => player.base_grl < 99 && player.stamina === 100));
    assert.equal(result.match.events.length, 1); assert.equal(result.match.events[0].type, 'kickoff');
    assert.equal(result.match.home_goals, 0); assert.equal(result.match.away_goals, 0);
  });
  await check('constraints rechazan v3 con 192 s, cursor121, versiones falsas o diferencia inicial GRL4', async () => {
    await role(null);
    await reject(() => query("update public.ut_online_partidas set ends_at=started_at+interval '192 seconds' where id=$1", [gameId]), '23514');
    await reject(() => query('update public.ut_online_partidas set active_seconds=121 where id=$1', [gameId]), '23514');
    await reject(() => query('update public.ut_online_partidas set simulation_version=4 where id=$1', [gameId]), '23514');
    await reject(() => query('update public.ut_online_partidas set away_initial_grl=home_initial_grl+4 where id=$1', [gameId]), '23514');
  });
  await check('anon/visitante no dirigen, lectores no ven semilla/eventos ni escriben energía', async () => {
    await role('anon'); await reject(state, '42501'); await reject(() => join(), '42501');
    await role('authenticated', users[9]); await reject(() => coach(gameId, team), '42501');
    assert.equal((await query('select id from public.ut_online_partidas where id=$1', [gameId])).length, 0);
    await role('authenticated', users[4]);
    await reject(() => query('select events,simulation_seed from public.ut_online_partidas'), '42501');
    await reject(() => query('select thc_private.ut_online_advance($1,now())', [gameId]), '42501');
    await reject(() => query('select * from thc_private.ut_online_tactical_requests'), '42501');
    await reject(() => query('update public.ut_online_energia set stamina=1000 where user_id=$1', [users[4]]), '42501');
  });
  await check('avance genera solo ocasiones pasadas y los dos rivales reciben el mismo estado', async () => {
    await time(gameId, 30); await role('authenticated', users[4]); const home = await state();
    await role('authenticated', users[5]); const away = await state();
    assert.equal(home.match.active_seconds, 30); assert.deepEqual(home.match.events, away.match.events);
    assert.equal(home.match.home_goals, away.match.home_goals); assert.equal(home.match.away_goals, away.match.away_goals);
    assert.ok(home.match.events.every(event => event.second <= 30));
    past30 = structuredClone(home.match.events); team = home.match.home;
  });
  await check('sustitución idempotente conserva el pasado, revisión, penalty GK y cinco cambios', async () => {
    await role('authenticated', users[4]);
    const ids = team.titulares.map(player => player.id); offId = ids[3]; switchedId = team.bench[0].id; ids[3] = switchedId;
    const requestId = crypto.randomUUID();
    const result = await coach(gameId, team, { ids, mentalidad: 'ofensiva', requestId });
    assert.equal(result.match.home.revision, 1); assert.equal(result.match.home.substitutions, 1);
    assert.deepEqual(result.match.events.slice(0, past30.length), past30);
    const replay = await coach(gameId, team, { ids, mentalidad: 'ofensiva', requestId });
    assert.equal(replay.match.home.revision, 1); assert.equal(replay.match.events.filter(event => event.type === 'tactics').length, 1);
    team = result.match.home;
    await reject(() => coach(gameId, team, { revision: 0 }), '55000');
    await reject(() => coach(gameId, team, { ids: Array(11).fill('p1') }), '22023');
    const returnOff = [...ids]; returnOff[3] = offId; await reject(() => coach(gameId, team, { ids: returnOff }), '22023');
    const six = [...ids]; for (let index = 0; index < 5; index++) six[index === 3 ? 5 : index] = team.bench[index].id;
    await reject(() => coach(gameId, team, { ids: six }), '22023');
    const switched = [...ids]; [switched[0], switched[10]] = [switched[10], switched[0]];
    const moved = await coach(gameId, team, { ids: switched, mentalidad: 'ofensiva' });
    assert.equal(moved.match.home.titulares[0].base_grl - moved.match.home.titulares[0].grl, 40);
    assert.equal(moved.match.home.substitutions, 1); team = moved.match.home;
    // Keep the incoming card active for the proportional fatigue checks below.
  });
  await check('entretiempo v3 a los 60 s congela pelota/eventos/energía; permite formación y mentalidad', async () => {
    await time(gameId, 65); await role('authenticated', users[4]); const first = await state();
    assert.equal(first.match.phase, 'halftime'); assert.equal(first.match.active_seconds, 60);
    assert.equal(first.match.events.filter(event => event.type === 'halftime').length, 1);
    assert.equal(first.match.events.find(event => event.type === 'halftime').minute, 45);
    await time(gameId, 70); await role('authenticated', users[4]); const again = await state();
    assert.equal(again.match.active_seconds, 60); assert.deepEqual(again.match.home, first.match.home); assert.deepEqual(again.match.events, first.match.events);
    const updated = await coach(gameId, again.match.home, { formacion: '4-4-2', mentalidad: 'defensiva' });
    assert.equal(updated.match.home.formacion, '4-4-2'); assert.equal(updated.match.home.mentalidad, 'defensiva');
    assert.equal(updated.match.home.substitutions, 1); assert.deepEqual(updated.match.home.roster, first.match.home.roster);
    const tactical = updated.match.events.at(-1); assert.equal(tactical.second, 60); assert.equal(tactical.minute, 45);
    team = updated.match.home;
  });
  await check('segundo tiempo arranca tras12 s y fatiga avanza por segundos activos, sin descontar descanso', async () => {
    await time(gameId, 73); await role('authenticated', users[4]); const result = await state();
    assert.equal(result.match.phase, 'second'); assert.equal(result.match.active_seconds, 61);
    assert.equal(result.match.events.filter(event => event.type === 'kickoff' && event.second === 61).length, 1);
    const off = result.match.home.roster.find(player => player.id === offId);
    const on = result.match.home.roster.find(player => player.id === switchedId);
    assert.equal(off.played_seconds, 30); assert.equal(on.played_seconds, 31);
    assert.ok(Math.abs(on.stamina - (on.initial_stamina - 31 / 120 * (18 + (100 - on.base_grl) * .08))) < .000001);
  });
  await check('finalv3 es único, no predetermina goles y persiste fatiga proporcional del saliente y reemplazo', async () => {
    await time(gameId, 133); await role('authenticated', users[4]); const result = await state();
    assert.equal(result.status, 'finished'); assert.equal(result.match.phase, 'finished'); assert.equal(result.match.active_seconds, 120);
    assert.ok(result.match.home_goals <= 6 && result.match.away_goals <= 6);
    assert.deepEqual(result.match.events.slice(0, past30.length), past30);
    assert.equal(result.match.events.filter(event => event.type === 'fulltime').length, 1);
    for (const side of ['home', 'away']) {
      const shots = result.match.events.filter(event => ['goal', 'save', 'post', 'shot'].includes(event.type) && event.side === side);
      assert.equal(shots.length, 7); assert.ok(shots.every(event => event.minute >= 0 && event.minute <= 90));
    }
    const off = result.match.home.roster.find(player => player.id === offId);
    const on = result.match.home.roster.find(player => player.id === switchedId);
    assert.equal(off.played_seconds, 30); assert.equal(on.played_seconds, 90);
    for (const card of [off, on]) assert.ok(Math.abs(card.stamina - (card.initial_stamina - card.played_seconds / 120 * (18 + (100 - card.base_grl) * .08))) < .000001);
    await role(null); const energies = await query('select * from public.ut_online_energia order by user_id,player_id');
    const persisted = energies.filter(item => item.user_id === users[4]);
    assert.equal(persisted.length, 12); assert.ok(!persisted.some(item => item.player_id === firstTeam.bench[1].id));
    await role('authenticated', users[4]); await state(); await reject(() => coach(gameId, team), '55000');
    await role(null); assert.deepEqual(await query('select * from public.ut_online_energia order by user_id,player_id'), energies);
  });
  await check('cola v3 conserva el límite estricto ±3 y no confía GRL fabricado del cliente', async () => {
    await role(null); const high = await catalogSquad(users[7], 75); const close = await catalogSquad(users[8], 74);
    await role('authenticated', users[7]); await save(high);
    await role('authenticated', users[8]); await save(close);
    await role('authenticated', users[6]); const low = await join(); assert.equal(low.status, 'waiting'); assert.equal(low.queue_grl, 71);
    await role(null); await query("update public.ut_online_sesiones set joined_at=now()-interval '2 hours' where user_id=$1", [users[6]]);
    await role('authenticated', users[7]); const remote = await join(); assert.equal(remote.status, 'waiting'); assert.equal(remote.queue_grl, 75);
    await role('authenticated', users[8]); const fair = await join(); assert.equal(fair.status, 'playing');
    assert.equal(fair.match.home.id, users[6]); assert.equal(fair.match.away.id, users[8]);
    assert.equal(Math.abs(fair.match.home.grl - fair.match.away.grl), 3); assert.equal(fair.match.duration_seconds, 120);
    await role('authenticated', users[7]); assert.equal((await state()).status, 'waiting');
  });
  await check('v3 admite exactamente cinco cambios y rechaza el sexto o reingreso', async () => {
    await role('authenticated', users[6]); const current = await state(); const local = current.match.home;
    const ids = local.titulares.map(player => player.id); const outgoing = ids.slice(0, 5);
    for (let index = 0; index < 5; index++) ids[index] = local.bench[index].id;
    const result = await coach(current.match.id, local, { ids }); assert.equal(result.match.home.substitutions, 5);
    const sixth = [...ids]; sixth[5] = result.match.home.bench[0].id;
    await reject(() => coach(current.match.id, result.match.home, { ids: sixth }), '22023');
    const reentry = [...ids]; reentry[0] = outgoing[0];
    await reject(() => coach(current.match.id, result.match.home, { ids: reentry }), '22023');
  });
  await check('con misma semilla y cartas, mentalidad v3 modifica la ocasión futura del servidor', async () => {
    await role(null);
    let seed;
    for (let index = 1; index <= 100; index++) {
      const candidate = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      const roll = Number((await query("select thc_private.ut_online_random($1::uuid,8,'home','chance') as roll", [candidate]))[0].roll);
      if (roll > .192 && roll < .23) { seed = candidate; break; }
    }
    assert.ok(seed);
    const goals = []; const shadowIds = [];
    for (const mentalidad of ['defensiva', 'ofensiva']) {
      const id = (await query(`insert into public.ut_online_partidas(home_user,away_user,home,away,events,home_goals,away_goals,started_at,ends_at,simulation_version,simulation_seed,home_initial_grl,away_initial_grl)
        values($1,$2,$3,$4,'[]',0,0,now(),now()+interval '132 seconds',3,$5,$6,$7) returning id`,
      [users[4], users[5], JSON.stringify({ ...firstTeam, mentalidad }), JSON.stringify(firstAway), seed, firstTeam.grl, firstAway.grl]))[0].id;
      shadowIds.push(id);
      await query("select thc_private.ut_online_advance($1,(select started_at+interval '8 seconds' from public.ut_online_partidas where id=$1))", [id]);
      goals.push((await query('select home_goals from public.ut_online_partidas where id=$1', [id]))[0].home_goals);
    }
    assert.deepEqual(goals, [0, 1]);
    await query('delete from public.ut_online_partidas where id=any($1::uuid[])', [shadowIds]);
  });
  await check('reaplicar v3 mantiene historia y energía y todos los helpers siguen privados', async () => {
    await role(null); const games = await query('select * from public.ut_online_partidas order by id');
    const energy = await query('select * from public.ut_online_energia order by user_id,player_id'); await db.exec(v3);
    assert.deepEqual(await query('select * from public.ut_online_partidas order by id'), games);
    assert.deepEqual(await query('select * from public.ut_online_energia order by user_id,player_id'), energy);
    const grants = await query(`select p.proname,has_function_privilege('authenticated',p.oid,'execute') as allowed,p.proconfig
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='thc_private' and p.proname like 'ut_online_%'`);
    assert.ok(grants.every(item => !item.allowed && item.proconfig.includes('search_path=""')));
  });
  console.log(`${checks} escenarios SQL de simulación v3 aprobados (PGlite local; sin prueba de carga multiconexión).`);
} catch (error) {
  console.error(error.code || error.name, error.message, error.where || ''); process.exitCode = 1;
} finally {
  await db.close();
}
