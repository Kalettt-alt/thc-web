import test from 'node:test';
import assert from 'node:assert/strict';
import { squadOverall, squadRatingTier } from '../src/pages/UltimateTeam/squadPresentationUT.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';
import { buildStarterSquad } from '../src/pages/UltimateTeam/utValidation.js';

test('GRL del equipo refleja once, huecos y mejora desde la banca sin superar 99',()=>{
  const {titulares}=buildStarterSquad(JUGADORES_BASE);
  const previous=squadOverall(titulares);
  const improved=[...titulares];improved[0]={...improved[0],grl:85};
  assert.ok(squadOverall(improved)>previous);
  assert.ok(squadOverall([...titulares.slice(0,10),null])<previous);
  assert.equal(squadOverall(Array(11).fill({grl:500})),99);
  assert.equal(squadOverall(Array(11).fill({grl:70}).concat({grl:99})),70);
  assert.equal(squadOverall([]),0);
});

test('distintivo progresa entre rangos y el tope muestra progreso completo',()=>{
  assert.equal(squadRatingTier(64).id,'bronce');
  assert.equal(squadRatingTier(65).id,'plata');
  assert.equal(squadRatingTier(75).id,'oro');
  assert.equal(squadRatingTier(85).id,'plus');
  assert.equal(squadRatingTier(95).id,'ultimate');
  assert.equal(squadRatingTier(74).remaining,1);
  assert.deepEqual(squadRatingTier(99),{id:'ultimate',name:'Ultimate',start:95,next:99,progress:100,remaining:0});
});
