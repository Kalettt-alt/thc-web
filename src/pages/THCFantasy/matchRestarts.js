import { PITCH_W, PITCH_H, BOUND_LEFT, BOUND_RIGHT, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { clampPitchPoint, pitchCenter } from './matchGeometry.js';

export const KICKOFF_SETUP_MS = 1000;
export const GOAL_KICK_SETUP_MS = 700;
export const FIELD_RESTART_SETUP_MS = 950;
export const CORNER_ROUTINES = ['NEAR_POST', 'FAR_POST', 'SHORT', 'EDGE'];

export function kickoffCarrier(players, isUser) {
  const candidates = players.filter(player => player.isUser === isUser && !player.isGK);
  return candidates.filter(player => player.role === 'MID').sort((a, b) => Math.abs(a.baseX - PITCH_W / 2) - Math.abs(b.baseX - PITCH_W / 2))[0] || candidates[0];
}

export function kickoffPositions(players, isUser) {
  const carrier = kickoffCarrier(players, isUser);
  const center = pitchCenter();
  return Object.fromEntries(players.map(player => {
    if (player.id === carrier?.id) return [player.id, center];
    const direction = player.isUser ? 1 : -1;
    let y = player.isUser ? Math.max(player.baseY, PITCH_H / 2 + 220) : Math.min(player.baseY, PITCH_H / 2 - 220);
    if (player.isUser !== isUser && Math.hypot(player.baseX - center.x, y - center.y) < 680) y = center.y + direction * 680;
    return [player.id, { x: player.baseX, y }];
  }));
}

export function beginKickoffSetup(state) {
  state.phase = 'KICKOFF_SETUP';
  state.transitionTimer = KICKOFF_SETUP_MS;
  state.repositionFrom = Object.fromEntries(state.players.map(player => [player.id, { x: player.x, y: player.y }]));
  state.repositionBall = { x: state.ball.x, y: state.ball.y };
  state.repositionCamera = { ...state.camera };
  state.isAiming = false;
}

export function advanceKickoffSetup(state, delta) {
  state.transitionTimer = Math.max(0, state.transitionTimer - delta);
  const progress = 1 - state.transitionTimer / KICKOFF_SETUP_MS;
  const ease = progress * progress * (3 - 2 * progress);
  const targets = kickoffPositions(state.players, state.restartUser);
  for (const player of state.players) {
    const start = state.repositionFrom[player.id] || player;
    const target = targets[player.id];
    player.x = start.x + (target.x - start.x) * ease;
    player.y = start.y + (target.y - start.y) * ease;
    player.target = null;
  }
  const center = pitchCenter();
  for (const key of ['x', 'y']) {
    state.ball[key] = state.repositionBall[key] + (center[key] - state.repositionBall[key]) * ease;
    state.camera[key] = state.repositionCamera[key] + (center[key] - state.repositionCamera[key]) * ease;
  }
  return state.transitionTimer === 0;
}

export function beginGoalKickSetup(state, isUser) {
  const keeper = state.players.find(player => player.isUser === isUser && player.isGK) || state.players.find(player => player.isUser === isUser);
  if (!keeper) return false;
  const point = { x: PITCH_W / 2, y: (isUser ? GOAL_Y_BOT : GOAL_Y_TOP) + (isUser ? -1 : 1) * 300 };
  state.phase = 'GOAL_KICK';
  state.transitionTimer = GOAL_KICK_SETUP_MS;
  state.restartUser = isUser;
  state.restartData = { kind: 'GOAL_KICK', carrierId: keeper.id, point };
  state.repositionFrom = Object.fromEntries(state.players.map(player => [player.id, { x: player.x, y: player.y }]));
  state.ball = { ...point, vx: 0, vy: 0, height: 0, airborne: false, owner: keeper.id, targetId: null };
  state.isAiming = false;
  state.wallReturn = null;
  return true;
}

export function advanceGoalKickSetup(state, delta) {
  state.transitionTimer = Math.max(0, state.transitionTimer - delta);
  const progress = 1 - state.transitionTimer / GOAL_KICK_SETUP_MS;
  const ease = progress * progress * (3 - 2 * progress);
  const direction = state.restartUser ? -1 : 1;
  const ownGoal = state.restartUser ? GOAL_Y_BOT : GOAL_Y_TOP;
  for (const player of state.players) {
    const start = state.repositionFrom[player.id] || player;
    const target = player.id === state.restartData.carrierId ? state.restartData.point : clampPitchPoint({ x: player.baseX, y: player.isUser === state.restartUser && player.role === 'DEF' ? ownGoal + direction * 1400 : player.baseY });
    player.x = start.x + (target.x - start.x) * ease;
    player.y = start.y + (target.y - start.y) * ease;
    player.target = null;
  }
  return state.transitionTimer === 0;
}

export function beginFieldRestart(state, contact, random = Math.random) {
  const isUser = !state.lastTouchUser;
  const kind = contact.edge === 'TOP' || contact.edge === 'BOTTOM' ? 'CORNER' : 'THROW_IN';
  const point = kind === 'CORNER'
    ? { x: contact.x < PITCH_W / 2 ? BOUND_LEFT + 90 : BOUND_RIGHT - 90, y: contact.edge === 'TOP' ? GOAL_Y_TOP + 90 : GOAL_Y_BOT - 90 }
    : clampPitchPoint(contact, 90);
  const taker = state.players.filter(player => player.isUser === isUser && !player.isGK).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
  if (!taker) return false;
  const targets = Object.fromEntries(state.players.map(player => [player.id, { x: player.x, y: player.y }]));
  let routine = null;
  let receiverId = null;
  if (kind === 'CORNER') {
    let index = Math.min(CORNER_ROUTINES.length - 1, Math.floor(Math.max(0, random()) * CORNER_ROUTINES.length));
    if (CORNER_ROUTINES[index] === state.lastCornerRoutine) index = (index + 1) % CORNER_ROUTINES.length;
    routine = CORNER_ROUTINES[index];
    state.lastCornerRoutine = routine;
    const goalY = contact.edge === 'TOP' ? GOAL_Y_TOP : GOAL_Y_BOT;
    const intoPitch = contact.edge === 'TOP' ? 1 : -1;
    const side = point.x < PITCH_W / 2 ? -1 : 1;
    const attackers = state.players.filter(player => player.isUser === isUser && !player.isGK && player.id !== taker.id).sort((a, b) => (a.role === 'ATT' ? 0 : a.role === 'MID' ? 1 : 2) - (b.role === 'ATT' ? 0 : b.role === 'MID' ? 1 : 2) || b.grl - a.grl);
    const attackingPoints = [
      { x: PITCH_W / 2 + side * 300, y: goalY + intoPitch * 670 },
      { x: PITCH_W / 2 - side * 420, y: goalY + intoPitch * 850 },
      { x: point.x - side * 620, y: goalY + intoPitch * 650 },
      { x: PITCH_W / 2 + side * 250, y: goalY + intoPitch * 1700 }
    ];
    attackers.forEach((player, order) => {
      targets[player.id] = clampPitchPoint(attackingPoints[order] || { x: player.baseX, y: goalY + intoPitch * (player.role === 'DEF' ? 3400 : 2300) }, 150);
    });
    receiverId = attackers[{ NEAR_POST: 0, FAR_POST: 1, SHORT: 2, EDGE: 3 }[routine]]?.id || attackers[0]?.id || null;
    const defenders = state.players.filter(player => player.isUser !== isUser && !player.isGK).sort((a, b) => (a.role === 'DEF' ? 0 : a.role === 'MID' ? 1 : 2) - (b.role === 'DEF' ? 0 : b.role === 'MID' ? 1 : 2));
    defenders.forEach((player, order) => {
      const mark = attackingPoints[order];
      targets[player.id] = clampPitchPoint(mark ? { x: mark.x + (order % 2 ? 200 : -200), y: mark.y - intoPitch * 170 } : { x: player.baseX, y: goalY + intoPitch * (player.role === 'ATT' ? 3400 : 2100) }, 150);
    });
    for (const keeper of state.players.filter(player => player.isGK)) targets[keeper.id] = keeper.isUser !== isUser ? { x: PITCH_W / 2 + side * 120, y: goalY + intoPitch * 140 } : { x: keeper.baseX, y: keeper.baseY };
  } else {
    for (const teammate of state.players.filter(player => player.isUser === isUser && !player.isGK && player.id !== taker.id).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y)).slice(0, 2)) {
      targets[teammate.id] = clampPitchPoint({ x: point.x + (point.x < PITCH_W / 2 ? 800 : -800), y: point.y + (teammate.y < point.y ? -650 : 650) }, 150);
    }
  }
  targets[taker.id] = point;
  state.phase = 'OUT';
  state.transitionTimer = FIELD_RESTART_SETUP_MS;
  state.restartUser = isUser;
  state.restartData = { kind, carrierId: taker.id, point, routine, receiverId, targets };
  state.repositionFrom = Object.fromEntries(state.players.map(player => [player.id, { x: player.x, y: player.y }]));
  state.repositionCamera = { ...state.camera };
  state.ball = { ...point, vx: 0, vy: 0, height: 0, airborne: false, owner: null, targetId: null };
  state.isAiming = false;
  state.wallReturn = null;
  state.attackTransition = null;
  return true;
}

export function advanceFieldRestart(state, delta) {
  state.transitionTimer = Math.max(0, state.transitionTimer - delta);
  if (!state.restartData?.targets || !state.repositionFrom || !state.repositionCamera) return state.transitionTimer === 0;
  const progress = 1 - state.transitionTimer / FIELD_RESTART_SETUP_MS;
  const ease = progress * progress * (3 - 2 * progress);
  for (const player of state.players) {
    const start = state.repositionFrom[player.id] || player;
    const target = state.restartData.targets[player.id] || start;
    player.x = start.x + (target.x - start.x) * ease;
    player.y = start.y + (target.y - start.y) * ease;
    player.target = null;
  }
  for (const key of ['x', 'y']) state.camera[key] = state.repositionCamera[key] + (state.restartData.point[key] - state.repositionCamera[key]) * ease;
  return state.transitionTimer === 0;
}
