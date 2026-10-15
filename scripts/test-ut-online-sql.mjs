import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2] || '.qa/sql-online-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const baseSql = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const onlineSql = await readFile(new URL('../supabase/ut_online_matches.sql', import.meta.url), 'utf8');
const users = Array.from({ length: 5 }, (_, i) => `${i + 1}`.repeat(8) + '-' + `${i + 1}`.repeat(4) + '-4' + `${i + 1}`.repeat(3) + '-8' + `${i + 1}`.repeat(3) + '-' + `${i + 1}`.repeat(12));
const request = () => crypto.randomUUID();
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const role = async (name = null, user = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  if (name) await db.exec(`set role ${name}`);
};
const rpc = async (name, req) => (await query(`select public.${name}(${req === undefined ? '' : '$1::uuid'}) as value`, req === undefined ? [] : [req]))[0].value;
const join = req => rpc('thc_ut_online_buscar', req);
const state = () => rpc('thc_ut_online_estado');
const cancel = () => rpc('thc_ut_online_cancelar');
const save = async squad => (await query('select public.thc_ut_guardar_plantilla($1::jsonb) as value', [JSON.stringify(squad)]))[0].value;
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const starter = { formacion: '4-3-3', titulares: ['p10', 'p11', 'p9', 'p7', 'p8', 'p15', 'p5', 'p2', 'p3', 'p4', 'p1'].map(id => ({ id, grl: 99, stamina: 999, pos: 'ST' })), suplentes: [], reservas: [] };
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
const makeCatalogSquad = async (user, rating) => {
  const positions = ['LW', 'ST', 'RW', 'CM', 'CAM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK'];
  const titulares = [];
  for (let i = 0; i < positions.length; i++) {
    const id = (await query(`insert into public.ut_cartas(codigo,nombre,posicion,ritmo,tiro,pase,regate,defensa,fisico,estirada,paradas,saque,reflejos,velocidad_por,posicionamiento)
      values($1,$2,$3,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4,$4) returning id`, [`fixture-${user.slice(0, 8)}-${i}`, `Jugador ${i}`, positions[i], rating]))[0].id;
    const copy = (await query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2) returning id', [user, id]))[0].id;
    titulares.push({ id: `ut:${copy}`, grl: 99, stamina: 999, pos: 'GK' });
  }
  return { formacion: '4-3-3', titulares, suplentes: [], reservas: [] };
};
let gameId; let firstRequest; let otherTabRequest; let highRequest; let finishEnergy; let mediumSquad; let highSquad;

