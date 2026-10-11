import { FORMACIONES_XY, PITCH_W, PITCH_H, BOUND_LEFT, BOUND_RIGHT, BOUND_TOP, BOUND_BOT, GOAL_X_MIN, GOAL_X_MAX, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { clamp, clampPitchPoint, segmentDistance } from './matchGeometry.js';
import { calcGrlEfectivo } from './formacionesFantasy.js';
import { playerMatchSpeed } from './matchAttributes.js';

export function roleForSlot(slot, y) {
  if (slot === 'gk') return 'GK';
  if (/^(li|ld|dfc)/.test(slot)) return 'DEF';
  if (/^(dc|ei|ed)/.test(slot)) return 'ATT';
  return y >= 68 ? 'DEF' : y <= 35 ? 'ATT' : 'MID';
}

const playerRole = player => /^(GK|POR)$/.test(player?.pos) ? 'GK' : /^(DEF|DFC|LI|LD|CB|LB|RB)$/.test(player?.pos) ? 'DEF' : /^(DEL|DC|EI|ED|ST|LW|RW|CF)$/.test(player?.pos) ? 'ATT' : 'MID';

function makeTeam(entries, layout, isUser, color) {
  const available = entries.map(([key, player]) => ({ key, player })).filter(entry => entry.player);
  return Object.entries(layout).flatMap(([slot, position]) => {
    const role = roleForSlot(slot, position.y);
    let index = available.findIndex(entry => entry.key === slot);
    if (index < 0) index = available.findIndex(entry => playerRole(entry.player) === role);
    if (index < 0) index = available.findIndex(entry => role === 'GK' || playerRole(entry.player) !== 'GK');
    if (index < 0) return [];
    const { key, player } = available.splice(index, 1)[0];
    const baseX = BOUND_LEFT + position.x / 100 * (BOUND_RIGHT - BOUND_LEFT);
    const baseY = BOUND_TOP + (isUser ? position.y : 100 - position.y) / 100 * (BOUND_BOT - BOUND_TOP);
    const baseGrl = clamp(Number(player.grl) || 70, 1, 99);
    const grl = calcGrlEfectivo({ ...player, grl: baseGrl }, { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'DEL' }[role]);
    const rawStamina = clamp(Number.isFinite(Number(player.energia)) ? Number(player.energia) : 100, 0, 100);
    return [{ id: `${isUser ? 'loc' : 'vis'}_${key}`, sourceId: player.id, careerData: { ...player }, slot, isUser, isGK: role === 'GK', role, baseX, baseY, x: baseX, y: baseY, speed: playerMatchSpeed({ grl, rawStamina }), color, name: player.name || 'Jugador', grl, rawStamina, initialStamina: rawStamina, moraleBonus: 0, target: null }];
  });
}

export function createMatchPlayers(titularesMap, rival, tactica, miClub) {
  const rivalRoster = rival?.titulares || [];
  const preferredFormation = rival?.tactica || rival?.formation;
  const naturalRoles = rivalRoster.map(playerRole);
  const rivalFormation = FORMACIONES_XY[preferredFormation] ? preferredFormation : Object.keys(FORMACIONES_XY).sort((a, b) => {
    const mismatch = formation => {
      const required = Object.entries(FORMACIONES_XY[formation]).map(([slot, position]) => roleForSlot(slot, position.y));
      return ['GK', 'DEF', 'MID', 'ATT'].reduce((sum, role) => sum + Math.abs(required.filter(value => value === role).length - naturalRoles.filter(value => value === role).length), 0);
    };
    return mismatch(a) - mismatch(b);
  })[0];
  return [
    ...makeTeam(Object.entries(titularesMap || {}), FORMACIONES_XY[tactica] || FORMACIONES_XY['4-3-3 OFENSIVO'], true, miClub?.color || '#F47A20'),
    ...makeTeam(rivalRoster.map((player, index) => [String(index), player]), FORMACIONES_XY[rivalFormation], false, rival?.color || '#64748b')
  ];
}

export function chooseChaser(players, point, isUser, previousId) {
  return players.filter(player => player.isUser === isUser && !player.isGK).reduce((best, player) => {
    const score = Math.hypot(player.x - point.x, player.y - point.y) - (player.id === previousId ? 180 : 0);
    return !best || score < best.score ? { id: player.id, score } : best;
  }, null)?.id || null;
}

export function buildTacticalTargets(players, ball, owner, previousChasers = {}, mentality = 'NORMAL', elapsedMs = 0) {
  const predictedBall = clampPitchPoint({ x: ball.x + (ball.vx || 0) * 0.13, y: ball.y + (ball.vy || 0) * 0.13 });
  const chasers = {
    user: !owner || !owner.isUser ? chooseChaser(players, predictedBall, true, previousChasers.user) : null,
    rival: !owner || owner.isUser ? chooseChaser(players, predictedBall, false, previousChasers.rival) : null
  };
  const targets = {};
  for (const player of players) {
    const direction = player.isUser ? -1 : 1;
    const ownGoal = player.isUser ? GOAL_Y_BOT : GOAL_Y_TOP;
    const goal = player.isUser ? GOAL_Y_TOP : GOAL_Y_BOT;
    if (owner?.id === player.id) { targets[player.id] = { x: player.x, y: player.y, behavior: 'OWNER' }; continue; }
    if (player.isGK) {
      const nearBox = Math.abs(ball.y - ownGoal) < 1250;
      const reacted = (ball.flightAgeMs || 0) >= 140 + (100 - player.grl) * 4;
      const movingToGoal = !owner && reacted && (player.isUser ? ball.vy > 0 : ball.vy < 0);
      const timeToGoal = movingToGoal ? clamp((ownGoal - ball.y) / ball.vy, 0, 1.5) : 0;
      const targetX = !owner && !reacted && Math.hypot(ball.vx || 0, ball.vy || 0) > 300 ? player.x : movingToGoal ? ball.x + ball.vx * timeToGoal : PITCH_W / 2 + (ball.x - PITCH_W / 2) * (nearBox ? 0.72 : 0.18);
      targets[player.id] = {
        x: clamp(targetX, GOAL_X_MIN + 70, GOAL_X_MAX - 70),
        y: ownGoal + (player.isUser ? -1 : 1) * (movingToGoal ? 65 : nearBox ? clamp(Math.abs(ball.y - ownGoal) * 0.18, 85, 300) : 170),
        behavior: 'KEEPER'
      };
      continue;
    }
    if (ball.targetId === player.id && !owner) {
      targets[player.id] = { ...clampPitchPoint({ x: ball.targetX, y: ball.targetY }), behavior: 'RECEIVE' };
      continue;
    }
    if (chasers[player.isUser ? 'user' : 'rival'] === player.id) {
      targets[player.id] = { ...predictedBall, behavior: 'PRESS' };
      continue;
    }
    const inPossession = owner && owner.isUser === player.isUser;
    const approach = player.isUser ? mentality : 'NORMAL';
    let y = player.baseY + (ball.y - PITCH_H / 2) * (player.role === 'DEF' ? 0.2 : 0.38);
    let x = player.baseX + (ball.x - PITCH_W / 2) * 0.12;
    if (inPossession) {
      if (player.role === 'ATT') y = owner.y + direction * (approach === 'OFENSIVA' ? 1150 : approach === 'DEFENSIVA' ? 550 : 850);
      if (player.role === 'MID') {
        const overlaps = player.slot !== 'mcd' && player.id !== owner.id && (player.baseX < PITCH_W / 2) !== (owner.x < PITCH_W / 2);
        y = owner.y + direction * (overlaps && approach !== 'DEFENSIVA' ? 300 : -(player.slot === 'mcd' ? 950 : approach === 'DEFENSIVA' ? 800 : 480));
      }
      if (player.role === 'DEF') y = player.isUser ? Math.max(y, owner.y + (approach === 'DEFENSIVA' ? 1650 : 1250)) : Math.min(y, owner.y - 1250);
      if (Math.abs(x - owner.x) < 350 && player.role !== 'DEF') x += player.baseX < PITCH_W / 2 ? -430 : 430;
      if (owner.isGK) {
        if (player.role === 'DEF') y = ownGoal + direction * (850 + Math.abs(player.baseX - PITCH_W / 2) * 0.14);
        if (player.role === 'MID') y = ownGoal + direction * 2350;
      } else if (player.role !== 'DEF') {
        const defenders = players.filter(opponent => opponent.isUser !== player.isUser && !opponent.isGK);
        const wave = Math.sin(elapsedMs / 2200 + player.baseX / 430) * 100;
        const candidate = clampPitchPoint({ x: x + wave, y });
        const laneClearance = point => Math.min(...defenders.map(opponent => segmentDistance(opponent, owner, point)).filter(projection => projection.t > 0.1).map(projection => projection.distance), 1000);
        const options = [candidate, clampPitchPoint({ x: candidate.x + (candidate.x < owner.x ? -350 : 350), y: candidate.y + direction * 180 })];
        const open = options.sort((a, b) => laneClearance(b) - laneClearance(a))[0];
        x = open.x; y = open.y;
      }
    } else if (owner) {
      if (player.role === 'DEF') y = player.isUser ? Math.max(player.baseY - 1800, owner.y + 650) : Math.min(player.baseY + 1800, owner.y - 650);
      if (player.role === 'MID') y = owner.y + direction * 380;
      if (player.role === 'ATT') y = player.baseY + (owner.y - PITCH_H / 2) * 0.15;
    }
    if (player.role === 'ATT') y = player.isUser ? Math.max(goal + 420, y) : Math.min(goal - 420, y);
    targets[player.id] = { ...clampPitchPoint({ x, y }, 150), behavior: inPossession ? 'SUPPORT' : 'SHAPE' };
  }
  return { targets, chasers };
}

export function moveToward(player, target, seconds, speedFactor = 1) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) return;
  const travel = Math.min(distance, player.speed * speedFactor * seconds);
  player.x += dx / distance * travel;
  player.y += dy / distance * travel;
}

