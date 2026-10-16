import { PITCH_W, PITCH_H, GOAL_X_MIN, GOAL_X_MAX, GOAL_Y_TOP, GOAL_Y_BOT, HALF_DURATION_MS, MATCH_DURATION_MS, TURN_DURATION_MS } from './ConstantesJuego.js';
import { clamp, clampPitchPoint, detectPostContact, pitchCenter, reflectBallVelocity, segmentDistance, traceBallBoundary } from './matchGeometry.js';
import { buildTacticalTargets, maintainSpacing, moveToward } from './matchTactics.js';
import { chooseAiPlay } from './matchDecisions.js';
import { recordStat, recordMatchEvent, statKey, updateMatchFitness } from './matchManagement.js';
import { playerControlRadius, playerDecisionDelay, playerPassKick, playerShotKick, playerTackleRadius } from './matchAttributes.js';
import { advanceFieldRestart, advanceGoalKickSetup, advanceKickoffSetup, beginFieldRestart, beginGoalKickSetup, beginKickoffSetup, kickoffCarrier, kickoffPositions } from './matchRestarts.js';
import { canUseMatchOpportunity, consumeMatchOpportunity, createMatchOpportunities, shotTeamForKick } from './matchOpportunities.js';

const actionAuthor = player => ({ id: player.id, sourceId: player.sourceId, name: player.name, isUser: player.isUser });

export function createMatchState(players, reserves = [], formation = '4-3-3 OFENSIVO', { autoStart = false } = {}) {
  const state = {
    players, ball: { ...pitchCenter(), vx: 0, vy: 0, height: 0, airborne: false, owner: null, targetId: null }, camera: pitchCenter(),
    clockMs: 0, score: [0, 0], half: 1, phase: 'SIMULATING', msg: 'ATAQUE HACIA ARRIBA', msgTimer: 2400,
    turnTimer: TURN_DURATION_MS, cooldown: 5000, nextUserTurnMs: 6500, actionTimer: 1000, transitionTimer: 0, lastTouchUser: true,
    isPaused: false, isAiming: false, aimingMs: 0, chasers: {}, finished: false, turnId: 0, tracker: Object.create(null), lastTouchId: null, lastTouchPlayer: null,
    reserves: reserves.map(player => ({ ...player })), formation, mentality: 'NORMAL', substitutionsUsed: 0, teamTalkCount: 0, teamTalkHistory: [], playerStats: Object.create(null), lastEvent: null, goalEvent: null, wallReturn: null,
    opportunities: createMatchOpportunities(players), lastPassTarget: {}, possessionMs: 0, attackTransition: null, turnover: null, setPiece: null, playCounts: {}
  };
  restartPlay(state, true);
  if (!autoStart) { state.phase = 'READY'; state.msg = 'TU EQUIPO ESTÁ LISTO'; }
  return state;
}

export function startMatch(state) {
  if (state.phase !== 'READY' || state.isPaused || !state.players.length) return false;
  state.opportunities = createMatchOpportunities(state.players);
  restartPlay(state, true);
  showMatchMessage(state, 'COMIENZA EL PARTIDO');
  return true;
}

export function showMatchMessage(state, text, duration = 1600) {
  state.msg = text;
  state.msgTimer = duration;
}

function givePossession(state, player, allowTurn = true) {
  state.ball = { x: player.x, y: player.y, vx: 0, vy: 0, height: 0, airborne: false, owner: player.id, targetId: null, ignoredId: null, ignoreMs: 0, fromUserInput: false, passFrom: null };
  state.lastTouchUser = player.isUser;
  state.lastTouchId = player.id;
  state.lastTouchPlayer = actionAuthor(player);
  state.phase = player.isUser && allowTurn ? 'WAITING_USER_INPUT' : 'SIMULATING';
  if (state.phase === 'WAITING_USER_INPUT') { state.nextUserTurnMs = 6500; state.turnId += 1; }
  state.turnTimer = TURN_DURATION_MS;
  state.actionTimer = playerDecisionDelay(player, player.isUser ? 950 : 720);
  state.possessionMs = 0;
  state.pressureResponded = false;
  state.isAiming = false;
  state.aimingMs = 0;
  player.target = null;
  player.driveTarget = null;
  if (state.attackTransition?.isUser !== player.isUser) state.attackTransition = null;
}

