import { FORMACIONES, normalizarPos } from './formacionesFantasy.js';
import { fitnessAdjustedRating } from './careerEnergy.js';

export function selectCareerLineup(titulares = {}, reservas = [], formation = '4-3-3 OFENSIVO') {
  const slots = FORMACIONES[formation] || FORMACIONES['4-3-3 OFENSIVO'];
  const unique = new Map([...Object.values(titulares), ...reservas].filter(Boolean).map(player => [player.id, player]));
  const remaining = [...unique.values()];
  const next = {};
  for (const slot of slots) {
    const group = normalizarPos(slot.pos);
    const candidates = remaining.filter(player => normalizarPos(player.pos) === group);
    candidates.sort((a, b) => {
      const score = player => fitnessAdjustedRating(player) + (player.pos === slot.pos ? 1 : 0) + (titulares[slot.id]?.id === player.id ? 0.05 : 0);
      return score(b) - score(a);
    });
    const chosen = candidates[0];
    next[slot.id] = chosen || null;
    if (chosen) remaining.splice(remaining.findIndex(player => player.id === chosen.id), 1);
  }
  return { titulares: next, reservas: remaining, missing: slots.filter(slot => !next[slot.id]).map(slot => slot.pos) };
}

export function swapCareerPlayers(titulares, reservas, source, destination) {
  if (!source || !destination || (source.type === destination.type && source.key === destination.key)) return null;
  const get = location => location.type === 'pitch' ? titulares[location.key] : reservas.find(player => player.id === location.key);
  const first = get(source);
  const second = get(destination);
  if (!first || (destination.type === 'bench' && !second)) return null;
  const next = { ...titulares };
  const bench = [...reservas];
  const put = (location, player) => {
    if (location.type === 'pitch') next[location.key] = player || null;
    else {
      const index = bench.findIndex(item => item.id === location.key);
      if (index >= 0) { if (player) bench[index] = player; else bench.splice(index, 1); }
    }
  };
  if (source.type === 'bench' && destination.type === 'bench') {
    const a = bench.findIndex(player => player.id === source.key);
    const b = bench.findIndex(player => player.id === destination.key);
    [bench[a], bench[b]] = [bench[b], bench[a]];
  } else { put(source, second); put(destination, first); }
  return { titulares: next, reservas: bench };
}
