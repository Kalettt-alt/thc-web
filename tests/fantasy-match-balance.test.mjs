import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMACIONES_XY, GOAL_X_MIN, GOAL_Y_TOP, GOAL_Y_BOT, BOUND_RIGHT, HALF_DURATION_MS, MATCH_DURATION_MS, MS_PER_VIRTUAL_MINUTE } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { createMatchPlayers, buildTacticalTargets } from '../src/pages/THCFantasy/matchTactics.js';
import { chooseAiPlay } from '../src/pages/THCFantasy/matchDecisions.js';
import { createMatchState, startMatch, stepMatch, resumeSecondHalf, applyMatchInput } from '../src/pages/THCFantasy/matchSimulation.js';
import { canUseMatchOpportunity, consumeMatchOpportunity, createMatchOpportunities } from '../src/pages/THCFantasy/matchOpportunities.js';
import { detectPostContact, reflectBallVelocity, traceBallBoundary } from '../src/pages/THCFantasy/matchGeometry.js';
import { beginGoalKickSetup } from '../src/pages/THCFantasy/matchRestarts.js';
import { getMatchSummary, restoreMatchEnergy, syncMatchEnergy } from '../src/pages/THCFantasy/matchManagement.js';

const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'DEL', 'DEL', 'DEL'];
const slots = Object.keys(FORMACIONES_XY['4-3-3 OFENSIVO']);
const roster = (grl, energia = 100) => roles.map((pos, i) => ({ id: `p${i}`, name: `P${i}`, pos, grl, energia }));
const squad = (own = 84, rival = 85, energia = 100) => createMatchPlayers(Object.fromEntries(slots.map((slot, i) => [slot, roster(own, energia)[i]])), { titulares: roster(rival) }, '4-3-3 OFENSIVO', {});
const player = (id, isUser, x, y, role = 'MID', grl = 85) => ({ id, sourceId: id, name: id, isUser, x, y, baseX: x, baseY: y, role, isGK: role === 'GK', slot: role === 'GK' ? 'gk' : 'mc1', grl, speed: 820, rawStamina: 100 });
const randomFor = initial => { let seed = initial; return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; };

test('each half is ninety seconds of active play and the break or pause never spends the next half', () => {
  assert.equal(MS_PER_VIRTUAL_MINUTE * 45, 90_000);
  const state = createMatchState([]);
  state.phase = 'SIMULATING';
  stepMatch(state, HALF_DURATION_MS);
  assert.equal(state.phase, 'HALFTIME');
  stepMatch(state, HALF_DURATION_MS * 5);
  assert.equal(state.clockMs, HALF_DURATION_MS);
  resumeSecondHalf(state);
  state.isPaused = true;
  stepMatch(state, HALF_DURATION_MS);
  assert.equal(state.clockMs, HALF_DURATION_MS);
  state.isPaused = false;
  stepMatch(state, HALF_DURATION_MS);
  assert.equal(state.clockMs, MATCH_DURATION_MS);
  assert.equal(state.phase, 'FINISHED');
});

test('one GRL point keeps equal opportunities, ten gives a moderate advantage and every side has a seven-chance ceiling', () => {
  for (const [a, b, limits] of [[84, 85, [5, 5]], [85, 75, [6, 4]], [98, 60, [7, 3]], [60, 98, [3, 7]]]) {
    const budget = createMatchOpportunities(squad(a, b));
    assert.deepEqual([budget.user.limit, budget.rival.limit], limits);
  }
  assert.ok(createMatchOpportunities(squad(85, 85, 15)).user.limit < createMatchOpportunities(squad(85, 85)).user.limit);
});

