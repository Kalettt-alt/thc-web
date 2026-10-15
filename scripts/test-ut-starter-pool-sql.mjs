import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LEGACY_STARTER_POOL_UT, STARTER_POOL_UT, STARTER_REQUIRED_POSITIONS, STARTER_RARITY_COUNTS } from '../src/pages/UltimateTeam/data/starterPoolUT.js';
import { buildStarterSquad } from '../src/pages/UltimateTeam/utValidation.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';

const {PGlite}=await import(pathToFileURL(resolve(process.argv[2]||'.qa/sql-muro-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite();
const sql=await readFile(new URL('../supabase/ut_starter_pool_v2.sql',import.meta.url),'utf8');
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const role=async(name=null,user='')=>{await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[user]);if(name)await db.exec(`set role ${name}`);};
const open=async()=> (await query('select public.thc_ut_abrir_sobre_inicial() as value'))[0].value;
const inventory=async()=> (await query('select public.thc_ut_cartas_iniciales() as value'))[0].value;
const save=async(squad)=> (await query('select public.thc_ut_guardar_plantilla($1::jsonb) as value',[JSON.stringify(squad)]))[0].value;
const rejected=(fn,code)=>assert.rejects(fn,error=>error.code===code);
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
const club=async(id)=>{await query('insert into public.perfiles_ut(user_id) values($1)',[id]);await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,'Club','THC')",[id]);};
let count=0,first,second,legacyBefore;
const check=async(name,fn)=>{await fn();count++;console.log(`OK ${name}`);};
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    create table public.perfiles_ut(user_id uuid primary key references auth.users(id),monedas bigint default 0,thc_points bigint default 0);
    create table public.equipos_ut(user_id uuid primary key references auth.users(id),nombre text not null,abreviatura text not null,logo_url text,liga text,colores jsonb default '[]',estadio text,apodos jsonb default '[]');
    create table public.plantillas_ut(user_id uuid primary key references auth.users(id),formacion text default '4-3-3',titulares jsonb default '[]',suplentes jsonb default '[]',reservas jsonb default '[]',tacticas jsonb default '{}',actualizado_en timestamptz default now());
    create table public.club_ut(user_id uuid references auth.users(id));create table public."PlaylistUT"(user_id uuid references auth.users(id));`);
  for(const id of ids)await query('insert into auth.users values($1)',[id]);
  for(const name of ['ut_club_policies.sql','ultimate_team_cartas.sql','ultimate_team_card_designs.sql','ut_online_matches.sql'])await db.exec(await readFile(new URL(`../supabase/${name}`,import.meta.url),'utf8'));
  await club(ids[0]);
  await role('authenticated',ids[0]);
  const legacySquad={...buildStarterSquad(JUGADORES_BASE),formacion:'4-3-3'};
  legacyBefore=await save(legacySquad);
  await role();
  // Simulate a receipt already issued by the previous unweighted 67-player patch.
  await db.exec(`create table thc_private.ut_inicial_entregas(user_id uuid primary key references auth.users(id),jugadores text[] not null,legacy boolean not null default false,semilla uuid not null default gen_random_uuid(),entregado_en timestamptz not null default now());`);
  const previousCards=LEGACY_STARTER_POOL_UT.slice(23,46);
  for(const player of LEGACY_STARTER_POOL_UT.slice(23))await query('insert into thc_private.ut_jugadores_base(id,datos) values($1,$2::jsonb)',[player.id,JSON.stringify(player)]);
  await query('insert into thc_private.ut_inicial_entregas(user_id,jugadores) values($1,$2::text[])',[ids[3],previousCards.map(player=>player.id)]);
  await check('migration compiles, seeds67 and preserves legacy savedsquad, balances and catalogue activation',async()=>{
    await db.exec(sql);
    assert.equal((await query('select count(*)::int n from thc_private.ut_jugadores_base'))[0].n,67);
    assert.deepEqual((await query('select to_jsonb(s) value from public.plantillas_ut s where user_id=$1',[ids[0]]))[0].value,legacyBefore);
    assert.equal((await query('select count(*)::int n from public.ut_cartas_club'))[0].n,0);
    assert.equal((await query('select count(*)::int n from public.ut_cartas where activa'))[0].n,0);
    assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1',[ids[0]]))[0].monedas,0);
  });
  await check('legacy club receives its same23 once; migration rerun doesnot touchthem',async()=>{
    await role('authenticated',ids[0]);const receipt=await open();assert.equal(receipt.legacy,true);assert.deepEqual(receipt.cartas,JUGADORES_BASE);
    await role();await db.exec(sql);await role('authenticated',ids[0]);assert.deepEqual(await open(),receipt);
  });
  await check('old67pool receipt snapshots its previousratings andcountries unchanged across weightedupgrade',async()=>{
    await role('authenticated',ids[3]);const old=await open();assert.equal(old.version,2);assert.deepEqual(old.cartas,previousCards);
    await role();await db.exec(sql);await role('authenticated',ids[3]);assert.deepEqual(await open(),old);
  });
  await check('newcatalog counts exactly37/24/5/1 andbronze cannotcarry elite87stats',async()=>{
    await role();const catalog=await query("select datos from thc_private.ut_inicial_catalogo order by substring(id from 2)::integer");
    assert.deepEqual(catalog.map(row=>row.datos),STARTER_POOL_UT);
    for(const [rarity,n] of Object.entries(STARTER_RARITY_COUNTS))assert.equal(catalog.filter(row=>row.datos.color===rarity).length,n);
    const stats=['pac','sho','pas','dri','def','phy','gk_div','gk_han','gk_kic','gk_ref','gk_spd','gk_pos'];
    for(const {datos:player} of catalog.filter(row=>row.datos.color==='bronce'))for(const key of stats)if(key in player)assert.ok(player[key]<=73);
  });
  await check('23qualityrolls areglobal and respect eachqualitystock before positions areassigned',async()=>{
    await role();const weights=await query('select rareza,peso_base::float8 peso from thc_private.ut_inicial_pesos');
    assert.deepEqual(Object.fromEntries(weights.map(row=>[row.rareza,row.peso])),{bronce:5500,plata:3450,oro:1000,plus:50});
    for(let seedIndex=0;seedIndex<40;seedIndex++) {
      const seed=(await query('select md5($1)::uuid seed',[`quality-check-${seedIndex}`]))[0].seed;
      const qualities=(await query('select thc_private.ut_inicial_calidades($1) value',[seed]))[0].value;
      assert.equal(qualities.length,23);
      for(const [rarity,n] of Object.entries(STARTER_RARITY_COUNTS))assert.ok(qualities.filter(value=>value===rarity).length<=n);
    }
  });
  await check('deterministic2000packs haveabout11percent Plus, not aST-only1percent rate',async()=>{
    const draws=await query("with draws as materialized(select thc_private.ut_inicial_calidades(md5('distribution-'||slot::text)::uuid) qualities from generate_series(1,2000) slot) select count(*)::int packs,count(*) filter(where 'plus'=any(qualities))::int plus_packs,sum((select count(*) from unnest(qualities) rarity where rarity='bronce'))::int bronze,sum((select count(*) from unnest(qualities) rarity where rarity='plata'))::int silver,sum((select count(*) from unnest(qualities) rarity where rarity='oro'))::int gold from draws");
    const result=draws[0];
    assert.ok(result.plus_packs/result.packs>.085&&result.plus_packs/result.packs<.135);
    assert.ok(result.bronze/(result.packs*23)>.52&&result.bronze/(result.packs*23)<.58);
    assert.ok(result.silver/(result.packs*23)>.32&&result.silver/(result.packs*23)<.37);
    assert.ok(result.gold/(result.packs*23)>.085&&result.gold/(result.packs*23)<.115);
    console.log(`Observed Plus ${result.plus_packs}/${result.packs} packs; global23 draws before roster coverage.`);
  });
  await check('coverage preserves exactqualitycounts evenallbronze, allsilver andallscarcecards rolled',async()=>{
    const variants=[Array(23).fill('bronce'),Array(23).fill('plata'),['plus',...Array(5).fill('oro'),...Array(17).fill('bronce')],['plus',...Array(5).fill('oro'),...Array(17).fill('plata')]];
    for(const qualities of variants) {
      const cards=(await query('select thc_private.ut_inicial_build($1,$2::text[]) value',['77777777-7777-4777-8777-777777777777',qualities]))[0].value;
      assert.equal(cards.length,23);assert.equal(new Set(cards.map(player=>player.id)).size,23);
      for(const rarity of Object.keys(STARTER_RARITY_COUNTS))assert.equal(cards.filter(player=>player.color===rarity).length,qualities.filter(value=>value===rarity).length);
      for(const [pos,n] of Object.entries(STARTER_REQUIRED_POSITIONS))assert.ok(cards.filter(player=>player.pos===pos).length>=n);
    }
  });
  await check('anonymous calls and private direct reads/writes are denied bygrants andRLS',async()=>{
    await role('anon');await rejected(open,'42501');await rejected(inventory,'42501');
    await role('authenticated',ids[1]);await rejected(()=>query('select * from thc_private.ut_inicial_entregas'),'42501');
    await rejected(()=>query('select * from thc_private.ut_jugadores_base'),'42501');
    await rejected(()=>query('select thc_private.ut_starter_canonical($1,$2)',[ids[0],'p1']),'42501');
    await role();assert.equal((await query("select relrowsecurity from pg_class where relname='ut_inicial_entregas'"))[0].relrowsecurity,true);
  });
  await check('readonly inventory doesnot allocate; profile andcreatedclub are bothrequired',async()=>{
    await role('authenticated',ids[1]);assert.deepEqual(await inventory(),[]);await rejected(open,'42501');
    await query('select public.thc_ut_initialize()');
    await role('authenticated',ids[1]);await rejected(open,'42501');
    await role();await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,'Nuevo','NEW')",[ids[1]]);await club(ids[2]);
  });
  await check('newaccount draws23 distinct withminimum naturalroles andservercanonicalstats',async()=>{
    await role('authenticated',ids[1]);first=await open();assert.equal(first.pool_size,67);assert.equal(first.cartas.length,23);assert.equal(first.legacy,false);
    assert.equal(new Set(first.cartas.map(player=>player.id)).size,23);
    for(const [pos,n] of Object.entries(STARTER_REQUIRED_POSITIONS))assert.ok(first.cartas.filter(player=>player.pos===pos).length>=n);
    for(const player of first.cartas)assert.deepEqual(player,STARTER_POOL_UT.find(row=>row.id===player.id));
    const squad=buildStarterSquad(first.cartas);assert.ok(squad.titulares.every(Boolean));assert.equal(squad.titulares[10].pos,'GK');
    assert.equal(squad.titulares[0].pos,'LW');assert.equal(squad.titulares[2].pos,'RW');
  });
  await check('retries return identicalreceipt andprivate serverseed reproduces theexact draw',async()=>{
    assert.deepEqual(await open(),first);assert.deepEqual(await inventory(),first.cartas);
    await role();const receipt=(await query('select * from thc_private.ut_inicial_entregas where user_id=$1',[ids[1]]))[0];
    const qualities=(await query('select thc_private.ut_inicial_calidades($1) value',[receipt.semilla]))[0].value;
    assert.deepEqual(receipt.calidades,qualities);
    const cards=(await query('select thc_private.ut_inicial_build($1,$2::text[]) value',[receipt.semilla,qualities]))[0].value;
    assert.deepEqual(receipt.jugadores,cards.map(player=>player.id));assert.deepEqual(receipt.cartas,cards);
  });
  await check('differentaccount owns its ownvariety, cannotinject anyunowned starter norforgedGRL',async()=>{
    await role('authenticated',ids[2]);second=await open();assert.notDeepEqual(second.cartas.map(player=>player.id),first.cartas.map(player=>player.id));
    const missing=STARTER_POOL_UT.find(player=>!second.cartas.some(owned=>owned.id===player.id));
    await rejected(()=>save({formacion:'4-3-3',titulares:[missing],suplentes:[],reservas:[]}),'42501');
    await rejected(()=>save({formacion:'4-3-3',titulares:[{id:'p68'}],suplentes:[],reservas:[]}),'42501');
    const squad={...buildStarterSquad(second.cartas),formacion:'4-3-3'};const canonical=squad.titulares[0];squad.titulares[0]={...canonical,grl:99,pac:99,nombre:'Inventado'};
    const saved=await save(squad);assert.deepEqual(saved.titulares[0],canonical);
    await role();assert.equal((await query('select thc_private.ut_online_canonical($1,$2) value',[ids[2],missing.id]))[0].value,null);
    assert.deepEqual((await query('select thc_private.ut_online_canonical($1,$2) value',[ids[2],canonical.id]))[0].value,canonical);
  });
  await check('rebalancing futurecatalog neverchanges players from a confirmedreceipt',async()=>{
    await role();const chosen=first.cartas[0];
    await query("update thc_private.ut_inicial_catalogo set datos=jsonb_set(datos,'{grl}','99') where id=$1",[chosen.id]);
    await role('authenticated',ids[1]);assert.deepEqual(await open(),first);
    await role();assert.deepEqual((await query('select thc_private.ut_online_canonical($1,$2) value',[ids[1],chosen.id]))[0].value,chosen);
    await db.exec(sql);await role('authenticated',ids[1]);assert.deepEqual(await open(),first);
  });
  await check('clubreset, reinitialize and migration rerun preserve firstreceipt without reroll ornewcoins',async()=>{
    await role('authenticated',ids[1]);await query('select public.thc_ut_reset()');
    assert.deepEqual(await open(),first);await query('select public.thc_ut_initialize()');
    await role();await query("insert into public.equipos_ut(user_id,nombre,abreviatura) values($1,'Recreado','NEW')",[ids[1]]);await db.exec(sql);
    await role('authenticated',ids[1]);assert.deepEqual(await open(),first);
    await role();assert.equal((await query('select monedas from public.perfiles_ut where user_id=$1',[ids[1]]))[0].monedas,0);
    assert.equal((await query('select count(*)::int n from thc_private.ut_inicial_entregas where user_id=$1',[ids[1]]))[0].n,1);
  });
  console.log(`${count} comprobaciones SQL del pool inicial aprobadas.`);
} catch(error) {
  console.error(`${error.code||'ERROR'}: ${error.message}`);
  if(error.position)console.error(sql.slice(Math.max(0,Number(error.position)-180),Number(error.position)+220));
  process.exitCode=1;
} finally {await db.close();}
