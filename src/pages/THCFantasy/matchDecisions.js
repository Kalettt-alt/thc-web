import { PITCH_W, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { choosePassTarget } from './matchTactics.js';
import { clampPitchPoint, segmentDistance } from './matchGeometry.js';

const laneRoom = (opponents, from, to) => Math.min(...opponents.map(player => segmentDistance(player, from, to)).filter(projection => projection.t > 0.04 && projection.t < 0.96).map(projection => projection.distance), 1500);

export function buttonShotTarget(players, owner) {
  const keeper = players.find(player => player.isGK && player.isUser !== owner.isUser);
  const openSide = keeper ? keeper.x >= PITCH_W / 2 ? -1 : 1 : 0;
  return { x: PITCH_W / 2 + openSide * 315, y: owner.isUser ? GOAL_Y_TOP - 35 : GOAL_Y_BOT + 35 };
}

export function chooseAiPlay(players, owner, { random = Math.random, mentality = 'NORMAL', pressure = 5000, returnToId, canShoot = true, lastTargetId, counter = false, restart } = {}) {
  const direction = owner.isUser ? -1 : 1;
  const goalY = owner.isUser ? GOAL_Y_TOP : GOAL_Y_BOT;
  const distanceToGoal = Math.abs(owner.y - goalY);
  const opponents = players.filter(player => player.isUser !== owner.isUser && !player.isGK);
  const nearGoal = distanceToGoal < 1950 && Math.abs(owner.x - PITCH_W / 2) < 1650;
  const roll = random();
  const shotLane = laneRoom(opponents, owner, { x: PITCH_W / 2, y: goalY });
  const goodAngle = Math.abs(owner.x - PITCH_W / 2) <= Math.max(600, distanceToGoal * 0.95);
  const clearFinish = !owner.isGK && distanceToGoal < 1350 && goodAngle && shotLane > 240 && pressure > 380;
  if (restart?.kind === 'CORNER' && restart.carrierId === owner.id) {
    const target = players.find(player => player.id === restart.receiverId && player.isUser === owner.isUser);
    if (target) return { type: 'PASS', target, style: `CORNER_${restart.routine}`, aerial: restart.routine !== 'SHORT' };
  }
  // Clear finishes take precedence over recycling, even outside an ordinary AI
  // opportunity window. The manager's own shots are never limited by windows.
  if (clearFinish) return { type: 'SHOT', style: counter ? 'COUNTER_FINISH' : 'OPEN_FINISH', freelyChosen: true };
  const shotChance = mentality === 'OFENSIVA' ? 0.72 : mentality === 'DEFENSIVA' ? 0.4 : 0.57;
  if (!owner.isGK && nearGoal && canShoot && goodAngle && shotLane > 115 && (pressure > 300 || distanceToGoal < 650) && roll < shotChance) return { type: 'SHOT', style: distanceToGoal < 850 ? 'BOX_FINISH' : 'DISTANCE_SHOT' };
  if (owner.isGK) {
    const longTarget = choosePassTarget(players, owner, { style: 'LONG' });
    const shortTarget = choosePassTarget(players, owner, { style: 'FORWARD' });
    if (longTarget && (!shortTarget || pressure < 850 || roll > 0.48)) return { type: 'PASS', target: longTarget, style: 'LONG', aerial: true };
    if (shortTarget) return { type: 'PASS', target: shortTarget, style: 'BUILDUP' };
    return { type: 'DRIBBLE', style: 'KEEPER_CARRY', target: { x: owner.x, y: owner.y } };
  }
  const centralBlock = opponents.filter(player => (player.y - owner.y) * direction > 150 && (player.y - owner.y) * direction < 2000 && Math.abs(player.x - PITCH_W / 2) < 1150).length >= 2;
  const wideOwner = Math.abs(owner.x - PITCH_W / 2) > 1150;
  const nearByline = distanceToGoal < 950 && wideOwner;
  const crowdedWing = wideOwner && opponents.filter(player => Math.abs(player.x - owner.x) < 1050 && Math.abs(player.y - owner.y) < 1800).length >= 2;
  const forwardRoom = laneRoom(opponents, owner, { x: owner.x * 0.65 + PITCH_W * 0.175, y: owner.y + direction * 1000 });
  let style = counter ? 'COUNTER'
    : nearByline ? roll < 0.55 ? 'CUTBACK' : 'CROSS'
      : crowdedWing ? 'SWITCH'
        : returnToId && !nearGoal && roll < 0.28 ? 'WALL'
        : centralBlock && !wideOwner ? 'WIDE'
          : pressure < 430 ? forwardRoom > 220 ? 'THROUGH' : 'RECYCLE'
              : mentality === 'DEFENSIVA' && !nearGoal && roll < 0.22 ? 'RECYCLE'
                : roll > 0.85 ? 'DIAGONAL' : roll > 0.65 ? 'OVERLAP' : roll > 0.43 ? 'THROUGH' : 'FORWARD';
  const eligible = lastTargetId && style !== 'WALL' ? players.filter(player => player.id !== lastTargetId) : players;
  const targetOptions = { style, returnToId, minProgress: nearGoal && !nearByline ? -80 : undefined };
  let target = choosePassTarget(eligible, owner, targetOptions) || choosePassTarget(players, owner, targetOptions);
  if (!target && pressure < 430 && !nearGoal) {
    target = choosePassTarget(players, owner, { style: 'RECYCLE' });
    if (target) style = 'RECYCLE';
  }
  const usefulForwardPass = target && (target.y - owner.y) * direction > 250;
  const deliberateDelivery = ['SWITCH', 'WALL', 'CUTBACK', 'CROSS', 'WIDE', 'COUNTER'].includes(style);
  if (target && (pressure < 750 || deliberateDelivery || usefulForwardPass && roll > 0.35 || forwardRoom < 180)) return { type: 'PASS', target, style, aerial: style === 'CROSS' || style === 'SWITCH' && Math.abs(target.x - owner.x) > 2400 };
  const keeper = pressure < 260 && !target && !nearGoal ? choosePassTarget(players, owner, { style: 'RECYCLE', allowKeeper: true }) : null;
  if (keeper?.isGK) return { type: 'PASS', target: keeper, style: 'RELIEVE' };

  const reach = pressure < 750 ? 700 : 1050;
  const nextY = goalY - direction * Math.max(320, distanceToGoal - reach);
  const centralX = owner.x * (nearGoal ? 0.48 : 0.85) + PITCH_W / 2 * (nearGoal ? 0.52 : 0.15);
  const routes = [centralX, owner.x - 550, owner.x + 550].map(x => clampPitchPoint({ x, y: nextY }, 180));
  const drive = routes.sort((a, b) => laneRoom(opponents, owner, b) - laneRoom(opponents, owner, a) || Math.abs(a.x - PITCH_W / 2) - Math.abs(b.x - PITCH_W / 2))[0];
  return { type: 'DRIBBLE', style: counter ? 'COUNTER_CARRY' : centralBlock ? 'TAKE_ON' : nearGoal ? 'SET_UP_SHOT' : 'CARRY', target: drive };
}
