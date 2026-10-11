export function validateFantasySave(save) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(save) || !object(save.titulares) || !Array.isArray(save.reservas) || !object(save.standings) || !Array.isArray(save.fixture)) return false;
  if (!Number.isInteger(save.jornada_actual) || save.jornada_actual < 0 || save.jornada_actual >= save.fixture.length || save.fixture.length > 64) return false;
  if (typeof save.tactica !== 'string' || typeof save.club_id !== 'string') return false;
  if (save.energia_revision != null && (!Number.isSafeInteger(save.energia_revision) || save.energia_revision < 0)) return false;
  const players = [...Object.values(save.titulares).filter(Boolean), ...save.reservas];
  if (players.length === 0 || players.length > 100 || players.some(player => !object(player) || typeof player.id !== 'string' || typeof player.name !== 'string' || typeof player.pos !== 'string' || !Number.isFinite(player.grl) || player.grl < 0 || player.grl > 100 || !Number.isFinite(player.energia) || player.energia < 0 || player.energia > 100)) return false;
  if (new Set(players.map(player => player.id)).size !== players.length) return false;
  const teamIds = new Set(Object.keys(save.standings));
  if (!teamIds.has(save.club_id)) return false;
  return save.fixture.every(round => Array.isArray(round) && round.length <= 32 && round.every(match => object(match) && teamIds.has(match.local) && teamIds.has(match.visitante))) && Object.values(save.standings).every(team => object(team) && typeof team.id === 'string' && typeof team.name === 'string' && ['pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'pts', 'dg'].every(key => Number.isFinite(team[key])));
}
