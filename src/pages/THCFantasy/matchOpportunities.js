import { MATCH_DURATION_MS, MAX_MATCH_OPPORTUNITIES, GOAL_X_MIN, GOAL_X_MAX, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';
import { clamp } from './matchGeometry.js';
import { playerEnergy } from './matchAttributes.js';

export function teamMatchStrength(players, isUser) {
  const team = players.filter(player => player.isUser === isUser);
  if (!team.length) return 75;
  return team.reduce((sum, player) => sum + clamp(Number(player.grl), 1, 99) * (0.82 + playerEnergy(player) * 0.0018), 0) / team.length;
}

export function createMatchOpportunities(players) {
  const difference = teamMatchStrength(players, true) - teamMatchStrength(players, false);
  const adjustment = Math.abs(difference) < 6 ? 0 : Math.abs(difference) < 18 ? Math.sign(difference) : 2 * Math.sign(difference);
  const entry = limit => ({ limit: clamp(limit, 3, MAX_MATCH_OPPORTUNITIES), used: 0, nextAtMs: 0 });
  return { user: entry(5 + adjustment), rival: entry(5 - adjustment) };
}

export function canUseMatchOpportunity(state, isUser) {
  const entry = state.opportunities?.[isUser ? 'user' : 'rival'];
  return !entry || (entry.used < entry.limit && state.clockMs + 0.001 >= entry.nextAtMs);
}

export function consumeMatchOpportunity(state, isUser) {
  state.opportunities ||= createMatchOpportunities(state.players);
  if (!canUseMatchOpportunity(state, isUser)) return false;
  const entry = state.opportunities[isUser ? 'user' : 'rival'];
  entry.used += 1;
  entry.nextAtMs = Math.max(state.clockMs + 9000, MATCH_DURATION_MS * entry.used / (entry.limit + 0.5));
  return true;
}

export function shotTeamForKick(owner, target, receiverId = null) {
  if (receiverId || owner.isGK) return null;
  const dy = target.y - owner.y;
  if (Math.abs(dy) < 1) return null;
  for (const [goalY, isUser] of [[GOAL_Y_TOP, true], [GOAL_Y_BOT, false]]) {
    const towardGoal = (goalY - owner.y) * dy > 0;
    if (!towardGoal) continue;
    const xAtGoal = owner.x + (target.x - owner.x) * (goalY - owner.y) / dy;
    const towardMouth = xAtGoal >= GOAL_X_MIN - 250 && xAtGoal <= GOAL_X_MAX + 250;
    const finalThirdAttempt = isUser === owner.isUser && Math.abs(goalY - owner.y) < 2600 && Math.abs(xAtGoal - 3000) < 2200;
    if (towardMouth || finalThirdAttempt) return isUser;
  }
  return null;
}