test('ordinary AI windows stay bounded but the manager can still shoot after the last scheduled chance', () => {
  const shooter = player('shooter', true, 3000, 700, 'ATT', 99);
  const receiver = player('receiver', true, 4100, 2200, 'MID', 99);
  const rival = player('rival', false, 1100, 7000, 'DEF', 55);
  const state = createMatchState([shooter, receiver, rival]);
  for (let chance = 0; chance < 7; chance++) {
    state.clockMs = state.opportunities.user.nextAtMs;
    state.half = state.clockMs >= HALF_DURATION_MS ? 2 : 1;
    Object.assign(shooter, { x: 3000, y: 700 });
    Object.assign(rival, { x: 1100, y: 7000 });
    state.ball = { x: shooter.x, y: shooter.y, owner: shooter.id, vx: 0, vy: 0 };
    state.phase = 'WAITING_USER_INPUT';
    assert.equal(applyMatchInput(state, shooter, { x: 0, y: -1200 }, { isDrag: true }), true);
    assert.equal(state.opportunities.user.used, chance + 1);
    assert.equal(canUseMatchOpportunity(state, true), false);
    for (let frame = 0; frame < 90 && state.phase !== 'GOAL'; frame++) stepMatch(state, 1000 / 60, () => 0.5);
    assert.equal(state.phase, 'GOAL');
  }
  assert.equal(state.score[0], 7);
  state.clockMs = MATCH_DURATION_MS - 100;
  state.phase = 'WAITING_USER_INPUT';
  state.ball.owner = shooter.id;
  assert.equal(applyMatchInput(state, shooter, { x: 0, y: -1200 }, { isDrag: true }), true);
  assert.equal(state.phase, 'BALL_FLIGHT');
  assert.equal(state.ball.owner, null);
  assert.equal(state.opportunities.user.attempts, 8);
  assert.equal(state.opportunities.user.extraAttempts, 1);
  state.phase = 'WAITING_USER_INPUT';
  state.ball.owner = shooter.id;
  assert.equal(applyMatchInput(state, receiver, { x: 0, y: 0 }, { isDrag: false }), true);
  assert.equal(state.ball.targetId, receiver.id);
  assert.equal(state.opportunities.user.used, 7);
});

test('the second chance cannot be rushed by rapid possession changes or by a rebound', () => {
  const state = createMatchState(squad());
  assert.equal(consumeMatchOpportunity(state, true), true);
  const next = state.opportunities.user.nextAtMs;
  for (let i = 0; i < 30; i++) assert.equal(consumeMatchOpportunity(state, true), false);
  state.clockMs = next - 1;
  assert.equal(consumeMatchOpportunity(state, true), false);
  state.clockMs = next;
  assert.equal(consumeMatchOpportunity(state, true), true);
});

test('a fast ball strikes the post before crossing the line, rebounds toward the pitch and never scores through it', () => {
  const state = createMatchState([]);
  state.phase = 'BALL_FLIGHT';
  state.ball = { x: GOAL_X_MIN, y: 650, vx: 0, vy: -4000, owner: null, height: 0 };
  stepMatch(state, 100, () => 0.5);
  assert.deepEqual(state.score, [0, 0]);
  assert.ok(state.ball.vy > 0);
  assert.ok(state.ball.y > GOAL_Y_TOP);
  assert.equal(state.lastEvent.type, 'POST');
  const contact = detectPostContact({ x: GOAL_X_MIN + 45, y: 700 }, { x: GOAL_X_MIN + 45, y: 200 });
  assert.ok(contact);
  const reflected = reflectBallVelocity({ vx: 0, vy: -3000 }, contact.normal);
  assert.ok(reflected.vx > 0);
  assert.ok(Math.hypot(reflected.vx, reflected.vy) < 3000);
});

test('ball height prevents an airborne goal above the crossbar and avoids low post collisions', () => {
  const start = { x: 3000, y: 600, height: 450 };
  const end = { x: 3000, y: 200, height: 450 };
  assert.equal(traceBallBoundary(start, end).type, 'OUT');
  assert.equal(detectPostContact({ ...start, x: GOAL_X_MIN }, { ...end, x: GOAL_X_MIN }), null);
});

