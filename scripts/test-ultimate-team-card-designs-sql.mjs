import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2] || '.qa/sql-oct10-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const request = '33333333-3333-4333-8333-333333333333';
const base = await readFile(new URL('../supabase/ultimate_team_cartas.sql', import.meta.url), 'utf8');
const upgrade = await readFile(new URL('../supabase/ultimate_team_card_designs.sql', import.meta.url), 'utf8');
const query = async (sql, values = []) => (await db.query(sql, values)).rows;
const role = async (roleName, id = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  if (roleName) await db.exec(`set role ${roleName}`);
};
const reject = (fn, code) => assert.rejects(fn, error => error.code === code);
const save = async players => (await query('select public.thc_ut_guardar_plantilla($1::jsonb) as value', [JSON.stringify({ formacion: '4-3-3', titulares: players, suplentes: [], reservas: [] })]))[0].value;
const open = async packId => (await query('select public.thc_ut_abrir_sobre($1::uuid,$2::uuid) as value', [packId, request]))[0].value;
const guards = async () => ({
  policies: await query("select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where tablename like 'ut_%' or tablename='plantillas_ut' order by schemaname,tablename,policyname"),
  acls: await query("select n.nspname,c.relname,c.relrowsecurity,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' and (c.relname like 'ut_%' or c.relname='plantillas_ut')) or n.nspname='thc_private' order by n.nspname,c.relname"),
  functions: await query("select p.proname,pg_get_functiondef(p.oid) as definition,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('thc_ut_guardar_plantilla','thc_ut_abrir_sobre') order by p.proname"),
});
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };
let beforeGuards; let beforeSeed; let ultimateId; let ownedId; let packId; let receipt;

