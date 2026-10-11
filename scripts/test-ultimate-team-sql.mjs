import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const modulePath = process.argv[2] || '.qa/sql-oct09-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const request = '33333333-3333-4333-8333-333333333333';
const retry = '44444444-4444-4444-8444-444444444444';
const sql = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const query = async (sql, values = []) => (await db.query(sql, values)).rows;
const role = async (roleName, id = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  if (roleName) await db.exec(`set role ${roleName}`);
};
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const open = async (id, req = request) => (await query('select public.thc_ut_abrir_sobre($1::uuid,$2::uuid) as value', [id, req]))[0].value;
const save = async data => (await query('select public.thc_ut_guardar_plantilla($1::jsonb) as value', [JSON.stringify(data)]))[0].value;
const squad = (players = [{ id: 'p1', grl: 99, pac: 99, nombre: 'Hacked' }]) => ({ formacion: '4-3-3', titulares: players, suplentes: [], reservas: [], tacticas: {} });
let checks = 0; let packId; let secondPack; let cardId; let receipt;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion varchar default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0);
    grant all on public.plantillas_ut to authenticated,anon;
    grant update(titulares),insert(user_id),select(titulares) on public.plantillas_ut to anon,authenticated;
    alter table public.plantillas_ut enable row level security;
    create policy old_open on public.plantillas_ut for all using(true) with check(true);`);
  await query('insert into auth.users values($1),($2)', [user, other]);
  await query('insert into public.perfiles_ut values($1,1234)', [user]);
  await check('migration compiles, sets RLS and seeds only an inactive example and pack', async () => {
    await db.exec(sql);
    const card = (await query("select * from public.ut_cartas where codigo='ejemplo-cm'"))[0];
    assert.equal(card.grl, 70); assert.equal(card.activa, false); assert.equal(card.es_ejemplo, true);
    assert.equal((await query("select activo from public.ut_sobres_catalogo where id='thc-base'"))[0].activo, false);
    assert.equal((await query('select count(*)::int as n from public.ut_sobres_inventario'))[0].n, 0);
    assert.equal((await query('select count(*)::int as n from thc_private.ut_jugadores_base'))[0].n, 23);
    assert.ok((await query("select relrowsecurity from pg_class where relname in ('ut_cartas','ut_sobres_catalogo','ut_sobres_pool','ut_sobres_inventario','ut_cartas_club')")).every(table => table.relrowsecurity));
  });
  await check('anonymous access and missing authenticated identity cannot execute mutations', async () => {
    await role('anon'); await reject(() => open(request), '42501'); await reject(() => save(squad()), '42501');
    await role('authenticated'); await reject(() => open(request), '42501');
  });
  await check('RLS and grants deny direct rewards, stats edits, private receipts and legacy column writes', async () => {
    await role('authenticated', user);
    await reject(() => query("insert into public.ut_sobres_inventario(user_id,tipo_id) values($1,'thc-base')", [user]), '42501');
    await reject(() => query("update public.ut_cartas set ritmo=99 where codigo='ejemplo-cm'"), '42501');
    await reject(() => query('select * from thc_private.ut_aperturas'), '42501');
    await reject(() => query("update public.plantillas_ut set titulares='[]'::jsonb"), '42501');
    await reject(() => query('insert into public.plantillas_ut(user_id) values($1)', [user]), '42501');
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 0);
  });
  await check('inactive or empty pool leaves manually granted pack untouched, excludes examples', async () => {
    await role(null);
    packId = (await query("insert into public.ut_sobres_inventario(user_id,tipo_id) values($1,'thc-base') returning id", [user]))[0].id;
    await role('authenticated', user); await reject(() => open(packId), 'P0001');
    await role(null); await query("update public.ut_sobres_catalogo set activo=true where id='thc-base'");
    await query("update public.ut_cartas set activa=true where codigo='ejemplo-cm'");
    await query("insert into public.ut_sobres_pool select 'thc-base',id,100 from public.ut_cartas where codigo='ejemplo-cm'");
    await role('authenticated', user); await reject(() => open(packId), 'P0001');
    assert.equal((await query('select estado from public.ut_sobres_inventario where id=$1', [packId]))[0].estado, 'disponible');
  });
  await check('another account cannot see or open owned packs', async () => {
    await role('authenticated', other);
    assert.equal((await query('select * from public.ut_sobres_inventario')).length, 0);
    await reject(() => open(packId), '42501');
  });
  await check('opening commits five distinct copies, deducts one pack and uses server stats', async () => {
    await role(null);
    cardId = (await query("insert into public.ut_cartas(codigo,nombre,posicion,activa,ritmo,tiro,pase,regate,defensa,fisico) values('test-cm','Jugador de prueba','CM',true,80,70,90,85,60,70) returning id"))[0].id;
    await query("insert into public.ut_sobres_pool values('thc-base',$1,100)", [cardId]);
    secondPack = (await query("insert into public.ut_sobres_inventario(user_id,tipo_id) values($1,'thc-base') returning id", [user]))[0].id;
    await role('authenticated', user); receipt = await open(packId);
    assert.equal(receipt.cartas.length, 5); assert.equal(new Set(receipt.cartas.map(card => card.id)).size, 5);
    assert.ok(receipt.cartas.every(copy => copy.carta.id === cardId && copy.carta.grl === 79));
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 5);
    assert.equal((await query('select estado from public.ut_sobres_inventario where id=$1', [packId]))[0].estado, 'abierto');
  });
  await check('same request and different request retry return receipt without duplicate awards', async () => {
    assert.deepEqual(await open(packId), receipt); assert.deepEqual(await open(packId, retry), receipt);
    await reject(() => open(secondPack, request), '22023');
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 5);
  });
  await check('a mid-award error rolls back every copy and leaves pack available', async () => {
    await role(null);
    await db.exec(`create function public.test_ut_award_failure() returns trigger language plpgsql as $$begin
      if (select count(*) from public.ut_cartas_club where sobre_id=new.sobre_id)>=2 then raise exception 'test rollback'; end if; return new; end$$;
      create trigger test_ut_fail before insert on public.ut_cartas_club for each row execute function public.test_ut_award_failure();`);
    await role('authenticated', user); await reject(() => open(secondPack, retry), 'P0001');
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club where sobre_id=$1', [secondPack]))[0].n, 0);
    assert.equal((await query('select estado from public.ut_sobres_inventario where id=$1', [secondPack]))[0].estado, 'disponible');
    await role(null); assert.equal((await query('select count(*)::int as n from thc_private.ut_aperturas where sobre_id=$1', [secondPack]))[0].n, 0);
    await db.exec('drop trigger test_ut_fail on public.ut_cartas_club; drop function public.test_ut_award_failure();');
  });
  await check('canonical squad discards client stats and derives catalog copies plus legacy starters', async () => {
    await role('authenticated', user);
    const saved = await save(squad([{ id: 'p1', grl: 99 }, { id: `ut:${receipt.cartas[0].id}`, grl: 99, nombre: 'Modified' }, null]));
    assert.equal(saved.user_id, user); assert.equal(saved.titulares[0].grl, 72); assert.equal(saved.titulares[0].nombre, 'V. RIVERA');
    assert.equal(saved.titulares[1].grl, 79); assert.equal(saved.titulares[1].nombre, 'Jugador de prueba'); assert.equal(saved.titulares[1].club_carta_id, receipt.cartas[0].id); assert.equal(saved.titulares[2], null);
  });
  await check('duplicate copies, unknown players, forged copies, invalid shapes and slots reject', async () => {
    await reject(() => save(squad([{ id: 'p1' }, { id: 'p1' }])), '22023');
    await reject(() => save(squad([{ id: `ut:${receipt.cartas[0].id}` }, { id: `ut:${receipt.cartas[0].id.toUpperCase()}` }])), '22023');
    await reject(() => save(squad([{ id: 'p99' }])), '42501');
    await reject(() => save(squad([{ id: `ut:${request}` }])), '42501');
    await reject(() => save(squad([{ id: `ut:${receipt.cartas[0].id}`, club_carta_id: request }])), '22023');
    await reject(() => save(squad(Array.from({ length: 12 }, () => null))), '22023');
    await reject(() => save({ ...squad(), reservas: {} }), '22023');
    await reject(() => save({ ...squad(), formacion: '9-0-1' }), '22023');
  });
  await check('lineup-only saves preserve existing tactics while explicitly invalid tactics reject', async () => {
    const tactics = { ancho: 45, mentalidad: 'normal' };
    await save({ ...squad(), tacticas: tactics });
    const onlyLineup = squad(); delete onlyLineup.tacticas;
    assert.deepEqual((await save(onlyLineup)).tacticas, tactics);
    await reject(() => save({ ...squad(), tacticas: null }), '22023');
    await reject(() => save({ ...squad(), tacticas: [] }), '22023');
  });
  await check('another account cannot read squad, use collected copies or delete the owner squad', async () => {
    await role('authenticated', other); assert.equal((await query('select * from public.plantillas_ut')).length, 0);
    assert.equal((await query('select * from public.ut_cartas_club')).length, 0);
    await reject(() => save(squad([{ id: `ut:${receipt.cartas[0].id}` }])), '42501');
    await query('delete from public.plantillas_ut where user_id=$1', [user]);
    await role('authenticated', user); assert.equal((await query('select * from public.plantillas_ut')).length, 1);
  });
  await check('catalog validates statistics and calculates GRL rather than accepting overrides', async () => {
    await role(null);
    await reject(() => query('update public.ut_cartas set grl=99 where id=$1', [cardId]), '428C9');
    await reject(() => query('update public.ut_cartas set ritmo=100 where id=$1', [cardId]), '23514');
    await reject(() => query("update public.ut_cartas set posicion='INVALID' where id=$1", [cardId]), '23514');
  });
  await check('rerunning migration keeps awards, balances, activation and identity receipts intact', async () => {
    await role(null); await db.exec(sql);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1', [user]))[0].monedas, 1234);
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 5);
    assert.equal((await query("select activo from public.ut_sobres_catalogo where id='thc-base'"))[0].activo, true);
    await role('authenticated', user); assert.deepEqual(await open(packId), receipt);
  });
  await check('own squad reset does not remove cards or award packs again', async () => {
    await query('delete from public.plantillas_ut where user_id=$1', [user]);
    assert.equal((await query('select * from public.plantillas_ut')).length, 0);
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 5);
    assert.equal((await query("select count(*)::int as n from public.ut_sobres_inventario where estado='disponible'"))[0].n, 1);
  });
  console.log(`Passed ${checks} Ultimate Team SQL scenarios.`);
} catch (error) { console.error(`FAILED after ${checks}: ${error.message} (${error.code || 'assertion'})`); if (error.position) console.error(sql.slice(Math.max(0, Number(error.position)-180), Number(error.position)+180)); if (error.internalQuery) console.error(error.internalQuery); process.exitCode = 1; }
finally { await db.close(); }
