import { PITCH_W, PITCH_H, BOUND_LEFT, BOUND_RIGHT, BOUND_TOP, BOUND_BOT, GOAL_X_MIN, GOAL_X_MAX, GOAL_Y_TOP, GOAL_Y_BOT, BALL_RADIUS, GOAL_POST_RADIUS, GOAL_HEIGHT } from './ConstantesJuego.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : (min + max) / 2));

export function clampPitchPoint(point, margin = 80) {
  return { x: clamp(point.x, BOUND_LEFT + margin, BOUND_RIGHT - margin), y: clamp(point.y, BOUND_TOP + margin, BOUND_BOT - margin) };
}

export function getMatchViewport(width, height, mode = 'FOLLOW') {
  const availableWidth = Math.max(1, width);
  const availableHeight = Math.max(1, height);
  const zoom = mode === 'STADIUM'
    ? Math.min(availableWidth / (PITCH_W + 2200), availableHeight / (PITCH_H + 1700))
    : Math.max(availableHeight / 7000, Math.min(availableWidth / 4200, availableHeight / 3500, 0.29));
  return { width, height, zoom, playerSize: Math.max(112, 23 / zoom), ballSize: Math.max(66, 11 / zoom) };
}

export function clampMatchCamera(camera, viewport) {
  const axis = (value, min, max, size) => min + size / 2 > max - size / 2 ? (min + max) / 2 : clamp(value, min + size / 2, max - size / 2);
  return {
    x: axis(camera.x, BOUND_LEFT - 180, BOUND_RIGHT + 180, viewport.width / viewport.zoom),
    y: axis(camera.y, BOUND_TOP - 280, BOUND_BOT + 280, viewport.height / viewport.zoom)
  };
}

export function getMatchCamera(camera, viewport, mode = 'FOLLOW') {
  return mode === 'STADIUM' ? pitchCenter() : clampMatchCamera(camera, viewport);
}

export function screenToPitch(clientX, clientY, pitchRect, zoom) {
  return { x: (clientX - pitchRect.left) / zoom, y: (clientY - pitchRect.top) / zoom };
}

export function segmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > 0 ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1) : 0;
  return { distance: Math.hypot(point.x - start.x - dx * t, point.y - start.y - dy * t), t };
}

export function traceBallBoundary(start, end) {
  const intersections = [];
  const cross = (axis, value, edge, scoreIndex) => {
    const displacement = end[axis] - start[axis];
    if (!displacement) return;
    const t = (value - start[axis]) / displacement;
    const outside = edge === 'TOP' || edge === 'LEFT' ? end[axis] < value : end[axis] > value;
    if (!outside || t < 0 || t > 1) return;
    const point = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
    const height = (start.height || 0) + ((end.height || 0) - (start.height || 0)) * t;
    const inGoal = scoreIndex !== undefined && point.x > GOAL_X_MIN + BALL_RADIUS && point.x < GOAL_X_MAX - BALL_RADIUS && height <= GOAL_HEIGHT;
    intersections.push({ type: inGoal ? 'GOAL' : 'OUT', ...(inGoal ? { scoreIndex } : {}), edge, t, ...point });
  };
  cross('y', GOAL_Y_TOP, 'TOP', 0);
  cross('y', GOAL_Y_BOT, 'BOTTOM', 1);
  cross('x', BOUND_LEFT, 'LEFT');
  cross('x', BOUND_RIGHT, 'RIGHT');
  return intersections.sort((a, b) => a.t - b.t)[0] || null;
}

export function detectBallOutcome(start, end) {
  const contact = traceBallBoundary(start, end);
  return !contact ? null : contact.type === 'GOAL' ? { type: 'GOAL', scoreIndex: contact.scoreIndex } : { type: 'OUT' };
}

export function detectPostContact(start, end, radius = BALL_RADIUS + GOAL_POST_RADIUS) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.000001) return null;
  let first = null;
  for (const y of [GOAL_Y_TOP, GOAL_Y_BOT]) for (const x of [GOAL_X_MIN, GOAL_X_MAX]) {
    const sx = start.x - x;
    const sy = start.y - y;
    const b = 2 * (sx * dx + sy * dy);
    const c = sx * sx + sy * sy - radius * radius;
    const discriminant = b * b - 4 * lengthSquared * c;
    if (discriminant < 0) continue;
    const t = c <= 0 ? 0 : (-b - Math.sqrt(discriminant)) / (2 * lengthSquared);
    if (t < 0 || t > 1 || first && first.t <= t) continue;
    const height = (start.height || 0) + ((end.height || 0) - (start.height || 0)) * t;
    if (height > GOAL_HEIGHT) continue;
    const contactX = start.x + dx * t;
    const contactY = start.y + dy * t;
    const normalLength = Math.hypot(contactX - x, contactY - y) || 1;
    const normal = { x: (contactX - x) / normalLength, y: (contactY - y) / normalLength };
    if (dx * normal.x + dy * normal.y >= 0) continue;
    first = { type: 'POST', t, x: x + normal.x * radius, y: y + normal.y * radius, normal };
  }
  return first;
}

export function reflectBallVelocity(velocity, normal, restitution = 0.8) {
  const projection = velocity.vx * normal.x + velocity.vy * normal.y;
  return { vx: velocity.vx - (1 + restitution) * projection * normal.x, vy: velocity.vy - (1 + restitution) * projection * normal.y };
}

export const pitchCenter = () => ({ x: PITCH_W / 2, y: PITCH_H / 2 });
