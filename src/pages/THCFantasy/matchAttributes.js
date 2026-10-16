import { clamp } from './matchGeometry.js';

export const playerSkill = player => clamp(Number(player.grl) || 1, 1, 99) / 100;
export const playerEnergy = player => clamp(Number.isFinite(Number(player.rawStamina)) ? Number(player.rawStamina) : 100, 0, 100);

export function playerMatchSpeed(player) {
  return (520 + playerSkill(player) * 360) * (0.65 + playerEnergy(player) / 285) * (1 + (player.moraleBonus || 0));
}

export const playerEffortFactor = player => 1.12 - playerSkill(player) * 0.22;
export const playerDecisionDelay = (player, duration) => duration * (1.08 - playerSkill(player) * 0.16) * (1 + (100 - playerEnergy(player)) / 500);
export const playerControlRadius = player => ((player.isGK ? 98 : 70) + playerSkill(player) * (player.isGK ? 42 : 25)) * (0.85 + playerEnergy(player) * 0.0015);
export const playerTackleRadius = player => (88 + playerSkill(player) * 25) * (0.88 + playerEnergy(player) * 0.0012);

export function playerPassKick(player, target, speed, random = Math.random) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return { target: { x: target.x, y: target.y }, speed };
  const error = (random() - 0.5) * 2 * (1 - playerSkill(player)) * (45 + distance * 0.025) * (1 + (100 - playerEnergy(player)) / 200);
  return {
    target: { x: target.x - dy / distance * error, y: target.y + dx / distance * error },
    speed: speed * (0.92 + playerSkill(player) * 0.12)
  };
}

export function playerShotKick(player, target, speed, random = Math.random, { controlled = false, pressure = 5000 } = {}) {
  const fatigue = 100 - playerEnergy(player);
  const distance = Math.hypot(target.x - player.x, target.y - player.y);
  const angle = Math.abs(target.x - player.x) / Math.max(300, Math.abs(target.y - player.y));
  const rangeError = Math.max(0, distance - 1100) * (controlled ? 0.24 : 0.19);
  const angleError = Math.min(angle, 2.5) * (controlled ? 430 : 650);
  const spread = controlled
    ? 90 + (1 - playerSkill(player)) * 330 + fatigue * 1.1 + rangeError + angleError + (pressure < 450 ? 200 : 0)
    : 750 + (1 - playerSkill(player)) * 1850 + fatigue * 8 + rangeError + angleError + (pressure < 450 ? 380 : 0);
  return {
    target: { x: target.x + (random() - 0.5) * spread, y: target.y },
    speed: speed * (0.82 + playerSkill(player) * 0.2) * (0.85 + playerEnergy(player) * 0.0015)
  };
}
