import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCareerLineup, swapCareerPlayers } from '../src/pages/THCFantasy/squadSelection.js';
import { recoverBetweenFixtures } from '../src/pages/THCFantasy/careerEnergy.js';
import { completeSavedRoster } from '../src/pages/THCFantasy/rosterCoverage.js';
import { TODOS_LOS_EQUIPOS } from '../src/pages/THCFantasy/equiposFantasy.js';
import { FORMACIONES, normalizarPos } from '../src/pages/THCFantasy/formacionesFantasy.js';

const player = (id, pos = 'DEF', grl = 80, energia = 100) => ({ id, name: id, pos, grl, energia });

test('all 58 clubs can fill every formation with real players from the correct broad line', () => {
  assert.equal(TODOS_LOS_EQUIPOS.length, 58);
  for (const club of TODOS_LOS_EQUIPOS) {
    const available = [...club.titulares, ...club.suplentes];
    const defenders = available.filter(item => normalizarPos(item.pos) === 'DEF');
    assert.ok(defenders.length >= 5, `${club.name}: cover in defence`);
    for (const [formation, slots] of Object.entries(FORMACIONES)) {
      const next = selectCareerLineup({}, available, formation);
      assert.equal(next.missing.length, 0, `${club.liga}:${club.id} ${formation}`);
      assert.equal(new Set([...Object.values(next.titulares), ...next.reservas].map(item => item.id)).size, available.length);
      for (const slot of slots) assert.equal(normalizarPos(next.titulares[slot.id].pos), normalizarPos(slot.pos), `${club.name}: ${slot.id}`);
    }
  }
});

test('autoalignment chooses a prepared substitute before a tired higher-rated starter', () => {
  const club = TODOS_LOS_EQUIPOS.find(item => item.id === 'river');
  const first = selectCareerLineup({}, [...club.titulares, ...club.suplentes]);
  const originalDefender = first.titulares.li.id;
  first.titulares.li = { ...first.titulares.li, energia: 12, grl: 89 };
  const reserveDefender = first.reservas.find(item => normalizarPos(item.pos) === 'DEF');
  const next = selectCareerLineup(first.titulares, first.reservas);
  assert.ok(Object.values(next.titulares).some(item => item.id === reserveDefender.id));
  assert.ok(next.reservas.some(item => item.id === originalDefender));
});

test('a depleted roster leaves empty defence slots instead of assigning a striker or second keeper', () => {
  const next = selectCareerLineup({}, [player('keeper', 'GK'), player('Cavani', 'DEL', 95), player('spare-keeper', 'GK', 89)]);
  for (const slot of ['li', 'dfc1', 'dfc2', 'ld']) assert.equal(next.titulares[slot], null);
  assert.equal(next.reservas.filter(item => item.pos === 'GK').length, 1);
  assert.equal(next.titulares.ei.name, 'Cavani');
});

test('pitch and bench swaps work in both directions without losing or duplicating a player', () => {
  const lineup = { dfc1: player('a'), dfc2: player('b'), empty: null };
  const reserves = [player('c'), player('d')];
  const first = swapCareerPlayers(lineup, reserves, { type: 'pitch', key: 'dfc1' }, { type: 'bench', key: 'c' });
  assert.equal(first.titulares.dfc1.id, 'c');
  assert.deepEqual(first.reservas.map(item => item.id), ['a', 'd']);
  const back = swapCareerPlayers(first.titulares, first.reservas, { type: 'bench', key: 'a' }, { type: 'pitch', key: 'dfc1' });
  assert.deepEqual(back, { titulares: lineup, reservas: reserves });
  const empty = swapCareerPlayers(lineup, reserves, { type: 'bench', key: 'c' }, { type: 'pitch', key: 'empty' });
  assert.equal(empty.titulares.empty.id, 'c');
  assert.deepEqual(empty.reservas.map(item => item.id), ['d']);
  assert.equal(swapCareerPlayers(lineup, reserves, { type: 'bench', key: 'missing' }, { type: 'pitch', key: 'dfc1' }), null);
  assert.equal(lineup.dfc1.id, 'a');
  assert.equal(reserves.length, 2);
});

test('three days remove most fatigue while keeping the heavier match load meaningful', () => {
  const lineup = { tired: player('a', 'MID', 80, 40), regular: player('b', 'MID', 80, 70), fresh: player('c', 'GK', 80, 100), almost: player('d', 'MID', 80, 99), empty: null };
  const result = recoverBetweenFixtures(lineup, [player('bench', 'MID', 80, 40)]);
  assert.equal(result.titulares.tired.energia, 82);
  assert.equal(result.titulares.regular.energia, 91);
  assert.equal(result.titulares.fresh.energia, 100);
  assert.equal(result.titulares.almost.energia, 99);
  assert.equal(result.titulares.empty, null);
  assert.equal(result.reservas[0].energia, 89);
  assert.equal(lineup.tired.energia, 40);
  assert.deepEqual(recoverBetweenFixtures(lineup, [], 0).titulares, lineup);
  for (let day = 0; day <= 7; day++) {
    const next = recoverBetweenFixtures(lineup, [], day);
    for (const item of Object.values(next.titulares).filter(Boolean)) assert.ok(item.energia >= lineup[Object.keys(lineup).find(key => lineup[key]?.id === item.id)].energia && item.energia <= 100);
  }
});

test('roster supplements reach existing careers once, keep fatigue and do not cross clubs with the same id', () => {
  const club = TODOS_LOS_EQUIPOS.find(item => item.id === 'racing' && item.liga === 'ESP');
  const lineup = { mc1: { ...club.titulares[6], energia: 39 } };
  const reserves = completeSavedRoster(club, lineup, []);
  assert.equal(reserves.length, 1);
  assert.equal(reserves[0].name, 'Íñigo Sainz-Maza');
  assert.deepEqual(completeSavedRoster(club, lineup, reserves), reserves);
  assert.equal(lineup.mc1.energia, 39);
  const arg = TODOS_LOS_EQUIPOS.find(item => item.id === 'racing' && item.liga === 'ARG');
  assert.equal(completeSavedRoster(arg, {}, [])[0].name, 'S. Solari');
});
