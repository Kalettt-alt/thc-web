import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { playerPositionPenalty } from '../src/pages/UltimateTeam/squadUT.js';

const runtime = process.argv[2] || '.qa/sql-online-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const bundle = await readFile(new URL('../ComandosSQL_ActualizacionUT.txt', import.meta.url), 'utf8');
const base = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const existingCardTables = base.slice(base.indexOf('create table if not exists public.ut_cartas ('), base.indexOf('create table if not exists thc_private.ut_aperturas ('));
const users = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const starter = { formacion: '4-3-3', titulares: ['p10', 'p11', 'p9', 'p7', 'p8', 'p15', 'p5', 'p2', 'p3', 'p4', 'p1'].map(id => ({ id, grl: 99, pos: 'ST', stamina: 999 })), suplentes: [], reservas: [] };
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const role = async (name = null, user = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  if (name) await db.exec(`set role ${name}`);
};
const rpc = async (name, args = []) => (await query(`select public.${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`, args))[0].value;
const save = async squad => rpc('thc_ut_guardar_plantilla', [JSON.stringify(squad)]);
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
let retainedCard; let retainedCopy; let retainedPack; let matchId; let waitingRequest;

try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0,thc_points bigint default 0,creado_en timestamptz default now(),actualizado_en timestamptz default now());
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre varchar not null,abreviatura varchar not null,logo_url text,liga varchar not null,colores jsonb not null default '[]',estadio varchar not null,apodos jsonb default '[]',creado_en timestamptz default now(),actualizado_en timestamptz default now());
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion varchar default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());
    create table public."JugadoresUT"(id uuid primary key default gen_random_uuid(),nombre text not null,avatar varchar not null,creado_en timestamptz default now());
    create table public.club_ut(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),jugador_id uuid references public."JugadoresUT"(id),estado varchar default 'en_club',adquirido_en timestamptz default now());
    create table public."PlaylistUT"(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),url text not null,title text not null,artist text not null,thumbnail text,created_at timestamptz not null default now(),source text default 'youtube');
    grant all on public.perfiles_ut,public.equipos_ut,public.club_ut,public.plantillas_ut,public."PlaylistUT" to anon,authenticated;
    create policy old_open_wallet on public.perfiles_ut for all using(true) with check(true);
    create policy old_open_club on public.equipos_ut for all using(true) with check(true);
    create policy old_open_music on public."PlaylistUT" for all using(true) with check(true);`);
  await db.exec(existingCardTables);
  for (const user of users) await query('insert into auth.users values($1)', [user]);
  for (let i = 0; i < 2; i++) {
    await query('insert into public.perfiles_ut(user_id,monedas,thc_points) values($1,$2,20)', [users[i], i === 0 ? 1234 : 987]);
    await query("insert into public.equipos_ut(user_id,nombre,abreviatura,liga,estadio) values($1,$2,'THC','Argentina','THC Arena')", [users[i], `Club existente ${i}`]);
    await query('insert into public.plantillas_ut(user_id,titulares) values($1,$2)', [users[i], JSON.stringify(starter.titulares)]);
    await query('insert into public.club_ut(user_id) values($1)', [users[i]]);
    await query("insert into public.\"PlaylistUT\"(user_id,url,title,artist) values($1,'https://youtube.com/watch?v=abcdefghijk','Canción existente','Artista')", [users[i]]);
  }
  retainedCard = (await query("insert into public.ut_cartas(codigo,nombre,posicion,rareza,ritmo,tiro,pase,regate,defensa,fisico) values('conservar-carta','Carta existente','CM','oro',75,75,75,75,75,75) returning id"))[0].id;
  await query("insert into public.ut_sobres_catalogo(id,nombre) values('thc-base','Sobre existente')");
  retainedPack = (await query("insert into public.ut_sobres_inventario(user_id,tipo_id) values($1,'thc-base') returning id", [users[0]]))[0].id;
  retainedCopy = (await query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2) returning id', [users[0], retainedCard]))[0].id;

  await check('TXT contiene una sola transacción externa y migra el esquema existente sin RPC previos', async () => {
    assert.equal(bundle.match(/^begin;/gm)?.length, 1); assert.equal(bundle.match(/^commit;/gm)?.length, 1);
    assert.equal((await query("select to_regprocedure('public.thc_ut_reset()') as function"))[0].function, null);
    await db.exec(bundle);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1', [users[0]]))[0].monedas, 1234);
    assert.equal((await query('select nombre from public.ut_sobres_catalogo where id=$1', ['thc-base']))[0].nombre, 'Sobre existente');
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 1);
    assert.equal((await query('select count(*)::int as n from public.ut_sobres_inventario'))[0].n, 1);
    assert.ok((await query('select version_posiciones from public.plantillas_ut')).every(row => row.version_posiciones === 0));
  });
  await check('reejecutar TXT conserva club, saldos, cartas, sobres y playlist', async () => {
    await db.exec(bundle);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1', [users[0]]))[0].monedas, 1234);
    assert.equal((await query('select count(*)::int as n from public.ut_sobres_inventario'))[0].n, 1);
    assert.equal((await query('select count(*)::int as n from public."PlaylistUT"'))[0].n, 2);
    assert.equal((await query('select count(*)::int as n from thc_private.ut_bonus_claims'))[0].n, 2);
    assert.equal((await query('select count(*)::int as n from thc_private.ut_jugadores_base'))[0].n, 23);
  });
  await check('un fallo posterior revierte el TXT completo de forma atómica', async () => {
    await db.exec('drop index public.ut_online_cola_grl');
    const failed = bundle.replace(/commit;\s*$/, "do $failure$ begin raise exception 'Fallo controlado de comprobación'; end $failure$; commit;");
    await reject(() => db.exec(failed), 'P0001'); await db.exec('rollback');
    assert.equal((await query("select to_regclass('public.ut_online_cola_grl') as object"))[0].object, null);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1', [users[0]]))[0].monedas, 1234);
    await db.exec(bundle);
  });
  await check('foundation permite guardar club propio y bloquea wallet fabricado y club ajeno', async () => {
    await role('authenticated', users[0]);
    assert.equal((await query('select * from public.equipos_ut')).length, 1);
    await query("update public.equipos_ut set nombre='Club propio actualizado' where user_id=$1", [users[0]]);
    assert.equal((await query('select nombre from public.equipos_ut'))[0].nombre, 'Club propio actualizado');
    assert.equal((await query("update public.equipos_ut set nombre='Ataque' where user_id=$1 returning user_id", [users[1]])).length, 0);
    await reject(() => query('update public.perfiles_ut set monedas=999999'), '42501');
    await reject(() => query('delete from public.perfiles_ut'), '42501');
  });
  await check('playlist elimina la canción propia y no toca canciones de otra cuenta', async () => {
    assert.equal((await query('select * from public."PlaylistUT"')).length, 1);
    assert.equal((await query('delete from public."PlaylistUT" where user_id=$1 returning id', [users[1]])).length, 0);
    assert.equal((await query('delete from public."PlaylistUT" where user_id=$1 returning id', [users[0]])).length, 1);
    await query("insert into public.\"PlaylistUT\"(user_id,url,title,artist) values($1,'https://youtube.com/watch?v=abcdefghijk','Canción nueva','Artista')", [users[0]]);
  });
  await check('catálogo admite Plus y Ultimate con GRL máximo99; ninguna carta se reparte sola', async () => {
    await role(null);
    for (const rarity of ['plus', 'ultimate']) {
      await query('insert into public.ut_cartas(codigo,nombre,posicion,rareza) values($1,$1,\'CM\',$2)', [`test-${rarity}`, rarity]);
    }
    assert.ok((await query('select grl from public.ut_cartas')).every(card => card.grl <= 99));
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 1);
    await role('authenticated', users[0]); const squad = await save(starter);
    assert.equal(squad.titulares[0].grl, 70); assert.equal(squad.titulares[0].nacionalidad, 'PE');
  });
  await check('buscar online y eliminar club mientras espera cancela sin reactivar UUID ni borrar activos nuevos', async () => {
    const uncertain = crypto.randomUUID();
    assert.equal((await rpc('thc_ut_online_cancelar', [uncertain])).status, 'idle');
    assert.equal((await rpc('thc_ut_online_buscar', [uncertain])).status, 'idle');
    waitingRequest = crypto.randomUUID(); assert.equal((await rpc('thc_ut_online_buscar', [waitingRequest])).status, 'waiting');
    assert.equal(await rpc('thc_ut_reset'), users[0]);
    assert.equal((await rpc('thc_ut_online_estado')).status, 'idle');
    assert.equal((await rpc('thc_ut_online_buscar', [waitingRequest])).status, 'idle');
    assert.equal((await query('select * from public.equipos_ut')).length, 0);
    assert.equal((await query('select * from public.plantillas_ut')).length, 0);
    assert.equal((await query('select * from public."PlaylistUT"')).length, 0);
    assert.equal((await query('select * from public.perfiles_ut')).length, 0);
    assert.equal((await query('select * from public.club_ut')).length, 0);
    assert.equal((await query('select id from public.ut_cartas_club'))[0].id, retainedCopy);
    assert.equal((await query('select id from public.ut_sobres_inventario'))[0].id, retainedPack);
    await reject(() => rpc('thc_ut_reset'), 'P0002');
  });
  await check('borrado propio conserva datos ajenos y no vuelve a entregar500 monedas', async () => {
    assert.equal(await rpc('thc_ut_initialize'), users[0]);
    assert.equal((await query('select monedas from public.perfiles_ut'))[0].monedas, 0);
    await role('authenticated', users[1]); assert.equal((await query('select monedas from public.perfiles_ut'))[0].monedas, 987);
    assert.equal((await query('select * from public."PlaylistUT"')).length, 1); assert.equal((await query('select * from public.club_ut')).length, 1);
    await role('authenticated', users[2]); assert.equal(await rpc('thc_ut_initialize'), users[2]);
    assert.equal((await query('select monedas from public.perfiles_ut'))[0].monedas, 500);
    await rpc('thc_ut_initialize'); assert.equal((await query('select monedas from public.perfiles_ut'))[0].monedas, 500);
  });
  await check('reset sin auth no puede borrar; un partido activo bloquea reset de todos sus participantes', async () => {
    await role('anon'); await reject(() => rpc('thc_ut_reset'), '42501');
    await role('authenticated'); await reject(() => rpc('thc_ut_reset'), '42501');
    await role('authenticated', users[0]);
    await query("insert into public.equipos_ut(user_id,nombre,abreviatura,liga,estadio) values($1,'Club renovado','THC','Argentina','Arena')", [users[0]]);
    await save(starter); assert.equal((await rpc('thc_ut_online_buscar', [crypto.randomUUID()])).status, 'waiting');
    await role('authenticated', users[1]); await save(starter);
    const match = await rpc('thc_ut_online_buscar', [crypto.randomUUID()]); assert.equal(match.status, 'playing'); matchId = match.match.id;
    await reject(() => rpc('thc_ut_reset'), '55000'); assert.equal((await query('select monedas from public.perfiles_ut'))[0].monedas, 987);
    await role('authenticated', users[0]); await reject(() => rpc('thc_ut_reset'), '55000'); assert.equal((await query('select * from public.equipos_ut')).length, 1);
  });
  await check('reset tras finalizar conserva resultado y energía autoritativos del partido', async () => {
    await role(null); await query("update public.ut_online_partidas set started_at=now()-interval '181 seconds',ends_at=now()-interval '1 second' where id=$1", [matchId]);
    await role('authenticated', users[0]); assert.equal(await rpc('thc_ut_reset'), users[0]);
    assert.equal((await query('select id from public.ut_online_partidas'))[0].id, matchId);
    assert.equal((await query('select * from public.ut_online_energia')).length, 11);
    await role('authenticated', users[1]); assert.equal((await rpc('thc_ut_online_estado')).status, 'finished');
    assert.equal((await query('select * from public.equipos_ut')).length, 1);
  });
  await check('penalización manualGK en banda la calcula servidor y no cambia posición ni GRL originales', async () => {
    const misplaced = structuredClone(starter);
    [misplaced.titulares[0], misplaced.titulares[10]] = [misplaced.titulares[10], misplaced.titulares[0]];
    const saved = await save(misplaced); assert.equal(saved.titulares[0].pos, 'GK'); assert.equal(saved.titulares[0].grl, 72);
    const team = (await rpc('thc_ut_online_estado')).team;
    assert.equal(team.titulares[0].base_grl, 72); assert.equal(team.titulares[0].grl, 32); assert.equal(team.titulares[0].penalizacion_grl, 40);
    assert.equal(team.titulares[10].base_grl, 70); assert.equal(team.titulares[10].grl, 30);
    assert.equal(team.grl, 64);
  });
  await check('los225 pares de posición usan exactamente la misma penalización en JavaScript y SQL', async () => {
    await role(null);
    const positions = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
    for (const source of positions) {
      for (const target of positions) {
        const player = { pos: source, posiciones_secundarias: [] };
        const penalty = (await query('select thc_private.ut_online_position_penalty($1,$2) as value', [JSON.stringify(player), target]))[0].value;
        assert.equal(penalty, playerPositionPenalty(player, target), `${source} → ${target}`);
        assert.equal((await query('select thc_private.ut_online_position_penalty($1,$2) as value', [JSON.stringify({ ...player, posiciones_secundarias: [target] }), target]))[0].value, 0);
      }
    }
  });
  await check('guardar marca posiciones manuales; no modifica filas legacy durante la instalación', async () => {
    await role('authenticated', users[1]);
    const manual = { ...starter, titulares: Array.from({ length: 11 }, (_, i) => ({ id: `p${i + 1}` })) };
    const saved = await save({ ...manual, version_posiciones: 999 }); assert.equal(saved.version_posiciones, 1);
    assert.deepEqual(saved.titulares.map(p => p.id), manual.titulares.map(p => p.id));
  });
  console.log(`${checks} escenarios del TXT completo UT aprobados.`);
} catch (error) {
  console.error(error.code || error.name, error.message, error.where || '', error.internalQuery || '');
  process.exitCode = 1;
} finally {
  await db.close();
}