test('a player behind an already released ball cannot recover it while the ball moves away', () => {
  const defender = player('defender', false, 3140, 4500, 'DEF');
  const state = createMatchState([defender]);
  Object.assign(defender, { x: 3140, y: 4500 });
  state.phase = 'BALL_FLIGHT';
  state.ball = { x: 3200, y: 4500, vx: 3000, vy: 0, owner: null, height: 0 };
  for (let frame = 0; frame < 10; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.ball.owner, null);
  assert.ok(state.ball.x > 3600);
});

test('passes stop at their destination rather than drifting through goal and bypassing the shot budget', () => {
  const passer = player('passer', true, 3000, 1400);
  const receiver = player('receiver', true, 3000, 700);
  const state = createMatchState([passer, receiver]);
  Object.assign(passer, { x: 3000, y: 1400 });
  Object.assign(receiver, { x: 3000, y: 700 });
  state.phase = 'WAITING_USER_INPUT';
  state.ball = { x: passer.x, y: passer.y, vx: 0, vy: 0, owner: passer.id };
  state.opportunities.user.used = state.opportunities.user.limit;
  assert.equal(applyMatchInput(state, receiver, { x: 0, y: 0 }, { isDrag: false }), true);
  state.players = [];
  for (let frame = 0; frame < 120; frame++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.deepEqual(state.score, [0, 0]);
  assert.ok(state.ball.y >= GOAL_Y_TOP + 90);
  assert.equal(state.ball.vx, 0);
  assert.equal(state.ball.vy, 0);
});

test('a missed shot restarts with the defending keeper instead of sending everybody to midfield', () => {
  const keeper = player('keeper', false, 3000, 600, 'GK');
  const attacker = player('attacker', true, 1400, 1800, 'ATT');
  const state = createMatchState([attacker, keeper]);
  state.phase = 'BALL_FLIGHT';
  state.lastTouchUser = true;
  state.ball = { x: 4200, y: 430, vx: 0, vy: -3000, owner: null, height: 0 };
  stepMatch(state, 30, () => 0.5);
  assert.equal(state.phase, 'GOAL_KICK');
  assert.equal(state.ball.owner, keeper.id);
  assert.equal(state.restartUser, false);
  assert.ok(state.ball.y < 1200);
  const clock = state.clockMs;
  stepMatch(state, 700, () => 0.5);
  assert.equal(state.phase, 'SIMULATING');
  assert.equal(state.clockMs, clock);
});

test('a sideline restart keeps its location and awards the opposite team a throw-in', () => {
  const state = createMatchState([player('a', true, 1200, 5000), player('b', false, 1300, 4000)]);
  state.phase = 'BALL_FLIGHT';
  state.lastTouchUser = true;
  state.ball = { x: BOUND_RIGHT - 10, y: 4500, vx: 2000, vy: 0, owner: null };
  stepMatch(state, 20, () => 0.5);
  assert.equal(state.phase, 'OUT');
  assert.equal(state.restartData.kind, 'THROW_IN');
  assert.equal(state.restartData.carrierId, 'b');
  assert.ok(state.restartData.point.x > 5000);
  assert.equal(state.restartData.point.y, 4500);
});

test('keepers choose a safe short outlet or a genuinely airborne long distribution', () => {
  const keeper = player('keeper', false, 3000, 700, 'GK');
  const defender = player('defender', false, 1700, 1700, 'DEF');
  const midfielder = player('midfielder', false, 3800, 4200);
  const team = [keeper, defender, midfielder];
  assert.equal(chooseAiPlay(team, keeper, { random: () => 0.2 }).style, 'BUILDUP');
  const long = chooseAiPlay(team, keeper, { random: () => 0.9 });
  assert.equal(long.style, 'LONG');
  assert.equal(long.aerial, true);
  const local = team.map(p => ({ ...p, isUser: true, y: GOAL_Y_BOT - (p.y - GOAL_Y_TOP), baseY: GOAL_Y_BOT - (p.y - GOAL_Y_TOP) }));
  const state = createMatchState(local);
  beginGoalKickSetup(state, true);
  stepMatch(state, 700, () => 0.5);
  assert.equal(state.phase, 'WAITING_USER_INPUT');
  assert.equal(applyMatchInput(state, state.ball, { x: 0, y: -2200 }, { isDrag: true }), true);
  assert.equal(state.ball.airborne, true);
  stepMatch(state, 200, () => 0.5);
  assert.ok(state.ball.height > 100);
  assert.equal(state.opportunities.user.used, 0);
});

test('support moves into different open lanes while retaining exactly one defensive chaser', () => {
  const team = squad();
  const owner = team.find(p => p.isUser && p.slot === 'mc1');
  Object.assign(owner, { x: 2500, y: 4400 });
  for (const opponent of team.filter(p => !p.isUser)) opponent.y = 7000;
  const ball = { x: owner.x, y: owner.y, owner: owner.id };
  const early = buildTacticalTargets(team, ball, owner, {}, 'NORMAL', 0);
  const later = buildTacticalTargets(team, ball, owner, {}, 'NORMAL', 4000);
  assert.notEqual(early.targets.loc_ed.x, later.targets.loc_ed.x);
  assert.equal(team.filter(p => early.targets[p.id].behavior === 'PRESS').length, 1);
  assert.ok(team.filter(p => p.isUser && p.role === 'MID' && p !== owner).some(p => early.targets[p.id].y < owner.y));
});

test('a recovery refreshes only the user team, preserves match data and an old receipt applies its actual stored energy', () => {
  const state = createMatchState(squad(84, 85, 20), [{ id: 'bench', energia: 40 }]);
  const rivalEnergy = state.players.filter(p => !p.isUser).map(p => p.rawStamina);
  const ball = structuredClone(state.ball);
  assert.equal(restoreMatchEnergy(state).ok, true);
  assert.ok(state.players.filter(p => p.isUser).every(p => p.rawStamina === 100));
  assert.equal(state.reserves[0].energia, 100);
  assert.deepEqual(state.players.filter(p => !p.isUser).map(p => p.rawStamina), rivalEnergy);
  assert.deepEqual(state.ball, ball);
  const actual = getMatchSummary(state);
  const lineup = Object.fromEntries(Object.entries(actual.lineup).map(([slot, p]) => [slot, { ...p, energia: 73 }]));
  assert.equal(syncMatchEnergy(state, { titulares: lineup, reservas: [{ id: 'bench', energia: 88 }] }).ok, true);
  assert.ok(state.players.filter(p => p.isUser).every(p => p.rawStamina === 73));
  assert.equal(state.reserves[0].energia, 88);
  startMatch(state);
  assert.equal(restoreMatchEnergy(state).ok, false);
});

test('seeded complete matches stay finite, finish at three active minutes and record actual shots beyond scheduled windows', () => {
  let attempts = 0;
  let goals = 0;
  for (const [a, b] of [[84, 85], [85, 75], [95, 70]]) for (const seed of [1, 3, 7, 11]) {
    const state = createMatchState(squad(a, b));
    startMatch(state);
    const random = randomFor(seed);
    for (let frame = 0; frame < 24_000 && !state.finished; frame++) {
      stepMatch(state, 1000 / 30, random);
      if (state.phase === 'HALFTIME') resumeSecondHalf(state);
    }
    assert.equal(state.finished, true);
    assert.equal(state.clockMs, MATCH_DURATION_MS);
    for (const key of ['user', 'rival']) {
      assert.ok(state.opportunities[key].used <= state.opportunities[key].limit);
      const shots = Object.values(state.playerStats).filter(p => p.isUser === (key === 'user')).reduce((sum, p) => sum + p.shots, 0);
      assert.equal(shots, state.opportunities[key].attempts);
      assert.equal(shots, state.opportunities[key].used + state.opportunities[key].extraAttempts);
      attempts += shots;
    }
    assert.ok(state.score.every(value => value < 12));
    goals += state.score[0] + state.score[1];
    assert.ok(state.players.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  }
  assert.ok(attempts > 10);
  assert.ok(goals > 0);
  assert.ok(goals < attempts * 0.65);
});
