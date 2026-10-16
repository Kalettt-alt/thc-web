export function validOnlineMatchUT(match) {
  if (!match?.home || !match?.away || !Array.isArray(match.events) ||
    !Number.isInteger(match.home_goals) || !Number.isInteger(match.away_goals) ||
    match.home_goals < 0 || match.home_goals > 6 || match.away_goals < 0 || match.away_goals > 6) return false;

  let activeSeconds = match.simulation_version >= 3 ? 120 : 180;
  let halftimeSeconds = match.simulation_version >= 2 ? match.halftime_seconds ?? 12 : 0;
  if (match.simulation_version >= 4) {
    activeSeconds = match.active_duration_seconds;
    if (!Number.isInteger(activeSeconds) || activeSeconds < 128 || activeSeconds > 136 || activeSeconds % 2 !== 0 ||
      (match.first_half_seconds !== undefined && match.first_half_seconds !== activeSeconds / 2) ||
      (match.duration_seconds !== undefined && match.duration_seconds !== 120) || halftimeSeconds !== 12) return false;
    halftimeSeconds = 12;
  }
  return Date.parse(match.ends_at) - Date.parse(match.started_at) === (activeSeconds + halftimeSeconds) * 1000;
}