try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion varchar default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0,thc_points bigint default 0);`);
  await query('insert into auth.users values($1),($2)', [user, other]);
  await query('insert into public.perfiles_ut values($1,1234,57)', [user]);
  await db.exec(base);
  await query("insert into public.ut_cartas(codigo,nombre,posicion,rareza) values('legacy-special','Legacy','CM','especial')");
  await check('upgrade compiles and leaves policies, grants, functions and original starter stats intact', async () => {
    beforeGuards = await guards();
    beforeSeed = await query("select id,datos-'nacionalidad'-'pais_codigo' as stats from thc_private.ut_jugadores_base order by id");
    await db.exec(upgrade);
    assert.deepEqual(await guards(), beforeGuards);
    assert.deepEqual(await query("select id,datos-'nacionalidad'-'pais_codigo' as stats from thc_private.ut_jugadores_base order by id"), beforeSeed);
    assert.ok((await query('select datos from thc_private.ut_jugadores_base')).every(row => row.datos.nacionalidad === 'PE'));
    assert.equal((await query("select rareza from public.ut_cartas where codigo='legacy-special'"))[0].rareza, 'especial');
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut where user_id=$1', [user]))[0], { monedas: 1234, thc_points: 57 });
    assert.equal((await query('select count(*)::int as n from public.ut_sobres_inventario'))[0].n, 0);
  });
  await check('plus and ultimate work without inflating GRL, while invalid types and stats still reject', async () => {
    ultimateId = (await query("insert into public.ut_cartas(codigo,nombre,posicion,rareza,nacionalidad,ritmo,tiro,pase,regate,defensa,fisico,activa) values('ultimate-75','Carta Ultimate','CM','ultimate','AR',75,75,75,75,75,75,true) returning id,grl"))[0].id;
    const plus = (await query("insert into public.ut_cartas(codigo,nombre,posicion,rareza,ritmo,tiro,pase,regate,defensa,fisico) values('plus-68','Carta Plus','CM','plus',68,68,68,68,68,68) returning grl"))[0];
    assert.equal(plus.grl, 68);
    assert.equal((await query('select grl from public.ut_cartas where id=$1', [ultimateId]))[0].grl, 75);
    await reject(() => query("update public.ut_cartas set rareza='invalid' where id=$1", [ultimateId]), '23514');
    await reject(() => query('update public.ut_cartas set ritmo=100 where id=$1', [ultimateId]), '23514');
    await reject(() => query('update public.ut_cartas set grl=99 where id=$1', [ultimateId]), '428C9');
    await query('update public.ut_cartas set ritmo=99,tiro=99,pase=99,regate=99,defensa=99,fisico=99 where id=$1', [ultimateId]);
    assert.equal((await query('select grl from public.ut_cartas where id=$1', [ultimateId]))[0].grl, 99);
    await query('update public.ut_cartas set ritmo=75,tiro=75,pase=75,regate=75,defensa=75,fisico=75 where id=$1', [ultimateId]);
  });
  await check('canonical saves retain starter stats and country, plus collected type and actual GRL', async () => {
    ownedId = (await query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2) returning id', [user, ultimateId]))[0].id;
    await role('authenticated', user);
    const saved = await save([{ id: 'p1', grl: 99, nacionalidad: 'Fake' }, { id: `ut:${ownedId}`, grl: 99, color: 'oro', nacionalidad: 'Fake' }]);
    assert.equal(saved.titulares[0].grl, 72);
    assert.equal(saved.titulares[0].nacionalidad, 'PE');
    assert.equal(saved.titulares[1].color, 'ultimate');
    assert.equal(saved.titulares[1].grl, 75);
    assert.equal(saved.titulares[1].nacionalidad, 'AR');
  });
  await check('RLS still prevents another user, anonymous access and browser rewards or edits', async () => {
    await role('authenticated', user);
    await reject(() => query('update public.ut_cartas set ritmo=99 where id=$1', [ultimateId]), '42501');
    await reject(() => query('insert into public.ut_cartas_club(user_id,carta_id) values($1,$2)', [user, ultimateId]), '42501');
    await role('authenticated', other);
    assert.equal((await query('select * from public.ut_cartas_club')).length, 0);
    assert.equal((await query('select * from public.plantillas_ut')).length, 0);
    await reject(() => save([{ id: `ut:${ownedId}` }]), '42501');
    await role('anon');
    await reject(() => query('select * from public.ut_cartas'), '42501');
    await reject(() => save([{ id: 'p1' }]), '42501');
  });
  await check('new types remain compatible with atomic five-card packs and replay receipts', async () => {
    await role(null);
    await query("update public.ut_sobres_catalogo set activo=true where id='thc-base'");
    await query("insert into public.ut_sobres_pool values('thc-base',$1,100)", [ultimateId]);
    packId = (await query("insert into public.ut_sobres_inventario(user_id,tipo_id) values($1,'thc-base') returning id", [user]))[0].id;
    await role('authenticated', user);
    receipt = await open(packId);
    assert.equal(receipt.cartas.length, 5);
    assert.ok(receipt.cartas.every(copy => copy.carta.rareza === 'ultimate' && copy.carta.grl === 75));
    assert.deepEqual(await open(packId), receipt);
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 6);
  });
  await check('rerunning design upgrade does not overwrite a custom starter country or rewards', async () => {
    await role(null);
    await query("update thc_private.ut_jugadores_base set datos=datos||'{\"nacionalidad\":\"AR\",\"pais_codigo\":\"AR\"}'::jsonb where id='p2'");
    await db.exec(upgrade);
    assert.deepEqual(await guards(), beforeGuards);
    assert.equal((await query("select datos->>'nacionalidad' as country from thc_private.ut_jugadores_base where id='p2'"))[0].country, 'AR');
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut where user_id=$1', [user]))[0], { monedas: 1234, thc_points: 57 });
    assert.equal((await query('select count(*)::int as n from public.ut_cartas_club'))[0].n, 6);
    await role('authenticated', user);
    assert.deepEqual(await open(packId), receipt);
  });
  console.log(`${checks} card design SQL scenarios passed.`);
} finally {
  await db.close();
}
