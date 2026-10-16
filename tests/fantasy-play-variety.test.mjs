import test from 'node:test';
import assert from 'node:assert/strict';
import { BOUND_LEFT, BOUND_RIGHT, FORMACIONES_XY, GOAL_Y_TOP, GOAL_Y_BOT, PITCH_W, TURN_DURATION_MS } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { buttonShotTarget, chooseAiPlay } from '../src/pages/THCFantasy/matchDecisions.js';
import { playerShotKick } from '../src/pages/THCFantasy/matchAttributes.js';
import { buildTacticalTargets, createMatchPlayers } from '../src/pages/THCFantasy/matchTactics.js';
import { beginFieldRestart, CORNER_ROUTINES, FIELD_RESTART_SETUP_MS } from '../src/pages/THCFantasy/matchRestarts.js';
import { applyMatchInput, createMatchState, stepMatch } from '../src/pages/THCFantasy/matchSimulation.js';

const p = (id, isUser, x, y, role = 'MID', grl = 78) => ({ id, sourceId: id, name: id, isUser, isGK: role === 'GK', role, slot: role === 'GK' ? 'gk' : 'mc1', grl, rawStamina: 100, speed: 800, x, y, baseX: x, baseY: y });
const holding = team => {
  const state = createMatchState(team);
  for (const player of team) Object.assign(player, { x: player.baseX, y: player.baseY });
  state.phase = 'WAITING_USER_INPUT';
  state.ball = { x: team[0].x, y: team[0].y, owner: team[0].id, vx: 0, vy: 0 };
  return state;
};
const squad = () => {
  const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'DEL', 'DEL', 'DEL'];
  const roster = roles.map((pos, i) => ({ id: `p${i}`, name: `P${i}`, pos, grl: 78, energia: 100 }));
  return createMatchPlayers(Object.fromEntries(Object.keys(FORMACIONES_XY['4-3-3 OFENSIVO']).map((slot, i) => [slot, roster[i]])), { titulares: roster }, '4-3-3 OFENSIVO', {});
};

test('running out of decision time brings the nearest rival in and transfers possession, without a pass or a teleport', () => {
  const owner = p('carrier', true, 3000, 4500);
  const closest = p('closest', false, 3500, 4800, 'DEF');
  const farther = p('farther', false, 4200, 5000, 'DEF');
  const state = holding([owner, closest, farther, p('support', true, 2000, 5000)]);
  const start = { x: closest.x, y: closest.y };
  const ids = state.players.map(player => player.id);
  stepMatch(state, 100, () => 0.5);
  assert.equal(state.phase, 'WAITING_USER_INPUT');
  assert.equal(state.ball.owner, owner.id);
  assert.ok(Math.hypot(closest.x - start.x, closest.y - start.y) <= closest.speed * 0.1);
  assert.ok(Math.hypot(closest.x - owner.x, closest.y - owner.y) < Math.hypot(start.x - owner.x, start.y - owner.y));
  for (let i = 0; i < TURN_DURATION_MS / 20 && state.phase === 'WAITING_USER_INPUT'; i++) stepMatch(state, 20, () => 0.5);
  assert.equal(state.phase, 'TURNOVER_PRESS');
  assert.equal(state.turnover.presserId, closest.id);
  assert.equal(applyMatchInput(state, { x: 3000, y: 700 }), false);
  for (let i = 0; i < 150 && state.phase === 'TURNOVER_PRESS'; i++) stepMatch(state, 20, () => 0.5);
  assert.equal(state.phase, 'SIMULATING');
  assert.equal(state.ball.owner, closest.id);
  assert.equal(state.lastEvent.reason, 'TIMEOUT');
  assert.equal(state.lastEvent.type, 'RECOVERY');
  assert.equal(state.playerStats['rival:closest'].recoveries, 1);
  assert.ok(Object.values(state.playerStats).every(player => player.passesAttempted === 0 && player.shots === 0));
  assert.deepEqual(state.players.map(player => player.id), ids);
});

