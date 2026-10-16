import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMACIONES_XY, MS_PER_VIRTUAL_MINUTE } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { createMatchPlayers, buildTacticalTargets } from '../src/pages/THCFantasy/matchTactics.js';
import { chooseAiPlay } from '../src/pages/THCFantasy/matchDecisions.js';
import { createMatchState, applyMatchInput, stepMatch } from '../src/pages/THCFantasy/matchSimulation.js';
import { applyMatchFormation, getMatchSummary, getPlayerStats, recordStat, setMatchMentality, substituteMatchPlayer, swapMatchPositions, updateMatchFitness } from '../src/pages/THCFantasy/matchManagement.js';
import { TEAM_TALK_PHRASES, getTeamTalkOptions, applyMatchTeamTalk } from '../src/pages/THCFantasy/teamTalks.js';

const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'DEL', 'DEL', 'DEL'];
const starters = Object.fromEntries(Object.keys(FORMACIONES_XY['4-3-3 OFENSIVO']).map((slot, i) => [slot, { id: `first_${i}`, name: `Titular ${i}`, pos: roles[i], grl: 78, energia: i === 6 ? 30 : 100 }]));
const bench = Array.from({ length: 6 }, (_, i) => ({ id: `bench_${i}`, name: `Reserva ${i}`, pos: i === 0 ? 'GK' : i < 3 ? 'DEF' : i === 3 ? 'MID' : 'DEL', grl: 75, energia: 95 }));
const stateFixture = () => createMatchState(createMatchPlayers(starters, { titulares: [] }, '4-3-3 OFENSIVO', {}), bench);

test('four random talk options offer distinct tones from the fifty-message repertoire', () => {
  for (const random of [() => 0, () => 0.999999, Math.random]) {
    const options = getTeamTalkOptions(random);
    assert.equal(new Set(options.map(phrase => phrase.tone)).size, 4);
    assert.ok(options.every(phrase => TEAM_TALK_PHRASES.includes(phrase)));
  }
});

