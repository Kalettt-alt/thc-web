import { effectivePlayerGrl, playerPositionPenalty } from './squadUT.js';

const aliases = { POR: 'GK', LD: 'RB', DFC: 'CB', LI: 'LB', MC: 'CM', MCO: 'CAM', MDC: 'CDM', MCD: 'CDM', EI: 'LW', ED: 'RW', MI: 'LM', MD: 'RM', DC: 'ST', SP: 'CF' };
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function coachingBasePlayer(player) {
  const position = player?.pos || player?.posicion;
  return { ...player, pos: aliases[position] || position, grl: clamp(number(player?.base_grl ?? player?.grl, 0), 0, 99) };
}

export function coachingPlayerProfile(player, target) {
  const canonical = coachingBasePlayer(player);
  const position = target || canonical.pos;
  const grl = effectivePlayerGrl(canonical, position);
  const energy = Math.round(clamp(number(player?.stamina ?? player?.energia, 100), 0, 100));
  return { player, grl, energy, penalty: playerPositionPenalty(canonical, position),
    // Ranking aid only. The displayed GRL remains the real rating for the slot;
    // fatigue moderately favours a fresh replacement without inventing boosts.
    recommendation: grl * (.88 + .12 * energy / 100) };
}

export function sortCoachingBench(players, target) {
  return players.map(player => coachingPlayerProfile(player, target))
    .sort((a, b) => b.recommendation - a.recommendation || b.grl - a.grl || b.energy - a.energy
      || String(a.player.id).localeCompare(String(b.player.id)));
}

export function pendingCoachingChanges(original, lineup, slots) {
  const nextIds = new Set(lineup);
  const previousIds = new Set(original);
  const outgoing = original.filter(id => !nextIds.has(id));
  const availableOutgoing = [...outgoing];
  const replacements = lineup.flatMap((id, index) => {
    if (previousIds.has(id)) return [];
    const preferred = availableOutgoing.indexOf(original[index]);
    const removeAt = preferred >= 0 ? preferred : 0;
    const [out] = availableOutgoing.splice(removeAt, 1);
    return [{ out, in: id, position: slots[index]?.[0], index }];
  });
  const moved = lineup.filter((id, index) => previousIds.has(id) && original[index] !== id).length;
  return { replacements, substitutions: outgoing.length, moved };
}