try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre text not null,abreviatura text not null,logo_url text,liga text,colores jsonb default '[]',estadio text,apodos jsonb default '[]');
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion text default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());`);
  for (const user of users) await query('insert into auth.users values($1)', [user]);
  for (const user of users.slice(0, 4)) await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,$2,'THC')", [user, `Club ${user.slice(0, 2)}`]);
  await db.exec(baseSql);
  await check('migración Online compila con RLS, grants de columna y guardado canonical existente', async () => {
    await db.exec(onlineSql);
    assert.equal((await query("select count(*)::int as n from pg_class where relname in ('ut_online_partidas','ut_online_sesiones','ut_online_energia','ut_online_solicitudes') and relrowsecurity"))[0].n, 4);
  });
  await check('anon y authenticated sin JWT no pueden consultar ni generar partidos', async () => {
    await role('anon'); await reject(state, '42501'); await reject(() => join(request()), '42501');
    await role('authenticated'); await reject(state, '42501');
  });
  await check('sin club o solicitud válida no se entra a la cola', async () => {
    await role('authenticated', users[4]); await reject(() => join(request()), '22023');
    assert.equal((await state()).team, null);
    await role('authenticated', users[0]); await reject(() => join(null), '22023'); await reject(() => join(request()), '22023');
  });
  await check('cancelar antes de la primera búsqueda deja tombstone propio y una llegada tardía no revive', async () => {
    const pending = request();
    const cancelled = (await query('select public.thc_ut_online_cancelar($1::uuid) as value', [pending]))[0].value;
    assert.equal(cancelled.status, 'idle'); assert.equal((await join(pending)).status, 'idle');
    await role(null);
    assert.equal((await query('select count(*)::int as n from thc_private.ut_online_solicitudes where user_id=$1 and request_id=$2', [users[0], pending]))[0].n, 1);
    assert.equal((await query('select count(*)::int as n from public.ut_online_sesiones'))[0].n, 0);
    await role('authenticated', users[1]);
    await query('select public.thc_ut_online_cancelar($1::uuid)', [pending]);
    await role(null);
    assert.equal((await query('select count(*)::int as n from thc_private.ut_online_solicitudes where request_id=$1', [pending]))[0].n, 2);
    await role('authenticated', users[0]);
  });
  await check('guardado conserva posición canonical y aplica penalización a puestos manuales; admite huecos', async () => {
    const wrong = structuredClone(starter); wrong.titulares[3] = { id: 'p6', pos: 'CM' };
    assert.equal((await save(wrong)).titulares[3].pos, 'CDM');
    const altered = (await state()).team.titulares[3];
    assert.equal(altered.base_grl, 75); assert.equal(altered.grl, 72); assert.equal(altered.penalizacion_grl, 3);
    const partial = await save({ ...starter, titulares: [null] });
    assert.equal(partial.titulares[0], null);
    await reject(() => join(request()), '22023');
    const canonical = await save(starter);
    assert.equal(canonical.titulares[0].grl, 70); assert.equal(canonical.titulares[0].pos, 'LW'); assert.notEqual(canonical.titulares[0].stamina, 999);
    await role('authenticated', users[1]); await save(starter);
    await role(null); mediumSquad = await makeCatalogSquad(users[2], 74); highSquad = await makeCatalogSquad(users[3], 75);
    await role('authenticated', users[2]); await save(mediumSquad);
    await role('authenticated', users[3]); await save(highSquad);
  });
  await check('cola usa GRL canonical y stamina100, sin aceptar los valores999 del navegador', async () => {
    await role('authenticated', users[0]); firstRequest = request();
    const value = await join(firstRequest); assert.equal(value.status, 'waiting'); assert.equal(value.queue_grl, 71); assert.equal(value.online_count, 1);
    const session = (await query('select * from public.ut_online_sesiones'))[0];
    assert.equal(session.snapshot.stamina, 100); assert.ok(session.snapshot.titulares.every(p => p.stamina === 100 && p.grl < 99));
  });
  await check('dos pestañas y reintentos generan una sola sesión y no duplican partidos', async () => {
    otherTabRequest = request();
    const values = await Promise.all([join(firstRequest), join(firstRequest), join(otherTabRequest)]);
    assert.ok(values.every(value => value.status === 'waiting' && value.online_count === 1));
    assert.equal((await query('select count(*)::int as n from public.ut_online_sesiones'))[0].n, 1);
    await role(null); assert.equal((await query('select count(*)::int as n from thc_private.ut_online_solicitudes where user_id=$1 and request_id in ($2,$3)', [users[0], firstRequest, otherTabRequest]))[0].n, 2);
    await role('authenticated', users[0]);
  });
  await check('la espera nunca amplía el límite de tres GRL', async () => {
    await role(null); await query("update public.ut_online_sesiones set joined_at=now()-interval '2 hours' where user_id=$1", [users[0]]);
    await role('authenticated', users[3]); highRequest = request();
    const value = await join(highRequest); assert.equal(value.status, 'waiting'); assert.equal(value.queue_grl, 75); assert.equal(value.online_count, 2);
    await role(null); assert.equal((await query('select count(*)::int as n from public.ut_online_partidas'))[0].n, 0);
  });
  await check('diferencia exacta de tres GRL crea un partido único de180segundos', async () => {
    await role('authenticated', users[2]);
    const value = await join(request()); assert.equal(value.status, 'playing'); assert.equal(value.online_count, 3);
    const match = value.match; gameId = match.id;
    assert.equal(value.team.id, users[2]); assert.equal(value.team.stamina, 100);
    assert.equal(match.home.id, users[0]); assert.equal(match.away.id, users[2]); assert.equal(Math.abs(match.home.grl - match.away.grl), 3);
    assert.equal(Date.parse(match.ends_at) - Date.parse(match.started_at), 192000);
    assert.equal(match.home_goals, 0); assert.equal(match.away_goals, 0); assert.ok(match.events.every(e => e.second === 0));
  });
  await check('los dos participantes reciben mismo timeline y no pueden leer eventos futuros directamente', async () => {
    await role('authenticated', users[0]); const home = await state();
    await role('authenticated', users[2]); const away = await state();
    assert.equal(home.match.id, away.match.id); assert.deepEqual(home.match.events, away.match.events);
    await reject(() => query('select events,home_goals from public.ut_online_partidas'), '42501');
    assert.equal((await query('select id from public.ut_online_partidas')).length, 1);
    await role('authenticated', users[1]); assert.equal((await query('select id from public.ut_online_partidas')).length, 0);
    assert.equal((await query('select * from public.ut_online_sesiones')).length, 0);
  });
  await check('RLS y grants impiden escribir marcadores, sesiones y stamina fabricados', async () => {
    await role('authenticated', users[0]);
    await reject(() => query("update public.ut_online_partidas set home_goals=6 where id=$1", [gameId]), '42501');
    await reject(() => query("update public.ut_online_sesiones set grl=99 where user_id=$1", [users[0]]), '42501');
    await reject(() => query("insert into public.ut_online_energia(user_id,player_id,stamina) values($1,'p1',100)", [users[0]]), '42501');
    await reject(() => query('select * from thc_private.ut_online_solicitudes'), '42501');
    await reject(() => query('delete from public.ut_online_sesiones'), '42501');
  });
  await check('timeline visible y marcador coinciden con el reloj del servidor', async () => {
    await role(null); await query("update public.ut_online_partidas set started_at=now()-interval '60 seconds',ends_at=now()+interval '132 seconds' where id=$1", [gameId]);
    await role('authenticated', users[0]); const value = await state();
    assert.ok(value.match.events.every(e => e.second <= 60));
    assert.equal(value.match.home_goals, value.match.events.filter(e => e.side === 'home' && e.type === 'goal').length);
    assert.equal(value.match.away_goals, value.match.events.filter(e => e.side === 'away' && e.type === 'goal').length);
  });
  await check('cancelar solo afecta la cola propia y no borra un partido empezado', async () => {
    await role('authenticated', users[3]); assert.equal((await cancel()).status, 'idle');
    assert.equal((await join(highRequest)).status, 'idle');
    await role('authenticated', users[0]); assert.equal((await cancel()).status, 'playing');
    await reject(() => save(starter), '55000');
  });
  await check('sesiones esperando desaparecen del contador tras30segundos sin presencia', async () => {
    await role('authenticated', users[1]); const req = request(); assert.equal((await join(req)).status, 'waiting');
    await role(null); await query("update public.ut_online_sesiones set last_seen=now()-interval '31 seconds' where user_id=$1", [users[1]]);
    await role('authenticated', users[0]); assert.equal((await state()).online_count, 2);
    await role('authenticated', users[1]); assert.equal((await state()).status, 'idle'); assert.equal((await join(req)).status, 'idle');
  });
  await check('al finalizar se persiste resultado único y fatiga canonical para ambos equipos', async () => {
    await role(null); await query("update public.ut_online_partidas set started_at=now()-interval '193 seconds',ends_at=now()-interval '1 second' where id=$1", [gameId]);
    await role('authenticated', users[0]); const value = await state(); assert.equal(value.status, 'finished');
    finishEnergy = await query('select * from public.ut_online_energia order by player_id'); assert.equal(finishEnergy.length, 11);
    assert.ok(value.team.stamina < 100);
    assert.ok(finishEnergy.every(row => row.stamina >= 40 && row.stamina < 100));
    await role('authenticated', users[2]); const away = await state(); assert.equal(away.status, 'finished'); assert.deepEqual(away.match.events, value.match.events);
    await role(null); const game = (await query('select * from public.ut_online_partidas where id=$1', [gameId]))[0];
    assert.equal(game.home_goals, value.match.home_goals); assert.equal(game.away_goals, value.match.away_goals); assert.equal(game.estado, 'finished');
  });
  await check('poll y reintento tras el final no vuelven a consumir stamina ni crear partido', async () => {
    await role('authenticated', users[0]); await state(); assert.equal((await join(firstRequest)).status, 'finished');
    assert.equal((await join(otherTabRequest)).status, 'finished');
    assert.deepEqual(await query('select * from public.ut_online_energia order by player_id'), finishEnergy);
    await role(null); assert.equal((await query('select count(*)::int as n from public.ut_online_partidas'))[0].n, 1);
  });
  await check('nueva búsqueda usa fatiga del servidor y recuperación gradual de12puntos porhora', async () => {
    await role(null); await query("update public.ut_online_energia set stamina=48,actualizado_en=now()-interval '2 hours' where user_id=$1", [users[0]]);
    await role('authenticated', users[0]); await save(starter);
    assert.equal((await join(request())).status, 'waiting');
    const own = (await query('select snapshot from public.ut_online_sesiones'))[0].snapshot;
    assert.equal(own.stamina, 72); assert.ok(own.titulares.every(p => p.stamina === 72));
    await cancel();
  });
  await check('marcadores y ocasiones mantienen techo6 sin aceptar resultados externos', async () => {
    await role(null);
    const base = (await query('select home from public.ut_online_partidas where id=$1', [gameId]))[0].home;
    let sum = 0;
    for (let i = 0; i < 150; i++) {
      const events = (await query('select thc_private.ut_online_timeline($1,$1) as value', [JSON.stringify(base)]))[0].value;
      assert.ok(events.some(e => e.type === 'kickoff' && e.second === 93));
      assert.ok(events.some(e => e.type === 'fulltime' && e.second === 180));
      assert.ok(events.filter(e => e.type === 'save').every(e => e.player === base.titulares.find(p => p.puesto === 'GK').nombre));
      for (const side of ['home', 'away']) {
        const goals = events.filter(e => e.type === 'goal' && e.side === side).length;
        const chances = events.filter(e => ['goal', 'save', 'post', 'shot'].includes(e.type) && e.side === side).length;
        assert.ok(goals <= 6); assert.equal(chances, 7); sum += goals;
      }
    }
    assert.ok(sum / 300 > .5 && sum / 300 < 2.5);
  });
  await check('una búsqueda cancelada no revive por UUID de otra pestaña', async () => {
    await role('authenticated', users[1]);
    const original = request(); const secondTab = request();
    assert.equal((await join(original)).status, 'waiting');
    assert.equal((await join(secondTab)).status, 'waiting');
    assert.equal((await cancel()).status, 'idle');
    assert.equal((await join(original)).status, 'idle');
    assert.equal((await join(secondTab)).status, 'idle');
  });
  await check('secundarias reales evitan penalización; secundarias inventadas no alteran el GRL del servidor', async () => {
    await role(null);
    for (const [index, position] of [[3, 'CAM'], [4, 'CM']]) {
      const copy = highSquad.titulares[index].id.slice(3);
      await query('update public.ut_cartas set posiciones_secundarias=array[$2] where id=(select carta_id from public.ut_cartas_club where id=$1)', [copy, position]);
    }
    const compatible = structuredClone(highSquad);
    [compatible.titulares[3], compatible.titulares[4]] = [compatible.titulares[4], compatible.titulares[3]];
    await role('authenticated', users[3]);
    const saved = await save(compatible); assert.equal(saved.titulares[3].pos, 'CAM');
    assert.equal((await state()).team.titulares[3].penalizacion_grl, 0);
    const fabricated = structuredClone(highSquad);
    [fabricated.titulares[0], fabricated.titulares[3]] = [fabricated.titulares[3], fabricated.titulares[0]];
    fabricated.titulares[0].posiciones_secundarias = ['LW']; fabricated.titulares[3].posiciones_secundarias = ['CM'];
    const canonical = await save(fabricated); assert.equal(canonical.titulares[0].pos, 'CM');
    assert.deepEqual(canonical.titulares[0].posiciones_secundarias, ['CAM']);
    const penalized = (await state()).team.titulares[0];
    assert.equal(penalized.base_grl, 75); assert.equal(penalized.penalizacion_grl, 6); assert.equal(penalized.grl, 69);
    await role(null);
  });
  await check('reemigración conserva resultados y stamina, revoca grants antiguos y protege helpers', async () => {
    await db.exec('grant all on public.ut_online_partidas to authenticated; grant update(home_goals) on public.ut_online_partidas to authenticated; create policy legacy_open on public.ut_online_partidas for all using(true) with check(true)');
    await db.exec(onlineSql);
    assert.equal((await query('select count(*)::int as n from public.ut_online_partidas'))[0].n, 1);
    assert.equal((await query('select count(*)::int as n from public.ut_online_energia'))[0].n, 22);
    await role('authenticated', users[1]); assert.equal((await query('select id from public.ut_online_partidas')).length, 0);
    await reject(() => query('select events from public.ut_online_partidas'), '42501');
    await reject(() => query('select thc_private.ut_online_cleanup()'), '42501');
    await role(null); const configs = await query("select proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'thc_ut_online_%'");
    assert.equal(configs.length, 5); assert.ok(configs.every(row => row.proconfig.includes('search_path=""')));
  });
  console.log(`${checks} escenarios SQL Online UT aprobados.`);
} catch (error) {
  console.error(error.code || error.name, error.message, error.where || '', error.internalQuery || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