function markRecovery(state, player, reason = 'TACKLE') {
  state.attackTransition = { isUser: player.isUser, untilMs: state.clockMs + 6500 };
  state.wallReturn = null;
  state.setPiece = null;
  recordMatchEvent(state, player.isGK ? 'SAVE' : 'RECOVERY', player, { reason, playStyle: 'COUNTER' });
}

function nearestOpponent(state, owner) {
  return state.players.filter(player => player.isUser !== owner.isUser && !player.isGK).sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y))[0]
    || state.players.filter(player => player.isUser !== owner.isUser).sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y))[0];
}

function beginTimeoutRecovery(state) {
  const owner = state.players.find(player => player.id === state.ball.owner);
  const presser = owner && nearestOpponent(state, owner);
  state.isAiming = false;
  state.turnId += 1;
  state.wallReturn = null;
  if (!owner || !presser) {
    state.ball.owner = null;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.phase = 'SIMULATING';
    showMatchMessage(state, 'TIEMPO AGOTADO · PIERDES EL CONTROL');
    return;
  }
  state.phase = 'TURNOVER_PRESS';
  state.turnover = { carrierId: owner.id, presserId: presser.id };
  showMatchMessage(state, `${presser.name.split(' ').pop().toUpperCase()} PRESIONA · TIEMPO AGOTADO`, 2200);
}

export function restartPlay(state, isUser) {
  const positions = kickoffPositions(state.players, isUser);
  for (const player of state.players) { Object.assign(player, positions[player.id]); player.target = null; }
  state.ball = { ...pitchCenter(), vx: 0, vy: 0, height: 0, airborne: false, owner: null, targetId: null, ignoreMs: 0 };
  state.phase = 'SIMULATING';
  state.chasers = {};
  state.isAiming = false;
  state.wallReturn = null;
  state.setPiece = null;
  state.attackTransition = null;
  state.turnover = null;
  const carrier = kickoffCarrier(state.players, isUser);
  if (carrier) {
    Object.assign(carrier, pitchCenter());
    givePossession(state, carrier, false);
  }
}

export function resumeSecondHalf(state) {
  if (state.phase !== 'HALFTIME') return false;
  state.half = 2;
  state.phase = 'SIMULATING';
  state.cooldown = 3500;
  restartPlay(state, false);
  showMatchMessage(state, 'SEGUNDO TIEMPO');
  return true;
}

export function setMatchAiming(state, value) {
  state.isAiming = Boolean(value && state.phase === 'WAITING_USER_INPUT' && !state.isPaused);
}

function releaseBall(state, owner, target, speed, receiverId = null, random = Math.random, options = {}) {
  const shotTeam = options.shot ? owner.isUser : shotTeamForKick(owner, target, receiverId);
  if (Math.hypot(target.x - owner.x, target.y - owner.y) < 1) return false;
  if (shotTeam !== null && !consumeMatchOpportunity(state, owner.isUser, { freelyChosen: options.controlled || options.freelyChosen })) return false;
  let aim = target;
  if (shotTeam !== null && Math.abs(target.y - owner.y) > 0.001) {
    const goalY = shotTeam ? GOAL_Y_TOP - 35 : GOAL_Y_BOT + 35;
    aim = { x: owner.x + (target.x - owner.x) / (target.y - owner.y) * (goalY - owner.y), y: goalY };
  }
  const kick = receiverId ? playerPassKick(owner, aim, speed, random) : shotTeam !== null ? playerShotKick(owner, aim, speed, random, { controlled: options.controlled, pressure: options.pressure }) : { target: aim, speed };
  const flightTarget = shotTeam !== null ? kick.target : clampPitchPoint(kick.target, 90);
  const dx = flightTarget.x - owner.x;
  const dy = flightTarget.y - owner.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return false;
  state.ball = {
    ...clampPitchPoint({ x: owner.x + dx / distance * Math.min(110, distance), y: owner.y + dy / distance * Math.min(110, distance) }, 1), vx: dx / distance * kick.speed, vy: dy / distance * kick.speed, owner: null,
    targetId: receiverId, targetX: flightTarget.x, targetY: flightTarget.y, ignoredId: owner.id, ignoreMs: 180, flightAgeMs: 0, passFrom: receiverId ? statKey(owner) : null,
    travelRemaining: shotTeam !== null ? null : Math.max(0, distance - 110), shotTeam, height: 0,
    airborne: Boolean(options.aerial), aerialDelivery: Boolean(options.aerial), airDurationMs: options.aerial ? Math.max(600, distance / kick.speed * 1000) : 0, airPeak: options.aerial ? clamp(distance * 0.13, 250, 580) : 0
  };
  state.phase = 'BALL_FLIGHT';
  state.lastTouchUser = owner.isUser;
  state.lastTouchId = owner.id;
  state.lastTouchPlayer = actionAuthor(owner);
  if (receiverId || options.aerial) { recordStat(state, owner, 'passesAttempted'); recordMatchEvent(state, options.aerial ? 'LONG_PASS' : 'PASS', owner, { playStyle: options.style || (options.aerial ? 'LONG' : 'MANUAL_PASS') }); state.lastPassTarget[owner.id] = receiverId; }
  if (shotTeam !== null) { recordStat(state, owner, 'shots'); recordMatchEvent(state, 'SHOT', owner, { playStyle: options.style || (options.controlled ? 'MANUAL_SHOT' : 'SHOT'), manual: Boolean(options.controlled) }); }
  const style = options.style || (shotTeam !== null ? 'SHOT' : options.aerial ? 'LONG' : 'PASS');
  state.playCounts ||= {};
  state.playCounts[style] = (state.playCounts[style] || 0) + 1;
  state.setPiece = null;
  state.isAiming = false;
  state.cooldown = 1400;
  owner.target = null;
  return true;
}

