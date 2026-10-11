import test from 'node:test';
import assert from 'node:assert/strict';
import { HaxBot, chooseDodgeSide, chooseGoalAim, chooseWallAction, decidePracticeAction } from '../src/pages/UltimateTeam/SkillMode/BotAI.js';
import { SKILL_PHYSICS as HAX, behindBall, clampPracticeCamera, getPracticeViewport, isKickAligned, kickRadius, predictPracticeBall, wallPassPath } from '../src/pages/UltimateTeam/SkillMode/skillGeometry.js';

const disc = (x, y, radius = HAX.PLAYER_RAD) => ({ x, y, vx: 0, vy: 0, rad: radius });
const ballAt = (x, y) => disc(x, y, HAX.BALL_RAD);

test('bot shares the exact field, kick range and rebound values of the game', () => {
  assert.equal(HAX.BOUND_X, 700);
  assert.equal(HAX.BOUND_Y, 320);
  assert.equal(HAX.BALL_BCOEF, 0.65);
  assert.equal(kickRadius(disc(0, 0), ballAt(0, 0)), 32.5);
  const original = { ...ballAt(300, 307), vx: 2, vy: 10 };
  const predicted = predictPracticeBall(original, 2);
  assert.ok(predicted.vy < 0);
  assert.equal(original.y, 307);
  assert.ok(Math.abs(predicted.y) < HAX.BOUND_Y);
});

test('wall return compensates the actual normal restitution rather than a perfect mirror', () => {
  const ball = ballAt(0, 190);
  const receive = { x: -230, y: 90 };
  const path = wallPassPath(ball, receive, 1);
  const incomingSlope = (path.bounce.y - ball.y) / (path.bounce.x - ball.x);
  const outgoingSlope = (receive.y - path.bounce.y) / (receive.x - path.bounce.x);
  assert.ok(Math.abs(outgoingSlope + incomingSlope * HAX.BALL_BCOEF) < 1e-9);
  assert.equal(path.bounce.y, HAX.BOUND_Y - HAX.BALL_RAD);
  assert.ok(path.bounce.x < 0 && path.bounce.x > receive.x);
});

test('open shots use the real goal and avoid the keeper instead of always aiming at its centre', () => {
  const ball = ballAt(-260, 0);
  const keeper = disc(-650, -25);
  const goal = chooseGoalAim(ball, keeper, 'blue');
  assert.ok(goal.aim.x < -HAX.BOUND_X);
  assert.ok(goal.aim.y > 0 && goal.aim.y < HAX.GOAL_Y - HAX.BALL_RAD);
  const bot = { ...disc(0, 0), ...behindBall(ball, goal.aim) };
  assert.equal(decidePracticeAction(bot, ball, keeper, 'blue').type, 'SHOOT');
  assert.equal(new HaxBot('blue').think(bot, ball, keeper).kick, true);
});

test('a close challenge triggers a lateral feint and a subsequent ole into free space', () => {
  const ball = ballAt(0, 0), bot = disc(29, 0), opponent = disc(-60, 0);
  const feint = decidePracticeAction(bot, ball, opponent, 'blue');
  const ole = decidePracticeAction(bot, ball, opponent, 'blue', { dodgeAge: 20, dodgeSide: feint.side });
  assert.equal(feint.type, 'FEINT');
  assert.equal(ole.type, 'OLE');
  assert.equal(Math.sign(feint.aim.y), Math.sign(ole.aim.y));
  assert.ok(Math.abs(ole.aim.y) > Math.abs(feint.aim.y));
  assert.equal(ole.kick, true);
  assert.equal(chooseDodgeSide(ballAt(0, 280), opponent), -1);
});

test('controlled dribbling aims into contact so the bot pushes the ball rather than stopping behind it', () => {
  const ball = ballAt(0, 0), bot = disc(29, 0);
  const decision = decidePracticeAction(bot, ball, disc(-400, 200), 'blue');
  assert.equal(decision.type, 'DRIBBLE');
  assert.ok(Math.hypot(decision.target.x - ball.x, decision.target.y - ball.y) < HAX.PLAYER_RAD + HAX.BALL_RAD - 2);
  assert.equal(decision.kick, false);
  assert.equal(new HaxBot('blue').think(bot, ball, disc(-400, 200)).a, true);
});

