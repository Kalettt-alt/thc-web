import { PITCH_W, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { choosePassTarget } from './matchTactics.js';
import { segmentDistance } from './matchGeometry.js';

export function chooseAiPlay(players, owner, { random = Math.random, mentality = 'NORMAL', pressure = 5000, returnToId, canShoot = true, lastTargetId } = {}) {
  const goalY = owner.isUser ? GOAL_Y_TOP : GOAL_Y_BOT;
  const nearGoal = Math.abs(owner.y - goalY) < 1850 && Math.abs(owner.x - PITCH_W / 2) < 1650;
  const roll = random();
  const shotChance = mentality === 'OFENSIVA' ? 0.62 : mentality === 'DEFENSIVA' ? 0.35 : 0.5;
  const shotLane = Math.min(...players.filter(player => player.isUser !== owner.isUser && !player.isGK).map(player => segmentDistance(player, owner, { x: PITCH_W / 2, y: goalY })).filter(projection => projection.t > 0.01 && projection.t < 0.95).map(projection => projection.distance), 1500);
  const goodAngle = Math.abs(owner.x - PITCH_W / 2) < 1150 || Math.abs(owner.y - goalY) < 700;
  if (!owner.isGK && nearGoal && canShoot && roll < shotChance && goodAngle && shotLane > 115 && (pressure > 300 || Math.abs(owner.y - goalY) < 650)) return { type: 'SHOT' };
  if (owner.isGK) {
    const longTarget = choosePassTarget(players, owner, { style: 'LONG' });
    const shortTarget = choosePassTarget(players, owner, { style: 'FORWARD' });
    if (longTarget && (!shortTarget || pressure < 850 || roll > 0.48)) return { type: 'PASS', target: longTarget, style: 'LONG', aerial: true };
    if (shortTarget) return { type: 'PASS', target: shortTarget, style: 'BUILDUP' };
    return { type: 'DRIBBLE', style: 'KEEPER_CARRY' };
  }
  const crowdedWing = Math.abs(owner.x - PITCH_W / 2) > 1000 && players.filter(p => p.isUser !== owner.isUser && Math.abs(p.x - owner.x) < 1300).length >= 3;
  const nearByline = Math.abs(owner.y - goalY) < 850 && Math.abs(owner.x - PITCH_W / 2) > 500;
  const escape = pressure < 430 ? choosePassTarget(players, owner, { style: 'FORWARD' }) : null;
  const hasExit = escape && (escape.y - owner.y) * (owner.isUser ? -1 : 1) > 500;
  const style = pressure < 430 ? hasExit ? 'FORWARD' : 'RECYCLE' : mentality === 'DEFENSIVA' && roll < 0.4 ? 'RECYCLE' : returnToId && roll < 0.28 ? 'WALL' : nearByline ? 'CUTBACK' : crowdedWing || roll > 0.8 ? 'SWITCH' : roll < 0.5 ? 'BALANCED' : roll > 0.68 ? 'THROUGH' : 'FORWARD';
  const eligible = lastTargetId && style !== 'WALL' ? players.filter(player => player.id !== lastTargetId) : players;
  const target = choosePassTarget(eligible, owner, { style, returnToId }) || choosePassTarget(players, owner, { style, returnToId });
  if (target && (pressure < 750 || ['SWITCH', 'WALL', 'CUTBACK'].includes(style) || roll > 0.42 || nearGoal && !canShoot)) return { type: 'PASS', target, style };
  const keeper = pressure < 260 && !target ? choosePassTarget(players, owner, { style: 'RECYCLE', allowKeeper: true }) : null;
  if (keeper?.isGK) return { type: 'PASS', target: keeper, style: 'RELIEVE' };
  return { type: 'DRIBBLE', style: 'CARRY' };
}