export function applyMatchInput(state, point, drag = { x: 0, y: 0 }, options = {}) {
  if (state.isPaused || state.phase !== 'WAITING_USER_INPUT') return false;
  if (options.expectedTurnId !== undefined && options.expectedTurnId !== state.turnId) return false;
  const owner = state.players.find(player => player.id === state.ball.owner);
  if (!owner || !owner.isUser) return false;
  if (options.expectedOwnerId && options.expectedOwnerId !== owner.id) return false;
  const dragDistance = Math.hypot(drag.x, drag.y);
  state.isAiming = false;
  if (options.shot || (options.isDrag ?? dragDistance > 90)) {
    if (dragDistance < 1) return false;
    const aerial = owner.isGK && dragDistance > 400 && !options.shot;
    const reach = aerial ? clamp(2200 + dragDistance * 1.3, 2200, 4700) : dragDistance;
    let target = { x: owner.x + drag.x / dragDistance * reach, y: owner.y + drag.y / dragDistance * reach };
    if (options.shot && Math.abs(drag.y) > 0.001) {
      const goalY = owner.isUser ? GOAL_Y_TOP - 35 : GOAL_Y_BOT + 35;
      target = { x: owner.x + drag.x / drag.y * (goalY - owner.y), y: goalY };
    }
    const pressure = Math.min(...state.players.filter(player => player.isUser !== owner.isUser && !player.isGK).map(player => Math.hypot(player.x - owner.x, player.y - owner.y)), 5000);
    if (!releaseBall(state, owner, target, clamp(1400 + dragDistance * 1.7, 1400, 3600), null, options.random || Math.random, { aerial, controlled: true, shot: options.shot, pressure })) return false;
    state.ball.fromUserInput = true;
    showMatchMessage(state, aerial ? 'SAQUE LARGO' : state.ball.shotTeam !== null ? 'DISPARO' : 'PASE LIBRE', 900);
    return true;
  }
  const target = state.players.filter(player => player.isUser && player.id !== owner.id).map(player => ({ player, distance: Math.hypot(player.x - point.x, player.y - point.y) })).sort((a, b) => a.distance - b.distance)[0];
  if (target && target.distance <= (options.pickRadius ?? 350)) {
    const cornerCross = state.setPiece?.kind === 'CORNER' && Math.hypot(target.player.x - owner.x, target.player.y - owner.y) > 1200;
    if (!releaseBall(state, owner, target.player, clamp(1800 + Math.hypot(target.player.x - owner.x, target.player.y - owner.y) * 0.35, 1800, 2900), target.player.id, options.random || Math.random, { aerial: cornerCross, style: cornerCross ? 'CORNER_CROSS' : 'MANUAL_PASS' })) return false;
    state.ball.fromUserInput = true;
    showMatchMessage(state, `PASE A ${target.player.name.split(' ').pop()}`, 800);
  } else {
    owner.target = clampPitchPoint(point, 90);
    state.phase = 'USER_DRIVING';
    showMatchMessage(state, 'CONDUCCIÓN', 700);
  }
  return true;
}