test('a keyboard drive with zero selection radius does not turn into a nearby pass', () => {
  const state = stateFixture();
  const owner = state.players.find(player => player.slot === 'mc1');
  const teammate = state.players.find(player => player.slot === 'mc2');
  Object.assign(owner, { x: 3000, y: 4500 });
  Object.assign(teammate, { x: 3040, y: 3900 });
  state.ball = { x: owner.x, y: owner.y, owner: owner.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  assert.equal(applyMatchInput(state, { x: 3000, y: 3850 }, { x: 0, y: 0 }, { pickRadius: 0 }), true);
  assert.equal(state.phase, 'USER_DRIVING');
  assert.deepEqual(owner.target, { x: 3000, y: 3850 });
});

test('coach changes require pause and mentalities change support without adding chasers', () => {
  const state = stateFixture();
  assert.equal(setMatchMentality(state, 'OFENSIVA').ok, false);
  state.isPaused = true;
  assert.equal(setMatchMentality(state, 'INVALID').ok, false);
  assert.equal(setMatchMentality(state, 'OFENSIVA').ok, true);
  const owner = state.players.find(p => p.slot === 'mc1');
  owner.x = 3000; owner.y = 4500;
  const ball = { x: owner.x, y: owner.y };
  const attack = buildTacticalTargets(state.players, ball, owner, {}, 'OFENSIVA');
  const defense = buildTacticalTargets(state.players, ball, owner, {}, 'DEFENSIVA');
  const forward = state.players.find(p => p.slot === 'dc');
  assert.ok(attack.targets[forward.id].y < defense.targets[forward.id].y);
});

test('substitution keeps eleven, preserves outgoing stats and refuses reentry or a sixth change', () => {
  const state = stateFixture();
  const original = state.players.find(p => p.slot === 'mc1');
  recordStat(state, original, 'passesCompleted', 3);
  assert.equal(substituteMatchPlayer(state, 'mc1', 'bench_3').ok, false);
  state.isPaused = true;
  assert.equal(substituteMatchPlayer(state, 'mc1', 'bench_3').ok, true);
  const incoming = state.players.find(p => p.slot === 'mc1');
  assert.equal(incoming.sourceId, 'bench_3');
  assert.equal(incoming.rawStamina, 95);
  assert.equal(state.players.length, 11);
  assert.equal(getPlayerStats(state, original).passesCompleted, 3);
  assert.equal(substituteMatchPlayer(state, 'mc1', original.sourceId).ok, false);
  for (const reserve of ['bench_0', 'bench_1', 'bench_2', 'bench_4']) assert.equal(substituteMatchPlayer(state, 'mc1', reserve).ok, true);
  assert.equal(state.substitutionsUsed, 5);
  assert.equal(substituteMatchPlayer(state, 'mc1', 'bench_5').ok, false);
  const summary = getMatchSummary(state);
  assert.equal(summary.lineup.mc1.id, 'bench_4');
  assert.ok(summary.reservas.some(p => p.id === original.sourceId));
  assert.equal(summary.playerStats[`user:${original.sourceId}`].passesCompleted, 3);
});

test('formation and position changes preserve substitutes, possession, energy, moral and stats', () => {
  const state = stateFixture();
  state.isPaused = true;
  substituteMatchPlayer(state, 'mc1', 'bench_3');
  const player = state.players.find(p => p.sourceId === 'bench_3');
  player.rawStamina = 63.5; player.moraleBonus = 0.02;
  recordStat(state, player, 'recoveries', 2);
  state.ball.owner = player.id;
  const position = { x: player.x, y: player.y };
  assert.equal(swapMatchPositions(state, 'mc1', 'dc').ok, true);
  applyMatchFormation(state, '3-5-2 POSESIÓN');
  const retained = state.players.find(p => p.sourceId === 'bench_3');
  assert.equal(retained.id, state.ball.owner);
  assert.equal(retained.rawStamina, 63.5);
  assert.equal(retained.moraleBonus, 0.02);
  assert.deepEqual({ x: retained.x, y: retained.y }, position);
  assert.equal(getPlayerStats(state, retained).recoveries, 2);
  assert.equal(state.players.length, 11);
  assert.equal(new Set(state.players.map(p => p.sourceId)).size, 11);
});

test('fifty phrases provide four distinct choices with injected randomness', () => {
  assert.equal(TEAM_TALK_PHRASES.length, 50);
  assert.equal(new Set(TEAM_TALK_PHRASES.map(p => p.id)).size, 50);
  const options = getTeamTalkOptions(() => 0.25);
  assert.equal(options.length, 4);
  assert.equal(new Set(options.map(p => p.id)).size, 4);
  assert.deepEqual(options, getTeamTalkOptions(() => 0.25));
});

test('talks are halftime-only with valid recipients, four-message limit and stamina-dependent moderate effects', () => {
  const state = stateFixture();
  const phraseId = TEAM_TALK_PHRASES[0].id;
  assert.equal(applyMatchTeamTalk(state, { phraseId, targetType: 'TEAM' }).ok, false);
  state.phase = 'HALFTIME';
  assert.equal(applyMatchTeamTalk(state, { phraseId, targetType: 'POSITION', targetId: 'INVALID' }).ok, false);
  assert.equal(state.teamTalkCount, 0);
  assert.equal(applyMatchTeamTalk(state, { phraseId, targetType: 'TEAM' }).ok, true);
  const fresh = state.players.find(p => p.slot === 'mc1');
  const tired = state.players.find(p => p.slot === 'mco');
  assert.ok(fresh.moraleBonus > tired.moraleBonus);
  assert.equal(tired.rawStamina, 30);
  for (const targetType of ['POSITION', 'PLAYER', 'TEAM']) assert.equal(applyMatchTeamTalk(state, { phraseId, targetType, targetId: targetType === 'POSITION' ? 'MID' : fresh.sourceId }).ok, true);
  assert.equal(applyMatchTeamTalk(state, { phraseId, targetType: 'TEAM' }).ok, false);
  assert.equal(state.teamTalkCount, 4);
  assert.ok(state.players.every(p => p.moraleBonus <= 0.045));
});

test('fitness changes only match copies and elapsed playing time, with tired players slower', () => {
  const before = JSON.stringify({ starters, bench });
  const state = stateFixture();
  const fresh = state.players.find(p => p.slot === 'mc1');
  const tired = state.players.find(p => p.slot === 'mco');
  assert.ok(tired.speed < fresh.speed);
  for (let minute = 0; minute < 90; minute++) updateMatchFitness(state, MS_PER_VIRTUAL_MINUTE);
  assert.ok(fresh.rawStamina >= 70 && fresh.rawStamina < 100);
  assert.ok(tired.rawStamina >= 0 && tired.rawStamina < 30);
  assert.equal(getPlayerStats(state, fresh).minutes, 90);
  assert.equal(JSON.stringify({ starters, bench }), before);
  state.isPaused = true;
  const energy = fresh.rawStamina;
  stepMatch(state, 4000, () => 0.5);
  assert.equal(fresh.rawStamina, energy);
});

test('AI can recycle to support, switch wings, attempt a wall or carry instead of forcing a forward', () => {
  const player = (id, x, y, isUser = true) => ({ id, x, y, isUser, isGK: false, role: 'MID' });
  const owner = player('owner', 3000, 4500);
  const back = player('back', 3000, 5600);
  const recycle = chooseAiPlay([owner, back, player('press', 3050, 4400, false)], owner, { pressure: 200, random: () => 0.2 });
  assert.equal(recycle.type, 'PASS');
  assert.equal(recycle.style, 'RECYCLE');
  const wide = player('wide', 1000, 3500);
  const opposite = player('opposite', 4500, 3000);
  const switched = chooseAiPlay([wide, opposite, player('block1', 1100, 2500, false), player('block2', 1400, 3000, false)], wide, { pressure: 800, random: () => 0.9 });
  assert.equal(switched.style, 'SWITCH');
  assert.equal(switched.target.id, opposite.id);
  const support = player('support', 4100, 4700);
  const wall = chooseAiPlay([owner, support], owner, { pressure: 700, returnToId: support.id, random: () => 0.2 });
  assert.equal(wall.style, 'WALL');
  assert.equal(wall.target.id, support.id);
  const carry = chooseAiPlay([owner, back], owner, { pressure: 1000, random: () => 0.3 });
  assert.equal(carry.type, 'DRIBBLE');
});

test('passes attempts and completions are counted once with a structured event', () => {
  const state = stateFixture();
  const passer = state.players.find(p => p.slot === 'mc1');
  const receiver = state.players.find(p => p.slot === 'mc2');
  passer.x = 1800; passer.y = 5000; receiver.x = 3800; receiver.y = 4400;
  for (const p of state.players) if (p !== passer && p !== receiver) { p.x = p.baseX; p.y = p.baseY; }
  state.ball = { x: passer.x, y: passer.y, owner: passer.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  applyMatchInput(state, receiver, { x: 0, y: 0 }, { isDrag: false });
  assert.equal(getPlayerStats(state, passer).passesAttempted, 1);
  for (let frame = 0; frame < 180 && !state.ball.owner; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(getPlayerStats(state, passer).passesCompleted, 1);
  assert.ok(state.lastEvent.id > 0);
  assert.equal(state.lastEvent.team, 'USER');
});

test('a substitution during a paused celebration preserves the goal and scorer event', () => {
  const state = stateFixture();
  const scorer = state.players.find(player => player.slot === 'dc');
  scorer.x = 3000; scorer.y = 700;
  state.ball = { x: scorer.x, y: scorer.y, owner: scorer.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  applyMatchInput(state, scorer, { x: 100, y: -900 }, { isDrag: true });
  for (let frame = 0; frame < 120 && state.phase !== 'GOAL'; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.phase, 'GOAL');
  const originalGoal = structuredClone(state.goalEvent);
  assert.equal(originalGoal.playerName, scorer.name);
  assert.equal(originalGoal.scoringTeam, 'USER');
  assert.deepEqual(originalGoal.score, [1, 0]);
  state.isPaused = true;
  assert.equal(substituteMatchPlayer(state, 'dc', 'bench_4').ok, true);
  assert.equal(state.lastEvent.type, 'SUBSTITUTION');
  assert.deepEqual(state.goalEvent, originalGoal);
  assert.equal(state.phase, 'GOAL');
});

test('a scorer substituted while the shot is flying retains the goal attribution', () => {
  const state = stateFixture();
  const scorer = state.players.find(player => player.slot === 'dc');
  scorer.x = 3000; scorer.y = 700;
  state.ball = { x: scorer.x, y: scorer.y, owner: scorer.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  applyMatchInput(state, scorer, { x: 100, y: -900 }, { isDrag: true });
  assert.equal(state.phase, 'BALL_FLIGHT');
  state.isPaused = true;
  assert.equal(substituteMatchPlayer(state, 'dc', 'bench_4').ok, true);
  state.isPaused = false;
  for (let frame = 0; frame < 120 && state.phase !== 'GOAL'; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.phase, 'GOAL');
  assert.equal(state.goalEvent.playerName, scorer.name);
  assert.equal(state.tracker[scorer.sourceId].g, 1);
  assert.equal(state.playerStats[`user:${scorer.sourceId}`].goals, 1);
  assert.equal(state.tracker.bench_4, undefined);
  assert.equal(state.playerStats['user:bench_4'].goals, 0);
});

test('a pass completed after the passer is substituted counts against the original player', () => {
  const state = stateFixture();
  const passer = state.players.find(player => player.slot === 'mc1');
  const receiver = state.players.find(player => player.slot === 'mc2');
  for (const player of state.players) { player.x = 5000; player.y = 7800; }
  passer.x = 1800; passer.y = 5000; receiver.x = 3800; receiver.y = 4400;
  state.ball = { x: passer.x, y: passer.y, owner: passer.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  applyMatchInput(state, receiver, { x: 0, y: 0 }, { isDrag: false });
  state.isPaused = true;
  assert.equal(substituteMatchPlayer(state, 'mc1', 'bench_3').ok, true);
  state.isPaused = false;
  for (let frame = 0; frame < 180 && !state.ball.owner; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.ball.owner, receiver.id);
  assert.equal(state.playerStats[`user:${passer.sourceId}`].passesCompleted, 1);
  assert.equal(state.playerStats[`user:${passer.sourceId}`].passesAttempted, 1);
  assert.equal(state.playerStats['user:bench_3'].passesCompleted, 0);
});
