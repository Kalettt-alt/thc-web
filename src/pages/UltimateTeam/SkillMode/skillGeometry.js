export const SKILL_PHYSICS = Object.freeze({
  PLAYER_RAD: 20, PLAYER_MASS: 2.0, PLAYER_DAMP: 0.96, ACCEL: 0.13,
  KICK_ACCEL: 0.093, KICK_FORCE: 10, MAX_SPEED: 4.5,
  BALL_RAD: 8.5, BALL_MASS: 0.5, BALL_DAMP: 0.99, BALL_BCOEF: 0.65,
  FPS: 60, BOUND_X: 700, BOUND_Y: 320, GOAL_Y: 90,
});

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value)));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const attackDirection = team => team === 'blue' ? -1 : 1;
export const kickRadius = (bot, ball) => (bot.rad || SKILL_PHYSICS.PLAYER_RAD) + (ball.rad || SKILL_PHYSICS.BALL_RAD) + 4;

export function clampBotTarget(point) {
  const margin = 250 - SKILL_PHYSICS.PLAYER_RAD;
  return { x: clamp(point.x, -SKILL_PHYSICS.BOUND_X - margin, SKILL_PHYSICS.BOUND_X + margin), y: clamp(point.y, -SKILL_PHYSICS.BOUND_Y - margin, SKILL_PHYSICS.BOUND_Y + margin) };
}

export function segmentClearance(point, start, end) {
  if (!point) return Infinity;
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(point.x - start.x - dx * t, point.y - start.y - dy * t);
}

export function advanceBallPrediction(ball) {
  const { BOUND_X, BOUND_Y, GOAL_Y, BALL_BCOEF, BALL_DAMP, BALL_RAD } = SKILL_PHYSICS;
  const radius = ball.rad || BALL_RAD;
  if (ball.y - radius < -BOUND_Y) { ball.y = -BOUND_Y + radius; ball.vy *= -BALL_BCOEF; }
  if (ball.y + radius > BOUND_Y) { ball.y = BOUND_Y - radius; ball.vy *= -BALL_BCOEF; }
  if (ball.x - radius < -BOUND_X && Math.abs(ball.y) > GOAL_Y) { ball.x = -BOUND_X + radius; ball.vx *= -BALL_BCOEF; }
  if (ball.x + radius > BOUND_X && Math.abs(ball.y) > GOAL_Y) { ball.x = BOUND_X - radius; ball.vx *= -BALL_BCOEF; }
  ball.x += ball.vx; ball.y += ball.vy;
  ball.vx *= BALL_DAMP; ball.vy *= BALL_DAMP;
  return ball;
}

const copyBall = ball => ({ x: finite(ball.x), y: finite(ball.y), vx: finite(ball.vx), vy: finite(ball.vy), rad: ball.rad || SKILL_PHYSICS.BALL_RAD });
export function predictPracticeBall(ball, ticks) {
  const predicted = copyBall(ball);
  for (let tick = 0; tick < clamp(Math.floor(ticks), 0, 180); tick++) advanceBallPrediction(predicted);
  return predicted;
}

export function interceptPracticeBall(bot, ball, maxTicks = 90) {
  const future = copyBall(ball);
  const speed = Math.min(SKILL_PHYSICS.MAX_SPEED, Math.hypot(bot.vx || 0, bot.vy || 0));
  const terminal = SKILL_PHYSICS.ACCEL / (1 - SKILL_PHYSICS.PLAYER_DAMP);
  let closest = { x: future.x, y: future.y };
  let best = Infinity;
  for (let tick = 1; tick <= maxTicks; tick++) {
    advanceBallPrediction(future);
    const reach = Math.max(0, terminal * tick - (terminal - speed) * (1 - SKILL_PHYSICS.PLAYER_DAMP ** tick) / (1 - SKILL_PHYSICS.PLAYER_DAMP)) + kickRadius(bot, ball);
    const remaining = distance(bot, future) - reach;
    if (remaining < best) { closest = { x: future.x, y: future.y }; best = remaining; }
    if (remaining <= 0) return clampBotTarget(future);
    if (Math.abs(future.x) > SKILL_PHYSICS.BOUND_X + 25 && Math.abs(future.y) < SKILL_PHYSICS.GOAL_Y) break;
  }
  return clampBotTarget(closest);
}

export function wallPassPath(ball, receive, side) {
  const wallY = (side < 0 ? -1 : 1) * (SKILL_PHYSICS.BOUND_Y - (ball.rad || SKILL_PHYSICS.BALL_RAD));
  const aim = { x: receive.x, y: wallY + (wallY - receive.y) / SKILL_PHYSICS.BALL_BCOEF };
  const ratio = (wallY - ball.y) / (aim.y - ball.y);
  const bounce = { x: ball.x + (receive.x - ball.x) * ratio, y: wallY };
  return { aim, bounce, receive: { ...receive }, length: distance(ball, bounce) + distance(bounce, receive) };
}

export function behindBall(ball, aim, gap = SKILL_PHYSICS.PLAYER_RAD + SKILL_PHYSICS.BALL_RAD + 0.5) {
  const length = distance(ball, aim) || 1;
  return clampBotTarget({ x: ball.x - (aim.x - ball.x) / length * gap, y: ball.y - (aim.y - ball.y) / length * gap });
}

export function isKickAligned(bot, ball, aim, tolerance = 0.22) {
  const ax = aim.x - ball.x, ay = aim.y - ball.y;
  const bx = ball.x - bot.x, by = ball.y - bot.y;
  return ax * bx + ay * by > 0 && Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) <= tolerance;
}

export function getPracticeViewport(width, height, mode = 2) {
  width = Math.max(1, finite(width, 1)); height = Math.max(1, finite(height, 1));
  const full = Math.min(Math.max(1, width - 24) / (2 * (SKILL_PHYSICS.BOUND_X + 85)), Math.max(1, height - 70) / (2 * (SKILL_PHYSICS.BOUND_Y + 36)));
  const scale = mode === 1 ? full : Math.max(full, mode === 3 ? Math.min(width / 560, height / 420, 1.6) : Math.min(width / 980, height / 570, 1.15));
  return { width, height, scale };
}

export function clampPracticeCamera(point, viewport) {
  const extentX = SKILL_PHYSICS.BOUND_X + 250;
  const extentY = SKILL_PHYSICS.BOUND_Y + 250;
  const axis = (value, extent, visible) => visible >= extent * 2 ? 0 : clamp(value, -extent + visible / 2, extent - visible / 2);
  return { x: axis(point.x, extentX, viewport.width / viewport.scale), y: axis(point.y, extentY, viewport.height / viewport.scale) };
}