function moveTeam(state, seconds, owner) {
  const counter = Boolean(state.attackTransition && owner && state.attackTransition.isUser === owner.isUser && state.attackTransition.untilMs > state.clockMs);
  const { targets, chasers } = buildTacticalTargets(state.players, state.ball, owner, state.chasers, state.mentality, state.clockMs, { counter });
  state.chasers = chasers;
  for (const player of state.players) {
    const target = targets[player.id];
    player.behavior = target.behavior;
    if (target.behavior === 'OWNER') continue;
    moveToward(player, target, seconds, player.isGK ? 1.05 : target.behavior === 'PRESS' || target.behavior === 'RECEIVE' ? 1 : 0.76);
  }
  maintainSpacing(state.players, owner?.id);
}

function interceptFlight(state, start, random) {
  const ball = state.ball;
  const candidates = state.players.filter(player => !(player.id === ball.ignoredId && ball.ignoreMs > 0) && !(ball.shotTeam !== null && ball.shotTeam !== undefined && !ball.rebounded && player.isUser === state.lastTouchUser)).map(player => {
    const { distance, t } = segmentDistance(player, start, ball);
    const radius = playerControlRadius(player);
    const height = (start.height || 0) + ((ball.height || 0) - (start.height || 0)) * t;
    const movingAway = t === 0 && (ball.x - start.x) * (player.x - start.x) + (ball.y - start.y) * (player.y - start.y) < 0;
    const aerialControl = ball.aerialDelivery && player.id === ball.targetId && player.isUser === state.lastTouchUser;
    const reachable = !movingAway && distance <= radius && height <= (player.isGK ? 180 : aerialControl ? 230 : 95);
    return { player, distance, t, reachable };
  }).filter(candidate => candidate.reachable).sort((a, b) => a.t - b.t || a.distance - b.distance);
  if (!candidates.length) return false;
  const player = candidates[0].player;
  const previousUser = state.lastTouchUser;
  const speed = Math.hypot(ball.vx, ball.vy);
  const shot = ball.shotTeam !== null && ball.shotTeam !== undefined && player.isUser !== previousUser;
  const parryChance = player.isGK ? clamp(0.18 + speed / 18_000 + (100 - player.grl) / 450, 0.2, 0.45) : 0.24;
  if (shot && speed > 900 && !ball.deflected && random() < parryChance) {
    const goalY = previousUser ? GOAL_Y_TOP : GOAL_Y_BOT;
    const towardGoal = previousUser ? -1 : 1;
    const side = ball.vx > 0 ? 1 : ball.vx < 0 ? -1 : player.x >= PITCH_W / 2 ? 1 : -1;
    const destination = { x: PITCH_W / 2 + side * (player.isGK ? 1800 : 2200), y: goalY + towardGoal * 100 };
    const length = Math.hypot(destination.x - player.x, destination.y - player.y);
    state.ball = { x: player.x, y: player.y, vx: (destination.x - player.x) / length * speed * 0.62, vy: (destination.y - player.y) / length * speed * 0.62, owner: null, height: 0, airborne: false, shotTeam: null, targetId: null, ignoredId: player.id, ignoreMs: 280, flightAgeMs: 0, rebounded: true, deflected: true };
    state.lastTouchUser = player.isUser;
    state.lastTouchId = player.id;
    state.lastTouchPlayer = actionAuthor(player);
    recordStat(state, player, player.isGK ? 'saves' : 'recoveries');
    recordMatchEvent(state, player.isGK ? 'SAVE' : 'BLOCK', player, { deflected: true, playStyle: player.isGK ? 'PARRY' : 'SHOT_BLOCK' });
    showMatchMessage(state, player.isGK ? '¡EL ARQUERO DESVÍA!' : '¡REMATE BLOQUEADO!', 1500);
    return true;
  }
  if (ball.passFrom && previousUser === player.isUser && player.id !== ball.ignoredId) {
    const passStats = state.playerStats[ball.passFrom];
    if (passStats) passStats.passesCompleted += 1;
    const passer = state.players.find(candidate => statKey(candidate) === ball.passFrom);
    if (passer) state.wallReturn = { recipient: player.id, passer: passer.id, until: state.clockMs + 1800 };
  } else if (previousUser !== player.isUser) recordStat(state, player, player.isGK ? 'saves' : 'recoveries');
  givePossession(state, player, ball.fromUserInput || (state.nextUserTurnMs <= 0 && !player.isGK));
  if (previousUser !== player.isUser) markRecovery(state, player, 'INTERCEPTION');
  else recordMatchEvent(state, player.isGK ? 'SAVE' : 'RECEPTION', player, { aerial: Boolean(ball.aerialDelivery) });
  showMatchMessage(state, player.isGK ? '¡ATAJADA!' : state.phase === 'WAITING_USER_INPUT' ? 'TU TURNO' : player.isUser ? 'CIRCULACIÓN DEL BALÓN' : previousUser === player.isUser ? 'PASE RIVAL' : 'RIVAL RECUPERA');
  return true;
}

