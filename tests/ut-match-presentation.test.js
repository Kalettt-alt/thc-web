import test from 'node:test';
import assert from 'node:assert/strict';
import { broadcastKitColors, broadcastScene } from '../src/pages/UltimateTeam/matchPresentationUT.js';

const positions = ['LW','ST','RW','CM','CAM','CM','LB','CB','CB','RB','GK'];
const team = side => ({ nombre: side, titulares: positions.map((pos, index) => ({ id: `${side}-${index}`, nombre: `${side} ${index}`, pos, puesto: pos, grl: 80 })) });
const match = { id: 'shared-fixture', home: team('home'), away: team('away'), events: [{ type: 'kickoff', second: 0, side: 'home' }] };
test('broadcast frames are deterministic for both viewers and ignore future events', () => {
  const future = { ...match, events: [...match.events, { type: 'goal', second: 80, side: 'away', player: 'away 1' }] };
  assert.deepEqual(broadcastScene(future, 23.3), broadcastScene(match, 23.3));
  assert.deepEqual(broadcastScene(match, 23.3), broadcastScene(match, 23.3));
});
test('horizontal pitch has opposing keepers, 22 bounded continuously moving players', () => {
  const first = broadcastScene(match, 23.3);
  const next = broadcastScene(match, 23.31);
  assert.equal(first.players.length, 22);
  assert.ok(first.players.find(player => player.side === 'home' && player.role === 'GK').x < .15);
  assert.ok(first.players.find(player => player.side === 'away' && player.role === 'GK').x > .85);
  assert.ok(first.players.every((player, index) => player.x >= .035 && player.x <= .965 && player.y >= .08 && player.y <= .92 && Math.abs(next.players[index].x - player.x) < .01 && Math.abs(next.players[index].y - player.y) < .01));
  assert.ok(first.players.some((player, index) => player.x !== next.players[index].x));
  assert.ok(Math.abs(first.ball.x - next.ball.x) < .025);
});
test('second half changes goal ends and authoritative goals animate toward that goal', () => {
  const before = broadcastScene(match, 89, 'first');
  const after = broadcastScene(match, 92, 'second');
  assert.ok(before.players.find(player => player.side === 'home' && player.role === 'GK').x < .15);
  assert.ok(after.players.find(player => player.side === 'home' && player.role === 'GK').x > .85);
  const goalMatch = { ...match, events: [{ type: 'goal', side: 'home', second: 130, player: 'home 1' }] };
  const goal = broadcastScene(goalMatch, 130.8, 'second');
  assert.equal(goal.finishing, true);
  assert.ok(goal.ball.x < 0);
});
test('goal celebration remains visible when kickoff shares the authoritative event second', () => {
  const goalMatch = { ...match, events: [{ type: 'goal', side: 'home', second: 8, player: 'home 1' }, { type: 'kickoff', side: 'away', second: 8 }] };
  const goal = broadcastScene(goalMatch, 8.5);
  assert.equal(goal.finishing, true);
  assert.equal(goal.latest.type, 'goal');
});
test('shooter positions use assigned roles without modifying canonical players or scoring', () => {
  const manual = structuredClone(match); manual.home.titulares[0].pos = 'GK'; manual.home.titulares[0].puesto = 'LW';
  const previous = JSON.stringify(manual);
  const scene = broadcastScene(manual, 12.5);
  assert.equal(scene.players[0].role, 'LW');
  assert.equal(JSON.stringify(manual), previous);
  assert.equal(scene.home_goals, undefined);
});
test('kits preserve valid club colours and reject unsafe or unsupported colour values', () => {
  assert.deepEqual(broadcastKitColors({ colores: ['#fc861b','#181c1b'] }), { primary: '#fc861b', secondary: '#181c1b' });
  assert.deepEqual(broadcastKitColors({ c1: 'url(javascript:x)', c2: null }, true), { primary: '#eee8dc', secondary: '#2559a8' });
});

test('nuevos partidos cambian de lado después de60 segundos y construyen hacia adelante', () => {
  const modern = { ...match, simulation_version:3, duration_seconds:120, events:[{type:'pass',side:'home',second:12}] };
  assert.ok(broadcastScene(modern,59,'first').players.find(p=>p.role==='GK'&&p.side==='home').x < .15);
  assert.ok(broadcastScene(modern,61,'second').players.find(p=>p.role==='GK'&&p.side==='home').x > .85);
  const start = broadcastScene(modern,12.05);
  const box = broadcastScene(modern,16.5);
  assert.ok(box.ball.x > start.ball.x + .3);
  assert.equal(box.danger,true);
  assert.equal(box.passingForward,true);
  for (let tick=12; tick<22; tick+=.1) assert.equal(broadcastScene(modern,tick).passingForward,true);
  assert.equal(box.home_goals,undefined);
});
