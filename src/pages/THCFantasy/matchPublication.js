export function matchPublicationKey(state) {
  return JSON.stringify([state.phase, state.isPaused, state.msg, state.score[0], state.score[1], state.formation, state.mentality, state.turnId, state.substitutionsUsed, state.teamTalkCount, state.lastEvent?.id]);
}

export function shouldPublishMatchState(state, previousKey, previousTime, time) {
  if (matchPublicationKey(state) !== previousKey) return true;
  const active = !state.isPaused && !state.finished && ['SIMULATING', 'KICKOFF_SETUP', 'GOAL_KICK', 'WAITING_USER_INPUT', 'USER_DRIVING', 'BALL_FLIGHT'].includes(state.phase);
  return active && time - previousTime >= 1000 / 30;
}