function scoreGoal(state, scoreIndex) {
  state.score[scoreIndex] += 1;
  const scorer = state.lastTouchPlayer || state.players.find(player => player.id === state.lastTouchId);
  if (scorer && scorer.isUser === (scoreIndex === 0)) recordStat(state, scorer, 'goals');
  if (scoreIndex === 0 && scorer?.isUser) {
    const scorerId = scorer.sourceId || scorer.id;
    const previous = state.tracker[scorerId];
    state.tracker[scorerId] = { name: scorer.name, g: (previous?.g || 0) + 1 };
  }
  state.phase = 'GOAL';
  state.transitionTimer = 2000;
  state.restartUser = scoreIndex === 1;
  state.ball.owner = null;
  state.ball.vx = 0;
  state.ball.vy = 0;
  recordMatchEvent(state, 'GOAL', scorer, { score: [...state.score], scoringTeam: scoreIndex === 0 ? 'USER' : 'RIVAL', ownGoal: scorer?.isUser !== (scoreIndex === 0) });
  state.goalEvent = { ...state.lastEvent, score: [...state.score] };
  showMatchMessage(state, scoreIndex === 0 ? '¡GOOOOL!' : 'GOL DEL RIVAL', 2000);
}

function aiAction(state, owner, seconds, random) {
  const direction = owner.isUser ? -1 : 1;
  const goalY = owner.isUser ? GOAL_Y_TOP : GOAL_Y_BOT;
  const opponents = state.players.filter(player => player.isUser !== owner.isUser && !player.isGK);
  const pressure = Math.min(...opponents.map(player => Math.hypot(player.x - owner.x, player.y - owner.y)), 5000);
  state.actionTimer -= seconds * 1000;
  if (pressure < 350 && state.possessionMs > 220 && !state.pressureResponded) {
    state.actionTimer = Math.min(state.actionTimer, 150);
    state.pressureResponded = true;
  }
  if (owner.isUser && state.nextUserTurnMs <= 0 && !owner.isGK && (owner.role === 'ATT' || owner.y < PITCH_H * 0.48)) {
    givePossession(state, owner);
    showMatchMessage(state, '¡TU OPORTUNIDAD!');
    return;
  }
  if (state.actionTimer <= 0) {
    const keeper = state.players.find(player => player.isGK && player.isUser !== owner.isUser);
    const decision = chooseAiPlay(state.players, owner, { random, pressure, canShoot: canUseMatchOpportunity(state, owner.isUser), mentality: owner.isUser ? state.mentality : 'NORMAL', lastTargetId: state.lastPassTarget[owner.id], returnToId: state.wallReturn?.recipient === owner.id && state.wallReturn.until > state.clockMs ? state.wallReturn.passer : null, counter: state.attackTransition?.isUser === owner.isUser && state.attackTransition.untilMs > state.clockMs, restart: state.setPiece?.untilMs > state.clockMs ? state.setPiece : null });
    state.lastPlayType = decision.style || decision.type;
    if (decision.type === 'SHOT') {
      const farSide = keeper ? keeper.x >= PITCH_W / 2 ? -1 : 1 : random() < 0.5 ? -1 : 1;
      const side = random() < 0.7 ? farSide : -farSide;
      const targetX = PITCH_W / 2 + side * (260 + random() * 130);
      releaseBall(state, owner, { x: clamp(targetX, GOAL_X_MIN + 100, GOAL_X_MAX - 100), y: goalY + direction * 35 }, 2500 + owner.grl * 3, null, random, { shot: true, pressure, style: decision.style, freelyChosen: decision.freelyChosen });
      return;
    }
    const teammate = decision.target;
    if (decision.type === 'PASS' && teammate) {
      releaseBall(state, owner, teammate, clamp(1700 + Math.hypot(teammate.x - owner.x, teammate.y - owner.y) * 0.45, 1900, decision.aerial ? 3600 : 2900), teammate.id, random, { aerial: decision.aerial, style: decision.style });
      const labels = { COUNTER: '¡SALEN A LA CONTRA!', CUTBACK: 'PASE ATRÁS AL ÁREA', CROSS: 'CENTRO AL ÁREA', SWITCH: 'CAMBIO DE FRENTE', WIDE: 'ABREN LA CANCHA', WALL: 'PARED', THROUGH: 'PASE FILTRADO', OVERLAP: 'DESDOBLAMIENTO', DIAGONAL: 'DIAGONAL AL ESPACIO', LONG: 'SAQUE LARGO', RECYCLE: 'REORGANIZAN EL ATAQUE' };
      showMatchMessage(state, decision.style?.startsWith('CORNER_') ? decision.aerial ? '¡CENTRO DE ESQUINA!' : 'ESQUINA EN CORTO' : labels[decision.style] || 'PASE AL ESPACIO', 1100);
      return;
    }
    owner.driveTarget = decision.target || null;
    state.playCounts[decision.style] = (state.playCounts[decision.style] || 0) + 1;
    state.actionTimer = playerDecisionDelay(owner, 650 + random() * 550);
  }
  const nearest = opponents.sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y))[0];
  const awayFromPressure = nearest && pressure < 1000 ? (owner.x < nearest.x ? -420 : 420) : 0;
  const driveTarget = owner.driveTarget || clampPitchPoint({ x: owner.x * 0.86 + (Math.abs(owner.y - goalY) < 2000 ? PITCH_W / 2 : owner.baseX) * 0.14 + awayFromPressure, y: goalY - direction * Math.max(320, Math.abs(owner.y - goalY) - 700) });
  moveToward(owner, driveTarget, seconds, owner.isGK ? 0.3 : 0.9);
}

