import { SKILL_PHYSICS as HAX, attackDirection, behindBall, clamp, clampBotTarget, distance, interceptPracticeBall, isKickAligned, kickRadius, predictPracticeBall, segmentClearance, wallPassPath } from './skillGeometry.js';

const emptyKeys = () => ({ w: false, a: false, s: false, d: false, kick: false });
const opponentFuture = opponent => opponent ? { ...opponent, x: opponent.x + (opponent.vx || 0) * 5, y: opponent.y + (opponent.vy || 0) * 5 } : null;

export function chooseDodgeSide(ball, opponent, previousSide = 0) {
  if (previousSide) return previousSide;
  if (Math.abs(ball.y) > HAX.BOUND_Y * 0.55) return ball.y > 0 ? -1 : 1;
  if (opponent && Math.abs(opponent.y - ball.y) > 12) return opponent.y > ball.y ? -1 : 1;
  if (opponent && Math.abs(opponent.vy || 0) > 0.4) return opponent.vy > 0 ? -1 : 1;
  return ball.y >= 0 ? -1 : 1;
}

export function chooseGoalAim(ball, opponent, team) {
  const dir = attackDirection(team);
  const safeY = HAX.GOAL_Y - HAX.BALL_RAD - 6 - 12;
  return [-safeY, 0, safeY].map(y => {
    const aim = { x: dir * (HAX.BOUND_X + 22), y };
    const clearance = segmentClearance(opponentFuture(opponent), ball, aim);
    return { aim, clearance, score: (Number.isFinite(clearance) ? clearance : 500) - distance(ball, aim) * 0.025 };
  }).sort((a, b) => b.score - a.score)[0];
}

export function chooseWallAction(ball, opponent, team, shot = false) {
  const dir = attackDirection(team);
  const candidates = [-1, 1].map(side => {
    const receive = shot ? chooseGoalAim(ball, opponent, team).aim : {
      x: clamp(ball.x + dir * 230, -HAX.BOUND_X + 100, HAX.BOUND_X - 100),
      y: clamp(ball.y * 0.48, -HAX.BOUND_Y + 100, HAX.BOUND_Y - 100),
    };
    const path = wallPassPath(ball, receive, side);
    const clearance = Math.min(segmentClearance(opponentFuture(opponent), ball, path.bounce), segmentClearance(opponentFuture(opponent), path.bounce, receive));
    const progress = (receive.x - ball.x) * dir;
    return { ...path, clearance, progress, side, score: Math.min(clearance, 500) - path.length * 0.11 };
  }).filter(path => path.progress > 75 && Math.abs(path.bounce.x) < HAX.BOUND_X - 30 && path.length < (shot ? 1080 : 800) && path.clearance > HAX.PLAYER_RAD + HAX.BALL_RAD + 13);
  const path = candidates.sort((a, b) => b.score - a.score)[0];
  return path ? { type: shot ? 'BANK_SHOT' : 'WALL_PASS', aim: path.aim, target: behindBall(ball, path.aim), receive: path.receive, side: path.side, kick: true } : null;
}

export function approachContact(bot, ball, target, aim, side) {
  const length = distance(ball, aim) || 1;
  const ux = (aim.x - ball.x) / length, uy = (aim.y - ball.y) / length;
  const ahead = (bot.x - ball.x) * ux + (bot.y - ball.y) * uy;
  if (distance(bot, ball) < 100 && ahead > -8) {
    const lateral = (bot.x - ball.x) * -uy + (bot.y - ball.y) * ux;
    const around = Math.abs(lateral) > 10 ? Math.sign(lateral) : side;
    return clampBotTarget({ x: ball.x - ux * 50 - uy * around * 53, y: ball.y - uy * 50 + ux * around * 53 });
  }
  return target;
}