test('a manual shot is accepted from long range with exhausted windows, including a deliberate keeper shot', () => {
  for (const role of ['ATT', 'GK']) {
    const state = holding([p('shooter', true, 2500, 7000, role, 55), p('rival', false, 4800, 1500, 'DEF')]);
    state.opportunities.user.used = state.opportunities.user.limit;
    assert.equal(applyMatchInput(state, { x: 3000, y: GOAL_Y_TOP }, { x: 500, y: GOAL_Y_TOP - 7000 }, { shot: true, isDrag: true, random: () => 0.8 }), true);
    assert.equal(state.phase, 'BALL_FLIGHT');
    assert.equal(state.ball.shotTeam, true);
    assert.ok(state.ball.vy < 0);
    assert.equal(state.ball.airborne, false);
    assert.equal(state.playerStats['user:shooter'].shots, 1);
    assert.equal(state.opportunities.user.extraAttempts, 1);
    assert.doesNotMatch(state.msg, /BUSCA EL PASE/);
  }
});

test('shot dispersion grows with distance, poor angles, fatigue and lower GRL under the same random roll', () => {
  const target = { x: 3000, y: GOAL_Y_TOP };
  const good = p('good', true, 3000, 1100, 'ATT', 90);
  const error = player => Math.abs(playerShotKick(player, target, 2600, () => 0.9, { controlled: true }).target.x - target.x);
  assert.ok(error({ ...good, y: 7000 }) > error(good) * 3);
  assert.ok(error({ ...good, x: 1100 }) > error(good) * 2);
  assert.ok(error({ ...good, rawStamina: 15 }) > error(good));
  assert.ok(error({ ...good, grl: 55 }) > error(good));
});

test('the shoot button targets the open side of the goal instead of always kicking straight into its keeper', () => {
  const owner = p('owner', true, 3000, 1200, 'ATT');
  for (const x of [2700, 3300]) {
    const keeper = p('keeper', false, x, 500, 'GK');
    const aim = buttonShotTarget([owner, keeper], owner);
    assert.ok(aim.x > 2500 && aim.x < 3500);
    assert.ok((aim.x - 3000) * (keeper.x - 3000) < 0);
    assert.ok(aim.y < GOAL_Y_TOP);
  }
});

test('both AI teams finish an exposed goal instead of choosing an available backwards pass or wall', () => {
  for (const isUser of [true, false]) for (const mentality of ['NORMAL', 'OFENSIVA', 'DEFENSIVA']) {
    const owner = p('striker', isUser, 3100, isUser ? 1250 : 7750, 'ATT');
    const back = p('back', isUser, 3100, owner.y + (isUser ? 1000 : -1000));
    const rival = p('rival', !isUser, 5200, 4500, 'DEF');
    const decision = chooseAiPlay([owner, back, rival], owner, { random: () => 0.99, mentality, canShoot: false, returnToId: back.id });
    assert.equal(decision.type, 'SHOT');
    assert.equal(decision.style, 'OPEN_FINISH');
    assert.equal(decision.freelyChosen, true);
  }
});

test('an open route outside shooting distance advances the carrier rather than passing backwards', () => {
  for (const isUser of [true, false]) {
    const owner = p('runner', isUser, 3000, 4500, 'MID');
    const back = p('back', isUser, 3200, isUser ? 5600 : 3400, 'DEF');
    const decision = chooseAiPlay([owner, back], owner, { random: () => 0.5, canShoot: false });
    assert.equal(decision.type, 'DRIBBLE');
    assert.ok((decision.target.y - owner.y) * (isUser ? -1 : 1) > 0);
  }
});