function tryTackle(state, owner, delta, random) {
  state.possessionMs += delta;
  state.tackleDelay = Math.max(0, (state.tackleDelay || 0) - delta);
  if (state.tackleDelay > 0 || state.possessionMs < 550) return;
  const pressingId = state.chasers[owner.isUser ? 'rival' : 'user'];
  const presser = state.players.find(player => player.id === pressingId);
  if (presser && Math.hypot(presser.x - owner.x, presser.y - owner.y) < playerTackleRadius(presser)) {
    state.tackleDelay = 650;
    const chance = clamp(0.36 + (presser.grl - owner.grl) * 0.006 + (presser.role === 'DEF' ? 0.06 : 0) + (100 - (owner.rawStamina ?? 100)) * 0.0015, 0.18, 0.6);
    if (random() > chance) return;
    recordStat(state, presser, 'recoveries');
    givePossession(state, presser, state.nextUserTurnMs <= 0);
    markRecovery(state, presser);
    state.tackleDelay = 550;
    state.cooldown = 1800;
    showMatchMessage(state, presser.isUser ? '¡BALÓN RECUPERADO!' : '¡RIVAL RECUPERA!');
  }
}

function handleBallOut(state, contact, random) {
  const endLine = contact.edge === 'TOP' || contact.edge === 'BOTTOM';
  const defendingUser = contact.edge === 'BOTTOM';
  if (endLine && state.lastTouchUser !== defendingUser && beginGoalKickSetup(state, defendingUser)) {
    const keeper = state.players.find(player => player.id === state.restartData.carrierId);
    recordMatchEvent(state, 'GOAL_KICK', keeper);
    showMatchMessage(state, 'SAQUE DE META', 1800);
  } else if (beginFieldRestart(state, contact, random)) {
    const taker = state.players.find(player => player.id === state.restartData.carrierId);
    recordMatchEvent(state, state.restartData.kind, taker, { routine: state.restartData.routine });
    showMatchMessage(state, state.restartData.kind === 'CORNER' ? 'TIRO DE ESQUINA' : 'SAQUE DE BANDA', 1600);
  } else {
    state.ball = { ...state.ball, ...clampPitchPoint(contact), vx: 0, vy: 0, height: 0, airborne: false };
    state.phase = 'SIMULATING';
  }
}

