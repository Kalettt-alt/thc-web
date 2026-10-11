import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMACIONES_XY, MS_PER_VIRTUAL_MINUTE, PITCH_W, PITCH_H, GOAL_Y_TOP, GOAL_Y_BOT } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { createMatchPlayers } from '../src/pages/THCFantasy/matchTactics.js';
import { applyMatchInput, createMatchState, startMatch, stepMatch } from '../src/pages/THCFantasy/matchSimulation.js';
import { applyMatchFormation, getMatchSummary, swapMatchPositions, updateMatchFitness } from '../src/pages/THCFantasy/matchManagement.js';
import { playerControlRadius, playerDecisionDelay, playerMatchSpeed, playerPassKick, playerTackleRadius } from '../src/pages/THCFantasy/matchAttributes.js';
import { kickoffPositions, KICKOFF_SETUP_MS } from '../src/pages/THCFantasy/matchRestarts.js';
import { DEFAULT_MATCH_DISPLAY, MATCH_DISPLAY_KEY, normalizeMatchDisplay, readMatchDisplay, saveMatchDisplay } from '../src/pages/THCFantasy/matchPreferences.js';

const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'DEL', 'DEL', 'DEL'];
const roster = roles.map((pos, i) => ({ id: `career_${i}`, name: `Jugador ${i}`, pos, grl: 78, energia: 100 }));
const starters = Object.fromEntries(Object.keys(FORMACIONES_XY['4-3-3 OFENSIVO']).map((slot, i) => [slot, roster[i]]));
const fixture = () => createMatchState(createMatchPlayers(starters, { titulares: roster }, '4-3-3 OFENSIVO', {}));

test('the preview stays completely still until an explicit start, with no repeated start', () => {
  const state = fixture();
  assert.equal(state.phase, 'READY');
  const before = JSON.stringify(state);
  for (let i = 0; i < 200; i++) stepMatch(state, MS_PER_VIRTUAL_MINUTE, () => 0.5);
  assert.equal(JSON.stringify(state), before);
  assert.equal(applyMatchInput(state, { x: 3000, y: 2000 }), false);
  state.isPaused = true;
  assert.equal(startMatch(state), false);
  state.isPaused = false;
  assert.equal(startMatch(state), true);
  assert.equal(startMatch(state), false);
  stepMatch(state, 20, () => 0.5);
  assert.equal(state.clockMs, 20);
  assert.equal(state.players.length, 22);
  assert.equal(startMatch(createMatchState([])), false);
});

test('a formation and position change in the preview affects the starting eleven without consuming stamina', () => {
  const state = fixture();
  const first = state.players.find(p => p.isUser && p.slot === 'dfc1');
  const second = state.players.find(p => p.isUser && p.slot === 'mc1');
  state.isPaused = true;
  assert.equal(swapMatchPositions(state, 'dfc1', 'mc1').ok, true);
  assert.equal(first.grl, Math.round(78 * 0.85));
  assert.equal(second.grl, Math.round(78 * 0.85));
  applyMatchFormation(state, '3-5-2 POSESIÓN');
  const managed = getMatchSummary(state);
  state.isPaused = false;
  assert.equal(startMatch(state), true);
  assert.equal(state.formation, '3-5-2 POSESIÓN');
  assert.equal(state.players.filter(p => p.isUser).length, 11);
  assert.deepEqual(new Set(state.players.filter(p => p.isUser).map(p => p.sourceId)), new Set(Object.values(managed.lineup).map(p => p.id)));
  assert.ok(state.players.every(p => p.rawStamina === 100));
  assert.equal(state.clockMs, 0);
});

