import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { UT_MATCH_PLAYS, matchOpportunitySchedule, matchMinuteState } from '../src/pages/UltimateTeam/matchPlaysUT.js';
import { validOnlineMatchUT } from '../src/pages/UltimateTeam/onlineMatchValidationUT.js';

// Every call runs in one disposable local PostgreSQL instance. No production credentials.
const runtime = process.argv[2] || '.qa/sql-muro-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const [base, online, v2, v3, v4, bundle] = await Promise.all([
  read('supabase/ultimate_team_cartas.sql'), read('supabase/ut_online_matches.sql'), read('supabase/ut_simulation_v2.sql'),
  read('supabase/ut_simulation_v3.sql'), read('supabase/ut_live_match_v4.sql'), read('ComandosSQL_ActualizacionUT.txt'),
]);
assert.ok(online.includes('-- BEGIN UT SIMULATION V2'));
const v1 = online.split('-- BEGIN UT SIMULATION V2')[0] + '\ncommit;';
const users = Array.from({ length: 12 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
const starter = {
  formacion: '4-3-3',
  titulares: ['p10', 'p11', 'p9', 'p7', 'p8', 'p15', 'p5', 'p2', 'p3', 'p4', 'p1'].map(id => ({ id, grl: 99, stamina: 999, pos: 'GK' })),
  suplentes: ['p6', 'p12', 'p13', 'p14', 'p16', 'p17', 'p18'].map(id => ({ id, grl: 99, stamina: 999 })), reservas: [],
};
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const role = async (name = null, user = '') => {
  await db.exec('reset role'); await query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  if (name) await db.exec(`set role ${name}`);
};
const state = async () => (await query('select public.thc_ut_online_estado() as value'))[0].value;
const join = async (requestId = crypto.randomUUID()) => (await query('select public.thc_ut_online_buscar($1::uuid) as value', [requestId]))[0].value;
const save = async squad => query('select public.thc_ut_guardar_plantilla($1::jsonb)', [JSON.stringify(squad)]);
const coach = async (id, team, extra = {}) => (await query('select public.thc_ut_online_tactica($1::uuid,$2::integer,$3::uuid,$4::text[],$5::text,$6::text) as value', [
  id, extra.revision ?? team.revision, extra.requestId || crypto.randomUUID(), extra.ids || team.titulares.map(p => p.id),
  extra.formacion || team.formacion, extra.mentalidad || 'neutral',
]))[0].value;
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const row = async id => (await query('select * from public.ut_online_partidas where id=$1', [id]))[0];
const time = async (id, wall) => {
  await role(null);
  // Preserve the actual wall duration, including extra time, instead of hardcoding v4.
  await query("update public.ut_online_partidas set started_at=now()-$2::integer*interval '1 second',ends_at=now()-$2::integer*interval '1 second'+(ends_at-started_at) where id=$1", [id, wall]);
};
const pair = async (home, away) => { await role('authenticated', home); await join(); await role('authenticated', away); return join(); };
const goals = events => Object.fromEntries(['home', 'away'].map(side => [side, events.filter(e => e.side === side && e.type === 'goal').length]));
const shotTypes = new Set(['goal', 'save', 'post', 'shot']);
const noFuture = match => {
  assert.ok(match.events.every(event => event.second <= match.active_seconds));
  const score = goals(match.events); assert.equal(match.home_goals, score.home); assert.equal(match.away_goals, score.away);
};
const catalogSquad = async (user, rating) => {
  const ids = [];
  for (const [i, position] of ['LW', 'ST', 'RW', 'CM', 'CAM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK'].entries()) {
    const id = (await query(`insert into public.ut_cartas(codigo,nombre,posicion,ritmo,tiro,pase,regate,defensa,fisico,estirada,paradas,saque,reflejos,velocidad_por,posicionamiento)
      values($1,$2,$3,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4) returning id`, [`v4-${user.slice(-12)}-${i}`, `Prueba ${i}`, position, rating]))[0].id;
    const copy = (await query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2) returning id', [user, id]))[0].id;
    ids.push({ id: `ut:${copy}`, grl: 1, stamina: 999, pos: 'GK' });
  }
  return { formacion: '4-3-3', titulares: ids, suplentes: [], reservas: [] };
};
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
let legacy1, legacy2, legacy3, gameId, initial, team, half, activeDuration, past30, offId, onId;

try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0,thc_points bigint default 0,creado_en timestamptz default now(),actualizado_en timestamptz default now());
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre varchar not null,abreviatura varchar not null,logo_url text,liga varchar not null,colores jsonb not null default '[]',estadio varchar not null,apodos jsonb default '[]',creado_en timestamptz default now(),actualizado_en timestamptz default now());
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion varchar default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());
    create table public."JugadoresUT"(id uuid primary key default gen_random_uuid(),nombre text not null,avatar varchar not null,creado_en timestamptz default now());
    create table public.club_ut(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),jugador_id uuid references public."JugadoresUT"(id),estado varchar default 'en_club',adquirido_en timestamptz default now());
    create table public."PlaylistUT"(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),url text not null,title text not null,artist text not null,thumbnail text,created_at timestamptz not null default now(),source text default 'youtube');`);
  for (const user of users) {
    await query('insert into auth.users values($1)', [user]);
    await query('insert into public.perfiles_ut(user_id) values($1)', [user]);
    await query("insert into public.equipos_ut(user_id,nombre,abreviatura,liga,estadio) values($1,'Club local','THC','Argentina','Arena')", [user]);
  }
  await db.exec(base); await db.exec(v1);
  for (const user of users) { await role('authenticated', user); await save(starter); }
  legacy1 = (await pair(users[0], users[1])).match.id;
  await role(null); await db.exec(v2); legacy2 = (await pair(users[2], users[3])).match.id;
  await role(null); await db.exec(v3); legacy3 = (await pair(users[4], users[5])).match.id;
  await time(legacy2, 30); await role('authenticated', users[2]); await state();
  await time(legacy3, 30); await role('authenticated', users[4]); await state();

  await check('instalar v4 dos veces conserva partidos v1/v2/v3 en curso, sin reescribir sus relojes', async () => {
    await role(null); const before = await query('select * from public.ut_online_partidas order by id');
    await db.exec(v4); await db.exec(v4);
    assert.deepEqual(await query('select * from public.ut_online_partidas order by id'), before);
    assert.deepEqual(before.map(g => [g.simulation_version, Date.parse(g.ends_at) - Date.parse(g.started_at)]).sort((a, b) => a[0] - b[0]), [[1,180000],[2,192000],[3,132000]]);
  });
  await check('reloj legacy mantiene 180/192/132 s y coaching v2/v3 sigue operativo', async () => {
    await role(null);
    for (const [id, samples] of [
      [legacy1, [[90,90],[100,100],[180,180]]], [legacy2, [[89,89],[90,90],[101,90],[102,90],[103,91],[192,180]]],
      [legacy3, [[59,59],[60,60],[71,60],[72,60],[73,61],[132,120]]],
    ]) for (const [wall, expected] of samples) {
      const found = (await query("select thc_private.ut_online_live_elapsed(g,g.started_at+$2::integer*interval '1 second') as value from public.ut_online_partidas g where id=$1", [id, wall]))[0].value;
      assert.equal(found, expected);
    }
    for (const [id, user, version, duration, finish] of [[legacy2, users[2], 2, 180, 192], [legacy3, users[4], 3, 120, 132]]) {
      await role('authenticated', user); const live = await state();
      const updated = await coach(id, live.match.home, { mentalidad: 'ofensiva' });
      assert.equal(updated.match.simulation_version, version); assert.equal(updated.match.duration_seconds, duration);
      assert.equal(updated.match.home.mentalidad, 'ofensiva'); assert.equal(validOnlineMatchUT(updated.match), true);
      await time(id, finish + 1); await role('authenticated', user); const final = await state();
      assert.equal(final.status, 'finished'); assert.equal(final.match.active_seconds, duration);
      assert.equal(final.match.events.filter(e => e.type === 'fulltime').length, 1);
    }
    await time(legacy1, 179); await role('authenticated', users[0]); assert.equal((await state()).status, 'playing');
    await reject(() => coach(legacy1, { revision: 0, titulares: [] }), '55000');
    await time(legacy1, 181); await role('authenticated', users[0]); assert.equal((await state()).status, 'finished');
  });
  await check('partido nuevo usa 60 s nominales +4–8 de añadido por mitad, 12 de descanso y sin futuros goles', async () => {
    initial = await pair(users[6], users[7]); gameId = initial.match.id; team = initial.match.home;
    half = initial.match.first_half_seconds; activeDuration = initial.match.active_duration_seconds;
    assert.equal(initial.status, 'playing'); assert.equal(initial.match.simulation_version, 4);
    assert.equal(initial.match.duration_seconds, 120); assert.equal(initial.match.halftime_seconds, 12);
    assert.ok(Number.isInteger(half) && half >= 64 && half <= 68); assert.equal(activeDuration, half * 2);
    assert.equal(Date.parse(initial.match.ends_at) - Date.parse(initial.match.started_at), (activeDuration + 12) * 1000);
    assert.equal(validOnlineMatchUT(initial.match), true); assert.equal(initial.match.phase, 'pre');
    assert.equal(team.roster.length, 18); assert.equal(team.bench.length, 7);
    assert.ok(team.roster.every(p => p.base_grl < 99 && p.stamina === 100));
    assert.deepEqual(initial.match.events.map(e => e.type), ['kickoff']); noFuture(initial.match);
  });
  await check('v4 limita duración/cursor y rechaza ±4 GRL incluso si manipulan datos privilegiados', async () => {
    await role(null);
    for (const wall of [132,139,141,143,145,147,149,192]) await reject(() => query("update public.ut_online_partidas set ends_at=started_at+$2::integer*interval '1 second' where id=$1", [gameId,wall]), '23514');
    await reject(() => query('update public.ut_online_partidas set active_seconds=$2 where id=$1', [gameId,activeDuration+1]), '23514');
    await reject(() => query('update public.ut_online_partidas set simulation_version=5 where id=$1', [gameId]), '23514');
    await reject(() => query('update public.ut_online_partidas set away_initial_grl=home_initial_grl+4 where id=$1', [gameId]), '23514');
  });
  await check('SQL contiene las mismas veinte jugadas y rutas que el renderer; el mazo no repite antes de20', async () => {
    const seed = '00000000-0000-4000-8000-000000000067';
    const deck = (await query('select thc_private.ut_online_live_play($1::uuid,i) as play from generate_series(0,39) i', [seed])).map(r => r.play);
    assert.equal(new Set(deck.slice(0,20).map(p => p.id)).size, 20); assert.deepEqual(deck.slice(0,20), deck.slice(20));
    const expected = new Map(UT_MATCH_PLAYS.map(p => [p.id,p]));
    for (const play of deck) assert.deepEqual(play, expected.get(play.id));
    for (const h of [64,65,66,67,68]) {
      const schedule = await query(`select action_side as side,opportunity as index,action_tick as second from public.ut_online_partidas g,
        lateral thc_private.ut_online_live_schedule(jsonb_populate_record(null::public.ut_online_partidas,to_jsonb(g)||jsonb_build_object('ends_at',g.started_at+($2::integer*2+12)*interval '1 second'))) where g.id=$1`, [gameId,h]);
      const order = (a,b) => a.side.localeCompare(b.side) || a.index-b.index;
      assert.deepEqual([...schedule].sort(order), matchOpportunitySchedule({simulation_version:4,active_duration_seconds:h*2}).sort(order));
      assert.equal(schedule.filter(p => p.side==='home').length,7); assert.equal(schedule.filter(p => p.side==='away').length,7);
      assert.equal(Math.max(...schedule.filter(p => p.second<=h).map(p => p.second)), h-4);
      assert.equal(Math.max(...schedule.map(p => p.second)), h*2-4);
    }
  });
  await check('SQL y cliente muestran minuto y añadido coherentes a ambos lados del entretiempo', async () => {
    for (const second of [0,8,59,60,61,half-1,half,half+1,half+60,half+61,activeDuration-1,activeDuration]) {
      const value = (await query('select thc_private.ut_online_live_minute(g,$2) as value from public.ut_online_partidas g where id=$1', [gameId,second]))[0].value;
      const expected = matchMinuteState(initial.match,second);
      assert.equal(value.minute, expected.minute); assert.equal(value.minuteLabel,expected.minuteLabel);
    }
  });
  await check('RLS y grants no exponen semilla, helpers, futuros eventos ni energía de otro usuario', async () => {
    await role('anon'); await reject(state,'42501'); await reject(() => join(),'42501');
    await role('authenticated', users[11]); await reject(() => coach(gameId,team),'42501');
    assert.equal((await query('select id from public.ut_online_partidas where id=$1',[gameId])).length,0);
    await role('authenticated',users[6]); await reject(() => query('select events,simulation_seed from public.ut_online_partidas'),'42501');
    await reject(() => query('select thc_private.ut_online_advance($1,now())',[gameId]),'42501');
    await reject(() => query('select thc_private.ut_online_live_play(gen_random_uuid(),0)'),'42501');
    await reject(() => query('select * from thc_private.ut_online_tactical_requests'),'42501');
    await reject(() => query('update public.ut_online_energia set stamina=1000'),'42501');
  });
  await check('avance a30 s devuelve el mismo partido para ambos participantes, sin eventos futuros', async () => {
    await time(gameId,30); await role('authenticated',users[6]); const home = await state();
    await role('authenticated',users[7]); const away = await state();
    assert.deepEqual(home.match,away.match); noFuture(home.match); assert.equal(home.match.active_seconds,30);
    past30 = structuredClone(home.match.events); team = home.match.home;
  });
  await check('reaplicar patch y TXT completo con v4 activo no altera snapshots, recibos, fatiga ni reloj', async () => {
    await role(null); const games = await query('select * from public.ut_online_partidas order by id');
    const energy = await query('select * from public.ut_online_energia order by user_id,player_id');
    await db.exec(v4); await db.exec(v4); assert.deepEqual(await query('select * from public.ut_online_partidas order by id'),games);
    await db.exec(bundle); const receipts = await query('select * from thc_private.ut_inicial_entregas order by user_id');
    await db.exec(bundle); assert.deepEqual(await query('select * from public.ut_online_partidas order by id'),games);
    assert.deepEqual(await query('select * from public.ut_online_energia order by user_id,player_id'),energy);
    assert.deepEqual(await query('select * from thc_private.ut_inicial_entregas order by user_id'),receipts);
  });
  await check('cambio a30 s es idempotente, conserva jugadas anteriores y bloquea revisión vieja/reingreso', async () => {
    await time(gameId,30); await role('authenticated',users[6]); const ids = team.titulares.map(p=>p.id); offId=ids[3]; onId=team.bench[0].id; ids[3]=onId;
    const requestId=crypto.randomUUID(); const result=await coach(gameId,team,{ids,requestId,mentalidad:'ofensiva'});
    const replay=await coach(gameId,team,{ids,requestId,mentalidad:'ofensiva'});
    assert.equal(result.match.home.substitutions,1); assert.equal(result.match.home.revision,1);
    assert.deepEqual(replay.match.home,result.match.home); assert.equal(replay.match.events.filter(e=>e.type==='tactics').length,1);
    assert.deepEqual(result.match.events.slice(0,past30.length),past30); team=result.match.home;
    await reject(()=>coach(gameId,team,{revision:0}),'55000');
    await reject(()=>coach(gameId,team,{ids:Array(11).fill('p1')}),'22023');
    const reentry=[...ids]; reentry[3]=offId; await reject(()=>coach(gameId,team,{ids:reentry}),'22023');
  });
  await check('45 minutos no corta el ataque: remate cuatro segundos antes y pelota segura antes del silbato', async () => {
    await time(gameId,60); await role('authenticated',users[6]); const nominal=await state();
    assert.equal(nominal.match.phase,'first'); assert.equal(nominal.match.events.filter(e=>e.type==='halftime').length,0);
    await time(gameId,half-1); await role('authenticated',users[6]); const closing=await state(); noFuture(closing.match);
    const lastShot=closing.match.events.find(e=>e.second===half-4&&shotTypes.has(e.type)); assert.ok(lastShot);
    const safe=closing.match.events.find(e=>e.second===half-1&&e.safe_end); assert.ok(safe);
    assert.ok(['settled','clearance'].includes(safe.type)); assert.ok(['keeper','middle'].includes(safe.resume));
    assert.equal(closing.match.phase,'first'); assert.equal(closing.match.events.some(e=>e.type==='halftime'),false);
  });
  await check('entretiempo congela12 s: ni energía, ni jugadas; sí permite formación/mentalidad', async () => {
    await time(gameId,half+1); await role('authenticated',users[6]); const first=await state();
    assert.equal(first.match.phase,'halftime'); assert.equal(first.match.active_seconds,half);
    assert.equal(first.match.events.filter(e=>e.type==='halftime').length,1);
    await time(gameId,half+10); await role('authenticated',users[6]); const again=await state();
    assert.equal(again.match.active_seconds,half); assert.deepEqual(again.match.home,first.match.home); assert.deepEqual(again.match.events,first.match.events);
    const updated=await coach(gameId,again.match.home,{formacion:'4-4-2',mentalidad:'defensiva'});
    assert.equal(updated.match.home.formacion,'4-4-2'); assert.equal(updated.match.home.mentalidad,'defensiva');
    assert.equal(updated.match.home.substitutions,1); assert.deepEqual(updated.match.home.roster,first.match.home.roster); team=updated.match.home;
    assert.equal(updated.match.events.at(-1).second,half); assert.equal(updated.match.events.at(-1).minute,45);
    await role(null);
    for (const [wall,expected] of [[half-1,half-1],[half,half],[half+11,half],[half+12,half],[half+13,half+1],[activeDuration+12,activeDuration]]) {
      const actual=(await query("select thc_private.ut_online_live_elapsed(g,g.started_at+$2::integer*interval '1 second') as value from public.ut_online_partidas g where id=$1",[gameId,wall]))[0].value;
      assert.equal(actual,expected);
    }
  });
  await check('segundo tiempo arranca después del descanso y el añadido admite decisiones hasta el cierre', async () => {
    await time(gameId,half+13); await role('authenticated',users[6]); const second=await state();
    assert.equal(second.match.phase,'second'); assert.equal(second.match.active_seconds,half+1);
    assert.equal(second.match.events.filter(e=>e.type==='kickoff'&&e.second===half+1).length,1);
    const off=second.match.home.roster.find(p=>p.id===offId), on=second.match.home.roster.find(p=>p.id===onId);
    assert.equal(off.played_seconds,30); assert.equal(on.played_seconds,half+1-30);
    const expected=on.initial_stamina-on.played_seconds/120*(18+(100-on.base_grl)*.08); assert.ok(Math.abs(on.stamina-expected)<.000001);
    await time(gameId,half+61+12); await role('authenticated',users[6]); const added=await state();
    assert.equal(added.status,'playing'); assert.equal(added.match.phase,'second'); assert.ok(added.match.active_seconds>120);
    const updated=await coach(gameId,added.match.home,{mentalidad:'ofensiva'}); assert.equal(updated.match.home.mentalidad,'ofensiva');
    assert.equal(updated.match.events.at(-1).minuteLabel,'90+1'); team=updated.match.home;
  });
  await check('final llega con balón detenido, catorce ocasiones distintas, sin repetir ni adelantar resultado', async () => {
    await time(gameId,activeDuration+11); await role('authenticated',users[6]); const closing=await state();
    assert.equal(closing.match.phase,'second'); assert.equal(closing.match.active_seconds,activeDuration-1); noFuture(closing.match);
    const last=closing.match.events.find(e=>e.second===activeDuration-4&&shotTypes.has(e.type)); assert.ok(last);
    assert.ok(closing.match.events.some(e=>e.second===activeDuration-1&&e.safe_end));
    assert.equal(closing.match.events.some(e=>e.type==='fulltime'),false);
    await time(gameId,activeDuration+13); await role('authenticated',users[6]); const finished=await state();
    assert.equal(finished.status,'finished'); assert.equal(finished.match.phase,'finished'); assert.equal(finished.match.active_seconds,activeDuration);
    assert.equal(finished.match.events.filter(e=>e.type==='fulltime').length,1); noFuture(finished.match);
    const shots=finished.match.events.filter(e=>shotTypes.has(e.type)); assert.equal(shots.length,14);
    assert.equal(new Set(shots.map(e=>e.play_id)).size,14);
    for(const side of ['home','away']) assert.equal(shots.filter(e=>e.side===side).length,7);
    for(const card of finished.match.home.roster) {
      const expected=card.initial_stamina-card.played_seconds/120*(18+(100-card.base_grl)*.08);
      assert.ok(Math.abs(card.stamina-expected)<.000001);
    }
    assert.deepEqual(finished.match.events.slice(0,past30.length),past30);
    const off=finished.match.home.roster.find(p=>p.id===offId),on=finished.match.home.roster.find(p=>p.id===onId);
    assert.equal(off.played_seconds,30); assert.equal(on.played_seconds,activeDuration-30);
    await role(null); const energy=await query('select * from public.ut_online_energia order by user_id,player_id');
    const ownEnergy=energy.filter(e=>e.user_id===users[6]); assert.equal(ownEnergy.length,12);
    assert.ok(!ownEnergy.some(e=>e.player_id===initial.match.home.bench[1].id));
    await role('authenticated',users[6]); await state(); await reject(()=>coach(gameId,team),'55000');
    await role('authenticated',users[7]); assert.deepEqual((await state()).match,finished.match);
    await role(null); assert.deepEqual(await query('select * from public.ut_online_energia order by user_id,player_id'),energy);
  });
  await check('cola mantiene ±3 GRL sin ampliarlo por espera; sigue aceptando cinco cambios como máximo', async () => {
    await role(null); const high=await catalogSquad(users[9],75), close=await catalogSquad(users[10],74);
    await role('authenticated',users[9]); await save(high); await role('authenticated',users[10]); await save(close);
    await role('authenticated',users[8]); assert.ok((await state()).team,'fixture low team canonical'); const low=await join(); assert.equal(low.status,'waiting'); assert.equal(low.queue_grl,71);
    await role(null); await query("update public.ut_online_sesiones set joined_at=now()-interval '2 hours' where user_id=$1",[users[8]]);
    await role('authenticated',users[9]); assert.ok((await state()).team,'fixture high team canonical'); const far=await join(); assert.equal(far.status,'waiting'); assert.equal(far.queue_grl,75);
    await role('authenticated',users[10]); assert.ok((await state()).team,'fixture close team canonical'); const fair=await join(); assert.equal(fair.status,'playing');
    assert.equal(fair.match.home.id,users[8]); assert.equal(fair.match.away.id,users[10]); assert.equal(Math.abs(fair.match.home.grl-fair.match.away.grl),3);
    await role('authenticated',users[9]); assert.equal((await state()).status,'waiting');
    await role('authenticated',users[8]); const live=await state(); const local=live.match.home;
    const ids=local.titulares.map(p=>p.id), outgoing=ids.slice(0,5); for(let i=0;i<5;i++)ids[i]=local.bench[i].id;
    const requestId=crypto.randomUUID(); const changed=await coach(live.match.id,local,{ids,requestId});
    assert.equal(changed.match.home.substitutions,5); assert.equal(changed.match.home.revision,1);
    const replay=await coach(live.match.id,local,{ids,requestId}); assert.equal(replay.match.home.substitutions,5); assert.equal(replay.match.home.revision,1);
    const sixth=[...ids]; sixth[5]=changed.match.home.bench[0].id; await reject(()=>coach(live.match.id,changed.match.home,{ids:sixth}),'22023');
    const reentry=[...ids]; reentry[0]=outgoing[0]; await reject(()=>coach(live.match.id,changed.match.home,{ids:reentry}),'22023');
  });
  await check('todos los helpers permanecen privados tras parches y reinstalación completa', async () => {
    await role(null); const functions=await query(`select p.proname,has_function_privilege('authenticated',p.oid,'execute') as allowed,p.proconfig
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='thc_private' and p.proname like 'ut_online_%'`);
    assert.ok(functions.length>10); assert.ok(functions.every(f=>!f.allowed && f.proconfig.includes('search_path=""')));
  });
  console.log(`${checks} escenarios SQL v4 aprobados (PostgreSQL local; una conexión, sin prueba de carga).`);
} catch(error) {
  console.error(error.code||error.name,error.message,error.where||'',error.internalQuery||'',error.stack||''); process.exitCode=1;
} finally { await db.close(); }
