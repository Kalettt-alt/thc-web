import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LEGACY_STARTER_POOL_UT, STARTER_POOL_UT, STARTER_REQUIRED_POSITIONS, STARTER_RARITY_COUNTS, STARTER_RARITY_PROBABILITIES } from '../src/pages/UltimateTeam/data/starterPoolUT.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';
import { COUNTRY_ASSETS_UT } from '../src/pages/UltimateTeam/countryAssetsUT.js';
import { openStarterPackUT, validateStarterReceipt, readStarterCardsUT } from '../src/pages/UltimateTeam/starterPackUT.js';
import { cardCountry, cardStatFields } from '../src/pages/UltimateTeam/utCards.js';

test('pool de67 conserva los23legacy y contiene posiciones para un sobre equilibrado sin99',()=>{
  assert.equal(STARTER_POOL_UT.length,67);
  assert.equal(new Set(STARTER_POOL_UT.map(player=>player.id)).size,67);
  assert.deepEqual(LEGACY_STARTER_POOL_UT.slice(0,23),JUGADORES_BASE);
  assert.equal(Object.values(STARTER_REQUIRED_POSITIONS).reduce((sum,count)=>sum+count,0),12);
  for(const color of ['bronce','plata'])for(const [pos,required] of Object.entries(STARTER_REQUIRED_POSITIONS))assert.ok(STARTER_POOL_UT.filter(player=>player.pos===pos&&player.color===color).length>=required);
  for(const player of STARTER_POOL_UT) {
    assert.ok(player.grl>=0&&player.grl<99);
    for(const [key] of cardStatFields(player))assert.ok(Number.isInteger(player[key])&&player[key]>=0&&player[key]<=99);
  }
});
test('catálogo tiene37Bronce24Plata5Oro1Plus ystats coherentes, distinto dellegado',()=>{
  assert.deepEqual(Object.fromEntries(Object.keys(STARTER_RARITY_COUNTS).map(color=>[color,STARTER_POOL_UT.filter(player=>player.color===color).length])),STARTER_RARITY_COUNTS);
  assert.equal(Object.values(STARTER_RARITY_PROBABILITIES).reduce((sum,p)=>sum+p,0),100);
  const limits={bronce:[54,64,73],plata:[65,75,83],oro:[78,85,92],plus:[85,94,96]};
  for(const player of STARTER_POOL_UT) {
    const [min,max,statMax]=limits[player.color];
    assert.ok(player.grl>=min&&player.grl<=max);
    for(const [key] of cardStatFields(player))assert.ok(player[key]<=statMax);
  }
  assert.notDeepEqual(STARTER_POOL_UT[0],JUGADORES_BASE[0]);
  assert.deepEqual(LEGACY_STARTER_POOL_UT.slice(0,23),JUGADORES_BASE);
});
test('los20países usan arte suministrado y derivados web, incluyendoFeroe Vaticano SanMarino EEUU',async()=>{
  assert.equal(Object.keys(COUNTRY_ASSETS_UT).length,20);
  assert.equal(new Set(STARTER_POOL_UT.map(player=>player.pais_codigo)).size,20);
  for(const [code,path] of Object.entries(COUNTRY_ASSETS_UT)) {
    assert.equal(cardCountry(code).flagUrl,path);
    const bytes=await readFile(new URL(path));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length<40000);
  }
  for(const [name,code] of [['Feroe','FO'],['Vaticano','VA'],['SanMarino','SM'],['EEUU','US']])assert.equal(cardCountry(name).code,code);
});
test('apertura inicial obtiene sólo recibo servidor y no inventa cartas si falta SQL o sesión',async()=>{
  const cards=JUGADORES_BASE;
  const receipt={pool_size:67,cartas:cards};
  let calls=0;
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},rpc:async(name,args)=>{calls++;assert.equal(name,'thc_ut_abrir_sobre_inicial');assert.equal(args,undefined);return{data:receipt,error:null};}};
  assert.deepEqual(await openStarterPackUT(client),cards);assert.equal(calls,1);
  client.rpc=async()=>({error:{code:'PGRST202'}});
  await assert.rejects(openStarterPackUT(client),/actualización de Supabase/);
  client.auth.getUser=async()=>({data:{user:null},error:null});
  await assert.rejects(openStarterPackUT(client),/Inicia sesión/);
});
test('recibo incompleto, duplicado ostats inválidas nunca se muestran como regalo confirmado',()=>{
  assert.throws(()=>validateStarterReceipt({pool_size:67,cartas:JUGADORES_BASE.slice(0,22)}));
  assert.throws(()=>validateStarterReceipt({pool_size:67,cartas:Array(23).fill(JUGADORES_BASE[0])}));
  assert.throws(()=>validateStarterReceipt({pool_size:67,cartas:[{...JUGADORES_BASE[0],grl:100},...JUGADORES_BASE.slice(1)]}));
  assert.throws(()=>validateStarterReceipt({pool_size:67,cartas:[{...JUGADORES_BASE[0],pac:100},...JUGADORES_BASE.slice(1)]}));
  assert.throws(()=>validateStarterReceipt({pool_size:23,cartas:JUGADORES_BASE}));
});
test('lectura del club no llama a apertura ni regala sobre al visitarMyTeam',async()=>{
  const calls=[];
  const client={rpc:async(name)=>{calls.push(name);return{data:JUGADORES_BASE,error:null};}};
  assert.deepEqual(await readStarterCardsUT(client),JUGADORES_BASE);
  assert.deepEqual(calls,['thc_ut_cartas_iniciales']);
  client.rpc=async()=>({error:{code:'PGRST202'}});assert.deepEqual(await readStarterCardsUT(client),[]);
  client.rpc=async()=>({error:{code:'42501',message:'Denied'}});await assert.rejects(readStarterCardsUT(client));
});
