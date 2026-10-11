import { PITCH_W, PITCH_H, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { clampPitchPoint, pitchCenter } from './matchGeometry.js';

export const KICKOFF_SETUP_MS = 1000;
export const GOAL_KICK_SETUP_MS = 700;

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

export function beginFieldRestart(state, contact) {
  const isUser = !state.lastTouchUser;
  const point = clampPitchPoint(contact, 90);
  const taker = state.players.filter(player => player.isUser === isUser && !player.isGK).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
  if (!taker) return false;
  const kind = contact.edge === 'TOP' || contact.edge === 'BOTTOM' ? 'CORNER' : 'THROW_IN';
  state.phase = 'OUT';
  state.transitionTimer = 700;
  state.restartUser = isUser;
  state.restartData = { kind, carrierId: taker.id, point };
  state.ball = { ...point, vx: 0, vy: 0, height: 0, airborne: false, owner: null, targetId: null };
  state.isAiming = false;
  state.wallReturn = null;
  return true;
}
