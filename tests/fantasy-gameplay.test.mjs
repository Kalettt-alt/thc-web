import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMACIONES_XY, PITCH_W, PITCH_H, BOUND_LEFT, BOUND_RIGHT, BOUND_TOP, BOUND_BOT, GOAL_X_MIN, GOAL_Y_TOP, MS_PER_VIRTUAL_MINUTE, TURN_DURATION_MS } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { clampMatchCamera, detectBallOutcome, getMatchViewport, screenToPitch } from '../src/pages/THCFantasy/matchGeometry.js';
import { buildTacticalTargets, createMatchPlayers, maintainSpacing, moveToward } from '../src/pages/THCFantasy/matchTactics.js';
import { applyMatchInput, createMatchState, resumeSecondHalf, setMatchAiming, startMatch, stepMatch } from '../src/pages/THCFantasy/matchSimulation.js';

const roles = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'DEL', 'DEL', 'DEL'];
const roster = roles.map((pos, index) => ({ id: `player_${index}`, name: `Jugador ${index}`, pos, grl: 75, energia: 100 }));
const slots = Object.keys(FORMACIONES_XY['4-3-3 OFENSIVO']);
const starters = Object.fromEntries(slots.map((slot, index) => [slot, roster[index]]));
const players = () => createMatchPlayers(starters, { name: 'Rival', titulares: roster }, '4-3-3 OFENSIVO', { name: 'Club' });
const player = (id, isUser, x, y, role = 'MID') => ({ id, isUser, isGK: role === 'GK', x, y, baseX: x, baseY: y, speed: 700, grl: 75, name: id, role, slot: role === 'GK' ? 'gk' : 'mc1' });
const possession = team => {
  const state = createMatchState(team);
  for (const teammate of team) { teammate.x = teammate.baseX; teammate.y = teammate.baseY; }
  const owner = team[0];
  state.ball = { x: owner.x, y: owner.y, owner: owner.id, vx: 0, vy: 0 };
  state.phase = 'WAITING_USER_INPUT';
  state.turnTimer = TURN_DURATION_MS;
  return state;
};
const seededRandom = seed => () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };

test('both teams keep keeper, defender and forward roles after mirroring', () => {
  const squad = players();
  assert.equal(squad.length, 22);
  assert.equal(squad.find(p => p.id === 'vis_1').role, 'DEF');
  assert.equal(squad.find(p => !p.isUser && p.slot === 'dc').role, 'ATT');
  assert.ok(squad.find(p => p.id === 'vis_0').y < PITCH_H / 2);
  assert.ok(squad.find(p => p.id === 'loc_gk').y > PITCH_H / 2);
  for (const formation of Object.keys(FORMACIONES_XY)) {
    const changed = createMatchPlayers(starters, { titulares: roster }, formation, {});
    assert.equal(changed.filter(p => p.isUser).length, 11);
    assert.equal(new Set(changed.map(p => p.id)).size, 22);
  }
});

test('one outfield player presses per team while the rest protect lanes', () => {
  const squad = players();
  const { targets } = buildTacticalTargets(squad, { x: 2800, y: 4100, vx: 900, vy: -300 }, null);
  for (const isUser of [true, false]) {
    assert.equal(squad.filter(p => p.isUser === isUser && targets[p.id].behavior === 'PRESS').length, 1);
    assert.equal(squad.filter(p => p.isUser === isUser && targets[p.id].behavior === 'KEEPER').length, 1);
  }
});

