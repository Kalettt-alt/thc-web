import test from 'node:test';
import assert from 'node:assert/strict';
import { addSquadCard, arrangeSquad, canSwapSquadCards, effectivePlayerGrl, effectiveSquadOverall, playerPositionPenalty, positionFit, repairSquad, SQUAD_FORMATIONS, swapSquadCards, validateStartingSquad } from '../src/pages/UltimateTeam/squadUT.js';
import { buildStarterSquad } from '../src/pages/UltimateTeam/utValidation.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';

const starter = () => ({ ...buildStarterSquad(JUGADORES_BASE), formacion:'4-3-3' });
const allIds = squad => ['titulares','suplentes','reservas'].flatMap(section => squad[section] || []).filter(Boolean).map(player => player.id).sort();

test('penalización distingue puestos naturales, bandas, familias y portero fuera del arco', () => {
  const cases = [
    ['GK','LW',40],['ST','GK',40],['RW','RM',2],['LW','LM',2],['RW','LM',6],
    ['RB','LB',6],['LWB','RWB',6],['LB','CB',3],['CDM','CAM',3],['CF','ST',3],
    ['CB','ST',18],['CB','LW',18],['RB','CM',10],['CM','ST',9],['CM','LM',6],['LW','ST',5],
  ];
  for (const [pos,target,expected] of cases) {
    assert.equal(playerPositionPenalty({pos},target),expected,`${pos} → ${target}`);
    assert.equal(playerPositionPenalty({pos:target},pos),expected,`${target} → ${pos}`);
  }
  assert.equal(playerPositionPenalty({pos:'CM'},'CM'),0);
  assert.equal(playerPositionPenalty({pos:'CM',posiciones_secundarias:['CAM']},'CAM'),0);
  assert.equal(playerPositionPenalty({pos:'CM',posiciones_secundarias:'CAM'},'CAM'),3);
  assert.equal(positionFit({pos:'CM',posiciones_secundarias:['CAM']},'CAM'),2);
});

test('GRL efectivo baja por puesto sin mutar GRL ni estadísticas originales y se limita a 0–99', () => {
  const player={...JUGADORES_BASE[0]};
  const before=structuredClone(player);
  assert.equal(effectivePlayerGrl(player,'LW'),32);
  assert.equal(effectivePlayerGrl(player,'GK'),72);
  assert.equal(effectivePlayerGrl({...player,grl:25},'LW'),0);
  assert.equal(effectivePlayerGrl({...player,grl:500},'GK'),99);
  assert.deepEqual(player,before);
  const squad=starter(), previous=effectiveSquadOverall(squad);
  const swapped=swapSquadCards(squad,{section:'titulares',index:0},{section:'titulares',index:10});
  assert.ok(effectiveSquadOverall(swapped)<previous);
  assert.equal(effectiveSquadOverall({formacion:'4-3-3',titulares:[]}),0);
  assert.ok(effectiveSquadOverall({formacion:'4-3-3',titulares:Array(11).fill({pos:'CM',grl:500})})<=99);
});

test('plantel inicial incompleto deja huecos y conserva jugadores sin usar como suplentes', () => {
  const players = [{id:'gk',pos:'GK',grl:72},{id:'st1',pos:'ST',grl:74},{id:'st2',pos:'ST',grl:69}];
  const before = structuredClone(players);
  const squad = buildStarterSquad(players);
  assert.equal(squad.titulares[10].id,'gk');
  assert.equal(squad.titulares[1].id,'st1');
  assert.equal(squad.titulares.filter(Boolean).length,2);
  assert.deepEqual(allIds(squad),['gk','st1','st2']);
  assert.deepEqual(players,before);
});

test('solo la firma exacta del armado legacy p1…p11 sin versión se reordena automáticamente', () => {
  const squad={formacion:'4-3-3',titulares:JUGADORES_BASE.slice(0,11),suplentes:JUGADORES_BASE.slice(11,18),reservas:JUGADORES_BASE.slice(18)};
  const before=structuredClone(squad);
  const fixed=repairSquad(squad);
  assert.equal(fixed.changed,true);
  assert.ok(fixed.squad.titulares.every((player,index)=>positionFit(player,SQUAD_FORMATIONS['4-3-3'][index][0])>0));
  assert.deepEqual(allIds(fixed.squad),allIds(squad));
  assert.deepEqual(squad,before);
  assert.equal(repairSquad(fixed.squad).changed,false);
  assert.equal(repairSquad({...squad,version_posiciones:1}).changed,false);
  assert.equal(repairSquad({...squad,version_posiciones:1}).squad.titulares[0].id,'p1');
});