function advanceFlight(state, seconds, delta, random) {
  const ball = state.ball;
  const startingHeight = ball.height || 0;
  ball.ignoreMs = Math.max(0, (ball.ignoreMs || 0) - delta);
  ball.flightAgeMs = (ball.flightAgeMs || 0) + delta;
  const progress = ball.airDurationMs ? clamp(ball.flightAgeMs / ball.airDurationMs, 0, 1) : 1;
  const endHeight = ball.airborne ? Math.sin(Math.PI * progress) * ball.airPeak : 0;
  if (progress >= 1) ball.airborne = false;
  let remainingSeconds = seconds;
  let fromHeight = startingHeight;
  for (let collision = 0; collision < 3 && remainingSeconds > 0; collision++) {
    const start = { x: ball.x, y: ball.y, height: fromHeight };
    const speed = Math.hypot(ball.vx, ball.vy);
    const travel = Math.min(speed * remainingSeconds, Number.isFinite(ball.travelRemaining) ? ball.travelRemaining : Infinity);
    const duration = speed > 0 ? travel / speed : 0;
    const end = { x: start.x + ball.vx * duration, y: start.y + ball.vy * duration, height: endHeight };
    const boundary = traceBallBoundary(start, end);
    const post = detectPostContact(start, end);
    const contact = post && (!boundary || post.t < boundary.t) ? post : boundary;
    const travelledFraction = contact?.t ?? 1;
    ball.x = start.x + (end.x - start.x) * travelledFraction;
    ball.y = start.y + (end.y - start.y) * travelledFraction;
    ball.height = fromHeight + (endHeight - fromHeight) * travelledFraction;
    if (Number.isFinite(ball.travelRemaining)) ball.travelRemaining = Math.max(0, ball.travelRemaining - travel * travelledFraction);
    if (interceptFlight(state, start, random)) return;
    if (contact?.type === 'POST') {
      Object.assign(ball, reflectBallVelocity(ball, contact.normal));
      ball.rebounded = true;
      ball.x = contact.x + contact.normal.x;
      ball.y = contact.y + contact.normal.y;
      remainingSeconds *= 1 - contact.t;
      fromHeight = ball.height;
      const shooter = state.lastTouchPlayer || state.players.find(player => player.id === state.lastTouchId);
      recordMatchEvent(state, 'POST', shooter);
      showMatchMessage(state, '¡AL PALO!', 1200);
      continue;
    }
    if (contact?.type === 'GOAL') { scoreGoal(state, contact.scoreIndex); return; }
    if (contact?.type === 'OUT') { handleBallOut(state, contact, random); return; }
    ball.height = endHeight;
    if (ball.travelRemaining === 0) { ball.vx = 0; ball.vy = 0; ball.height = 0; ball.airborne = false; }
    else { ball.vx *= Math.exp(-0.14 * seconds); ball.vy *= Math.exp(-0.14 * seconds); }
    return;
  }
}