export function maintainSpacing(players, ownerId) {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (a.isGK || b.isGK || a.isUser !== b.isUser) continue;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance >= 400) continue;
      const dx = distance > 0.001 ? (b.x - a.x) / distance : (a.id < b.id ? 1 : -1);
      const dy = distance > 0.001 ? (b.y - a.y) / distance : 0;
      const push = (400 - distance) / (a.id === ownerId || b.id === ownerId ? 1 : 2);
      if (a.id !== ownerId) { a.x -= dx * push; a.y -= dy * push; }
      if (b.id !== ownerId) { b.x += dx * push; b.y += dy * push; }
    }
  }
  for (const player of players) Object.assign(player, clampPitchPoint(player, 70));
}

export function choosePassTarget(players, owner, { style = 'BALANCED', returnToId, allowKeeper = false } = {}) {
  const opponents = players.filter(player => player.isUser !== owner.isUser);
  const direction = owner.isUser ? -1 : 1;
  return players.filter(player => player.isUser === owner.isUser && player.id !== owner.id && (!player.isGK || allowKeeper)).map(player => {
    const distance = Math.hypot(player.x - owner.x, player.y - owner.y);
    const clearance = Math.min(...opponents.map(opponent => segmentDistance(opponent, owner, player)).filter(projection => projection.t > 0.035).map(projection => projection.distance), 1500);
    const progress = (player.y - owner.y) * direction;
    const lateralChange = Math.abs(player.x - owner.x);
    const marked = Math.min(...opponents.map(opponent => Math.hypot(opponent.x - player.x, opponent.y - player.y)), 1500);
    const preference = style === 'RECYCLE' ? -progress * 0.45 - distance * 0.08 : style === 'SWITCH' ? lateralChange * 0.6 : style === 'WALL' && player.id === returnToId ? 1400 : style === 'FORWARD' || style === 'THROUGH' ? progress * 0.65 : style === 'LONG' ? progress * 0.9 + distance * 0.1 : style === 'CUTBACK' ? -progress * 0.35 + (player.role === 'MID' ? 420 : 0) : 0;
    return { player, score: clearance * (style === 'LONG' ? 0.25 : 0.65) + Math.min(marked, 800) * 0.25 + progress * 0.24 - distance * 0.17 + preference - (player.isGK ? 1200 : 0), distance, clearance, progress };
  }).filter(candidate => candidate.distance > 280 && candidate.distance < (style === 'LONG' ? 5200 : 3000) && (style === 'LONG' ? candidate.progress > 1400 : candidate.clearance > 110)).sort((a, b) => b.score - a.score)[0]?.player || null;
}