test('a closed center sends the ball to a free wing and makes midfield support drop into an outlet', () => {
  const owner = p('owner', true, 3000, 5000);
  const wing = { ...p('wing', true, 1200, 4200, 'ATT'), slot: 'ei' };
  const pivot = { ...p('pivot', true, 2900, 5600), slot: 'mcd' };
  const opposite = { ...p('opposite', true, 4400, 4600), slot: 'md' };
  const team = [owner, wing, pivot, opposite, p('block1', false, 2750, 4000), p('block2', false, 3300, 3500)];
  const decision = chooseAiPlay(team, owner, { random: () => 0.5, canShoot: false });
  assert.equal(decision.type, 'PASS');
  assert.equal(decision.style, 'WIDE');
  assert.ok(Math.abs(decision.target.x - PITCH_W / 2) > 1000);
  const shape = buildTacticalTargets(team, { ...owner, owner: owner.id }, owner);
  assert.ok(shape.targets.pivot.y > owner.y + 800);
  assert.ok(shape.targets.opposite.x > opposite.baseX);
  assert.equal(team.filter(player => shape.targets[player.id].behavior === 'PRESS').length, 1);
});

test('a counterattack picks a vertical runner; attacking fullbacks overlap while center backs protect the transition', () => {
  const team = squad();
  const owner = team.find(player => player.id === 'loc_mc1');
  Object.assign(owner, { x: 2800, y: 5200 });
  const runner = team.find(player => player.id === 'loc_dc');
  Object.assign(runner, { x: 3700, y: 3000 });
  for (const opponent of team.filter(player => !player.isUser)) Object.assign(opponent, { x: 5200, y: 6700 });
  const decision = chooseAiPlay(team, owner, { random: () => 0.5, counter: true });
  assert.equal(decision.type, 'PASS');
  assert.equal(decision.style, 'COUNTER');
  assert.ok(decision.target.y < owner.y - 180);
  const shape = buildTacticalTargets(team, { ...owner, owner: owner.id }, owner, {}, 'NORMAL', 0, { counter: true });
  assert.ok(shape.targets.loc_li.y < owner.y);
  assert.ok(shape.targets.loc_ld.y < owner.y);
  assert.ok(shape.targets.loc_dfc1.y > owner.y + 900);
  assert.ok(shape.targets.loc_dfc2.y > owner.y + 900);
});

test('the byline offers a central cutback or a distinct airborne cross instead of a retreat to midfield', () => {
  const owner = p('winger', true, 1000, 1050, 'ATT');
  const finisher = p('finisher', true, 2900, 1500, 'ATT');
  const deep = p('deep', true, 3000, 4400);
  const team = [owner, finisher, deep];
  const cutback = chooseAiPlay(team, owner, { random: () => 0.1 });
  const cross = chooseAiPlay(team, owner, { random: () => 0.9 });
  assert.equal(cutback.style, 'CUTBACK');
  assert.equal(cutback.target.id, finisher.id);
  assert.equal(cross.style, 'CROSS');
  assert.equal(cross.aerial, true);
  assert.equal(cross.target.id, finisher.id);
});