export function stepMatch(state, delta, random = Math.random) {
  if (state.isPaused || state.finished || state.phase === 'READY' || delta <= 0) return;
  const seconds = delta / 1000;
  state.msgTimer = Math.max(0, state.msgTimer - delta);
  if (!state.msgTimer) state.msg = '';
  if (state.phase === 'HALFTIME') return;
  if (state.phase === 'OUT') {
    if (advanceFieldRestart(state, delta)) {
      const taker = state.players.find(player => player.id === state.restartData?.carrierId);
      if (taker) {
        givePossession(state, taker, taker.isUser);
        state.setPiece = { ...state.restartData, targets: undefined, untilMs: state.clockMs + 6500 };
        state.actionTimer = 380;
        showMatchMessage(state, state.restartData.kind === 'CORNER' ? taker.isUser ? 'ESQUINA · CENTRA, JUEGA CORTO O REMATA' : 'EL RIVAL PREPARA LA ESQUINA' : 'SAQUE DE BANDA', 1800);
      } else restartPlay(state, state.restartUser);
      state.cooldown = 2000;
    }
    return;
  }
  if (state.phase === 'GOAL') {
    state.transitionTimer -= delta;
    if (state.transitionTimer <= 0) {
      beginKickoffSetup(state); showMatchMessage(state, 'SAQUE DE MEDIO', 1000);
    }
    return;
  }
  if (state.phase === 'KICKOFF_SETUP') {
    if (advanceKickoffSetup(state, delta)) { restartPlay(state, state.restartUser); state.cooldown = 3500; }
    return;
  }
  if (state.phase === 'GOAL_KICK') {
    if (advanceGoalKickSetup(state, delta)) {
      const keeper = state.players.find(player => player.id === state.restartData.carrierId);
      if (keeper) givePossession(state, keeper, keeper.isUser);
      else restartPlay(state, state.restartUser);
      showMatchMessage(state, 'SAQUE DE META · CORTO O LARGO', 1500);
    }
    return;
  }
  if (state.phase === 'WAITING_USER_INPUT') {
    const owner = state.players.find(player => player.id === state.ball.owner);
    const presser = owner && nearestOpponent(state, owner);
    if (presser) {
      presser.behavior = 'PRESS';
      const distance = Math.hypot(presser.x - owner.x, presser.y - owner.y);
      const contactDistance = playerTackleRadius(presser) + 85;
      if (distance > contactDistance) moveToward(presser, { x: owner.x + (presser.x - owner.x) / distance * contactDistance, y: owner.y + (presser.y - owner.y) / distance * contactDistance }, seconds, 0.92);
    }
    state.aimingMs += state.isAiming ? delta : 0;
    if (!state.isAiming || state.aimingMs > 3000) state.turnTimer = Math.max(0, state.turnTimer - delta);
    if (state.turnTimer <= 0) {
      beginTimeoutRecovery(state);
    }
    return;
  }
  state.clockMs += delta;
  state.cooldown = Math.max(0, state.cooldown - delta);
  state.nextUserTurnMs = Math.max(0, state.nextUserTurnMs - delta);
  if (state.half === 1 && state.clockMs >= HALF_DURATION_MS) {
    state.clockMs = HALF_DURATION_MS;
    state.phase = 'HALFTIME';
    state.isAiming = false;
    showMatchMessage(state, 'DESCANSO', 3000);
    return;
  }
  if (state.clockMs >= MATCH_DURATION_MS) {
    state.clockMs = MATCH_DURATION_MS;
    state.phase = 'FINISHED';
    state.finished = true;
    showMatchMessage(state, 'FINAL DEL PARTIDO', 3000);
    return;
  }
  const owner = state.players.find(player => player.id === state.ball.owner);
  moveTeam(state, seconds, owner);
  updateMatchFitness(state, delta);
  if (owner) {
    if (state.phase === 'TURNOVER_PRESS') {
      const presser = state.players.find(player => player.id === state.turnover?.presserId) || nearestOpponent(state, owner);
      if (!presser) { state.ball.owner = null; state.phase = 'SIMULATING'; }
      else {
        moveToward(presser, owner, seconds, 0.65);
        if (Math.hypot(presser.x - owner.x, presser.y - owner.y) <= playerTackleRadius(presser) + 15) {
          recordStat(state, presser, 'recoveries');
          givePossession(state, presser, false);
          markRecovery(state, presser, 'TIMEOUT');
          state.turnover = null;
          state.actionTimer = 500;
          state.tackleDelay = 850;
          state.nextUserTurnMs = 4500;
          showMatchMessage(state, '¡TE ROBARON EL BALÓN! · SALE LA CONTRA', 1900);
        }
      }
    } else if (state.phase === 'USER_DRIVING' && owner.target) {
      moveToward(owner, owner.target, seconds, 0.9);
      if (Math.hypot(owner.target.x - owner.x, owner.target.y - owner.y) < 35) givePossession(state, owner);
    } else aiAction(state, owner, seconds, random);
    if (state.ball.owner === owner.id) {
      state.ball.x = owner.x;
      state.ball.y = owner.y;
      if (state.phase !== 'TURNOVER_PRESS') tryTackle(state, owner, delta, random);
    }
  } else {
    advanceFlight(state, seconds, delta, random);
  }
  const cameraTarget = state.ball.owner || state.phase === 'BALL_FLIGHT' ? state.ball : pitchCenter();
  const easing = 1 - Math.exp(-5.5 * seconds);
  state.camera.x += (cameraTarget.x - state.camera.x) * easing;
  state.camera.y += (cameraTarget.y - state.camera.y) * easing;
}