test('una distribución manual fuera de posición se conserva al volver a cargar', () => {
  const squad=starter();
  [squad.titulares[0],squad.titulares[10]]=[squad.titulares[10],squad.titulares[0]];
  const fixed=repairSquad(squad);
  assert.equal(fixed.squad,squad);
  assert.equal(fixed.changed,false);
  assert.equal(validateStartingSquad(squad).valid,true);
});

test('autoalinear usa eficacia, banca y posiciones naturales sin colocar arqueros en las bandas', () => {
  const squad=starter();
  squad.reservas.push({id:'better-cm',pos:'CM',grl:90},{id:'extra-keeper',pos:'GK',grl:99});
  const before=structuredClone(squad);
  const arranged=arrangeSquad(squad,'4-3-3');
  assert.ok(arranged.titulares.some(player=>player?.id==='better-cm'));
  assert.equal(arranged.titulares[10].id,'extra-keeper');
  assert.ok(arranged.titulares.slice(0,10).every(player=>player?.pos!=='GK'));
  assert.deepEqual(allIds(arranged),allIds(squad));
  assert.deepEqual(squad,before);
  assert.ok(effectiveSquadOverall(arranged)>=effectiveSquadOverall(squad));
});

test('validación exige once completo y cartas distintas, pero permite cualquier posición manual', () => {
  const squad=starter();
  const bad=swapSquadCards(squad,{section:'titulares',index:0},{section:'titulares',index:10});
  assert.equal(validateStartingSquad(bad).valid,true);
  const missing={...squad,titulares:[...squad.titulares]};missing.titulares[10]=null;
  assert.equal(validateStartingSquad(missing).valid,false);
  assert.deepEqual(validateStartingSquad(missing).missingPositions,['GK']);
  const duplicate={...squad,titulares:[...squad.titulares]};duplicate.titulares[10]=duplicate.titulares[0];
  assert.equal(validateStartingSquad(duplicate).valid,false);
  assert.equal(validateStartingSquad({...squad,formacion:'__proto__'}).valid,false);
});

test('swaps de cualquier puesto conservan ambas cartas y rechazan solo destinos o índices inválidos', () => {
  const squad=starter(), before=structuredClone(squad);
  const from={section:'titulares',index:0}, to={section:'titulares',index:10};
  assert.equal(canSwapSquadCards(squad,from,to),true);
  const moved=swapSquadCards(squad,from,to);
  assert.equal(moved.titulares[0].pos,'GK');
  assert.equal(moved.titulares[10].pos,'LW');
  assert.deepEqual(allIds(moved),allIds(squad));
  assert.deepEqual(squad,before);
  assert.equal(swapSquadCards(squad,{section:'__proto__',index:0},to),squad);
  assert.equal(swapSquadCards(squad,from,{section:'titulares',index:11}),squad);
});

test('incorporar desde el club permite cualquier puesto, conserva reemplazo y no duplica copias', () => {
  const squad=starter();
  const incoming={id:'ut:owned-gk',nombre:'Nuevo portero',pos:'GK',grl:80};
  const added=addSquadCard(squad,incoming,{section:'titulares',index:0});
  assert.equal(added.titulares[0].id,incoming.id);
  assert.equal(effectivePlayerGrl(added.titulares[0],'LW'),40);
  assert.ok(added.reservas.some(player=>player.id===squad.titulares[0].id));
  assert.equal(addSquadCard(added,incoming),added);
  assert.deepEqual(allIds(added),[...allIds(squad),incoming.id].sort());
  for (const formation of Object.keys(SQUAD_FORMATIONS)) {
    const arranged=arrangeSquad(squad,formation);
    assert.equal(validateStartingSquad(arranged).valid,true);
    assert.deepEqual(allIds(arranged),allIds(squad));
  }
});