test('match players preserve career stamina and apply the existing position penalty', () => {
  const tired = Object.fromEntries(Object.entries(starters).map(([slot, p]) => [slot, { ...p, energia: slot === 'mc1' ? 25 : 100 }]));
  tired.li.pos = 'DEL';
  const before = JSON.stringify(tired);
  const squad = createMatchPlayers(tired, { titulares: roster }, '4-3-3 OFENSIVO', {});
  const fresh = players();
  assert.equal(squad.find(p => p.id === 'loc_mc1').rawStamina, 25);
  assert.ok(squad.find(p => p.id === 'loc_mc1').speed < fresh.find(p => p.id === 'loc_mc1').speed);
  assert.equal(squad.find(p => p.id === 'loc_li').grl, Math.round(tired.li.grl * 0.85));
  const state = createMatchState(squad);
  startMatch(state);
  for (let i = 0; i < 120; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(JSON.stringify(tired), before);
});

test('attacking support keeps width and a defensive line behind the carrier', () => {
  const squad = players();
  const owner = squad.find(p => p.id === 'loc_dc');
  owner.x = 3000; owner.y = 2200;
  const { targets } = buildTacticalTargets(squad, { x: owner.x, y: owner.y, owner: owner.id }, owner);
  assert.equal(squad.filter(p => !p.isUser && targets[p.id].behavior === 'PRESS').length, 1);
  for (const defender of squad.filter(p => p.isUser && p.role === 'DEF')) assert.ok(targets[defender.id].y > owner.y + 500);
  assert.ok(targets.loc_ei.x < owner.x - 300);
  assert.ok(targets.loc_ed.x > owner.x + 300);
});

test('spacing recovers coincident teammates without NaN or moving the carrier', () => {
  const squad = [player('a', true, 3000, 4500), player('b', true, 3000, 4500)];
  maintainSpacing(squad, 'a');
  assert.equal(squad[0].x, 3000);
  assert.ok(Math.hypot(squad[1].x - squad[0].x, squad[1].y - squad[0].y) > 0);
  assert.ok(squad.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
});

test('movement covers the same distance at 30fps and 60fps', () => {
  const a = player('a', true, 2000, 5000);
  const b = { ...a };
  for (let i = 0; i < 60; i++) moveToward(a, { x: 4000, y: 2000 }, 1 / 60);
  for (let i = 0; i < 30; i++) moveToward(b, { x: 4000, y: 2000 }, 1 / 30);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-7);
});

test('pointer mapping stays exact in portrait, landscape and desktop views', () => {
  for (const [width, height] of [[320, 500], [390, 720], [844, 270], [1366, 650]]) {
    const viewport = getMatchViewport(width, height);
    const camera = clampMatchCamera({ x: 99999, y: -99999 }, viewport);
    const rect = { left: 37 + width / 2 - camera.x * viewport.zoom, top: 91 + height / 2 - camera.y * viewport.zoom };
    const expected = { x: 3700, y: 2300 };
    const actual = screenToPitch(rect.left + expected.x * viewport.zoom, rect.top + expected.y * viewport.zoom, rect, viewport.zoom);
    assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < 1e-7);
    assert.ok(viewport.playerSize * viewport.zoom >= 22);
  }
});

test('goals use the crossing point instead of a later ball position', () => {
  assert.deepEqual(detectBallOutcome({ x: 3000, y: 500 }, { x: 3000, y: 300 }), { type: 'GOAL', scoreIndex: 0 });
  assert.deepEqual(detectBallOutcome({ x: GOAL_X_MIN - 400, y: 450 }, { x: 3000, y: 200 }), { type: 'OUT' });
  assert.deepEqual(detectBallOutcome({ x: BOUND_LEFT + 10, y: 4000 }, { x: BOUND_LEFT - 10, y: 4000 }), { type: 'OUT' });
});

test('touching a teammate produces a directed pass and grants the receiver a turn', () => {
  const state = possession([player('passer', true, 1800, 5000), player('receiver', true, 3800, 4400)]);
  assert.equal(applyMatchInput(state, { x: 3800, y: 4400 }, { x: 0, y: 0 }, { isDrag: false }), true);
  assert.equal(state.ball.targetId, 'receiver');
  assert.equal(state.phase, 'BALL_FLIGHT');
  for (let i = 0; i < 180 && state.phase === 'BALL_FLIGHT'; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.ball.owner, 'receiver');
  assert.equal(state.phase, 'WAITING_USER_INPUT');
  assert.equal(state.turnTimer, TURN_DURATION_MS);
});

test('a defender in the passing lane can intercept without all defenders swarming', () => {
  const state = possession([player('passer', true, 1800, 5000), player('receiver', true, 3800, 4400), player('defender', false, 3000, 4640, 'DEF')]);
  applyMatchInput(state, { x: 3800, y: 4400 }, { x: 0, y: 0 }, { isDrag: false });
  for (let i = 0; i < 180 && !state.ball.owner; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.ball.owner, 'defender');
  assert.equal(state.phase, 'SIMULATING');
});