test('all four corner routines line up at the actual corner with moving attackers, markers and the keeper', () => {
  for (const [index, routine] of CORNER_ROUTINES.entries()) {
    const state = createMatchState(squad());
    state.lastTouchUser = false;
    const bases = state.players.map(player => [player.baseX, player.baseY]);
    assert.equal(beginFieldRestart(state, { x: 4300, y: GOAL_Y_TOP, edge: 'TOP' }, () => (index + 0.1) / CORNER_ROUTINES.length), true);
    assert.equal(state.restartData.routine, routine);
    assert.equal(state.restartData.point.x, BOUND_RIGHT - 90);
    assert.equal(state.restartData.point.y, GOAL_Y_TOP + 90);
    const before = state.players.map(player => ({ x: player.x, y: player.y }));
    stepMatch(state, FIELD_RESTART_SETUP_MS / 2, () => 0.5);
    assert.equal(state.phase, 'OUT');
    assert.ok(state.players.some((player, i) => Math.hypot(player.x - before[i].x, player.y - before[i].y) > 100));
    assert.notDeepEqual(state.players.map(player => ({ x: player.x, y: player.y })), Object.values(state.restartData.targets));
    stepMatch(state, FIELD_RESTART_SETUP_MS / 2, () => 0.5);
    assert.equal(state.phase, 'WAITING_USER_INPUT');
    assert.equal(state.setPiece.kind, 'CORNER');
    assert.equal(state.setPiece.routine, routine);
    const taker = state.players.find(player => player.id === state.ball.owner);
    const receiver = state.players.find(player => player.id === state.setPiece.receiverId);
    const decision = chooseAiPlay(state.players, taker, { restart: state.setPiece, random: () => 0.5 });
    assert.equal(decision.style, `CORNER_${routine}`);
    assert.equal(decision.target.id, receiver.id);
    assert.equal(decision.aerial, routine !== 'SHORT');
    assert.ok(state.players.every(player => player.x >= BOUND_LEFT && player.x <= BOUND_RIGHT));
    assert.deepEqual(state.players.map(player => [player.baseX, player.baseY]), bases);
    assert.equal(state.clockMs, 0);
    assert.equal(applyMatchInput(state, receiver, { x: 0, y: 0 }, { isDrag: false }), true);
    assert.equal(state.ball.targetId, receiver.id);
    assert.equal(state.ball.airborne, routine !== 'SHORT');
  }
});

test('a rival corner mirrors the end line, avoids repeating the previous routine and actually delivers into the area', () => {
  const state = createMatchState(squad());
  state.lastTouchUser = true;
  state.lastCornerRoutine = 'NEAR_POST';
  beginFieldRestart(state, { x: 1700, y: GOAL_Y_BOT, edge: 'BOTTOM' }, () => 0);
  assert.equal(state.restartData.routine, 'FAR_POST');
  assert.equal(state.restartData.point.x, BOUND_LEFT + 90);
  assert.equal(state.restartData.point.y, GOAL_Y_BOT - 90);
  stepMatch(state, FIELD_RESTART_SETUP_MS, () => 0.5);
  assert.equal(state.phase, 'SIMULATING');
  for (let i = 0; i < 50 && state.phase !== 'BALL_FLIGHT'; i++) stepMatch(state, 20, () => 0.5);
  assert.equal(state.phase, 'BALL_FLIGHT');
  assert.equal(state.ball.aerialDelivery, true);
  assert.equal(state.lastEvent.playStyle, 'CORNER_FAR_POST');
  assert.equal(state.players.length, 22);
});

test('a strong shot can be parried out for a corner, preserving who last touched it', () => {
  const attacker = p('attacker', true, 1100, 7500, 'ATT');
  const keeper = p('keeper', false, 3000, 600, 'GK');
  const state = holding([attacker, keeper]);
  state.phase = 'BALL_FLIGHT';
  state.lastTouchUser = true;
  state.lastTouchId = attacker.id;
  state.ball = { x: 3000, y: 700, vx: 0, vy: -2600, owner: null, height: 0, shotTeam: true };
  for (let i = 0; i < 20 && !state.ball.deflected; i++) stepMatch(state, 20, () => 0);
  assert.equal(state.lastEvent.type, 'SAVE');
  assert.equal(state.lastEvent.deflected, true);
  assert.equal(state.lastTouchUser, false);
  assert.equal(state.ball.owner, null);
  for (let i = 0; i < 300 && state.phase === 'BALL_FLIGHT'; i++) stepMatch(state, 20, () => 0.5);
  assert.equal(state.phase, 'OUT');
  assert.equal(state.restartData.kind, 'CORNER');
  assert.equal(state.restartUser, true);
  assert.deepEqual(state.score, [0, 0]);
  assert.equal(state.playerStats['rival:keeper'].saves, 1);
});
