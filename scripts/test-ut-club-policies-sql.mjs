import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2] || '.qa/sql-online-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const sql = await readFile(new URL('../supabase/ut_club_policies.sql', import.meta.url), 'utf8');
const existing = '11111111-1111-4111-8111-111111111111';
const fresh = '22222222-2222-4222-8222-222222222222';
const third = '33333333-3333-4333-8333-333333333333';
const query = async (sql, args=[]) => (await db.query(sql,args)).rows;
const role = async (name,id='') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  if(name)await db.exec(`set role ${name}`);
};
const reject = (fn,code='42501') => assert.rejects(fn,error=>error.code===code);
const initialize = async()=> (await query('select public.thc_ut_initialize() as value'))[0].value;
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log(`OK ${name}`);};

try {
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre text,logo_url text);
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0,thc_points bigint default 0);
    create table public.club_ut(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),jugador_id uuid,estado text);
    create table public.fantasy_partidas(user_id uuid primary key);
    create schema storage;create table storage.buckets(id text primary key,public boolean);
    insert into storage.buckets values('logos_clubes',false);
    grant all on public.equipos_ut,public.perfiles_ut,public.club_ut to anon,authenticated;
    grant update(monedas,thc_points),insert(user_id),select(monedas) on public.perfiles_ut to anon,authenticated;
    create policy existing_foreign_policy on public.perfiles_ut for all using(true) with check(true);
    create policy existing_team_policy on public.equipos_ut for all using(true) with check(true);`);
  await query('insert into auth.users values($1),($2),($3)',[existing,fresh,third]);
  await query('insert into public.perfiles_ut values($1,12500,81)',[existing]);
  await query("insert into public.equipos_ut values($1,'Club existente','/escudo.png')",[existing]);
  await query("insert into public.club_ut(user_id,estado) values($1,'en_club')",[existing]);
  await check('migration enables owned RLS without changing existing balance, club, foreign policies, Fantasy or Storage',async()=>{
    await db.exec(sql);
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut where user_id=$1',[existing]))[0],{monedas:12500,thc_points:81});
    assert.equal((await query('select nombre from public.equipos_ut where user_id=$1',[existing]))[0].nombre,'Club existente');
    assert.equal((await query("select count(*)::int n from pg_policies where policyname in ('existing_foreign_policy','existing_team_policy')"))[0].n,2);
    assert.equal((await query("select relrowsecurity from pg_class where relname='fantasy_partidas'"))[0].relrowsecurity,false);
    assert.equal((await query("select public from storage.buckets where id='logos_clubes'"))[0].public,false);
    assert.equal((await query('select count(*)::int n from thc_private.ut_bonus_claims'))[0].n,1);
  });
  await check('new authenticated user receives exactly 500 once, existing user keeps previous balances',async()=>{
    await role('authenticated',fresh);
    assert.equal(await initialize(),fresh);assert.equal(await initialize(),fresh);
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut'))[0],{monedas:500,thc_points:0});
    await role('authenticated',existing);await initialize();
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut'))[0],{monedas:12500,thc_points:81});
  });
  await check('owner can create, update and delete club while other accounts remain isolated',async()=>{
    await role('authenticated',fresh);
    await query("insert into public.equipos_ut(user_id,nombre) values($1,'Mi club')",[fresh]);
    await query("update public.equipos_ut set nombre='Nuevo nombre' where user_id=$1",[fresh]);
    assert.equal((await query('select nombre from public.equipos_ut'))[0].nombre,'Nuevo nombre');
    await reject(()=>query("insert into public.equipos_ut(user_id,nombre) values($1,'Ajeno')",[third]));
    await reject(()=>query('update public.equipos_ut set user_id=$1 where user_id=$2',[third,fresh]));
    await query('delete from public.equipos_ut where user_id=$1',[existing]);
    await query('delete from public.equipos_ut where user_id=$1',[fresh]);
    assert.equal((await query('select * from public.equipos_ut')).length,0);
    await role('authenticated',existing);assert.equal((await query('select * from public.equipos_ut')).length,1);
  });
  await check('wallet and player inventory cannot be minted, changed, read across users or deleted from browser',async()=>{
    await role('authenticated',fresh);
    await reject(()=>query('update public.perfiles_ut set monedas=999999 where user_id=$1',[fresh]));
    await reject(()=>query('insert into public.perfiles_ut(user_id,monedas) values($1,999999)',[third]));
    await reject(()=>query('delete from public.perfiles_ut where user_id=$1',[fresh]));
    await reject(()=>query("insert into public.club_ut(user_id,estado) values($1,'en_club')",[fresh]));
    await reject(()=>query('delete from public.club_ut'));
    assert.equal((await query('select * from public.club_ut')).length,0);
    await reject(()=>query('select * from thc_private.ut_bonus_claims'));
    await role('anon');await reject(initialize);await reject(()=>query('select * from public.perfiles_ut'));
    await role('authenticated');await reject(initialize);
  });
  await check('rerunning keeps balances and prevents a deleted wallet from claiming a second welcome reward',async()=>{
    await role(null);await db.exec(sql);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1',[fresh]))[0].monedas,500);
    await query('delete from public.perfiles_ut where user_id=$1',[fresh]);
    await role('authenticated',fresh);await initialize();
    assert.deepEqual((await query('select monedas,thc_points from public.perfiles_ut'))[0],{monedas:0,thc_points:0});
    await role(null);assert.equal((await query('select count(*)::int n from thc_private.ut_bonus_claims'))[0].n,2);
  });
  console.log(`${checks} UT club policies SQL scenarios passed.`);
} finally {await db.close();}