test('a swipe can score once and celebration returns to normal play', () => {
  const state = possession([{ ...player('shooter', true, 3000, 700, 'ATT'), sourceId: 'career_player_9' }]);
  applyMatchInput(state, { x: 3000, y: 700 }, { x: 200, y: -900 }, { isDrag: true });
  for (let i = 0; i < 120 && state.phase !== 'GOAL'; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.deepEqual(state.score, [1, 0]);
  assert.deepEqual(state.tracker.career_player_9, { name: 'shooter', g: 1 });
  assert.equal(state.phase, 'GOAL');
  for (let i = 0; i < 181; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.deepEqual(state.score, [1, 0]);
  assert.deepEqual(state.tracker.career_player_9, { name: 'shooter', g: 1 });
  assert.equal(state.phase, 'SIMULATING');
});

test('an own goal does not credit the user scorer for MVP', () => {
  const state = possession([player('carrier', true, 3000, BOUND_BOT - 300)]);
  applyMatchInput(state, { x: 3000, y: BOUND_BOT }, { x: 0, y: 900 }, { isDrag: true });
  for (let i = 0; i < 120 && state.phase !== 'GOAL'; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.deepEqual(state.score, [0, 1]);
  assert.deepEqual(Object.keys(state.tracker), []);
});

test('dribble targets stay inside the pitch and paused matches stay unchanged', () => {
  const state = possession([player('carrier', true, 3000, 4000)]);
  applyMatchInput(state, { x: -9000, y: 99999 }, { x: 0, y: 0 }, { isDrag: false });
  const target = state.players[0].target;
  assert.ok(target.x > BOUND_LEFT && target.x < BOUND_RIGHT && target.y > BOUND_TOP && target.y < BOUND_BOT);
  state.isPaused = true;
  const before = JSON.stringify(state);
  stepMatch(state, 1000, () => 0.5);
  assert.equal(JSON.stringify(state), before);
});

test('a gesture from a previous turn or another carrier cannot trigger a new action', () => {
  const state = possession([player('carrier', true, 3000, 4000)]);
  state.turnId = 9;
  const before = JSON.stringify(state);
  assert.equal(applyMatchInput(state, { x: 3000, y: 2000 }, { x: 0, y: -500 }, { isDrag: true, expectedTurnId: 8 }), false);
  assert.equal(applyMatchInput(state, { x: 3000, y: 2000 }, { x: 0, y: -500 }, { isDrag: true, expectedTurnId: 9, expectedOwnerId: 'previousCarrier' }), false);
  assert.equal(JSON.stringify(state), before);
});

test('aiming extends a turn for at most three seconds and timeout loses the ball without an automatic pass', () => {
  const state = possession([player('carrier', true, 3000, 4000)]);
  state.isAiming = true;
  for (let i = 0; i < 500 && state.phase === 'WAITING_USER_INPUT'; i++) stepMatch(state, 1000 / 60, () => 0.5);
  assert.equal(state.phase, 'SIMULATING');
  assert.ok(Number.isFinite(state.ball.vx) && Number.isFinite(state.ball.vy));
  assert.equal(state.ball.vx, 0);
  assert.equal(state.ball.vy, 0);
  assert.equal(state.ball.owner, null);
});

test('separate aiming gestures share the same three-second budget per turn', () => {
  const state = possession([player('carrier', true, 3000, 4000)]);
  let elapsed = 0;
  for (let gesture = 0; gesture < 40 && state.phase === 'WAITING_USER_INPUT'; gesture++) {
    setMatchAiming(state, true);
    for (let frame = 0; frame < 30 && state.phase === 'WAITING_USER_INPUT'; frame++) { stepMatch(state, 1000 / 60, () => 0.5); elapsed += 1000 / 60; }
    setMatchAiming(state, false);
    if (state.phase === 'WAITING_USER_INPUT') { stepMatch(state, 1000 / 60, () => 0.5); elapsed += 1000 / 60; }
  }
  assert.equal(state.phase, 'SIMULATING');
  assert.ok(elapsed <= TURN_DURATION_MS + 3100);
});

test('halftime needs explicit resume, and final time ends only once', () => {
  const state = createMatchState(players());
  startMatch(state);
  state.clockMs = 45 * MS_PER_VIRTUAL_MINUTE - 5;
  stepMatch(state, 16, () => 0.5);
  assert.equal(state.phase, 'HALFTIME');
  assert.equal(state.half, 1);
  stepMatch(state, 1000, () => 0.5);
  assert.equal(state.clockMs, 45 * MS_PER_VIRTUAL_MINUTE);
  assert.equal(resumeSecondHalf(state), true);
  assert.equal(resumeSecondHalf(state), false);
  assert.equal(state.half, 2);
  state.clockMs = 90 * MS_PER_VIRTUAL_MINUTE - 5;
  stepMatch(state, 16, () => 0.5);
  const before = JSON.stringify(state);
  stepMatch(state, 1000, () => 0.5);
  assert.equal(state.phase, 'FINISHED');
  assert.equal(JSON.stringify(state), before);
});

test('seeded full games reach 90 minutes with user turns and finite player positions', () => {
  const run = seed => {
    const state = createMatchState(players());
    startMatch(state);
    const random = seededRandom(seed);
    let turns = 0;
    let phase;
    for (let frame = 0; frame < 60000 && !state.finished; frame++) {
      stepMatch(state, 1000 / 60, random);
      if (state.phase === 'WAITING_USER_INPUT' && phase !== state.phase) turns++;
      phase = state.phase;
      if (state.phase === 'HALFTIME') resumeSecondHalf(state);
      assert.ok(state.players.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    }
    assert.equal(state.phase, 'FINISHED');
    assert.ok(turns > 5);
    assert.ok(state.score[0] + state.score[1] < 20);
    return { score: state.score, turns };
  };
  assert.deepEqual(run(42), run(42));
});