test('both goal directions celebrate then reposition for one second before the conceding team kicks off', () => {
  for (const scoringUser of [true, false]) {
    const state = fixture();
    startMatch(state);
    const scorer = state.players.find(p => p.isUser === scoringUser && p.role === 'ATT');
    state.lastTouchPlayer = { id: scorer.id, sourceId: scorer.sourceId, name: scorer.name, isUser: scorer.isUser };
    state.lastTouchUser = scoringUser;
    for (const p of state.players) { p.x = 5100; p.y = 6100; }
    state.ball = { x: 3000, y: scoringUser ? GOAL_Y_TOP + 10 : GOAL_Y_BOT - 10, vx: 0, vy: scoringUser ? -1000 : 1000, owner: null };
    state.phase = 'BALL_FLIGHT';
    stepMatch(state, 20, () => 0.5);
    assert.equal(state.phase, 'GOAL');
    assert.deepEqual(state.score, scoringUser ? [1, 0] : [0, 1]);
    const time = state.clockMs;
    const fitness = state.players.map(p => p.rawStamina);
    const before = state.players.map(p => ({ x: p.x, y: p.y }));
    stepMatch(state, 1999, () => 0.5);
    assert.equal(state.phase, 'GOAL');
    assert.deepEqual(state.players.map(p => ({ x: p.x, y: p.y })), before);
    stepMatch(state, 1, () => 0.5);
    assert.equal(state.phase, 'KICKOFF_SETUP');
    assert.equal(state.transitionTimer, KICKOFF_SETUP_MS);
    const targets = kickoffPositions(state.players, !scoringUser);
    stepMatch(state, KICKOFF_SETUP_MS / 2, () => { throw new Error('No IA during kickoff setup'); });
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      assert.ok(Math.abs(p.x - (before[i].x + targets[p.id].x) / 2) < 1e-8);
      assert.ok(Math.abs(p.y - (before[i].y + targets[p.id].y) / 2) < 1e-8);
    }
    const paused = JSON.stringify(state);
    state.isPaused = true;
    stepMatch(state, 500, () => 0.5);
    state.isPaused = false;
    assert.equal(JSON.stringify(state), paused);
    stepMatch(state, KICKOFF_SETUP_MS / 2, () => { throw new Error('No IA before restart'); });
    assert.equal(state.phase, 'SIMULATING');
    assert.equal(state.clockMs, time);
    assert.deepEqual(state.players.map(p => p.rawStamina), fitness);
    const carrier = state.players.find(p => p.id === state.ball.owner);
    assert.equal(carrier.isUser, !scoringUser);
    assert.equal(carrier.x, PITCH_W / 2);
    assert.equal(carrier.y, PITCH_H / 2);
    for (const p of state.players.filter(p => p.id !== carrier.id)) {
      assert.ok(p.isUser ? p.y > PITCH_H / 2 : p.y < PITCH_H / 2);
      if (p.isUser === scoringUser) assert.ok(Math.hypot(p.x - PITCH_W / 2, p.y - PITCH_H / 2) >= 650);
    }
  }
});

test('GRL improves pace, effort efficiency, passing precision and response with the same energy and role', () => {
  const low = { grl: 55, rawStamina: 100, x: 3000, y: 6000, moraleBonus: 0, isUser: true, behavior: 'PRESS', sourceId: 'low', name: 'Low' };
  const high = { ...low, grl: 90, sourceId: 'high', name: 'High' };
  const state = { players: [low, high], mentality: 'NORMAL', playerStats: Object.create(null) };
  assert.ok(playerMatchSpeed(high) > playerMatchSpeed(low));
  assert.ok(playerMatchSpeed(high) / playerMatchSpeed(low) < 1.2);
  updateMatchFitness(state, 90 * MS_PER_VIRTUAL_MINUTE);
  assert.ok(high.rawStamina > low.rawStamina);
  assert.ok(high.rawStamina - low.rawStamina < 3);
  const target = { x: 3000, y: 4000 };
  const lowPass = playerPassKick(low, target, 2400, () => 1);
  const highPass = playerPassKick(high, target, 2400, () => 1);
  assert.ok(Math.abs(highPass.target.x - target.x) < Math.abs(lowPass.target.x - target.x));
  assert.ok(highPass.speed > lowPass.speed);
  assert.ok(playerDecisionDelay(high, 1000) < playerDecisionDelay(low, 1000));
  assert.ok(playerControlRadius(high) > playerControlRadius(low));
  assert.ok(playerTackleRadius(high) > playerTackleRadius(low));
  assert.ok(playerMatchSpeed({ ...high, rawStamina: 10 }) < playerMatchSpeed(low));
});

test('display preferences recover from corrupt or unavailable storage and persist only local options', () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  assert.deepEqual(readMatchDisplay(storage), DEFAULT_MATCH_DISPLAY);
  entries.set(MATCH_DISPLAY_KEY, '{invalid');
  assert.deepEqual(readMatchDisplay(storage), DEFAULT_MATCH_DISPLAY);
  assert.deepEqual(normalizeMatchDisplay({ detailedPitch: 'false', showRadar: null }), DEFAULT_MATCH_DISPLAY);
  assert.equal(saveMatchDisplay({ detailedPitch: false, showRadar: true, club_id: 'ignored' }, storage), true);
  assert.deepEqual(readMatchDisplay(storage), { detailedPitch: false, showRadar: true });
  assert.equal(entries.size, 1);
  assert.equal(entries.get(MATCH_DISPLAY_KEY).includes('club_id'), false);
  const unavailable = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Denied'); } };
  assert.deepEqual(readMatchDisplay(unavailable), DEFAULT_MATCH_DISPLAY);
  assert.equal(saveMatchDisplay({ detailedPitch: false }, unavailable), false);
});
