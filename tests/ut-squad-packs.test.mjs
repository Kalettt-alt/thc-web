import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeSquad, positionFit, swapSquadCards, SQUAD_FORMATIONS } from '../src/pages/UltimateTeam/squadUT.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';
import { buildStarterSquad, normalizePlayerList } from '../src/pages/UltimateTeam/utValidation.js';
import { openUtPack, readPendingUtPack } from '../src/pages/UltimateTeam/packRequestsUT.js';
import { saveUtSquad } from '../src/pages/UltimateTeam/squadPersistenceUT.js';
import { catalogCard, cardAsset } from '../src/pages/UltimateTeam/utCards.js';
const starter=()=>({...buildStarterSquad(JUGADORES_BASE),formacion:'4-3-3'});
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const user='11111111-1111-4111-8111-111111111111', pack='33333333-3333-4333-8333-333333333333';

test('autoalinear incorpora banca, valora eficacia por posición y no duplica ni modifica el inventario',()=>{
  const squad=starter();squad.suplentes[0]={...squad.suplentes[0],id:'better-cb',pos:'CB',grl:99};
  const before=structuredClone(squad);const result=arrangeSquad(squad,'4-4-2');
  assert.ok(result.titulares.some(p=>p?.id==='better-cb'));
  assert.ok(result.titulares.every((p,i)=>p===null||p.pos!=='GK'||SQUAD_FORMATIONS['4-4-2'][i][0]==='GK'));
  assert.deepEqual(squad,before);
  assert.equal(new Set([...result.titulares,...result.suplentes,...result.reservas].filter(Boolean).map(p=>p.id)).size,23);
  assert.equal(positionFit({pos:'ST'},'CB'),0);assert.equal(positionFit({pos:'GK'},'CM'),0);
  assert.ok(arrangeSquad(starter(),'4-3-3').titulares.some(p=>p?.id==='p6'), 'un MCD con penalización baja puede mejorar la eficacia del MC desde la banca');
  const flexible=starter();flexible.suplentes=flexible.suplentes.map(p=>p?.id==='p6'?{...p,posiciones_secundarias:['CM']}:p);
  assert.ok(arrangeSquad(flexible,'4-3-3').titulares.some(p=>p?.id==='p6'), 'una secundaria explícita permite mejorar el MC desde la banca');
  const balanced=arrangeSquad(starter(),'4-3-3');
  assert.equal(balanced.titulares[4].id,'p8','el MCO natural conserva el puesto cuando no beneficia cruzar los medios');
  assert.equal(balanced.titulares[6].pos,'LB');
  assert.equal(balanced.titulares[7].pos,'CB');
  assert.equal(balanced.titulares[8].pos,'CB');
});
test('intercambiar carta conserva ambos jugadores; destinos vacíos funcionan y payload inválido no cambia datos',()=>{
  const squad=starter();squad.suplentes[0]={...squad.suplentes[0],id:'reserve-lw',pos:'LW'};
  const moved=swapSquadCards(squad,{section:'titulares',index:0},{section:'suplentes',index:0});
  assert.equal(moved.titulares[0].id,squad.suplentes[0].id);assert.equal(moved.suplentes[0].id,squad.titulares[0].id);
  assert.equal(swapSquadCards(squad,{section:'__proto__',index:0},{section:'titulares',index:0}),squad);
  const empty=swapSquadCards({...squad,suplentes:[]},{section:'titulares',index:0},{section:'suplentes',index:0});
  assert.equal(empty.titulares[0],null);assert.equal(empty.suplentes[0].id,squad.titulares[0].id);
});
test('catálogo usa copias únicas, keeper stats y diseños seguros, y conserva especial al recargar',()=>{
  const card=catalogCard({id:'card',nombre:'Arquero',posicion:'GK',grl:80,rareza:'especial',estirada:81,paradas:79},'copy');
  assert.equal(card.id,'ut:copy');assert.equal(card.gk_div,81);assert.equal(card.gk_han,79);
  assert.equal(normalizePlayerList([card],11)[0].color,'especial');
  assert.equal(cardAsset('javascript:alert(1)'),null);assert.equal(cardAsset('//evil.example/x'),null);assert.equal(cardAsset('local.webp',{'./cartas/local.webp':'/assets/local.webp'}),'/assets/local.webp');
  assert.equal(cardAsset('https://user:secret@example.com/card.png'),null);
  assert.equal(cardAsset('/\\example.com/card.png'),null);
});
test('apertura con respuesta perdida reusa UUID al reintentar y confirma el mismo sobre',async()=>{
  const store=storage();const ids=[];let first=true;
  const client={auth:{getUser:async()=>({data:{user:{id:user}},error:null})},rpc:async(_,args)=>{ids.push(args.p_solicitud_id);if(first){first=false;return {error:{message:'Network lost'}};}return {data:{cartas:[{id:'copy',carta:{id:'card'}}]},error:null};}};
  await assert.rejects(openUtPack(client,pack,user,store));assert.ok(readPendingUtPack(store,user));
  await openUtPack(client,pack,user,store);assert.equal(ids[0],ids[1]);assert.equal(readPendingUtPack(store,user),null);
});
test('apertura pendiente bloquea otro sobre y rechazo definitivo permite volver a elegir',async()=>{
  const store=storage();let calls=0;const client={auth:{getUser:async()=>({data:{user:{id:user}},error:null})},rpc:async()=>{calls++;return {error:{message:'Sin pool',code:'P0001'}};}};
  await assert.rejects(openUtPack(client,pack,user,store));assert.equal(readPendingUtPack(store,user),null);
  store.setItem('thc:ut:pack-pending:'+user,JSON.stringify({packId:pack,requestId:crypto.randomUUID()}));
  await assert.rejects(openUtPack(client,'44444444-4444-4444-8444-444444444444',user,store),/anterior/);assert.equal(calls,1);
});
test('guardado no pasa a escritura directa por conflictos ni permite guardar cartas nuevas sin RPC',async()=>{
  const squad=starter();let writes=0;
  const client=error=>({auth:{getUser:async()=>({data:{user:{id:user}},error:null})},rpc:async()=>({error}),from:()=>{writes++;throw Error('Unexpected fallback');}});
  await assert.rejects(saveUtSquad(client({code:'40001',message:'Conflicto'}),squad,user));assert.equal(writes,0);
  squad.titulares[0]={...squad.titulares[0],club_carta_id:'copy'};
  await assert.rejects(saveUtSquad(client({code:'PGRST202',message:'RPC missing'}),squad,user));assert.equal(writes,0);
  await assert.rejects(saveUtSquad(client(null),squad,'other'),/sesión/);
});