export function decidePracticeAction(bot, ball, opponent, team, memory = {}) {
  const dir = attackDirection(team);
  const myGoal = { x: -dir * HAX.BOUND_X, y: 0 };
  const goal = chooseGoalAim(ball, opponent, team);
  const botDistance = distance(bot, ball);
  const oppDistance = opponent ? distance(opponent, ball) : Infinity;
  const owns = botDistance < 66 && botDistance < oppDistance + 16;
  const side = chooseDodgeSide(ball, opponent, memory.dodgeSide);
  const action = (type, aim, kick = false) => ({ type, aim, target: behindBall(ball, aim, ['DRIBBLE', 'FEINT', 'OLE'].includes(type) ? HAX.PLAYER_RAD + HAX.BALL_RAD - 4 : undefined), kick, side });
  if (owns) {
    const goalDistance = Math.abs(goal.aim.x - ball.x);
    if (goalDistance < 610 && goal.clearance > HAX.PLAYER_RAD + HAX.BALL_RAD + 12) return action('SHOOT', goal.aim, true);
    if (goalDistance < 430 && goal.clearance < 45) {
      const bank = chooseWallAction(ball, opponent, team, true);
      if (bank) return bank;
    }
    const challenge = opponent && oppDistance < 145 && (opponent.x - ball.x) * dir > -35;
    if (challenge) {
      if (Math.abs(ball.y) > 130 || (memory.dodgeAge || 0) > 28) {
        const wall = chooseWallAction(ball, opponent, team);
        if (wall) return wall;
      }
      const ole = (memory.dodgeAge || 0) >= 14;
      const aim = { x: ball.x + dir * (ole ? 145 : 65), y: clamp(ball.y + side * (ole ? 130 : 72), -HAX.BOUND_Y + 45, HAX.BOUND_Y - 45) };
      return action(ole ? 'OLE' : 'FEINT', aim, ole && oppDistance < 78 && segmentClearance(opponent, ball, aim) > HAX.PLAYER_RAD + HAX.BALL_RAD + 5);
    }
    return action('DRIBBLE', { x: ball.x + dir * 160, y: ball.y * 0.78 });
  }
  const danger = opponent && oppDistance + 14 < botDistance && (distance(ball, myGoal) < 470 || (ball.vx || 0) * dir < -2 && distance(ball, myGoal) < 680);
  if (danger) {
    const towardGoal = Math.max(1, distance(ball, myGoal));
    const target = { x: ball.x + (myGoal.x - ball.x) / towardGoal * 105, y: ball.y + (myGoal.y - ball.y) / towardGoal * 105 };
    target.x = clamp(target.x, -HAX.BOUND_X + 38, HAX.BOUND_X - 38);
    target.y = Math.abs(target.x) > HAX.BOUND_X - 120 ? clamp(target.y, -HAX.GOAL_Y + 25, HAX.GOAL_Y - 25) : target.y;
    return { type: 'DEFEND', target, aim: goal.aim, kick: isKickAligned(bot, ball, goal.aim, 0.55) };
  }
  const future = interceptPracticeBall(bot, ball);
  const aim = { x: future.x + dir * 180, y: future.y * 0.8 };
  return { type: 'INTERCEPT', target: behindBall(future, aim), aim, kick: false, side };
}

export class HaxBot {
  constructor(team) { this.team = team; this.reset(); }
  reset() {
    this.lastTeam = this.team;
    this.tick = 0; this.possessionTicks = 0; this.kickCooldown = 0;
    this.dodgeStart = null; this.dodgeSide = 0; this.recoverUntil = 0;
    this.lastTargetX = 0; this.lastTargetY = 0; this.lastDecision = 'INTERCEPT';
  }
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  predictBall(ball, ticks) { return predictPracticeBall(ball, ticks); }
  think(bot, ball, opponent, match = { state: 'playing' }) {
    if (this.lastTeam !== this.team) this.reset();
    this.tick++;
    this.kickCooldown = Math.max(0, this.kickCooldown - 1);
    const keys = emptyKeys();
    if (match.state === 'goal_scored') { this.reset(); return keys; }
    if (match.state === 'kickoff' && match.kickoffTeam !== this.team) {
      this.lastDecision = 'KICKOFF';
      return this.moveTo(-attackDirection(this.team) * 200, clamp(ball.y, -120, 120), bot, keys);
    }
    const close = distance(bot, ball) < 66 && (!opponent || distance(bot, ball) < distance(opponent, ball) + 16);
    this.possessionTicks = close ? this.possessionTicks + 1 : 0;
    let decision;
    if (this.tick < this.recoverUntil && !close && (!opponent || distance(opponent, ball) > 38)) {
      const target = interceptPracticeBall(bot, ball);
      decision = { type: 'RECOVER', target, aim: target, kick: false };
    } else {
      decision = decidePracticeAction(bot, ball, opponent, this.team, { dodgeAge: this.dodgeStart === null ? 0 : this.tick - this.dodgeStart, dodgeSide: this.dodgeSide });
    }
    if (decision.type === 'FEINT' || decision.type === 'OLE') {
      if (this.dodgeStart === null) { this.dodgeStart = this.tick; this.dodgeSide = decision.side; }
    } else { this.dodgeStart = null; this.dodgeSide = 0; }
    const target = decision.type === 'RECOVER' || decision.type === 'DEFEND' ? decision.target : approachContact(bot, ball, decision.target, decision.aim, decision.side || 1);
    const canKick = this.kickCooldown === 0 && distance(bot, ball) < kickRadius(bot, ball) && isKickAligned(bot, ball, decision.aim, decision.type === 'DEFEND' ? 0.55 : 0.22);
    keys.kick = Boolean(decision.kick && canKick);
    if (keys.kick) {
      this.kickCooldown = 14;
      this.recoverUntil = decision.type === 'WALL_PASS' ? this.tick + 115 : decision.type === 'OLE' ? this.tick + 70 : 0;
    }
    this.lastDecision = decision.type;
    this.lastTargetX = target.x; this.lastTargetY = target.y;
    return this.moveTo(target.x, target.y, bot, keys);
  }
  moveTo(tx, ty, bot, keys) {
    const target = clampBotTarget({ x: tx, y: ty });
    const dx = target.x - bot.x - (bot.vx || 0) * 5;
    const dy = target.y - bot.y - (bot.vy || 0) * 5;
    keys.a = dx < -2; keys.d = dx > 2; keys.w = dy < -2; keys.s = dy > 2;
    return keys;
  }
}