test('a blocked wall-side advance selects a real self-pass and its receiving point stays playable', () => {
  const ball = ballAt(0, 200), opponent = disc(-80, 160);
  const path = chooseWallAction(ball, opponent, 'blue');
  assert.equal(path.type, 'WALL_PASS');
  assert.ok(path.receive.x < ball.x);
  assert.ok(Math.abs(path.receive.y) < HAX.BOUND_Y - 80);
  const bot = { ...disc(0, 0), ...behindBall(ball, path.aim) };
  const brain = new HaxBot('blue');
  assert.equal(brain.think(bot, ball, opponent).kick, true);
  assert.equal(brain.think(bot, ball, opponent).kick, false);
  assert.ok(brain.recoverUntil > brain.tick);
});

test('a bot on the wrong side circles the ball without shooting toward its own goal', () => {
  const ball = ballAt(-250, 0), bot = disc(-278, 0), opponent = disc(200, 100);
  const brain = new HaxBot('blue');
  const keys = brain.think(bot, ball, opponent);
  assert.equal(keys.kick, false);
  assert.ok(Math.abs(brain.lastTargetY) > 40);
  assert.equal(isKickAligned(bot, ball, { x: -722, y: 0 }), false);
});

test('team mirroring preserves tactical intent and only emits legal input booleans', () => {
  const blue = new HaxBot('blue'), red = new HaxBot('red');
  const keysBlue = blue.think(disc(29, 0), ballAt(0, 0), disc(-60, 0));
  const keysRed = red.think(disc(-29, 0), ballAt(0, 0), disc(60, 0));
  assert.equal(blue.lastDecision, red.lastDecision);
  assert.equal(keysBlue.a, keysRed.d);
  assert.equal(keysBlue.d, keysRed.a);
  assert.equal(keysBlue.w, keysRed.w);
  assert.equal(keysBlue.s, keysRed.s);
  for (const keys of [keysBlue, keysRed]) assert.ok(Object.values(keys).every(value => typeof value === 'boolean'));
});

test('kickoff waits on the correct side and a goal celebration emits no controls', () => {
  const brain = new HaxBot('blue');
  const waiting = brain.think(disc(200, 0), ballAt(0, 0), disc(-200, 0), { state: 'kickoff', kickoffTeam: 'red' });
  assert.deepEqual(waiting, { w: false, a: false, s: false, d: false, kick: false });
  assert.deepEqual(brain.think(disc(0, 0), ballAt(0, 0), null, { state: 'goal_scored' }), waiting);
});

test('decisions do not mutate opponents, discs or configured physics', () => {
  const bot = disc(29, 0), ball = ballAt(0, 0), opponent = disc(-60, 0);
  const before = JSON.stringify([bot, ball, opponent, HAX]);
  const brain = new HaxBot('blue');
  for (let i = 0; i < 80; i++) brain.think(bot, ball, opponent);
  assert.equal(JSON.stringify([bot, ball, opponent, HAX]), before);
});

test('a uniform camera keeps the pitch and goals in frame across device sizes', () => {
  for (const [width, height] of [[320, 460], [390, 700], [844, 220], [1920, 900]]) {
    const overview = getPracticeViewport(width, height, 1);
    assert.ok((HAX.BOUND_X + 50) * 2 * overview.scale <= width);
    assert.ok(HAX.BOUND_Y * 2 * overview.scale <= height);
    for (const mode of [1, 2, 3]) {
      const viewport = getPracticeViewport(width, height, mode);
      const camera = clampPracticeCamera({ x: 99999, y: -99999 }, viewport);
      assert.ok(Number.isFinite(camera.x) && Number.isFinite(camera.y) && viewport.scale > 0);
      const point = { x: 321, y: -123 };
      const screen = { x: width / 2 + (point.x - camera.x) * viewport.scale, y: height / 2 + (point.y - camera.y) * viewport.scale };
      assert.ok(Math.abs((screen.x - width / 2) / viewport.scale + camera.x - point.x) < 1e-9);
      assert.ok(Math.abs((screen.y - height / 2) / viewport.scale + camera.y - point.y) < 1e-9);
    }
  }
});
